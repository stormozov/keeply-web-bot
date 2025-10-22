// =============================================================================
// Модуль для работы с Capabilities
// =============================================================================

import MessageService from '../services/MessageService';
import {
  IBotCapabilities,
  IBotUiStructure,
  ICapabilitiesElementSettings,
} from '../shared/interfaces';

/**
 * Менеджер для управления возможностями бота (capabilities)
 *
 * @description
 * Обрабатывает:
 * - Загрузку конфигурации возможностей с сервера
 * - Применение ограничений и настроек к элементам интерфейса
 * - Получение специфичных конфигураций для вложений
 *
 * @see {@link MessageService} - Сервис для работы с сообщениями
 * @see {@link IBotCapabilities} - Интерфейс конфигурации возможностей
 */
export class CapabilitiesManager {
  private _capabilities: IBotCapabilities = {} as IBotCapabilities;
  private _messageService: MessageService;

  /**
   * Создает экземпляр менеджера возможностей
   *
   * @param {MessageService} messageService - Сервис для работы с сообщениями
   */
  constructor(messageService: MessageService) {
    this._messageService = messageService;
  }

  /**
   * Загружает конфигурацию возможностей бота с сервера
   *
   * @returns {Promise<IBotCapabilities>} Промис, разрешающийся в объект
   * возможностей
   *
   * @description
   * 1. Выполняет запрос к MessageService.loadCapabilities()
   * 2. Сохраняет полученные данные в _capabilities
   * 3. Возвращает те же данные для внешнего использования
   *
   * @see {@link IBotCapabilities} - Структура возвращаемых данных
   */
  async loadCapabilities(): Promise<IBotCapabilities> {
    this._capabilities = await this._messageService.loadCapabilities();
    return this._capabilities;
  }

  /**
   * Применяет настройки возможностей к структуре UI
   *
   * @param {IBotUiStructure} botUi - Структура элементов интерфейса
   *
   * @description
   * 1. Проходит по всем категориям (messaging, search, ui)
   * 2. Для каждого элемента интерфейса:
   *    - Отключает/включает элемент в зависимости от availableState
   *    - Добавляет/удаляет подсказки (tooltip)
   *    - Устанавливает лимиты и фильтры типов файлов
   */
  applyToUi(botUi: IBotUiStructure): void {
    for (const category in botUi) {
      const uiCategory = botUi[category];
      const capCategory =
        this._capabilities[category as keyof IBotCapabilities];
      if (!capCategory || typeof capCategory !== 'object') continue;

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
   * Возвращает конфигурацию для отправки вложений
   *
   * @returns {ICapabilitiesElementSettings | undefined} Настройки или undefined
   *
   * @description
   * Извлекает из _capabilities настройки для sendAttachments из раздела
   * messaging
   *
   * @see {@link ICapabilitiesElementSettings} - Структура конфигурации
   */
  getSendAttachmentsConfig(): ICapabilitiesElementSettings | undefined {
    return this._capabilities.messaging?.sendAttachments;
  }

  /**
   * Обновляет состояние элемента интерфейса в соответствии с настройками
   *
   * @param {HTMLElement} element - Целевой элемент DOM
   * @param {ICapabilitiesElementSettings} config - Конфигурация элемента
   *
   * @description
   * 1. Включение/выключение элемента через атрибут disabled
   * 2. Добавление/удаление подсказок (tooltip)
   * 3. Установка лимитов и допустимых типов файлов
   *
   * @example
   * // Пример внутреннего использования:
   * _updateElementState(buttonElement, {
   *   availableState: 'false',
   *   hasTooltip: true,
   *   tooltip: 'Функция недоступна'
   * });
   *
   * @see {@link ICapabilitiesElementSettings} - Структура конфигурации
   */
  private _updateElementState(
    element: HTMLElement,
    config: ICapabilitiesElementSettings
  ): void {
    const isEnabled = config.availableState === 'true';
    if (isEnabled) {
      element.removeAttribute('disabled');
    } else {
      element.setAttribute('disabled', 'true');
    }

    if (config.hasTooltip) {
      element.classList.add('has-tooltip');
      element.setAttribute('data-tooltip', config.tooltip || '');
    } else {
      element.classList.remove('has-tooltip');
      element.removeAttribute('data-tooltip');
    }

    if (typeof config.limit !== 'undefined') {
      element.setAttribute('data-limit', String(config.limit));
    } else {
      element.removeAttribute('data-limit');
    }

    if (Array.isArray(config.types) && config.types.length > 0) {
      element.setAttribute('data-types', JSON.stringify(config.types));
    } else {
      element.removeAttribute('data-types');
    }
  }
}
