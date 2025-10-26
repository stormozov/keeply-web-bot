// =============================================================================
// Модуль для управления всплывающими уведомлениями
// =============================================================================

import createElement from '../../../utils/createElementFunction';

/**
 * Типы уведомлений
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Позиции отображения уведомлений
 */
export type NotificationPosition = 'top-left' | 'top-right' | 'bottom-center';

/**
 * Таймауты уведомлений
 */
export type NotificationTimeouts = Map<HTMLElement, INotificationTimeout>;

/**
 * Интерфейс для конфигурации уведомления
 */
export interface INotificationConfig {
  message: string;
  type: NotificationType;
  duration?: number; // в миллисекундах, по умолчанию 3000
  position?: NotificationPosition; // позиция отображения, по умолчанию 'top-left'
}

/**
 * Интерфейс для данных таймаута уведомления
 */
interface INotificationTimeout {
  timeoutId: ReturnType<typeof setTimeout>;
  animationId?: number;
  startTime: number;
  duration: number;
  remaining?: number;
  position: NotificationPosition;
}

/**
 * Класс для управления всплывающими уведомлениями
 *
 * @description
 * Реализует:
 * - Показ уведомлений с автоматическим скрытием
 * - Очередь уведомлений
 * - Разные типы уведомлений (success, error, info, warning)
 * - Анимации появления и исчезновения
 */
export default class NotificationManager {
  // Контейнеры
  private _containers: Map<NotificationPosition, HTMLElement> = new Map();
  private _queues: Map<NotificationPosition, INotificationConfig[]> = new Map();
  private _isShowing: Map<NotificationPosition, boolean> = new Map();
  private _notificationTimeouts: NotificationTimeouts = new Map();

  // Классы уведомлений
  private _visibleClass = 'notification--visible';

  /**
   * Создает экземпляр NotificationManager
   */
  constructor() {
    this._createContainers();
  }

  /**
   * Создает контейнеры для всех позиций уведомлений
   *
   * @see {@link createElement} - Функция создания HTML-элемента
   */
  private _createContainers(): void {
    const positions: NotificationPosition[] = [
      'top-left',
      'top-right',
      'bottom-center',
    ];

    positions.forEach((position) => {
      const container = createElement({
        tag: 'div',
        className: [
          'notifications-container',
          `notifications-container--${position}`,
        ],
      });

      this._containers.set(position, container);
      this._queues.set(position, []);
      this._isShowing.set(position, false);
    });
  }

  /**
   * Показывает уведомление
   *
   * @param {INotificationConfig} config - Конфигурация уведомления
   */
  show(config: INotificationConfig): void {
    const position = config.position || 'top-right';
    const queue = this._queues.get(position);
    queue?.push(config);
    this._processQueue(position);
  }

  /**
   * Обрабатывает очередь уведомлений для указанной позиции
   *
   * @param {NotificationPosition} position - Позиция уведомлений
   * @private
   */
  private _processQueue(position: NotificationPosition): void {
    const isShowing = this._isShowing.get(position);
    const queue = this._queues.get(position);

    if (isShowing || queue?.length === 0) return;

    this._isShowing.set(position, true);
    const config = queue?.shift();
    this._showNotification(config || ({} as INotificationConfig), position);
  }

