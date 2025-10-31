// =============================================================================
// Модуль для работы с ленивой загрузкой сообщений в чате
// =============================================================================

import MessageService from '../services/MessageService';
import { ILazyLoaderOptions, IUserMessageCard } from '../shared/interfaces';

/**
 * Тип функции обратного вызова для обработки события прокрутки
 */
export type ScrollHandler = ((event: Event) => void) | null;

/**
 * Класс для реализации ленивой загрузки сообщений при прокрутке контейнера
 *
 * @description
 * Управляет загрузкой дополнительных сообщений при достижении порога прокрутки.
 * Использует MessageService для получения данных и вызывает callback при
 * добавлении новых сообщений.
 *
 * @see {@link MessageService} - Сервис для работы с сообщениями
 * @see {@link ILazyLoaderOptions} - Конфигурационные параметры
 */
export type OnMessagesUpdate = (allMessages: IUserMessageCard[]) => void;

/**
 * Класс для реализации ленивой загрузки сообщений при прокрутке контейнера
 *
 * @description
 * Управляет загрузкой сообщений по мере прокрутки контейнера вверх.
 * Использует MessageService для получения данных и вызывает callback
 * при обновлении сообщений.
 *
 * @see {@link MessageService} - Сервис для работы с сообщениями
 * @see {@link ILazyLoaderOptions} - Конфигурационные параметры
 */

export default class LazyLoader {
  private _messages: IUserMessageCard[] = [];
  private _currentOffset: number = 0;
  private _isLoading: boolean = false;
  private _hasMore: boolean = true;
  private _scrollContainer: HTMLElement;
  private _messageService: MessageService;
  private _onUpdate: OnMessagesUpdate;
  private _scrollHandler: ScrollHandler = null;
  private _scrollButtonVisibilityHandler: ScrollHandler = null;
  private readonly _messagePerPage: number;
  private readonly _scrollThreshold: number;

  /**
   * Создает экземпляр класса LazyLoader
   *
   * @param {HTMLElement} scrollContainer - Контейнер для отслеживания прокрутки
   * @param {MessageService} messageService - Сервис для загрузки сообщений
   * @param {OnMessagesUpdate} onUpdate - Callback для обработки обновленных данных
   * @param {ILazyLoaderOptions} [options={}] - Опции конфигурации
   *
   * @example
   * const loader = new LazyLoader(
   *   chatContainer,
   *   messageService,
   *   (messages) => renderMessages(messages),
   *   { messagePerPage: 20, scrollThreshold: 100 }
   * );
   */
  constructor(
    scrollContainer: HTMLElement,
    messageService: MessageService,
    onUpdate: OnMessagesUpdate,
    options: ILazyLoaderOptions = {}
  ) {
    this._scrollContainer = scrollContainer;
    this._messageService = messageService;
    this._onUpdate = onUpdate;
    this._messagePerPage = options.messagePerPage ?? 10;
    this._scrollThreshold = options.scrollThreshold ?? 50;
  }

  /**
   * Загружает начальную порцию сообщений
   *
   * @description
   * 1. Выполняет запрос к MessageService.loadInitialMessages()
   * 2. Обновляет _messages, _currentOffset и _hasMore
   * 3. Вызывает callback с новыми данными
   *
   * @see {@link MessageService.loadInitialMessages} - Метод для загрузки
   * начальных сообщений
   */
  async loadInitial(): Promise<void> {
    const messages = await this._messageService.loadInitialMessages(
      this._messagePerPage
    );
    this._messages = [...messages];
    this._currentOffset = messages.length;
    this._hasMore = messages.length === this._messagePerPage;
    this._onUpdate(this._messages);
  }

