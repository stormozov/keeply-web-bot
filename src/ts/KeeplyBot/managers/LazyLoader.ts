// =============================================================================
// Модуль для работы с ленивой загрузкой сообщений в чате
// =============================================================================

import MessageService from '../services/MessageService';
import { ILazyLoaderOptions, IUserMessageCard } from '../shared/interfaces';

/**
 * Тип функции обратного вызова для обработки загруженных сообщений
 */
export type OnLoadCallback = (newMessages: IUserMessageCard[]) => void;

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
export default class LazyLoader {
  private _currentOffset: number = 0;
  private _isLoading: boolean = false;
  private _hasMore: boolean = true;
  private _scrollContainer: HTMLElement;
  private _messageService: MessageService;
  private _onLoadCallback: OnLoadCallback;
  private _scrollHandler!: ScrollHandler;
  private readonly _messagePerPage: number;
  private readonly _scrollThreshold: number;

  /**
   * Создает экземпляр класса менеджера LazyLoader
   *
   * @param {HTMLElement} scrollContainer - Контейнер для отслеживания прокрутки
   * @param {MessageService} messageService - Сервис для загрузки сообщений
   * @param {OnLoadCallback} onLoadCallback - Callback для обработки новых данных
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
    onLoadCallback: OnLoadCallback,
    options: ILazyLoaderOptions = {}
  ) {
    this._scrollContainer = scrollContainer;
    this._messageService = messageService;
    this._onLoadCallback = onLoadCallback;
    this._messagePerPage = options.messagePerPage ?? 10;
    this._scrollThreshold = options.scrollThreshold ?? 50;

    // Первая порция сообщений уже загружена
    this._currentOffset = this._messagePerPage;
  }

  /**
   * Подключает обработчик события прокрутки
   */
  attachScrollListener(): void {
    // Сохраняем ссылку на обработчик, чтобы потом отписаться
    this._scrollHandler = this._handleScroll.bind(this);
    this._scrollContainer.addEventListener('scroll', this._scrollHandler);
  }

  /**
   * Освобождает ресурсы, связанные с обработкой событий прокрутки
   *
   * @description
   * 1. Проверяет существование обработчика прокрутки
   * 2. Удаляет обработчик события 'scroll' из контейнера
   * 3. Сбрасывает ссылку на обработчик, чтобы предотвратить утечку памяти
   */
  dispose(): void {
    if (!this._scrollHandler) return;
    this._scrollContainer.removeEventListener('scroll', this._scrollHandler);
    this._scrollHandler = null;
  }

  /**
   * Сбрасывает состояние загрузчика
   *
   * @param {number} [offset=this._messagePerPage] - Начальное смещение
   * @description
   * Восстанавливает начальные значения:
   * - _currentOffset = offset
   * - _hasMore = true
   * - _isLoading = false
   *
   * @example
   * // Сброс с дефолтным смещением на основе актуального this._messagePerPage
   * loader.reset();
   * loader.reset(30); // Сброс с пользовательским смещением
   */
  reset(offset: number = this._messagePerPage): void {
    this._currentOffset = offset;
    this._hasMore = true;
    this._isLoading = false;
  }

  /**
   * Обработчик события прокрутки
   *
   * @param {Event} event - Событие прокрутки
   *
   * @description
   * 1. Проверяет условия для начала загрузки:
   *    - Не выполняется текущая загрузка
   *    - Есть доступные сообщения
   *    - Цель события - HTMLElement
   * 2. Если достигнут порог прокрутки (scrollTop < threshold):
   *    - Загружает новые сообщения через MessageService
   *    - Обновляет смещение
   *    - Вызывает callback с новыми данными
   *    - Восстанавливает позицию скролла
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
    const scrollTop = target.scrollTop;

    // Активируем загрузку только если прокрутили близко к верху
    if (scrollTop > this._scrollThreshold) return;

    this._isLoading = true;

    try {
      const newMessages = await this._messageService.loadMoreMessages(
        this._currentOffset,
        this._messagePerPage
      );

      if (newMessages.length === 0) {
        this._hasMore = false;
        return;
      }

      const oldScrollHeight = target.scrollHeight;

      // Обновляем смещение для следующей загрузки
      this._currentOffset += this._messagePerPage;

      // Передаем новые сообщения в callback
      this._onLoadCallback(newMessages);

      // Сохраняем позицию прокрутки после добавления новых сообщений
      this._restoreScrollPosition(target, oldScrollHeight, scrollTop);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      this._isLoading = false;
    }
  }

  /**
   * Восстанавливает позицию прокрутки после добавления новых сообщений
   *
   * @param {HTMLElement} target - Контейнер прокрутки
   * @param {number} oldScrollHeight - Ранняя высота контейнера
   * @param {number} scrollTop - Текущая позиция прокрутки
   *
   * @description
   * Рассчитывает новую позицию прокрутки, чтобы сохранить видимость тех же
   * сообщений после добавления новых данных в начало контейнера.
   */
  private _restoreScrollPosition(
    target: HTMLElement,
    oldScrollHeight: number,
    scrollTop: number
  ): void {
    const newScrollHeight = target.scrollHeight;
    target.scrollTop = newScrollHeight - oldScrollHeight + scrollTop;
  }
}
