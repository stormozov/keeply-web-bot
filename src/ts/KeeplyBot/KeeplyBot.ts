// =============================================================================
// Модуль централизованной логики KeeplyBot
// =============================================================================

import { ChatFormController } from './controllers/ChatFormController';
import FileDownloadHandler from './handlers/FileDownloadHandler';
import { AttachmentManager } from './managers/AttachmentManager';
import { CapabilitiesManager } from './managers/CapabilitiesManager';
import { DragAndDropManager } from './managers/DragAndDropManager';
import LazyLoader from './managers/LazyLoader';
import MessageService from './services/MessageService';
import { IBotUiStructure, IUserMessageCard } from './shared/interfaces';
import { FileType } from './shared/types';
import ChatRenderer from './ui/chat-renderer/ChatRenderer';

/**
 * Класс для управления UI-элементами чат-бота Keeply на основе его возможностей (capabilities).
 * Автоматически настраивает состояние кнопок, полей ввода и других элементов интерфейса
 * в зависимости от полученных данных о поддерживаемых функциях.
 */
export default class KeeplyBot {
  // UI-элементы (инициализируются из корневого элемента)
  private _chatForm!: HTMLFormElement | null;
  private _chatTextarea!: HTMLTextAreaElement | null;
  private _chatSendButton!: HTMLButtonElement | null;
  private _chatAttachButton!: HTMLButtonElement | null;
  private _chatAttachmentsPreview!: HTMLElement | null;
  private _chatContent!: HTMLElement | null;
  private _chatFeedWrap!: HTMLElement | null;
  private _emptyBlock!: HTMLElement | null;
  private _chat!: HTMLElement | null;

  // Параметры ленивой загрузки
  private readonly _messagePerPage = 10;

  // Сервисы и менеджеры
  private _messageService: MessageService;
  private _capabilitiesManager: CapabilitiesManager;
  private _attachmentManager: AttachmentManager;
  private _lazyLoader!: LazyLoader | null;
  private _dragDropManager!: DragAndDropManager | null;

  // Контроллеры
  private _formController!: ChatFormController;

  // UI
  private _renderer!: ChatRenderer;

  // Обработчики
  private _fileDownloadHandler!: FileDownloadHandler;

  /**
   * Создаёт экземпляр KeeplyBot и инициализирует ссылки на UI-элементы.
   */
  constructor(
    private readonly _rootElement: HTMLElement,
    private readonly _botUi: IBotUiStructure,
    messageService: MessageService,
    capabilitiesManager: CapabilitiesManager,
    attachmentManager: AttachmentManager,
    fileDownloadHandler: FileDownloadHandler
  ) {
    this._messageService = messageService;
    this._capabilitiesManager = capabilitiesManager;
    this._attachmentManager = attachmentManager;
    this._fileDownloadHandler = fileDownloadHandler;

    // Извлекаем UI-элементы из rootElement
    this._chat = this._rootElement.querySelector('.chat');
    this._chatForm = this._rootElement.querySelector('.chat__form');
    this._chatTextarea = this._rootElement.querySelector('.chat__textarea');
    this._chatSendButton = this._rootElement.querySelector('.chat__submit');
    this._chatAttachButton =
      this._rootElement.querySelector('.chat__btn-attach');
    this._chatAttachmentsPreview =
      this._rootElement.querySelector('.form-att-prev');
    this._chatContent = this._rootElement.querySelector('.chat__content');
    this._chatFeedWrap = this._rootElement.querySelector('.chat__feed-wrap');
    this._emptyBlock = this._rootElement.querySelector('.chat__empty-block');

    this._renderer = new ChatRenderer(this._chatContent, this._emptyBlock);
  }

  /**
   * Инициализирует KeeplyBot.
   */
  init(): void {
    void this.updateUiCapabilities();
    this._handleEvents();
    void this._loadMessages();
    this._updateSendButtonState();
  }

