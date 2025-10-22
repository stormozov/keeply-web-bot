import createElement from '../utils/createElementFunction';
import { AttachmentManager } from './managers/AttachmentManager';
import MessageService from './services/MessageService';
import {
  IBotCapabilities,
  IBotUiStructure,
  ICapabilitiesElementSettings,
  IUserMessageCard,
} from './shared/interfaces';
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
  private _currentOffset: number = 0;
  private _isLoadingMore: boolean = false;
  private _hasMoreMessages: boolean = true;
  private readonly _scrollThreshold = 50;
  private readonly _messagePerPage = 10;

  // Счётчик для Drag & Drop, чтобы избежать мерцания при входе/выходе из дочерних элементов
  private _dragEnterCounter: number = 0;

  // Сервисы и менеджеры
  private _messageService: MessageService = new MessageService();
  private _attachmentManager: AttachmentManager = new AttachmentManager({
    types: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
    limit: 9,
  });

  /**
   * Создаёт экземпляр KeeplyBot и инициализирует ссылки на UI-элементы.
   */
  constructor() {}

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
    if (this._chatForm) {
      this._chatForm.addEventListener(
        'submit',
        this._handleChatFormSubmit.bind(this)
      );
    }

    // Обработка ввода текста в поле ввода
    if (this._chatTextarea) {
      this._chatTextarea.addEventListener(
        'input',
        this._handleTextareaInput.bind(this)
      );
      this._chatTextarea.addEventListener(
        'keydown',
        this._handleTextareaKeydown.bind(this)
      );
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
    this._handleDragAndDrop();

    // Обработка прокрутки для ленивой подгрузки
    if (this._chatFeedWrap) {
      this._chatFeedWrap.addEventListener(
        'scroll',
        this._handleLazyScroll.bind(this)
      );
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
   * Получает текущие возможности (capabilities) бота с сервера.
   *
   * @returns {Promise<IBotCapabilities>} Объект с описанием поддерживаемых
   * функций бота, разбитый по категориям (ui, messaging, search и т.д.).
   *
   * @see {@link IBotCapabilities} - Интерфейс для Capabilities бота
   */
  async getCapabilities(): Promise<IBotCapabilities> {
    return await this._messageService.loadCapabilities();
  }

  /**
   * Обновляет состояние UI-элементов в соответствии с возможностями бота.
   * Для каждого элемента применяются настройки: доступность, тултипы, лимиты,
   * допустимые типы и т.д.
   *
   * @returns {Promise<void>} Промис, который разрешается, когда обновление завершено.
   */
  async updateUiCapabilities(): Promise<void> {
    const capabilities = await this.getCapabilities();

    // Проходим по всем категориям: ui, messaging, search и т.д.
    for (const category in this._botUi) {
      const uiCategory = this._botUi[category];
      const capCategory = capabilities[category as keyof IBotCapabilities];

      if (!capCategory || typeof capCategory !== 'object') continue;

      // Проходим по каждому элементу внутри категории
      for (const elementKey in uiCategory) {
        const element = uiCategory[elementKey];
        const config = capCategory[elementKey as keyof typeof capCategory] as
          | ICapabilitiesElementSettings
          | undefined;

        if (element && config) {
          this._updateElementState(element, config);
        }
      }
    }

    // Установка атрибутов для sendAttachments
    this._setSendAttachmentsAttributes(capabilities.messaging.sendAttachments);
  }

  /**
   * Применяет конфигурацию к конкретному UI-элементу на основе его настроек из capabilities.
   *
   * Управляет:
   * - атрибутом `disabled` (включено/выключено),
   * - наличием тултипа (`has-tooltip` класс и `data-tooltip`),
   * - атрибутом `data-limit` (если задан лимит),
   * - атрибутом `data-types` (в формате JSON, если заданы допустимые типы).
   *
   * @param {HTMLElement} element — DOM-элемент, который нужно обновить.
   * @param {ICapabilitiesElementSettings} config — настройки элемента из capabilities.
   *
   * @private
   */
  private _updateElementState(
    element: HTMLElement,
    config: ICapabilitiesElementSettings
  ): void {
    const isEnabled = config.availableState === 'true';

    // Управление доступностью элемента
    if (isEnabled) {
      element.removeAttribute('disabled');
    } else {
      element.setAttribute('disabled', 'true');
    }

    // Управление тултипом
    if (config.hasTooltip) {
      element.classList.add('has-tooltip');
      element.setAttribute('data-tooltip', config.tooltip || '');
    } else {
      element.classList.remove('has-tooltip');
      element.removeAttribute('data-tooltip');
    }

    // Limit (если задан)
    if (typeof config.limit !== 'undefined') {
      element.setAttribute('data-limit', String(config.limit));
    } else {
      element.removeAttribute('data-limit');
    }

    // Types (если заданы)
    if (Array.isArray(config.types) && config.types.length > 0) {
      // Сохраняем как JSON — надёжнее, чем через запятую
      // (особенно если типы содержат спецсимволы)
      element.setAttribute('data-types', JSON.stringify(config.types));
    } else {
      element.removeAttribute('data-types');
    }
  }

  /**
   * Устанавливает атрибуты для кнопки прикрепления файлов на основе настроек sendAttachments.
   *
   * @param {ICapabilitiesElementSettings} config — настройки sendAttachments из capabilities.
   *
   * @private
   */
  private _setSendAttachmentsAttributes(
    config: ICapabilitiesElementSettings
  ): void {
    const element = this._botUi.messaging.sendAttachments;
    if (element) {
      this._updateElementState(element, config);
      const types = Array.isArray(config.types) ? config.types : undefined;
      const limit = typeof config.limit === 'number' ? config.limit : undefined;
      this._attachmentManager.updateConfig({ types, limit });
    }
  }

  /**
   * Обработчик события отправки сообщения через форму чата.
   *
   * @description
   * Получает данные сообщения из формы, отправляет их на сервер,
   * и обновляет интерфейс чата.
   *
   * @param {Event} event - Событие отправки формы.
   * @returns {Promise<void>} Промис, который разрешается, когда отправка
   * сообщения завершена.
   *
   * @private
   */
  private async _handleChatFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this._chatForm) return;

    const message = this._getUserMessageFromForm();
    const hasText = message && message.trim().length > 0;

    const { images, videos, audios } = this._attachmentManager.getState();
    const hasFiles =
      images.length > 0 || videos.length > 0 || audios.length > 0;
    const allFiles = [...images, ...videos, ...audios];

    if (hasText || hasFiles) {
      try {
        const response = await this._messageService.submitUserMessage(
          message || '',
          allFiles
        );
        // После отправки показываем последние 10 сообщений для поддержания
        // ленивой подгрузки
        this._loadedMessages = response.slice(-this._messagePerPage);
        this._currentOffset = Math.max(
          0,
          response.length - this._messagePerPage
        );
        this._hasMoreMessages = response.length > this._messagePerPage;
        this._displayMessages(this._loadedMessages);
        this._scrollToBottom(); // Прокручиваем до последнего сообщения
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    // Сброс формы и файлов
    this._chatForm.reset();
    this._attachmentManager.clear();
    this._attachmentManager.renderPreview(
      this._chatAttachmentsPreview as HTMLElement
    );
    if (this._chatAttachmentsPreview) {
      this._chatAttachmentsPreview.classList.add('hidden');
    }
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
   * Обработчик функционала Drag & Drop для загрузки файлов.
   *
   * @description
   * Добавляет обработчики событий dragover, dragenter, dragleave и drop.
   *
   * @private
   */
  private _handleDragAndDrop(): void {
    const dragDropTarget = this._chat || document;

    dragDropTarget.addEventListener('dragover', (event) => {
      this._handleDragOver(event as DragEvent);
    });
    dragDropTarget.addEventListener('dragenter', (event) => {
      this._handleDragEnter(event as DragEvent);
    });
    dragDropTarget.addEventListener('dragleave', (event) => {
      this._handleDragLeave(event as DragEvent);
    });
    dragDropTarget.addEventListener('drop', (event) => {
      this._handleDrop(event as DragEvent);
    });
  }

  /**
   * Обработчик события dragover для чата или документа.
   *
   * @description
   * Предотвращает стандартное поведение браузера и добавляет визуальную индикацию.
   *
   * @param {DragEvent} event - Событие dragover.
   *
   * @private
   */
  private _handleDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this._chat) this._chat.classList.add('drag-over');
  }

  /**
   * Обработчик события dragenter для чата или документа.
   *
   * @description
   * Добавляет визуальную индикацию при входе перетаскиваемого объекта.
   * Использует счётчик для предотвращения мерцания при входе/выходе из дочерних элементов.
   *
   * @param {DragEvent} event - Событие dragenter.
   *
   * @private
   */
  private _handleDragEnter(event: DragEvent): void {
    event.preventDefault();

    this._dragEnterCounter++;
    if (this._chat && this._dragEnterCounter === 1) {
      this._chat.classList.add('drag-over');
    }
  }

  /**
   * Обработчик события dragleave для чата или документа.
   *
   * @description
   * Убирает визуальную индикацию при выходе перетаскиваемого объекта.
   * Использует счётчик для предотвращения мерцания при входе/выходе из дочерних элементов.
   *
   * @param {DragEvent} event - Событие dragleave.
   *
   * @private
   */
  private _handleDragLeave(event: DragEvent): void {
    event.preventDefault();

    this._dragEnterCounter--;
    if (this._chat && this._dragEnterCounter === 0) {
      this._chat.classList.remove('drag-over');
    }
  }

  /**
   * Обработчик события drop для чата или документа.
   *
   * @description
   * Обрабатывает сброс файлов на чат или документ, добавляет их к выбранным файлам,
   * обновляет превью и состояние кнопки отправки.
   *
   * @param {DragEvent} event - Событие drop.
   *
   * @private
   */
  private _handleDrop(event: DragEvent): void {
    event.preventDefault();

    this._dragEnterCounter = 0;
    if (this._chat) this._chat.classList.remove('drag-over');

    // Проверка наличия перетаскиваемых файлов
    if (event.dataTransfer?.files) {
      const files = [...event.dataTransfer.files];
      this._attachmentManager.addFiles(files);
      this._attachmentManager.renderPreview(
        this._chatAttachmentsPreview as HTMLElement
      );
      this._updateSendButtonState();
    }
  }

  /**
   * Обработчик события ввода текста в текстовое поле чата.
   *
   * @private
   */
  private _handleTextareaInput(): void {
    this._updateSendButtonState();
  }

  /**
   * Обработчик события нажатия клавиши в текстовом поле чата.
   *
   * @description
   * Если нажата клавиша Enter и не нажата одновременно клавиша Shift,
   * то отправляет сообщение.
   *
   * @param {KeyboardEvent} event - Событие нажатия клавиши.
   *
   * @private
   */
  private _handleTextareaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this._chatForm && !this._chatSendButton?.disabled) {
        this._chatForm.requestSubmit();
      }
    }
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
   * Получает текст сообщения из формы.
   *
   * @returns {string | undefined}
   * - Текст сообщения
   * - Если форма не определена, возвращает `undefined`
   */
  private _getUserMessageFromForm(): string | undefined {
    if (!this._chatForm) return;

    const formData = new FormData(this._chatForm);
    return formData.get('chat-textarea') as string;
  }

  /**
   * Загружает сообщения с сервера и отображает их.
   *
   * @description
   * 1. Показывает скелетон загрузки.
   * 2. Загружает последние 10 сообщений с сервера.
   * 3. Отображает сообщения в UI чата.
   * 4. Скрывает скелетон загрузки.
   * 5. Прокручивает чат до последнего сообщения.
   *
   * @returns {Promise<void>} Промис, который разрешается, когда загрузка сообщений завершена.
   *
   * @private
   */
  private async _loadMessages(): Promise<void> {
    this._showSkeleton();
    try {
      const messages = await this._messageService.loadMoreMessages(
        0,
        this._messagePerPage
      );

      this._currentOffset = 10;

      this._displayMessages([...messages]);
      this._scrollToBottom(); // Прокручиваем до последнего сообщения
    } catch (error) {
      console.error('Failed to load messages:', error);
      this._displayMessages([]);
    } finally {
      this._hideSkeleton();
    }
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
   * Обработчик события прокрутки чата для ленивой подгрузки сообщений.
   *
   * @description
   * При прокрутке вверх до верхней границы загружает следующие 10 сообщений.
   *
   * @param {Event} event - Событие прокрутки.
   *
   * @private
   */
  private async _handleLazyScroll(event: Event): Promise<void> {
    if (
      this._isLoadingMore ||
      !this._chatFeedWrap ||
      !this._hasMoreMessages ||
      !(event.target instanceof HTMLElement)
    ) {
      return;
    }

    const target = event.target;
    const scrollTop = target.scrollTop;

    // Если прокрутили вверх до верхней границы (с небольшим отступом)
    if (scrollTop > this._scrollThreshold) return;

    this._isLoadingMore = true;

    try {
      const newMessages = await this._messageService.loadMoreMessages(
        this._currentOffset,
        this._messagePerPage
      );

      if (newMessages.length === 0) {
        this._hasMoreMessages = false;
        return;
      }

      // Сохраняем текущую высоту скролла перед добавлением новых сообщений
      const oldScrollHeight = target.scrollHeight;

      // Добавляем новые сообщения в начало массива
      this._currentOffset += this._messagePerPage;
      this._displayMessages([...newMessages, ...this._loadedMessages]);

      // Восстанавливаем позицию прокрутки после добавления новых сообщений
      this._restoreScrollPosition(target, oldScrollHeight, scrollTop);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      this._isLoadingMore = false;
    }
  }

  private _restoreScrollPosition(
    target: HTMLElement,
    oldScrollHeight: number,
    scrollTop: number
  ): void {
    const newScrollHeight = target.scrollHeight;
    target.scrollTop = newScrollHeight - oldScrollHeight + scrollTop;
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
