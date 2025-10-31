// =============================================================================
// Менеджер закрепленных сообщений
// =============================================================================

import MessageService from '../services/MessageService';
import ChatRenderer from '../ui/chat-renderer/ChatRenderer';
import LazyLoader from './LazyLoader';
import NotificationManager from './NotificationManager';

/**
 * Класс для управления закрепленными сообщениями
 *
 * @description
 * Реализует логику:
 * - Закрепления и открепления сообщений
 * - Сохранения состояния в localStorage
 * - Обновления UI закрепленного сообщения
 * - Обновления кнопок закрепления/открепления
 * - Скролла к закрепленному сообщению
 */
export default class PinnedMessageManager {
  // Селекторы для элементов UI
  private readonly _selectors = {
    // Селекторы закрепленного сообщения
    pinnedMessage: '.pinned-message',
    pinnedMessageClose: '.pinned-message__close',
    // Селекторы выпадающего меню
    msgDropdownButtonPin: '.msg-dropdown__button--pin',
    msgDropdownButtonUnpin: '.msg-dropdown__button--unpin',
    chatMessageItem: '.chat__message-item',
    msgDropdown: '.msg-dropdown',
    msgDropdownList: '.msg-dropdown__list',
    pinnedMessageText: '.pinned-message__text',
    msgDropdownIcon: '.msg-dropdown__icon',
    msgDropdownText: '.msg-dropdown__text',
  };

  // Сообщение закрепленного сообщения по умолчанию
  private readonly _pinnedDefaultMessage = 'Закрепленное сообщение';

  // Сообщения для уведомлений
  private readonly _notificationMessages = {
    pinned: 'Сообщение закреплено',
    unpinned: 'Сообщение откреплено',
  };

  // Состояние закрепленного сообщения
  private _pinnedMessageId!: string | null;
  private readonly _pinnedMessageKey = 'keeply_pinned_message';
  private _pinClickHandler!: ((e: Event) => void) | null;

  // Зависимости
  private _lazyLoader!: LazyLoader | null;
  private _renderer!: ChatRenderer | null;
  private _chatContent!: HTMLElement | null;
  private _chatFeedWrap!: HTMLElement | null;
  private _notificationManager!: NotificationManager | null;
  private _messageService!: MessageService | null;

  /**
   * Создает экземпляр PinnedMessageManager
   */
  constructor() {
    this._loadPinnedMessageFromStorage();
  }

  /**
   * Устанавливает зависимости для работы менеджера
   *
   * @param {LazyLoader} lazyLoader - LazyLoader для работы с сообщениями
   * @param {ChatRenderer} renderer - ChatRenderer для обновления UI
   * @param {HTMLElement} chatContent - Элемент контента чата для обработки
   * событий
   * @param {HTMLElement} chatFeedWrap - Элемент обертки ленты чата для скролла
   * @param {NotificationManager} notificationManager - NotificationManager для
   * показа уведомлений
   */
  setDependencies(
    lazyLoader: LazyLoader,
    renderer: ChatRenderer,
    chatContent: HTMLElement,
    chatFeedWrap: HTMLElement,
    notificationManager: NotificationManager,
    messageService: MessageService
  ): void {
    this._lazyLoader = lazyLoader;
    this._renderer = renderer;
    this._chatContent = chatContent;
    this._chatFeedWrap = chatFeedWrap;
    this._notificationManager = notificationManager;
    this._messageService = messageService;
  }