  /**
   * Обрабатывает события, связанные с UI-элементами бота.
   *
   * @description
   * - Обработка отправки сообщения через форму чата.
   * - Обработка ввода текста в поле ввода.
   * - Обработка прикрепления файлов.
   * - Обработка Drag & Drop для загрузки файлов.
   * - Обработка прокрутки для ленивой подгрузки сообщений.
   *
   * @private
   */
  private _handleEvents(): void {
    // Обработка отправки сообщения через форму
    if (this._chatForm && this._chatTextarea && this._chatSendButton) {
      this._formController = new ChatFormController(
        this._chatForm,
        this._chatTextarea,
        this._chatSendButton,
        async (text) => this._submitMessage(text),
        () => this._updateSendButtonState()
      );
      this._formController.init();
    }

    // Обработка прикрепления файлов
    if (this._chatAttachButton) {
      this._chatAttachButton.addEventListener(
        'click',
        this._handleAttachButtonClick.bind(this)
      );
    }

    // Делегирование для удаления вложений
    if (this._chatAttachmentsPreview) {
      this._chatAttachmentsPreview.addEventListener(
        'click',
        this._handleAttachmentRemove.bind(this)
      );
      if (this._chatAttachmentsPreview) {
        this._chatAttachmentsPreview.addEventListener(
          'click',
          this._handleAttachmentClearAll.bind(this)
        );
      }
    }

    // Обработка Drag & Drop для загрузки файлов
    if (this._chat instanceof HTMLElement) {
      this._dragDropManager = new DragAndDropManager(this._chat, (files) => {
        this._attachmentManager.addFiles(files);
        this._attachmentManager.renderPreview(
          this._chatAttachmentsPreview as HTMLElement
        );
        if (this._chatAttachmentsPreview) {
          this._chatAttachmentsPreview.classList.remove('hidden');
        }
        this._updateSendButtonState();
      });
      this._dragDropManager.attach();
    }

    // Обработка изменения состояния файлов
    // Добавляем слушатель для обновления состояния кнопки при изменении файлов
    this._updateSendButtonState();

    // Обработка клика кнопку "Скачать" у файла в сообщении
    if (this._chatContent) {
      this._chatContent.addEventListener('click', (e) => {
        this._fileDownloadHandler.handle(e);
      });
    }
  }

  /**
   * Обновляет состояние UI-элементов в соответствии с возможностями бота.
   *
   * @returns {Promise<void>}
   * - Промис, когда обновление состояния завершено.
   * - Промис при преждевременном выходе из метода.
   *
   * @description
   * Загружает конфигурацию с сервера и применяет ее к UI-элементам бота.
   */
  async updateUiCapabilities(): Promise<void> {
    await this._capabilitiesManager.loadCapabilities();
    this._capabilitiesManager.applyToUi(this._botUi);

    const config = this._capabilitiesManager.getSendAttachmentsConfig();
    if (!config) return;

    this._attachmentManager.updateConfig({
      types: Array.isArray(config.types) ? config.types : [],
      limit: typeof config.limit === 'number' ? config.limit : 20,
    });
  }

  /**
   * Обработчик события отправки сообщения через форму чата.
   *
   * @param {string} text - Текст сообщения.
   * @returns {Promise<void>} Промис, который разрешается, когда отправка
   * сообщения завершена.
   *
   * @description
   * Получает данные сообщения из формы, отправляет их на сервер,
   * и обновляет интерфейс чата.
   */
  private async _submitMessage(text: string): Promise<void> {
    const { images, videos, audios } = this._attachmentManager.getState();
    const hasFiles =
      images.length > 0 || videos.length > 0 || audios.length > 0;
    const allFiles = [...images, ...videos, ...audios];

    if (text.trim().length > 0 || hasFiles) {
      try {
        const newMessage = await this._messageService.submitUserMessage(
          text,
          allFiles
        );
        this._lazyLoader?.appendNewMessages(newMessage);
        this._lazyLoader?.reset();
        this._renderer.scrollToBottom(this._chatFeedWrap);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    // Сброс формы
    this._chatForm?.reset();
    this._attachmentManager.clear();
    this._attachmentManager.renderPreview(
      this._chatAttachmentsPreview as HTMLElement
    );
    this._chatAttachmentsPreview?.classList.add('hidden');
    this._updateSendButtonState();
  }

  /**
   * Обработчик события клика по кнопке прикрепления файла.
   *
   * @description
   * Создает скрытый input для выбора файлов, настраивает его и вызывает диалог выбора.
   *
   * @private
   */
  private _handleAttachButtonClick(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;

    // Получаем настройки из capabilities
    const sendAttachmentsConfig = this._botUi.messaging.sendAttachments;
    if (sendAttachmentsConfig) {
      const types = sendAttachmentsConfig.getAttribute('data-types');
      if (types) {
        const allowedTypes = JSON.parse(types) as string[];
        fileInput.accept = allowedTypes.join(',');
      }

      const limit = sendAttachmentsConfig.getAttribute('data-limit');
      if (limit) {
        fileInput.setAttribute('data-limit', limit);
      }
    }

    fileInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files) {
        this._attachmentManager.addFiles([...target.files]);
        this._attachmentManager.renderPreview(
          this._chatAttachmentsPreview as HTMLElement
        );
        this._updateSendButtonState();
      }
    });

