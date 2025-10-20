import linkifyHtml from 'linkify-html';
import { ICreateElementOptions } from '../shared/interfaces';
import createElement from '../utils/createElementFunction';
import {
  fetchCapabilities,
  fetchMessages,
  sendMessage,
  SERVER_URL,
} from './api/api';
import {
  IBotCapabilities,
  IBotUiStructure,
  ICapabilitiesElementSettings,
  IUserMessageCard,
} from './shared/interfaces';

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
  private readonly _emptyBlock = document.querySelector('.chat__empty-block');
  private readonly _skeleton = document.querySelector('.chat__skeleton');
  private readonly _chat = document.querySelector('.chat');

  // Состояние выбранных файлов по типам
  private _selectedImages: File[] = [];
  private _selectedVideos: File[] = [];
  private _selectedAudios: File[] = [];

  // Счётчик для Drag & Drop, чтобы избежать мерцания при входе/выходе из дочерних элементов
  private _dragEnterCounter: number = 0;

  /**
   * Настройки для функции linkifyHtml.
   *
   * @private
   *
   * @see {@link https://linkify.js.org/docs/options.html} - Документация linkifyHtml
   */
  private readonly _linkifyOptions = {
    className: 'chat__message-link',
    rel: 'noopener noreferrer',
    target: '_blank',
    truncate: 50,
  };

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

    // Обработка Drag & Drop для загрузки файлов
    this._handleDragAndDrop();

    // Обработка изменения состояния файлов
    // Добавляем слушатель для обновления состояния кнопки при изменении файлов
    this._updateSendButtonState();
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
    return await fetchCapabilities();
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
   * @returns {Promise<void>} Промис, который разрешается, когда отправка сообщения завершена.
   *
   * @private
   */
  private async _handleChatFormSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this._chatForm) return;

    const message = this._getUserMessageFromForm();
    const hasText = message && message.trim().length > 0;
    const hasFiles =
      this._selectedImages.length > 0 ||
      this._selectedVideos.length > 0 ||
      this._selectedAudios.length > 0;
    const allFiles = [
      ...this._selectedImages,
      ...this._selectedVideos,
      ...this._selectedAudios,
    ];

    if (hasText || hasFiles) {
      try {
        const response = await sendMessage(message || '', allFiles);
        this._renderMessages(response);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    this._chatForm.reset();
    this._selectedImages = [];
    this._selectedVideos = [];
    this._selectedAudios = [];
    this._renderAttachmentsPreview();
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
        const files = Array.from(target.files);
        this._addFilesToCategories(files);
        this._renderAttachmentsPreview();
        this._updateSendButtonState();
      }
    });

    fileInput.click();
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

    // Сбрасываем счётчик и убираем класс при drop
    this._dragEnterCounter = 0;
    if (this._chat) this._chat.classList.remove('drag-over');

    if (event.dataTransfer?.files) {
      const files = [...event.dataTransfer.files];

      // Получаем настройки из capabilities
      const sendAttachmentsConfig = this._botUi.messaging.sendAttachments;
      // let limit = 1;
      // if (sendAttachmentsConfig) {
      //   const limitAttr = sendAttachmentsConfig.getAttribute('data-limit');
      //   if (limitAttr) limit = parseInt(limitAttr, 10);
      // }

      // Фильтруем файлы по типам, если заданы
      let filteredFiles = files;
      if (sendAttachmentsConfig) {
        const types = sendAttachmentsConfig.getAttribute('data-types');
        if (types) {
          const allowedTypes = JSON.parse(types) as string[];
          filteredFiles = files.filter((file) =>
            allowedTypes.some((type) => file.type.match(type))
          );
        }
      }

      // Добавляем файлы к выбранным, соблюдая лимит
      this._addFilesToCategories(filteredFiles);

      this._renderAttachmentsPreview();
      this._updateSendButtonState();
    }
  }

  /**
   * Добавляет файлы в соответствующие категории на основе их типа.
   *
   * @param {File[]} files - Массив файлов для добавления.
   * @private
   */
  private _addFilesToCategories(files: File[]): void {
    const sendAttachmentsConfig = this._botUi.messaging.sendAttachments;
    let limit = 1;
    if (sendAttachmentsConfig) {
      const limitAttr = sendAttachmentsConfig.getAttribute('data-limit');
      if (limitAttr) limit = parseInt(limitAttr, 10);
    }

    files.forEach((file) => {
      const totalCurrentFiles =
        this._selectedImages.length +
        this._selectedVideos.length +
        this._selectedAudios.length;

      if (totalCurrentFiles >= limit) return;

      if (file.type.startsWith('image/')) {
        this._selectedImages.push(file);
      } else if (file.type.startsWith('video/')) {
        this._selectedVideos.push(file);
      } else if (file.type.startsWith('audio/')) {
        this._selectedAudios.push(file);
      }
    });
  }

  /**
   * Отображает превью выбранных файлов в форме, разделенных по типам.
   *
   * @private
   */
  private _renderAttachmentsPreview(): void {
    if (!this._chatAttachmentsPreview) return;

    this._chatAttachmentsPreview.innerHTML = '';

    const totalFiles =
      this._selectedImages.length +
      this._selectedVideos.length +
      this._selectedAudios.length;

    if (totalFiles === 0) {
      this._chatAttachmentsPreview.classList.add('hidden');
      return;
    }

    this._chatAttachmentsPreview.classList.remove('hidden');

    // Функция для создания превью секции
    const createSection = (files: File[], type: string, icon: string): void => {
      if (files.length === 0) return;

      const section = createElement({
        tag: 'div',
        className: [
          'form-att-prev__section',
          `form-att-prev__section--${type}`,
        ],
        children: [
          {
            tag: 'h5',
            className: 'form-att-prev__section-title',
            children: [
              {
                tag: 'span',
                className: 'material-symbols-outlined',
                text: icon,
              },
              {
                tag: 'span',
                text:
                  type === 'images'
                    ? 'Изображения'
                    : type === 'videos'
                      ? 'Видео'
                      : 'Аудио',
              },
            ],
          },
          {
            tag: 'ul',
            className: 'form-att-prev__list',
            children: files.map((file) => ({
              tag: 'li',
              className: 'form-att-prev__item',
              children: [
                {
                  tag: 'div',
                  className: 'form-att-prev__image-wrapper',
                  children: [
                    type === 'images'
                      ? {
                          tag: 'img',
                          className: 'form-att-prev__image',
                          attrs: {
                            src: URL.createObjectURL(file),
                            alt: file.name,
                          },
                        }
                      : {
                          tag: 'div',
                          className: 'form-att-prev__file-icon',
                          children: [
                            {
                              tag: 'span',
                              className: 'material-symbols-outlined',
                              text:
                                type === 'videos' ? 'videocam' : 'audiotrack',
                            },
                          ],
                        },
                    {
                      tag: 'button',
                      className: 'form-att-prev__remove',
                      children: [
                        {
                          tag: 'span',
                          className: 'material-symbols-outlined',
                          text: 'close',
                        },
                      ],
                    },
                  ],
                },
                {
                  tag: 'span',
                  className: ['form-att-prev__name', 'has-tooltip'],
                  text: file.name,
                  attrs: {
                    'data-tooltip': file.name,
                  },
                },
              ],
            })),
          },
        ],
        parent: this._chatAttachmentsPreview as HTMLElement,
      });

      // Обработчики удаления файлов
      const removeButtons = section.querySelectorAll('.form-att-prev__remove');
      removeButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
          if (type === 'images') {
            this._selectedImages.splice(index, 1);
          } else if (type === 'videos') {
            this._selectedVideos.splice(index, 1);
          } else if (type === 'audios') {
            this._selectedAudios.splice(index, 1);
          }
          this._renderAttachmentsPreview();
          this._updateSendButtonState();
        });
      });
    };

    createSection(this._selectedImages, 'images', 'image');
    createSection(this._selectedVideos, 'videos', 'videocam');
    createSection(this._selectedAudios, 'audios', 'audiotrack');
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
    const hasFiles =
      this._selectedImages.length > 0 ||
      this._selectedVideos.length > 0 ||
      this._selectedAudios.length > 0;

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
   * 2. Загружает сообщения с сервера.
   * 3. Отображает сообщения в UI чата.
   * 4. Скрывает скелетон загрузки.
   *
   * @returns {Promise<void>} Промис, который разрешается, когда загрузка сообщений завершена.
   *
   * @private
   */
  private async _loadMessages(): Promise<void> {
    this._showSkeleton();
    try {
      const messages = await fetchMessages();
      this._renderMessages(messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
      this._renderMessages([]);
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
   * Скрывает скелетон загрузки.
   *
   * @private
   */
  private _hideSkeleton(): void {
    if (!this._skeleton) return;
    this._skeleton.classList.add('hidden');
  }

  /**
   * Отображает массив сообщений в UI чата.
   *
   * @param {IUserMessageCard[]} messages — массив сообщений с сервера.
   *
   * @private
   *
   * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
   * @see {@link createElement} - Функция для создания DOM-элементов
   * @see {@link https://linkify.js.org/} - Библиотека для автоматической обработки ссылок
   */
  private _renderMessages(messages: IUserMessageCard[]): void {
    if (!(this._chatContent instanceof HTMLElement) || !this._chatContent) {
      return;
    }

    // Очищаем содержимое чата
    this._chatContent.replaceChildren();

    if (messages.length === 0) {
      // Если сообщений нет, показываем пустой блок
      if (this._emptyBlock) this._chatContent.append(this._emptyBlock);
      return;
    }

    // Скрываем пустой блок, если он есть
    if (this._emptyBlock && this._emptyBlock instanceof HTMLElement) {
      this._emptyBlock.style.display = 'none';
    }

    const fragment = document.createDocumentFragment();

    for (const msg of messages) {
      const bodyChildren: ICreateElementOptions[] = [];

      // Добавляем текст сообщения только если он присутствует
      if (msg.message?.trim()) {
        bodyChildren.push({
          tag: 'p',
          className: 'chat__message-text',
          html: linkifyHtml(msg.message, this._linkifyOptions),
        });
      }

      // Обработка файлов
      if (msg.files?.length) {
        const imageItems: ICreateElementOptions[] = [];
        const videoItems: ICreateElementOptions[] = [];
        const audioItems: ICreateElementOptions[] = [];

        for (const file of msg.files) {
          const fileUrl = `${SERVER_URL}${file.url}`;

          if (file.mimetype.startsWith('image/')) {
            imageItems.push({
              tag: 'li',
              className: ['chat__message-file', 'chat__message-file--image'],
              children: [
                {
                  tag: 'img',
                  className: ['chat__message-file-img', 'has-tooltip'],
                  attrs: {
                    src: fileUrl,
                    alt: file.originalname,
                    'data-tooltip': file.originalname,
                  },
                },
                {
                  tag: 'div',
                  className: 'chat__message-file-download-wrap',
                  children: [
                    {
                      tag: 'p',
                      className: 'chat__message-file-size',
                      text: String(file.size),
                    },
                    {
                      tag: 'a',
                      className: [
                        'chat__message-file-download-icon',
                        'material-symbols-outlined',
                      ],
                      attrs: { href: fileUrl, download: file.originalname },
                      text: 'download',
                    },
                  ],
                },
              ],
            });
          } else if (file.mimetype.startsWith('video/')) {
            videoItems.push({
              tag: 'li',
              className: 'chat__message-file',
              children: [
                {
                  tag: 'video',
                  className: 'chat__message-video',
                  attrs: { src: fileUrl, controls: 'true' },
                },
              ],
            });
          } else if (file.mimetype.startsWith('audio/')) {
            audioItems.push({
              tag: 'li',
              className: ['chat__message-file', 'chat__message-file--audio'],
              children: [
                {
                  tag: 'div',
                  className: 'chat__message-file-info',
                  children: [
                    {
                      tag: 'p',
                      className: ['chat__message-file-name', 'has-tooltip'],
                      text: file.filename,
                      attrs: {
                        'data-tooltip': 'Название аудиофайла',
                      },
                    },
                    {
                      tag: 'div',
                      className: ['chat__message-file-size', 'has-tooltip'],
                      attrs: {
                        'data-tooltip': 'Размер аудиофайла',
                      },
                      children: [
                        {
                          tag: 'span',
                          className: 'material-symbols-outlined',
                          text: 'play_for_work',
                        },
                        {
                          tag: 'span',
                          text: String(file.size),
                        },
                      ],
                    },
                    {
                      tag: 'a',
                      className: 'chat__message-file-download',
                      attrs: { href: fileUrl, download: file.originalname },
                      children: [
                        {
                          tag: 'span',
                          className: 'material-symbols-outlined',
                          text: 'download',
                        },
                        {
                          tag: 'span',
                          text: 'Скачать',
                        },
                      ],
                    },
                  ],
                },
                {
                  tag: 'audio',
                  className: 'chat__message-audio',
                  attrs: { src: fileUrl, controls: 'true' },
                },
              ],
            });
          }
          // Другие типы файлов (например, PDF, DOC) можно добавить здесь
        }

        // Создаем контейнер для всех секций файлов
        const filesSections: ICreateElementOptions[] = [];

        if (imageItems.length > 0) {
          filesSections.push({
            tag: 'div',
            className: 'chat__message-files-section',
            children: [
              {
                tag: 'h5',
                className: 'chat__message-files-title',
                children: [
                  {
                    tag: 'span',
                    className: 'material-symbols-outlined',
                    text: 'image',
                  },
                  {
                    tag: 'span',
                    text: 'Изображения',
                  },
                ],
              },
              {
                tag: 'ul',
                className: [
                  'chat__message-files',
                  'chat__message-files--images',
                ],
                children: imageItems,
              },
            ],
          });
        }
        if (videoItems.length > 0) {
          filesSections.push({
            tag: 'div',
            className: 'chat__message-files-section',
            children: [
              {
                tag: 'h5',
                className: 'chat__message-files-title',
                children: [
                  {
                    tag: 'span',
                    className: 'material-symbols-outlined',
                    text: 'videocam',
                  },
                  {
                    tag: 'span',
                    text: 'Видео',
                  },
                ],
              },
              {
                tag: 'ul',
                className: [
                  'chat__message-files',
                  'chat__message-files--videos',
                ],
                children: videoItems,
              },
            ],
          });
        }
        if (audioItems.length > 0) {
          filesSections.push({
            tag: 'div',
            className: 'chat__message-files-section',
            children: [
              {
                tag: 'h5',
                className: 'chat__message-files-title',
                children: [
                  {
                    tag: 'span',
                    className: 'material-symbols-outlined',
                    text: 'audiotrack',
                  },
                  {
                    tag: 'span',
                    text: 'Аудио',
                  },
                ],
              },
              {
                tag: 'ul',
                className: [
                  'chat__message-files',
                  'chat__message-files--audios',
                ],
                children: audioItems,
              },
            ],
          });
        }

        // Добавляем общий контейнер для всех секций файлов
        if (filesSections.length > 0) {
          bodyChildren.push({
            tag: 'div',
            className: 'chat__message-files-container',
            children: filesSections,
          });
        }
      }

      // Всегда добавляем временную метку
      bodyChildren.push({
        tag: 'time',
        className: 'chat__message-timestamp',
        text: new Date(msg.timestamp).toLocaleString(),
        attrs: { datetime: msg.timestamp },
      });

      // Создаём элемент сообщения
      const messageItem = createElement({
        tag: 'li',
        className: 'chat__message-item',
        id: msg.id,
        children: [
          {
            tag: 'div',
            className: 'chat__message-body',
            children: bodyChildren,
          },
        ],
      });

      fragment.append(messageItem);
    }

    // Оборачиваем все сообщения в список
    const messagesList = createElement({
      tag: 'ul',
      className: 'chat__messages-list',
    });
    messagesList.append(fragment);
    this._chatContent.append(messagesList);
  }
}