  /**
   * Подгружает сообщения порциями вверх, пока не найдёт сообщение с указанным
   * ID.
   *
   * @param {string} messageId - ID сообщения, до которого нужно подгрузить
   *
   * @return {boolean}
   * - true, если сообщение найдено;
   * - false — если достигнут конец истории.
   */
  async loadUntilMessageId(messageId: string): Promise<boolean> {
    // Проверяем, есть ли уже
    if (this._messages.some((msg) => msg.id === messageId)) return true;

    // Максимальное количество попыток (защита от бесконечного цикла)
    const maxAttempts = 100;
    let attempts = 0;

    while (this._hasMore && attempts < maxAttempts) {
      if (this._isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this._isLoading = true;
      try {
        const newMessages = await this._messageService.loadMoreMessages(
          this._currentOffset,
          this._messagePerPage
        );

        if (newMessages.length === 0) {
          this._hasMore = false;
          break;
        }

        // Добавляем новые сообщения в начало
        this._messages = [...newMessages, ...this._messages];
        this._currentOffset += newMessages.length;

        // Проверяем наличие целевого сообщения
        if (this._messages.some((msg) => msg.id === messageId)) {
          this._onUpdate(this._messages);
          return true;
        }

        // Обновляем UI (например, для индикатора "загрузка...")
        this._onUpdate(this._messages);
      } catch (error) {
        console.error('Error during auto-load for pinned message:', error);
        break;
      } finally {
        this._isLoading = false;
      }

      attempts++;
    }

    return false;
  }

  /**
   * Подключает обработчик события прокрутки
   *
   * @description
   * Добавляет слушатель 'scroll' к контейнеру, который будет
   * вызывать _handleScroll
   */
  attachScrollListener(): void {
    this._scrollHandler = this._handleScroll.bind(this);
    this._scrollButtonVisibilityHandler =
      this._handleScrollButtonVisibility.bind(this);

    this._scrollContainer.addEventListener('scroll', this._scrollHandler);
    this._scrollContainer.addEventListener(
      'scroll',
      this._scrollButtonVisibilityHandler
    );
  }

  /**
   * Отключает обработчик события прокрутки
   *
   * @description
   * Удаляет слушатель 'scroll' из контейнера и сбрасывает ссылку на обработчик
   */
  dispose(): void {
    if (this._scrollHandler) {
      this._scrollContainer.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }

    if (this._scrollButtonVisibilityHandler) {
      this._scrollContainer.removeEventListener(
        'scroll',
        this._scrollButtonVisibilityHandler
      );
      this._scrollButtonVisibilityHandler = null;
    }
  }

  /**
   * Сбрасывает состояние загрузчика
   */
  reset(): void {
    this._currentOffset = this._messages.length;
    this._hasMore = true;
    this._isLoading = false;
  }

  /**
   * Очищает все сообщения и сбрасывает состояние загрузчика
   */
  clear(): void {
    this._messages = [];
    this._currentOffset = 0;
    this._hasMore = true;
    this._isLoading = false;
    this._onUpdate(this._messages);
  }

  /**
   * Возвращает копию массива сообщений
   *
   * @returns {IUserMessageCard[]} Копия массива сообщений
   *
   * @see {@link IUserMessageCard} - Интерфейс сообщения
   */
  getMessages(): IUserMessageCard[] {
    return [...this._messages];
  }

  /**
   * Добавляет новые сообщения в конец списка
   *
   * @param {IUserMessageCard[]} messages - Массив новых сообщений
   *
   * @see {@link IUserMessageCard} - Интерфейс сообщения
   */
  appendNewMessages(messages: IUserMessageCard[]): void {
    this._messages = [...this._messages, ...messages];
    this._currentOffset += messages.length;
    this._onUpdate(this._messages);
  }

  /**
   * Удаляет сообщение по ID
   *
   * @param {string} messageId - ID сообщения для удаления
   *
   * @see {@link IUserMessageCard} - Интерфейс сообщения
   */
  removeMessage(messageId: string): void {
    this._messages = this._messages.filter((msg) => msg.id !== messageId);
    this._onUpdate(this._messages);
  }

  /**
   * Обработчик события прокрутки
   *
   * @param {Event} event - Событие прокрутки
   *
   * @see {@link MessageService.loadMoreMessages} - Метод загрузки сообщений
   */
  private async _handleScroll(event: Event): Promise<void> {
    if (
      this._isLoading ||
      !this._hasMore ||
      !(event.target instanceof HTMLElement)
    ) {
      return;
    }

    const target = event.target;
    if (target.scrollTop > this._scrollThreshold) return;

    this._isLoading = true;
    try {
      const newMessages = await this._messageService.loadMoreMessages(
        this._currentOffset,
        this._messagePerPage
      );

      if (newMessages.length < this._messagePerPage) this._hasMore = false;
      if (newMessages.length === 0) return;

      const oldScrollHeight = target.scrollHeight;
      this._messages = [...newMessages, ...this._messages];
      this._currentOffset += newMessages.length;

      this._onUpdate(this._messages);

      // Восстановление позиции скролла
      const newScrollHeight = target.scrollHeight;
      target.scrollTop = newScrollHeight - oldScrollHeight + target.scrollTop;
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * Обработчик события прокрутки для управления видимостью кнопки скролла
   *
   * @param {Event} event - Событие прокрутки
   */
  private _handleScrollButtonVisibility(event: Event): void {
    if (!(event.target instanceof HTMLElement)) return;
    if (window.updateScrollButtonVisibility) {
      window.updateScrollButtonVisibility();
    }
  }
}