    fileInput.click();
  }

  /**
   * Обработчик удаления вложенного файла из чата
   *
   * @param {Event} event - Событие клика на кнопку удаления
   *
   * @description
   * 1. Находит ближайшую кнопку с классом .form-att-prev__remove
   * 2. Получает тип файла и индекс из атрибутов data-type и data-index
   * 3. Удаляет файл из менеджера вложений
   * 4. Перерисовывает превью оставшихся файлов
   * 5. Обновляет состояние кнопки отправки
   *
   * @see _attachmentManager - Менеджер работы с вложениями
   * @see _updateSendButtonState - Метод обновления состояния кнопки отправки
   */
  private _handleAttachmentRemove(event: Event): void {
    // Получаем целевой элемент события и находим ближайшую кнопку удаления
    const target = event.target as HTMLElement;
    const button = target.closest('.form-att-prev__remove');
    if (!button) return;

    // Извлекаем тип файла и индекс из атрибутов кнопки
    const type = button.getAttribute('data-type') as FileType;
    const index = parseInt(button.getAttribute('data-index') || '', 10);

    // Проверяем корректность индекса
    if (isNaN(index)) return;

    // Удаляем файл из менеджера вложений
    this._attachmentManager.removeFile(type, index);

    // Перерисовываем превью с учетом изменений
    this._attachmentManager.renderPreview(
      this._chatAttachmentsPreview as HTMLElement
    );

    // Обновляем состояние кнопки отправки
    this._updateSendButtonState();
  }

  /**
   * Обработчик события полной очистки всех вложений
   *
   * @param {Event} event - Событие клика
   *
   * @description
   * 1. Проверяет, что событие произошло на элементе с нужным классом
   * 2. Выполняет полную очистку всех загруженных файлов
   * 3. Перерисовывает интерфейс предварительного просмотра
   * 4. Обновляет состояние кнопки отправки
   *
   * @example
   * // Пример работы:
   * // 1. Пользователь нажимает кнопку "Очистить всё"
   * // 2. Все файлы удаляются из менеджера
   * // 3. Интерфейс обновляется и закрывает блок предварительного просмотра
   *
   * @see {@link AttachmentManager.clear} - Метод полной очистки файлов
   * @see {@link AttachmentManager.renderPreview} - Перерисовка интерфейса
   */
  private _handleAttachmentClearAll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('form-att-prev__clear-all')) return;

    this._attachmentManager.clear();
    this._attachmentManager.renderPreview(
      this._chatAttachmentsPreview as HTMLElement
    );
    this._updateSendButtonState();
  }

  /**
   * Обновляет состояние кнопки отправки сообщения.
   *
   * @description
   * По умолчанию кнопка отключена. Она меняет состояние на активное, если
   * соблюден хотя бы один из следующих условий:
   * - Поле ввода сообщения не пустое
   * - Количество выбранных файлов больше нуля
   * - Поле ввода сообщения не пустое и количество выбранных файлов больше нуля
   *
   * @private
   */
  private _updateSendButtonState(): void {
    if (!this._chatSendButton || !this._chatTextarea) return;

    const message = this._chatTextarea.value.trim();
    const hasText = message.length > 0;
    const { images, videos, audios } = this._attachmentManager.getState();
    const hasFiles =
      images.length > 0 || videos.length > 0 || audios.length > 0;

    this._chatSendButton.disabled = !hasText && !hasFiles;
  }

  /**
   * Загружает начальные сообщения и инициализирует ленивую загрузку
   *
   * @description
   * 2. Загружает начальную порцию сообщений
   * 3. Инициализирует LazyLoader для подгрузки старых сообщений при прокрутке
   * 4. Обновляет интерфейс и позиционирует скролл
   *
   * @see {@link LazyLoader} - Механизм ленивой загрузки
   * @see {@link MessageService.loadInitialMessages} - Метод загрузки начальных
   * сообщений из MessageService
   */
  private async _loadMessages(): Promise<void> {
    try {
      // Инициализируем LazyLoader ДО загрузки сообщений
      this._initLazyLoader();

      if (!this._lazyLoader) throw Error(`LazyLoader не инициализирован`);

      // Загружаем начальные сообщения через LazyLoader
      await this._lazyLoader.loadInitial();

      this._renderer.render(this._lazyLoader.getMessages());
      this._renderer.scrollToBottom(this._chatFeedWrap);
    } catch (error) {
      console.error('Failed to load messages:', error);
      this._renderer.render([]);
    }
  }

  /**
   * Инициализирует LazyLoader для подгрузки старых сообщений при прокрутке.
   */
  private _initLazyLoader(): void {
    if (!(this._chatFeedWrap instanceof HTMLElement)) return;
    if (this._lazyLoader) this._lazyLoader.dispose();

    // Создаём новый LazyLoader
    this._lazyLoader = new LazyLoader(
      this._chatFeedWrap,
      this._messageService,
      (allMessages: IUserMessageCard[]) => this._renderer.render(allMessages),
      { messagePerPage: this._messagePerPage }
    );

    this._lazyLoader.attachScrollListener();
  }
}
