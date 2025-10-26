// =============================================================================
// Модуль централизованной логики KeeplyBot
// =============================================================================

import createElement from '../utils/createElementFunction';
import { deleteAllMessages, deleteMessage } from './api/api';
import { ChatFormController } from './controllers/ChatFormController';
import FileDownloadHandler from './handlers/FileDownloadHandler';
import { AttachmentManager } from './managers/AttachmentManager';
import { CapabilitiesManager } from './managers/CapabilitiesManager';
import { DragAndDropManager } from './managers/DragAndDropManager';
import LazyLoader from './managers/LazyLoader';
import SidebarManager from './managers/SidebarManager';
import MessageService from './services/MessageService';
import { IBotUiStructure, IUserMessageCard } from './shared/interfaces';
import { FileType } from './shared/types';
import ChatRenderer from './ui/chat-renderer/ChatRenderer';
import NotificationManager, {
  INotificationConfig,
} from './ui/notifications/NotificationManager';

/**
 * Основной класс для управления функциональностью чат-бота Keeply
 *
 * @description
 * Объединяет все компоненты и логику работы чата:
 * - Инициализация и обработка событий UI
 * - Работу с сообщениями и вложениями
 * - Ленивую загрузку старых сообщений
 * - Обработку Drag & Drop файлов
 * - Отображение интерфейса
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
  private _appElement!: HTMLElement | null;

  // Параметры ленивой загрузки
  private readonly _messagePerPage = 10;

  // Сервисы и менеджеры
  private _messageService: MessageService;
  private _capabilitiesManager: CapabilitiesManager;
  private _attachmentManager: AttachmentManager;
  private _sidebarManager!: SidebarManager;
  private _lazyLoader!: LazyLoader | null;
  private _dragDropManager!: DragAndDropManager | null;

  // Контроллеры
  private _formController!: ChatFormController;

  // UI
  private _renderer!: ChatRenderer;

  // Обработчики
  private _fileDownloadHandler!: FileDownloadHandler;
  private _notificationManager!: NotificationManager;

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

    // Инициализация UI элементов
    this._initUiElements(this._rootElement);

    this._renderer = new ChatRenderer(this._chatContent, this._emptyBlock);
    this._notificationManager = new NotificationManager();
    this._sidebarManager = new SidebarManager(this._rootElement, this._botUi);
  }

  /**
   * Инициализирует KeeplyBot.
   */
  init(): void {
    void this.updateUiCapabilities();
    this._handleEvents();
    void this._loadMessages();
  }

  private _initUiElements(root: HTMLElement): void {
    this._appElement = root;
    if (!this._appElement) {
      console.error(`Chat root element not found: ${root}`);
    }
    this._chatForm = root.querySelector('.chat__form');
    this._chatTextarea = root.querySelector('.chat__textarea');
    this._chatSendButton = root.querySelector('.chat__submit');
    this._chatAttachButton = root.querySelector('.chat__btn-attach');
    this._chatAttachmentsPreview = root.querySelector('.form-att-prev');
    this._chatContent = root.querySelector('.chat__content');
    this._chatFeedWrap = root.querySelector('.chat__feed-wrap');
    this._emptyBlock = root.querySelector('.chat__empty-block');
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
    this._handleFormController();
    this._initAttachmentHandlers();
    this._initDragAndDrop();
    this._initFileDownloadHandler();
    this._initMessageDeleteHandler();
    this._initSidebarHandlers();
    this._updateSendButtonState();
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
   * Обработка отправки сообщения через форму чата.
   */
  private _handleFormController(): void {
    if (!this._chatForm && !this._chatTextarea && !this._chatSendButton) return;
    this._formController = new ChatFormController(
      this._chatForm,
      this._chatTextarea,
      this._chatSendButton,
      async (text) => this._submitMessage(text),
      () => this._updateSendButtonState()
    );
    this._formController.init();
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
    let notifyConfig: INotificationConfig = {} as INotificationConfig;

    if (text.trim().length > 0 || hasFiles) {
      try {
        const newMessage = await this._messageService.submitUserMessage(
          text,
          allFiles
        );
        this._lazyLoader?.appendNewMessages(newMessage);
        this._lazyLoader?.reset();
        this._renderer.scrollToBottom(this._chatFeedWrap);
        // Показываем уведомление об успешной отправке
        notifyConfig = {
          message: 'Сообщение отправлено',
          type: 'success',
          duration: 2500,
          position: 'bottom-center',
        };

        // После отправки сообщения кнопка "Очистить чат" должна быть доступна
        this._sidebarManager.updateClearChatButtonState(true);
      } catch (error) {
        console.error('Failed to send message:', error);
        notifyConfig = {
          message: 'Произошла ошибка при отправке сообщения',
          type: 'error',
          duration: 2500,
          position: 'bottom-center',
        };
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

    // Показываем уведомление об успехе отправки, либо уведомление об ошибке
    this._notificationManager.show(notifyConfig);
  }

  /**
   * Инициализация обработчиков событий для кнопки прикрепления файла и превью
   * файлов
   */
  private _initAttachmentHandlers(): void {
    if (this._chatAttachButton) {
      this._chatAttachButton.addEventListener(
        'click',
        this._handleAttachButtonClick.bind(this)
      );
    }

    if (this._chatAttachmentsPreview) {
      this._chatAttachmentsPreview.addEventListener(
        'click',
        this._handleAttachmentRemove.bind(this)
      );
      this._chatAttachmentsPreview.addEventListener(
        'click',
        this._handleAttachmentClearAll.bind(this)
      );
    }
  }

  /**
   * Обработчик события клика по кнопке прикрепления файла.
   *
   * @description
   * Создает скрытый input для выбора файлов, настраивает его и вызывает диалог
   * выбора.
   *
   * @private
   */
  private _handleAttachButtonClick(): void {
    const fileInput = createElement({
      tag: 'input',
      attrs: {
        type: 'file',
        multiple: 'true',
      },
    }) as HTMLInputElement;

    // Получаем настройки из capabilities
    const sendAttachmentsConfig = this._botUi.messaging.sendAttachments;
    if (sendAttachmentsConfig) {
      const types = sendAttachmentsConfig.getAttribute('data-types');
      if (types) {
        const allowedTypes = JSON.parse(types) as string[];
        fileInput.accept = allowedTypes.join(',');
      }

      const limit = sendAttachmentsConfig.getAttribute('data-limit');
      if (limit) fileInput.setAttribute('data-limit', limit);
    }

    fileInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      if (!target.files) return;

      const filesToAdd = [...target.files];
      const addedCount = this._attachmentManager.addFiles(filesToAdd);
      this._attachmentManager.renderPreview(
        this._chatAttachmentsPreview as HTMLElement
      );

      this._updateSendButtonState();

      // Проверяем, достигнут ли лимит
      if (addedCount < filesToAdd.length) {
        const limit =
          this._capabilitiesManager.getSendAttachmentsConfig()?.limit || 9;
        this._notificationManager.show({
          message: `Достигнут лимит прикрепления файлов (${limit})`,
          type: 'warning',
          duration: 3000,
          position: 'bottom-center',
        });
      } else {
        // Показываем уведомление об успешном прикреплении
        this._notificationManager.show({
          message: `Выбранные файлы(${addedCount}) успешно прикреплены`,
          type: 'info',
          duration: 2500,
        });
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
    const target = event.target;
    if (!(target instanceof Element)) return;
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
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains('form-att-prev__clear-all')) return;

    this._attachmentManager.clear();
    this._attachmentManager.renderPreview(
      this._chatAttachmentsPreview as HTMLElement
    );
    this._updateSendButtonState();
  }

  /**
   * Инициализация Drag and Drop.
   */
  private _initDragAndDrop(): void {
    if (!(this._appElement instanceof HTMLElement)) return;
    this._dragDropManager = new DragAndDropManager(
      this._appElement,
      this._onFilesDropped
    );
    this._dragDropManager.attach();
  }

  /**
   * Обработчик события перетаскивания файлов.
   */
  private _onFilesDropped = (files: File[]): void => {
    if (!this._chatAttachmentsPreview) {
      console.warn(
        `Метод _initDragAndDrop. Элемент не найден: ${this._chatAttachmentsPreview}`
      );
      return;
    }

    const addedCount = this._attachmentManager.addFiles(files);
    this._attachmentManager.renderPreview(this._chatAttachmentsPreview);
    this._chatAttachmentsPreview?.classList.remove('hidden');
    this._updateSendButtonState();

    // Проверяем, достигнут ли лимит
    if (addedCount < files.length) {
      const limit =
        this._capabilitiesManager.getSendAttachmentsConfig()?.limit || 9;
      this._notificationManager.show({
        message: `Достигнут лимит прикрепления файлов (${limit})`,
        type: 'warning',
        duration: 3000,
        position: 'bottom-center',
      });
    } else {
      // Показываем уведомление об успешном прикреплении
      this._notificationManager.show({
        message: `Выбранные файлы(${addedCount}) успешно прикреплены`,
        type: 'info',
        duration: 2500,
      });
    }
  };

  /**
   * Инициализация загрузки файлов.
   */
  private _initFileDownloadHandler(): void {
    this._chatContent?.addEventListener('click', (e) => {
      this._fileDownloadHandler.handle(e);
    });
  }

  /**
   * Инициализация обработчика удаления выбранного сообщения.
   */
  private _initMessageDeleteHandler(): void {
    this._chatContent?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.msg-dropdown__button--delete')) return;

      e.preventDefault();

      const messageElement = target.closest('.chat__message-item');
      if (!(messageElement instanceof HTMLElement)) return;

      const messageId = messageElement.id;
      if (!messageId) return;

      if (!confirm('Вы уверены, что хотите удалить это сообщение?')) return;

      const isSuccess = await deleteMessage(messageId);
      if (!isSuccess) {
        this._notificationManager.show({
          message: 'Не удалось удалить сообщение',
          type: 'error',
          position: 'bottom-center',
        });
        return;
      }

      // Показываем уведомление об успешном удалении
      this._notificationManager.show({
        message: 'Сообщение удалено',
        type: 'success',
        duration: 3000,
        position: 'bottom-center',
      });

      // Добавляем класс для анимации удаления
      messageElement.classList.add('chat__message-item--deleting');

      // Ждем завершения анимации, затем удаляем элемент
      const handleTransitionEnd = (): void => {
        messageElement.remove();
        this._lazyLoader?.removeMessage(messageId);

        messageElement.removeEventListener(
          'transitionend',
          handleTransitionEnd
        );
      };

      messageElement.addEventListener('transitionend', handleTransitionEnd);
    });
  }

  /**
   * Инициализация обработчиков для sidebar
   */
  private _initSidebarHandlers(): void {
    this._sidebarManager.initSidebarHandlers();
    this._clearChatButtonHandler();
  }

  /**
   * Обработчик клика на кнопку очистки чата
   */
  private _clearChatButtonHandler(): void {
    // Обработчик клика на кнопку очистки чата
    this._appElement?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const clearButton = target.closest(
        '[data-action="clear-chat"]'
      ) as HTMLElement;
      if (!clearButton) return;

      e.preventDefault();

      // Подтверждение пользователя
      if (
        !confirm(
          'Вы уверены, что хотите полностью очистить весь чат? Это действие нельзя отменить.'
        )
      ) {
        return;
      }

      let notification;

      try {
        // Отправляем запрос на сервер
        const isSuccess = await deleteAllMessages();

        if (isSuccess) {
          this._lazyLoader?.clear();

          // Показываем уведомление об успехе
          notification = {
            message: 'Чат успешно очищен',
            type: 'success',
            duration: 3000,
            position: 'bottom-center',
          };
        } else {
          // Показываем уведомление об ошибке
          notification = {
            message: 'Не удалось очистить чат. Попробуйте еще раз.',
            type: 'error',
            duration: 3000,
            position: 'bottom-center',
          };
        }
      } catch {
        notification = {
          message: 'Произошла ошибка при очистке чата',
          type: 'error',
          duration: 3000,
          position: 'bottom-center',
        };
      } finally {
        this._notificationManager.show(notification as INotificationConfig);
      }
    });
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

      // Обновляем состояние кнопки "Очистить чат"
      const hasMessages = this._lazyLoader.getMessages().length > 0;
      this._sidebarManager.updateClearChatButtonState(hasMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      this._renderer.render([]);
      // При ошибке загрузки считаем чат пустым
      this._sidebarManager.updateClearChatButtonState(false);
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
      (allMessages: IUserMessageCard[]) => {
        this._renderer.render(allMessages);
        // Обновляем состояние кнопки "Очистить чат" при изменении сообщений
        this._sidebarManager.updateClearChatButtonState(allMessages.length > 0);
      },
      { messagePerPage: this._messagePerPage }
    );

    this._lazyLoader.attachScrollListener();
  }
}
