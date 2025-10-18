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
    document.querySelector('.chat__btn:not(.chat__btn-help)');
  private readonly _chatAttachButton: HTMLButtonElement | null =
    document.querySelector('.chat__btn-attach');
  private readonly _chatAttachmentsPreview: HTMLUListElement | null =
    document.querySelector('.form-attachments-preview');
  private readonly _chatContent = document.querySelector('.chat__content');
  private readonly _emptyBlock = document.querySelector('.chat__empty-block');
  private readonly _skeleton = document.querySelector('.chat__skeleton');

  // Состояние выбранных файлов
  private _selectedFiles: File[] = [];

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
  }

  /**
   * Получает текущие возможности (capabilities) бота с сервера.
   *
   * @returns {Promise<IBotCapabilities>} Объект с описанием поддерживаемых функций бота,
   * разбитый по категориям (ui, messaging, search и т.д.).
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
    if (message) {
      try {
        const response = await sendMessage(message, this._selectedFiles);
        this._renderMessages(response);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    this._chatForm.reset();
    this._selectedFiles = [];
    this._renderAttachmentsPreview();
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
        const limit = parseInt(target.getAttribute('data-limit') || '1', 10);
        this._selectedFiles = files.slice(0, limit);
        this._renderAttachmentsPreview();
      }
    });

    fileInput.click();
  }

  /**
   * Отображает превью выбранных файлов в форме.
   *
   * @private
   */
  private _renderAttachmentsPreview(): void {
    if (!this._chatAttachmentsPreview) return;

    this._chatAttachmentsPreview.innerHTML = '';

    if (this._selectedFiles.length > 0) {
      this._chatAttachmentsPreview.classList.remove('hidden');
    }

    if (this._selectedFiles.length === 0) return;

    const file = this._selectedFiles[0];
    const previewElement = createElement({
      tag: 'li',
      className: 'form-attachment-preview__item',
      children: [
        {
          tag: 'div',
          className: 'form-attachments-preview__image-wrapper',
          children: [
            {
              tag: 'img',
              className: 'form-attachments-preview__image',
              attrs: {
                src: URL.createObjectURL(file),
                alt: file.name,
              },
            },
            {
              tag: 'button',
              className: 'form-attachments-preview__remove',
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
          className: 'form-attachments-preview__name',
          text: file.name,
        },
      ],
      parent: this._chatAttachmentsPreview,
    });

    // Обработчик удаления файла
    const removeButton = previewElement.querySelector(
      '.form-attachments-preview__remove'
    );
    if (removeButton) {
      removeButton.addEventListener('click', () => {
        this._selectedFiles = [];
        this._renderAttachmentsPreview();
        this._chatAttachmentsPreview?.classList.add('hidden');
      });
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
   * Если текст сообщения не пустой, то кнопка активна, иначе — неактивна.
   *
   * @private
   */
  private _updateSendButtonState(): void {
    if (!this._chatSendButton || !this._chatTextarea) return;
    const message = this._chatTextarea.value.trim();
    this._chatSendButton.disabled = message.length === 0;
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

      // Обработка файлов
      if (msg.files?.length) {
        const fileItems: ICreateElementOptions[] = [];

        for (const file of msg.files) {
          const fileUrl = `${SERVER_URL}${file.url}`;

          if (file.mimetype.startsWith('image/')) {
            fileItems.push({
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
            fileItems.push({
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
            fileItems.push({
              tag: 'li',
              className: 'chat__message-file',
              children: [
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

        bodyChildren.push({
          tag: 'ul',
          className: 'chat__message-files',
          children: fileItems,
        });
      }

      // Всегда добавляем текст сообщения и временную метку
      bodyChildren.push(
        {
          tag: 'p',
          className: 'chat__message-text',
          html: linkifyHtml(msg.message, this._linkifyOptions),
        },
        {
          tag: 'time',
          className: 'chat__message-timestamp',
          text: new Date(msg.timestamp).toLocaleString(),
          attrs: { datetime: msg.timestamp },
        }
      );

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
