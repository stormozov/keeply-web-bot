import createElement from '../utils/createElementFunction';
import { ChatFormController } from './controllers/ChatFormController';
import { AttachmentManager } from './managers/AttachmentManager';
import { CapabilitiesManager } from './managers/CapabilitiesManager';
import { DragAndDropManager } from './managers/DragAndDropManager';
import LazyLoader from './managers/LazyLoader';
import MessageService from './services/MessageService';
import { IBotUiStructure, IUserMessageCard } from './shared/interfaces';
import { FileType } from './shared/types';
import { buildMessageFragment } from './ui/msg-fragment/msgFragmentBuilder';

/**
 * Класс для управления UI-элементами чат-бота Keeply на основе его возможностей (capabilities).
 * Автоматически настраивает состояние кнопок, полей ввода и других элементов интерфейса
 * в зависимости от полученных данных о поддерживаемых функциях.
 */
export default class KeeplyBot {
  /**
   * Структура UI-элементов бота, настраиваемых сервером и сгруппированных по категориям:
   * - `ui`: основные кнопки интерфейса (помощь, избранное и т.д.)
   * - `messaging`: элементы, связанные с отправкой сообщений
   * - `search`: элементы поиска
   *
   * Каждый элемент представляет собой HTMLElement или null (если не найден в DOM).
   *
   * @private
   */
  private readonly _botUi: IBotUiStructure = {
    ui: {
      buttonHelp: document.querySelector('.chat__btn-help'),
      buttonFavorites: document.querySelector('.header__btn-favorites'),
      buttonAttachments: document.querySelector('.header__btn-attachments'),
      buttonSettings: document.querySelector('.header__btn-settings'),
    },
    messaging: {
      sendText: document.querySelector('.chat__textarea'),
      sendAttachments: document.querySelector('.chat__btn-attach'),
    },
    search: {
      searchMessages: document.querySelector('.header__search-input'),
    },
  };

  // Ссылки на UI-элементы
  private readonly _chatForm: HTMLFormElement | null =
    document.querySelector('.chat__form');
  private readonly _chatTextarea: HTMLTextAreaElement | null =
    document.querySelector('.chat__textarea');
  private readonly _chatSendButton: HTMLButtonElement | null =
    document.querySelector('.chat__submit');
  private readonly _chatAttachButton: HTMLButtonElement | null =
    document.querySelector('.chat__btn-attach');
  private readonly _chatAttachmentsPreview: HTMLElement | null =
    document.querySelector('.form-att-prev');
  private readonly _chatContent = document.querySelector('.chat__content');
  private readonly _chatFeedWrap = document.querySelector('.chat__feed-wrap');
  private readonly _emptyBlock = document.querySelector('.chat__empty-block');
  private readonly _skeleton = document.querySelector('.chat__skeleton');
  private readonly _chat = document.querySelector('.chat');

  // Состояние для ленивой подгрузки сообщений
  private _loadedMessages: IUserMessageCard[] = [];
  private readonly _messagePerPage = 10;

  // Сервисы и менеджеры
  private _messageService: MessageService;
  private _capabilitiesManager: CapabilitiesManager;
  private _attachmentManager: AttachmentManager;
  private _lazyLoader!: LazyLoader | null;
  private _dragDropManager!: DragAndDropManager | null;

  // Контроллеры
  private _formController!: ChatFormController;

