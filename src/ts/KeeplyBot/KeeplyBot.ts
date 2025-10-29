// =============================================================================
// Модуль централизованной логики KeeplyBot
// =============================================================================

import createElement from '../utils/createElementFunction';
import {
  deleteAllMessages,
  deleteMessage,
  downloadAttachments,
} from './api/api';
import { ChatFormController } from './controllers/ChatFormController';
import FileDownloadHandler from './handlers/FileDownloadHandler';
import { AttachmentManager } from './managers/AttachmentManager';
import { CapabilitiesManager } from './managers/CapabilitiesManager';
import { DragAndDropManager } from './managers/DragAndDropManager';
import LazyLoader from './managers/LazyLoader';
import PinnedMessageManager from './managers/PinnedMessageManager';
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
  private _uploadProgress!: HTMLElement | null;
  private _uploadProgressBar!: HTMLElement | null;

  // Параметры ленивой загрузки
  private readonly _messagePerPage = 10;

  // Сервисы и менеджеры
  private _messageService: MessageService;
  private _capabilitiesManager: CapabilitiesManager;
  private _attachmentManager: AttachmentManager;
  private _pinnedMessageManager: PinnedMessageManager;
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
    this._pinnedMessageManager = new PinnedMessageManager();
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
    this._uploadProgress = root.querySelector('#upload-progress');
    this._uploadProgressBar = root.querySelector('.upload-progress__bar');
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
    this._initMsgDropdownToggleHandler();
    this._initPinnedMessageHandler();
    this._initPinnedMessageManager();
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
        // Показываем прогресс бар только если есть файлы
        if (hasFiles) this._showUploadProgress();

        const newMessage = await this._messageService.submitUserMessage(
          text,
          allFiles,
          hasFiles ? this._updateUploadProgress.bind(this) : undefined
        );

        this._lazyLoader?.appendNewMessages(newMessage);
        this._lazyLoader?.reset();
        if (this._lazyLoader) {
          this._pinnedMessageManager.updateRendererWithPinnedMessage(
            this._initDownloadHandlers.bind(this)
          );
        }
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
      } catch (error: any) {
        console.error('Failed to send message:', error);
        const errorMessage =
          error.message || 'Произошла ошибка при отправке сообщения';
        notifyConfig = {
          message: errorMessage,
          type: 'error',
          duration: 2500,
          position: 'bottom-center',
        };
      } finally {
        // Устанавливаем прогресс на 100% перед скрытием
        if (hasFiles) {
          this._updateUploadProgress(100);
          setTimeout(() => this._hideUploadProgress(), 200);
        } else {
          this._hideUploadProgress();
        }
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
   * Создает обработчик клика для кнопки скачивания вложений.
   *
   * @param {string} messageId - ID сообщения.
   */
  private async _handleDownloadAttachments(messageId: string): Promise<void> {
    // Найти элемент прогресс-бара для этого сообщения
    const messageElement = document.querySelector(`[id="${messageId}"]`);
    const progressElement = messageElement?.querySelector(
      '.chat__message-download-progress'
    );

    if (!(progressElement instanceof HTMLElement)) {
      console.warn(`Progress element not found for message ${messageId}`);
      return;
    }

    try {
      // Показываем прогресс-бар
      progressElement.classList.remove('hidden');

      // Симулируем прогресс загрузки
      const progressInterval = setInterval(() => {
        // Имитируем постепенное увеличение прогресса
        // Визуально прогресс показывается через анимацию shimmer
      }, 200);

      // Отправляем GET-запрос на сервер
      const response = await downloadAttachments(messageId);

      // Останавливаем симуляцию прогресса
      clearInterval(progressInterval);

      // Получаем данные как blob
      const blob = await response.blob();

      // Создаем URL для скачивания
      const downloadUrl = window.URL.createObjectURL(blob);

      // Создаем временную ссылку для скачивания
      const a = createElement({
        tag: 'a',
        attrs: {
          href: downloadUrl,
          download: `attachments-${messageId}.zip`,
        },
      });

      // Добавляем ссылку на страницу, кликаем и удаляем
      document.body.append(a);
      a.click();
      document.body.removeChild(a);

      // Освобождаем URL
      window.URL.revokeObjectURL(downloadUrl);

      // Оставляем прогресс-бар видимым еще 3 секунды после завершения
      setTimeout(() => progressElement.classList.add('hidden'), 3000);

      // Показываем уведомление об успешном скачивании
      this._notificationManager.show({
        message: 'Вложения успешно скачаны',
        type: 'info',
        duration: 2500,
      });
    } catch {
      // В случае ошибки скрываем прогресс-бар
      progressElement.classList.add('hidden');

      this._notificationManager.show({
        message: 'Произошла ошибка при скачивании вложений',
        type: 'error',
        duration: 2500,
      });
    }
  }

  /**
   * Инициализирует обработчики событий для кнопок скачивания вложений.
   *
   * @param {DocumentFragment} fragment - Фрагмент с сообщениями.
   */
  private _initDownloadHandlers(fragment: DocumentFragment): void {
    const downloadButtons = fragment.querySelectorAll(
      '.msg-dropdown__button--download-attachments'
    );

    downloadButtons.forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const messageId = (button as HTMLElement).dataset.messageId;
        if (messageId) await this._handleDownloadAttachments(messageId);
      });
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

        // Если удаляемое сообщение было закреплено, открепляем его
        if (this._pinnedMessageManager.getPinnedMessage() === messageId) {
          this._pinnedMessageManager.setPinnedMessage(null);
        }

        messageElement.removeEventListener(
          'transitionend',
          handleTransitionEnd
        );
      };

      messageElement.addEventListener('transitionend', handleTransitionEnd);
    });
  }

  /**
   * Инициализация обработчика переключения выпадающего меню сообщений.
   */
  private _initMsgDropdownToggleHandler(): void {
    const DROPDOWN_SELECTOR = '.msg-dropdown';
    const MORE_BUTTON_SELECTOR = '.msg-dropdown__more';
    const LIST_SELECTOR = '.msg-dropdown__list';
    const HIDDEN_SELECTOR = 'hidden';

    // ОБРАБОТЧИК клика по кнопке
    this._chatContent?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const moreButton = target.closest(MORE_BUTTON_SELECTOR);
      if (!(moreButton instanceof HTMLElement)) return;

      e.preventDefault();

      const dropdown = moreButton.closest(DROPDOWN_SELECTOR);
      if (!(dropdown instanceof HTMLElement)) return;

      const list = dropdown.querySelector(LIST_SELECTOR);
      if (!(list instanceof HTMLElement)) return;

      list.classList.toggle(HIDDEN_SELECTOR);
    });

    // ОБРАБОТЧИК клика вне dropdown для закрытия
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(DROPDOWN_SELECTOR)) return;

      // Закрываем все открытые dropdown
      const openLists = this._chatContent?.querySelectorAll(
        `${LIST_SELECTOR}:not(${HIDDEN_SELECTOR})`
      );
      openLists?.forEach((list) => list.classList.add(HIDDEN_SELECTOR));
    });

    // ОБРАБОТЧИК клика по кнопкам закрепления/открепления
    this._chatContent?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('.msg-dropdown__button--pin') &&
        !target.closest('.msg-dropdown__button--unpin')
      ) {
        return;
      }

      e.preventDefault();

      const messageElement = target.closest('.chat__message-item');
      if (!(messageElement instanceof HTMLElement)) return;

      const messageId = messageElement.id;
      if (!messageId) return;

      if (target.closest('.msg-dropdown__button--pin')) {
        // Закрепить сообщение
        this._pinnedMessageManager.setPinnedMessage(messageId);
      } else if (target.closest('.msg-dropdown__button--unpin')) {
        // Открепить сообщение
        this._pinnedMessageManager.setPinnedMessage(null);
      }

      // Закрываем dropdown после действия
      const dropdown = target.closest(DROPDOWN_SELECTOR);
      if (dropdown) {
        const list = dropdown.querySelector(LIST_SELECTOR);
        if (list) list.classList.add(HIDDEN_SELECTOR);
      }
    });
  }

  /**
   * Инициализация обработчиков для закрепленного сообщения.
   */
  private _initPinnedMessageHandler(): void {
    this._pinnedMessageManager.initPinnedMessageHandler();
  }

  /**
   * Инициализация менеджера закрепленных сообщений.
   */
  private _initPinnedMessageManager(): void {
    if (
      this._lazyLoader &&
      this._renderer &&
      this._chatContent &&
      this._chatFeedWrap
    ) {
      this._pinnedMessageManager.setDependencies(
        this._lazyLoader,
        this._renderer,
        this._chatContent,
        this._chatFeedWrap
      );
      this._pinnedMessageManager.initPinButtonHandlers();
    }
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

          // Очищаем закрепленное сообщение при очистке чата
          this._pinnedMessageManager.setPinnedMessage(null);

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
   * Показывает прогресс бар загрузки.
   */
  private _showUploadProgress(): void {
    if (this._uploadProgress) {
      this._uploadProgress.classList.add('visible');
    }
  }

  /**
   * Скрывает прогресс бар загрузки.
   */
  private _hideUploadProgress(): void {
    if (this._uploadProgress) {
      this._uploadProgress.classList.remove('visible');
    }
    if (this._uploadProgressBar) {
      this._uploadProgressBar.style.width = '0%';
    }
  }

  /**
   * Обновляет прогресс бар загрузки.
   *
   * @param {number} progress - Процент загрузки (0-100).
   */
  private _updateUploadProgress(progress: number): void {
    if (this._uploadProgressBar) {
      this._uploadProgressBar.style.width = `${progress}%`;
    }
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

      this._pinnedMessageManager.updateRendererWithPinnedMessage(
        this._initDownloadHandlers.bind(this)
      );
      this._renderer.scrollToBottom(this._chatFeedWrap);

      // Обновляем состояние кнопки "Очистить чат"
      const hasMessages = this._lazyLoader.getMessages().length > 0;
      this._sidebarManager.updateClearChatButtonState(hasMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      this._renderer.render([], this._initDownloadHandlers.bind(this), null);
      // При ошибке загрузки считаем чат пустым
      this._sidebarManager.updateClearChatButtonState(false);

      // Если сообщения не загрузились, но есть закрепленное сообщение из localStorage,
      // очищаем его, так как сообщение могло быть удалено
      if (this._pinnedMessageManager.getPinnedMessage()) {
        this._pinnedMessageManager.setPinnedMessage(null);
      }
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
        this._renderer.render(
          allMessages,
          this._initDownloadHandlers.bind(this),
          this._pinnedMessageManager.getPinnedMessage()
        );
        this._pinnedMessageManager.updatePinnedMessageUI();
        PinnedMessageManager.updatePinButtonsUI(
          this._pinnedMessageManager.getPinnedMessage()
        );
        // Обновляем состояние кнопки "Очистить чат" при изменении сообщений
        this._sidebarManager.updateClearChatButtonState(allMessages.length > 0);
      },
      { messagePerPage: this._messagePerPage }
    );

    this._lazyLoader.attachScrollListener();
  }
}