  /**
   * Инициализирует обработчики событий для закрепленных сообщений
   */
  initPinnedMessageHandler(): void {
    const pinnedBlock = document.querySelector(this._selectors.pinnedMessage);
    if (!pinnedBlock) return;

    // Обработчик клика по блоку закрепленного сообщения
    pinnedBlock.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest(this._selectors.pinnedMessageClose)) {
        this.setPinnedMessage(null);
      }
      void this.scrollToPinnedMessage();
    });
  }

  /**
   * Инициализирует обработчики для кнопок закрепления/открепления в dropdown
   * меню
   */
  initPinButtonHandlers(): void {
    if (!this._chatContent) return;

    // Удаляем предыдущий обработчик, чтобы избежать дублирования
    if (this._pinClickHandler) {
      this._chatContent.removeEventListener('click', this._pinClickHandler);
    }

    this._pinClickHandler = (e): void => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const pinButton = target.closest(this._selectors.msgDropdownButtonPin);
      const unpinButton = target.closest(
        this._selectors.msgDropdownButtonUnpin
      );

      if (!pinButton && !unpinButton) return;

      e.preventDefault();

      const messageElement = target.closest(this._selectors.chatMessageItem);
      if (!(messageElement instanceof HTMLElement)) return;

      const messageId = messageElement.id;
      if (!messageId) return;

      if (pinButton) {
        this.setPinnedMessage(messageId);
        this._showNotification(this._notificationMessages.pinned);
      } else if (unpinButton) {
        this.setPinnedMessage(null);
        this._showNotification(this._notificationMessages.unpinned);
      }

      // Закрываем dropdown после действия
      const dropdown = target.closest(this._selectors.msgDropdown);
      const list = dropdown?.querySelector(this._selectors.msgDropdownList);
      if (list) list.classList.add('hidden');
    };

    this._chatContent.addEventListener('click', this._pinClickHandler);
  }

  /**
   * Установка закрепленного сообщения
   *
   * @param {string | null} messageId - ID закрепленного сообщения
   */
  setPinnedMessage(messageId: string | null): void {
    this._pinnedMessageId = messageId;
    this._savePinnedMessageToStorage();
    this.updatePinnedMessageUI();
    this.updatePinButtonsUI(messageId);
  }

  /**
   * Получение ID закрепленного сообщения
   */
  getPinnedMessageId(): string | null {
    return this._pinnedMessageId;
  }

  /**
   * Скролл к закрепленному сообщению с автоматической подгрузкой,
   * если оно ещё не загружено
   */
  async scrollToPinnedMessage(): Promise<void> {
    if (!this._pinnedMessageId || !this._lazyLoader || !this._renderer) return;

    // 1. Гарантируем, что сообщение загружено
    const isFound = await this._lazyLoader.loadUntilMessageId(
      this._pinnedMessageId
    );
    if (!isFound) {
      this._showNotification('Сообщение не найдено');
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    // 2. Даем браузеру время на рендер нового DOM
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 3. Находим элемент и выполняем прокрутку
    const messageElement = document.getElementById(this._pinnedMessageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this._highlightMessageTemporarily(messageElement);
    } else {
      console.warn('Message element not found in DOM after loading');
      this._showNotification('Не удалось прокрутить к сообщению');
    }
  }

  /**
   * Обновляет рендер сообщений с учетом закрепленного сообщения
   *
   * @param {Function} initDownloadHandlers - Функция для инициализации
   * обработчиков загрузки
   */
  updateRendererWithPinnedMessage(
    initDownloadHandlers: (fragment: DocumentFragment) => void
  ): void {
    if (!this._renderer || !this._lazyLoader) return;

    this._renderer.render(this._lazyLoader.getMessages(), {
      pinnedMessageId: this._pinnedMessageId,
      initDownloadHandlers: initDownloadHandlers,
    });
    this.updatePinnedMessageUI();
    this.updatePinButtonsUI(this._pinnedMessageId);
  }

  /**
   * Обновление UI закрепленного сообщения
   */
  updatePinnedMessageUI(): void {
    const pinnedBlock = document.querySelector(this._selectors.pinnedMessage);
    if (!(pinnedBlock instanceof HTMLElement)) return;

    if (!this._pinnedMessageId) {
      pinnedBlock.classList.add('hidden');
      return;
    }

    pinnedBlock.classList.remove('hidden');

    const messages = this._lazyLoader?.getMessages() || [];
    const pinnedMessage = messages.find((msg) => {
      return msg.id === this._pinnedMessageId;
    });
    if (!pinnedMessage) return;

    const textElement = pinnedBlock.querySelector(
      this._selectors.pinnedMessageText
    );
    if (textElement) textElement.textContent = this._pinnedDefaultMessage;
  }

  /**
   * Обновление UI кнопок закрепления/открепления для всех сообщений
   *
   * @param {string | null} pinnedMessageId - ID закрепленного сообщения
   */
  updatePinButtonsUI(pinnedMessageId: string | null): void {
    const messageItems = document.querySelectorAll<HTMLElement>(
      this._selectors.chatMessageItem
    );

    messageItems.forEach((messageItem) => {
      const messageId = messageItem.id;
      if (!messageId) return;

      const button = messageItem.querySelector<HTMLElement>(
        `${this._selectors.msgDropdownButtonPin}, ${this._selectors.msgDropdownButtonUnpin}`
      );
      if (!button) return;

      const isPinned = messageId === pinnedMessageId;

      // Сброс классов
      button.classList.remove(
        this._selectors.msgDropdownButtonPin.slice(1),
        this._selectors.msgDropdownButtonUnpin.slice(1)
      );
      // Установка нужного класса
      button.classList.add(
        isPinned
          ? this._selectors.msgDropdownButtonUnpin.slice(1)
          : this._selectors.msgDropdownButtonPin.slice(1)
      );

      const icon = button.querySelector(this._selectors.msgDropdownIcon);
      const text = button.querySelector(this._selectors.msgDropdownText);

      if (icon) icon.textContent = isPinned ? 'keep_off' : 'keep';
      if (text) text.textContent = isPinned ? 'Открепить' : 'Закрепить';
    });
  }

  /**
   * Отображение уведомления
   *
   * @param {string} message - Текст уведомления
   *
   * @see {@link NotificationManager} - Менеджер уведомлений
   */
  private _showNotification(message: string): void {
    this._notificationManager?.show({
      message,
      type: 'info',
      duration: 2500,
      position: 'bottom-center',
    });
  }

  /**
   * Показывает выделение сообщения после плавного перемещения к нему с помощью
   * клика по закрепленному сообщению.
   *
   * @param {HTMLElement} messageElement - Элемент сообщения
   */
  private _highlightMessageTemporarily(messageElement: HTMLElement): void {
    const highlightElement = 'chat__message-body';
    const messageBody = messageElement.querySelector(`.${highlightElement}`);
    if (!(messageBody instanceof HTMLElement)) return;

    const highlightClass = `${highlightElement}--highlighted`;

    // Добавляем временную подцветку
    messageBody.classList.add(highlightClass);

    // Убираем подцветку через 2 секунды
    setTimeout(() => messageBody.classList.remove(highlightClass), 2000);
  }

  /**
   * Загрузка закрепленного сообщения из localStorage
   */
  private _loadPinnedMessageFromStorage(): void {
    try {
      const stored = localStorage.getItem(this._pinnedMessageKey);
      if (stored) this._pinnedMessageId = stored;
    } catch (error) {
      console.warn('Failed to load pinned message from localStorage:', error);
    }
  }

  /**
   * Сохранение закрепленного сообщения в localStorage
   */
  private _savePinnedMessageToStorage(): void {
    try {
      if (this._pinnedMessageId) {
        localStorage.setItem(this._pinnedMessageKey, this._pinnedMessageId);
      } else {
        localStorage.removeItem(this._pinnedMessageKey);
      }
    } catch (error) {
      console.warn('Failed to save pinned message to localStorage:', error);
    }
  }
}
