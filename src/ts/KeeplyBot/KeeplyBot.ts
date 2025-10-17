import { fetchCapabilities } from './api/api';
import {
  IBotCapabilities,
  IBotUiStructure,
  ICapabilitiesElementSettings,
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

  /**
   * Создаёт экземпляр KeeplyBot и инициализирует ссылки на UI-элементы.
   */
  constructor() {}

  /**
   * Инициализирует KeeplyBot.
   */
  init(): void {
    void this.updateUiCapabilities();
  }

  /**
   * Получает текущие возможности (capabilities) бота с сервера.
   *
   * @returns {Promise<IBotCapabilities>} Объект с описанием поддерживаемых функций бота,
   * разбитый по категориям (ui, messaging, search и т.д.).
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
}
