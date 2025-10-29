// =============================================================================
// Менеджер закрепленных сообщений
// =============================================================================

import ChatRenderer from '../ui/chat-renderer/ChatRenderer';
import LazyLoader from './LazyLoader';

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
  // Состояние закрепленного сообщения
  private _pinnedMessageId!: string | null;
  private readonly _pinnedMessageKey = 'keeply_pinned_message';

  // Зависимости
  private _lazyLoader!: LazyLoader | null;
  private _renderer!: ChatRenderer | null;
  private _chatContent!: HTMLElement | null;
  private _chatFeedWrap!: HTMLElement | null;

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
   */
  setDependencies(
    lazyLoader: LazyLoader,
    renderer: ChatRenderer,
    chatContent: HTMLElement,
    chatFeedWrap: HTMLElement
  ): void {
    this._lazyLoader = lazyLoader;
    this._renderer = renderer;
    this._chatContent = chatContent;
    this._chatFeedWrap = chatFeedWrap;
  }

  /**
   * Инициализирует обработчики событий для закрепленных сообщений
   */
  initPinnedMessageHandler(): void {
    const pinnedBlock = document.querySelector('.pinned-message');
    if (!pinnedBlock) return;

    // Обработчик клика по блоку закрепленного сообщения
    pinnedBlock.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('.pinned-message__close')) {
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

    // ОБРАБОТЧИК клика по кнопкам закрепления/открепления
    this._chatContent.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
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
        this.setPinnedMessage(messageId);
      } else if (target.closest('.msg-dropdown__button--unpin')) {
        // Открепить сообщение
        this.setPinnedMessage(null);
      }

      // Закрываем dropdown после действия
      const dropdown = target.closest('.msg-dropdown');
      const list = dropdown?.querySelector('.msg-dropdown__list');
      if (list) list.classList.add('hidden');
    });
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
    PinnedMessageManager.updatePinButtonsUI(messageId);
  }

  /**
   * Получение ID закрепленного сообщения
   */
  getPinnedMessage(): string | null {
    return this._pinnedMessageId;
  }

  /**
   * Обновление UI закрепленного сообщения
   */
  updatePinnedMessageUI(): void {
    const pinnedBlock = document.querySelector('.pinned-message');
    if (!(pinnedBlock instanceof HTMLElement)) return;

    if (this._pinnedMessageId) {
      pinnedBlock.classList.remove('hidden');
      // Найти сообщение в данных и обновить текст
      const messages = this._lazyLoader?.getMessages() || [];
      const pinnedMessage = messages.find((msg) => {
        return msg.id === this._pinnedMessageId;
      });
      const textElement = pinnedBlock.querySelector('.pinned-message__text');
      if (textElement && pinnedMessage) {
        textElement.textContent = 'Закрепленное сообщение';
      }
    } else {
      pinnedBlock.classList.add('hidden');
    }
  }

  /**
   * Скролл к закрепленному сообщению
   */
  async scrollToPinnedMessage(): Promise<void> {
    if (!this._pinnedMessageId) return;
    const messageElement = document.getElementById(this._pinnedMessageId);
    messageElement?.scrollIntoView({ behavior: 'smooth' });
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

    this._renderer.render(
      this._lazyLoader.getMessages(),
      initDownloadHandlers,
      this._pinnedMessageId
    );
    this.updatePinnedMessageUI();
    PinnedMessageManager.updatePinButtonsUI(this._pinnedMessageId);
  }

  /**
   * Обновление UI кнопок закрепления/открепления для всех сообщений
   *
   * @param {string | null} pinnedMessageId - ID закрепленного сообщения
   */
  static updatePinButtonsUI(pinnedMessageId: string | null): void {
    // Обновляем классы для всех кнопок закрепления
    const pinButtons = document.querySelectorAll('.msg-dropdown__button--pin');
    const unpinButtons = document.querySelectorAll(
      '.msg-dropdown__button--unpin'
    );

    pinButtons.forEach((button) => {
      const messageElement = button.closest('.chat__message-item');
      if (messageElement) {
        const messageId = messageElement.id;
        if (messageId === pinnedMessageId) {
          // Если сообщение закреплено, меняем класс на unpin
          button.classList.remove('msg-dropdown__button--pin');
          button.classList.add('msg-dropdown__button--unpin');
          const icon = button.querySelector('.msg-dropdown__icon');
          const text = button.querySelector('.msg-dropdown__text');
          if (icon) icon.textContent = 'keep_off';
          if (text) text.textContent = 'Открепить';
        } else {
          // Если не закреплено, оставляем pin
          button.classList.add('msg-dropdown__button--pin');
          button.classList.remove('msg-dropdown__button--unpin');
          const icon = button.querySelector('.msg-dropdown__icon');
          const text = button.querySelector('.msg-dropdown__text');
          if (icon) icon.textContent = 'keep';
          if (text) text.textContent = 'Закрепить';
        }
      }
    });

    unpinButtons.forEach((button) => {
      const messageElement = button.closest('.chat__message-item');
      if (messageElement) {
        const messageId = messageElement.id;
        if (messageId !== pinnedMessageId) {
          // Если сообщение не закреплено, меняем класс на pin
          button.classList.remove('msg-dropdown__button--unpin');
          button.classList.add('msg-dropdown__button--pin');
          const icon = button.querySelector('.msg-dropdown__icon');
          const text = button.querySelector('.msg-dropdown__text');
          if (icon) icon.textContent = 'keep';
          if (text) text.textContent = 'Закрепить';
        }
      }
    });
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
