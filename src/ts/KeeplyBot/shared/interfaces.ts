// =============================================================================
// Интерфейсы приложения Keeply
// =============================================================================

import { ICreateElementOptions } from '../../shared/interfaces';
import FileDownloadHandler from '../handlers/FileDownloadHandler';
import { AttachmentManager } from '../managers/AttachmentManager';
import { CapabilitiesManager } from '../managers/CapabilitiesManager';
import MessageService from '../services/MessageService';
import { MessageFormat, MessageType } from './types';

export interface IKeeplyBotDependencies {
  messageService: MessageService;
  capabilitiesManager: CapabilitiesManager;
  attachmentManager: AttachmentManager;
  fileDownloadHandler: FileDownloadHandler;
}

/**
 * Интерфейс для структуры UI-элементов бота, которые настраиваются сервером
 */
export interface IBotUiStructure {
  ui: {
    [elementKey: string]: HTMLElement | null;
  };
  messaging: {
    [elementKey: string]: HTMLElement | null;
  };
  search: {
    [elementKey: string]: HTMLElement | null;
  };
  sidebar: ISidebarStructure;
}

/**
 * Интерфейс для опций при рендеринге UI-элементов
 */
export interface IRenderOptions {
  container?: HTMLElement | null;
  pinnedMessageId?: string | null;
  initDownloadHandlers?: (fragment: DocumentFragment) => void;
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

/**
 * Интерфейс для файла в сообщении
 */
export interface IMessageFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  url: string;
}

/**
 * Интерфейс для карточек сообщений, отображаемых в чате
 */
export interface IUserMessageCard {
  id: string;
  message: string;
  files: IMessageFile[];
  format: MessageFormat;
  timestamp: string;
  sender: MessageType;
}

/**
 * Интерфейс для конфигурации типов файлов в секциях файлов внутри сообщений
 */
export interface IFileTypeConfig {
  test: (mimetype: string) => boolean;
  builder: (
    file: IMessageFile,
    fileUrl: string,
    messageId: string
  ) => ICreateElementOptions;
  icon: string;
  title: string;
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
 * Интерфейс для структуры элементов sidebar
 */
export interface ISidebarStructure {
  sidebarElement: HTMLElement | null;
  sidebarContent: HTMLElement | null;
  sidebarTitle: HTMLElement | null;
  sidebarClose: HTMLElement | null;
}

/**
 * Интерфейс для настроек доступности функций бота
 */
export interface IBotCapabilities {
  messaging: IMessagingCapabilities;
  search: ISearchCapabilities;
  ui: IUiCapabilities;
}

// =============================================================================
// Интерфейсы для конфигурации вложений
// =============================================================================

/**
 * Интерфейс для состояния вложений
 */
export interface IAttachmentState {
  images: File[];
  videos: File[];
  audios: File[];
}

/**
 * Интерфейс для конфигурации вложений
 */
export interface IAttachmentConfig {
  types?: string[]; // например: ['image/*', 'video/mp4']
  limit?: number; // например: 5
}

// =============================================================================
// Интерфейсы для ленивой загрузки
// =============================================================================

/**
 * Интерфейс конфигурационных параметров для ленивой загрузки сообщений
 */
export interface ILazyLoaderOptions {
  messagePerPage?: number;
  scrollThreshold?: number;
}