  /**
   * Создаёт экземпляр KeeplyBot и инициализирует ссылки на UI-элементы.
   */
  constructor() {
    const messageService = new MessageService();
    this._messageService = messageService;
    this._capabilitiesManager = new CapabilitiesManager(messageService);
    this._attachmentManager = new AttachmentManager();
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
      this._chatContent.addEventListener(
        'click',
        this._handleDownloadClick.bind(this)
      );
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
        const allMessages = await this._messageService.submitUserMessage(
          text,
          allFiles
        );
        this._loadedMessages = allMessages.slice(-this._messagePerPage);
        this._displayMessages(this._loadedMessages);
        this._scrollToBottom();

        if (this._lazyLoader) this._lazyLoader.reset();
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
   * 1. Отображает индикатор загрузки (skeleton)
   * 2. Загружает начальную порцию сообщений
   * 3. Инициализирует LazyLoader для подгрузки старых сообщений при прокрутке
   * 4. Обновляет интерфейс и позиционирует скролл
   *
   * @see {@link LazyLoader} - Механизм ленивой загрузки
   * @see {@link MessageService.loadInitialMessages} - Метод загрузки начальных
   * сообщений из MessageService
   */
  private async _loadMessages(): Promise<void> {
    this._showSkeleton();
    try {
      const initialMessages = await this._messageService.loadInitialMessages(
        this._messagePerPage
      );
      this._loadedMessages = [...initialMessages];

      this._initLazyLoader();
      this._displayMessages(this._loadedMessages);
      this._scrollToBottom();
    } catch (error) {
      console.error('Failed to load messages:', error);
      this._displayMessages([]);
    } finally {
      this._hideSkeleton();
    }
  }

  /**
   * Инициализирует LazyLoader для подгрузки старых сообщений при прокрутке.
   */
  private _initLazyLoader(): void {
    if (!(this._chatFeedWrap instanceof HTMLElement)) return;
    if (this._lazyLoader) this._lazyLoader.dispose();

    this._lazyLoader = new LazyLoader(
      this._chatFeedWrap,
      this._messageService,
      (newMessages) => {
        this._loadedMessages = [...newMessages, ...this._loadedMessages];
        this._displayMessages(this._loadedMessages);
      },
      { messagePerPage: this._messagePerPage }
    );

    this._lazyLoader.attachScrollListener();
  }

  /**
   * Показывает скелетон загрузки.
   *
   * @private
   */
  private _showSkeleton(): void {
    if (!this._chatContent || !this._skeleton) return;
    this._skeleton.classList.remove('hidden');
  }

  /**
   * Прокручивает чат до самого последнего сообщения.
   *
   * @private
   */
  private _scrollToBottom(): void {
    if (!this._chatFeedWrap) return;
    this._chatFeedWrap.scrollTop = this._chatFeedWrap.scrollHeight;
  }

  /**
   * Скрывает скелетон загрузки.
   *
   * @private
   */
  private _hideSkeleton(): void {
    if (!this._skeleton) return;
    this._skeleton.classList.add('hidden');
  }

  /**
   * Обработчик клика по кнопке скачивания файла.
   *
   * @param {Event} event - Событие клика.
   *
   * @private
   */
  private async _handleDownloadClick(event: Event): Promise<void> {
    event.preventDefault();

    // Проверяем, что клик был совершен по кнопке скачивания
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest(
      '.chat__message-file-download'
    ) as HTMLElement;
    if (!button) return;

    // Получаем URL и имя файла из атрибутов кнопки
    const url = button.getAttribute('data-url');
    const filename = button.getAttribute('data-filename') || 'file';

    if (!url) return;

    try {
      // Используем fetch для скачивания файла
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      document.body.append(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download file:', error);
    }
  }

  /**
   * Отображает список всех отправленных сообщений в интерфейсе чата
   *
   * @param {IUserMessageCard[]} messages - Массив карточек сообщений
   * для отображения
   *
   * @description
   * 1. Очищает текущее содержимое чата
   * 2. Если нет сообщений:
   *    - Показывает блок "Пустой чат"
   * 3. Если есть сообщения:
   *    - Скрывает блок "Пустой чат"
   *    - Создает и добавляет список сообщений
   *
   * @see {@link buildMessageFragment} - Функция рендеринга сообщений в DOM-фрагмент
   * @see this._chatContent - Контейнер для отображения сообщений
   * @see this._emptyBlock - Блок, отображаемый при отсутствии сообщений
   */
  private _displayMessages(messages: IUserMessageCard[]): void {
    // Очистка содержимого чата перед отображением новых сообщений
    this._chatContent?.replaceChildren();

    // Показ блока "Пустой чат", если нет сообщений
    if (messages.length === 0) {
      if (this._emptyBlock) this._chatContent?.append(this._emptyBlock);
      return;
    }

    // Скрытие блока "Пустой чат"
    if (this._emptyBlock instanceof HTMLElement) {
      this._emptyBlock.style.display = 'none';
    }

    // Создание и добавление списка сообщений в DOM
    const list = createElement({
      tag: 'ul',
      className: 'chat__messages-list',
    });
    list.append(buildMessageFragment(messages));
    this._chatContent?.append(list);
  }
}
