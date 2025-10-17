// =============================================================================
// Интерфейсы бота
// =============================================================================

/**
 * Интерфейс для структуры UI-элементов бота, которые настраиваются сервером
 */
export interface IBotUiStructure {
  [category: string]: {
    [elementKey: string]: HTMLElement | null;
  };
}

// =============================================================================
// Интерфейсы для сообщений от пользователя
// =============================================================================

/**
 * Интерфейс для сообщений от пользователя
 */
export interface IUserMessageInput {
  text?: string;
  files?: File[];
  timestamp: number;
}

// =============================================================================
// Интерфейсы для Capabilities бота, полученных от сервера по API
// =============================================================================

/**
 * Интерфейс для настроек доступности элементов бота
 */
export interface ICapabilitiesElementSettings {
  availableState: string;
  limit: number;
  types: string[];
  hasTooltip: boolean;
  tooltip: string;
}

/**
 * Интерфейс для настроек доступности функций сообщений бота
 *
 * 1. Категория: Отправка сообщений
 */
export interface IMessagingCapabilities {
  sendText: ICapabilitiesElementSettings;
  sendAttachments: ICapabilitiesElementSettings;
}

/**
 * Интерфейс для настроек доступности функций поиска бота
 *
 * 2. Категория: Поиск
 */
export interface ISearchCapabilities {
  searchMessages: ICapabilitiesElementSettings;
}

/**
 * Интерфейс для настроек доступности функций интерфейса бота
 *
 * 3. Категория: UI-элементы (кнопки, панели и т.д.)
 */
export interface IUiCapabilities {
  buttonHelp: ICapabilitiesElementSettings;
  buttonFavorites: ICapabilitiesElementSettings;
  buttonAttachments: ICapabilitiesElementSettings;
  buttonSettings: ICapabilitiesElementSettings;
}

/**
 * Интерфейс для настроек доступности функций бота
 */
export interface IBotCapabilities {
  messaging: IMessagingCapabilities;
  search: ISearchCapabilities;
  ui: IUiCapabilities;
}