  /**
   * Создает и показывает уведомление
   *
   * @param {INotificationConfig} config - Конфигурация уведомления
   * @param {NotificationPosition} position - Позиция уведомления
   *
   * @see {@link createElement} - Функция создания HTML-элемента
   */
  private _showNotification(
    config: INotificationConfig,
    position: NotificationPosition
  ): void {
    const container = this._containers.get(position);
    if (!container) return;

    if (!container.parentNode) {
      document.getElementById('App')?.append(container);
    }

    const notification = createElement({
      tag: 'div',
      className: ['notification', `notification--${config.type}`],
      children: [
        {
          tag: 'span',
          className: 'notification__icon',
          text: this._getIcon(config.type),
        },
        {
          tag: 'span',
          className: 'notification__message',
          text: config.message,
        },
        {
          tag: 'button',
          className: ['notification__close', 'material-symbols-outlined'],
          text: 'close',
          attrs: { 'aria-label': 'Закрыть уведомление' },
        },
      ],
    });

    // Добавляем уведомление в контейнер
    container.append(notification);

    // Анимация появления
    setTimeout(() => notification.classList.add(this._visibleClass), 10);

    // Обработчик закрытия по кнопке
    const closeButton = notification.querySelector(
      '.notification__close'
    ) as HTMLElement;
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this._hideNotification(notification, position);
      });
    }

    // Автоматическое скрытие
    const duration = config.duration || 3000;
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      if (!notification.parentNode) return;
      this._hideNotification(notification, position);
    }, duration);

    // Сохраняем данные таймаута
    const timeoutData = {
      timeoutId,
      startTime,
      duration,
      position,
    };
    this._notificationTimeouts.set(notification, timeoutData);

    // Запускаем анимацию индикатора прогресса
    if (closeButton) this._animateProgress(closeButton, duration, timeoutData);

    // Обработчики наведения мыши
    notification.addEventListener('mouseenter', () => {
      const timeoutData = this._notificationTimeouts.get(notification);
      if (!timeoutData) return;

      clearTimeout(timeoutData.timeoutId);

      // Остановить анимацию индикатора
      if (timeoutData.animationId) {
        cancelAnimationFrame(timeoutData.animationId);
        timeoutData.animationId = undefined;
      }

      const elapsed = Date.now() - timeoutData.startTime;
      timeoutData.remaining = timeoutData.duration - elapsed;
      this._notificationTimeouts.set(notification, timeoutData);

      // Сохранить текущий прогресс (не сбрасывать)
      if (closeButton) {
        const currentProgress = Math.min(elapsed / timeoutData.duration, 1);
        closeButton.style.setProperty('--progress', currentProgress.toString());
      }
    });

    notification.addEventListener('mouseleave', () => {
      const timeoutData = this._notificationTimeouts.get(notification);
      if (!timeoutData?.remaining) return;

      const newTimeoutId = setTimeout(() => {
        if (!notification.parentNode) return;
        this._hideNotification(notification, position);
      }, timeoutData.remaining);

      timeoutData.timeoutId = newTimeoutId;
      this._notificationTimeouts.set(notification, timeoutData);

      // Возобновить анимацию индикатора
      if (closeButton && timeoutData.remaining) {
        this._animateProgress(closeButton, timeoutData.remaining, timeoutData);
      }
    });
  }

  /**
   * Скрывает уведомление
   *
   * @param {HTMLElement} notification - Элемент уведомления
   * @param {NotificationPosition} position - Позиция уведомления
   * @private
   */
  private _hideNotification(
    notification: HTMLElement,
    position: NotificationPosition
  ): void {
    notification.classList.remove(this._visibleClass);

    // Очищаем таймаут при скрытии уведомления
    const timeoutData = this._notificationTimeouts.get(notification);
    if (timeoutData) {
      clearTimeout(timeoutData.timeoutId);
      this._notificationTimeouts.delete(notification);
    }

    setTimeout(() => {
      if (notification.parentNode) notification.remove();
      this._isShowing.set(position, false);
      this._processQueue(position);

      const container = this._containers.get(position);
      if (
        container &&
        container.children.length === 0 &&
        !this._isShowing.get(position) &&
        this._queues.get(position)?.length === 0
      ) {
        container.remove();
      }
    }, 300);
  }

  /**
   * Возвращает иконку для типа уведомления
   *
   * @param {NotificationType} type - Тип уведомления
   * @returns {string} Иконка Material Symbols
   */
  private _getIcon(type: NotificationType): string {
    const icons = {
      success: 'check_circle',
      error: 'error',
      info: 'info',
      warning: 'warning',
    };
    return icons[type];
  }

  /**
   * Анимирует прогресс индикатора закрытия
   *
   * @param {HTMLElement} closeButton - Кнопка закрытия
   * @param {number} duration - Длительность анимации в миллисекундах
   * @param {INotificationTimeout} timeoutData - Данные таймаута
   * @private
   */
  private _animateProgress(
    closeButton: HTMLElement,
    duration: number,
    timeoutData: INotificationTimeout
  ): void {
    const startTime = Date.now();

    const animate = (): void => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      closeButton.style.setProperty('--progress', progress.toString());

      if (progress < 1) {
        timeoutData.animationId = requestAnimationFrame(animate);
        this._notificationTimeouts.set(
          closeButton.closest('.notification') as HTMLElement,
          timeoutData
        );
      } else {
        timeoutData.animationId = undefined;
        this._notificationTimeouts.set(
          closeButton.closest('.notification') as HTMLElement,
          timeoutData
        );
      }
    };

    timeoutData.animationId = requestAnimationFrame(animate);
    this._notificationTimeouts.set(
      closeButton.closest('.notification') as HTMLElement,
      timeoutData
    );
  }

  /**
   * Уничтожает менеджер уведомлений
   */
  destroy(): void {
    this._containers.forEach((container) => container.remove());
    this._containers.clear();
    this._queues.clear();
    this._isShowing.clear();
    this._notificationTimeouts.forEach((timeoutData) => {
      clearTimeout(timeoutData.timeoutId);
      if (timeoutData.animationId) {
        cancelAnimationFrame(timeoutData.animationId);
      }
    });
    this._notificationTimeouts.clear();
  }
}
