import linkifyHtml from 'linkify-html';
import createElement from '../utils/createElementFunction';
import { fetchCapabilities, fetchMessages, sendMessage } from './api/api';
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
  private readonly _chatContent = document.querySelector('.chat__content');
  private readonly _emptyBlock = document.querySelector('.chat__empty-block');
  private readonly _skeleton = document.querySelector('.chat__skeleton');

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
        const response = await sendMessage(message);
        this._renderMessages(response);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }

    this._chatForm.reset();
    this._updateSendButtonState();
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
    this._chatContent.innerHTML = '';

    if (messages.length === 0) {
      // Если сообщений нет, показываем пустой блок
      if (this._emptyBlock) this._chatContent.append(this._emptyBlock);
      return;
    }

    // Скрываем пустой блок, если он есть
    if (this._emptyBlock && this._emptyBlock instanceof HTMLElement) {
      this._emptyBlock.style.display = 'none';
    }

    const messagesList = createElement({
      tag: 'ul',
      className: 'chat__messages-list',
      parent: this._chatContent as HTMLElement,
    });

    // Создаём элементы для каждого сообщения
    messages.forEach((msg) => {
      return createElement({
        tag: 'li',
        className: 'chat__message-item',
        id: msg.id,
        children: [
          {
            tag: 'div',
            className: 'chat__message-body',
            children: [
              {
                tag: 'p',
                className: 'chat__message-text',
                html: linkifyHtml(msg.message, this._linkifyOptions),
              },
              {
                tag: 'time',
                className: 'chat__message-timestamp',
                text: new Date(msg.timestamp).toLocaleString(),
                attrs: {
                  datetime: new Date(msg.timestamp).toISOString(),
                },
              },
            ],
          },
        ],
        parent: messagesList,
      });
    });
  }
}
