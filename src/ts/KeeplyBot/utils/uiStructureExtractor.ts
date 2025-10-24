// =============================================================================
// Модуль для извлечения структуры UI-элементов бота
// =============================================================================

import { IBotUiStructure } from '../shared/interfaces';

/**
 * Извлекает структуру элементов интерфейса бота из указанного корневого элемента
 *
 * @param {HTMLElement} root - Корневой элемент, в котором будут искаться
 * элементы интерфейса
 * @returns {IBotUiStructure} Объект со структурированными ссылками на элементы
 * интерфейса
 *
 * @description
 * Полученные элементы интерфейса являются основными UI-компонентами, с которыми
 * может взаимодействовать пользователь, и которые настраиваются сервером.
 */
export function extractBotUiStructure(root: HTMLElement): IBotUiStructure {
  return {
    ui: {
      buttonHelp: root.querySelector('.chat__btn-help'),
      buttonFavorites: root.querySelector('.header__btn-favorites'),
      buttonAttachments: root.querySelector('.header__btn-attachments'),
      buttonSettings: root.querySelector('.header__btn-settings'),
    },
    messaging: {
      sendText: root.querySelector('.chat__textarea'),
      sendAttachments: root.querySelector('.chat__btn-attach'),
    },
    search: {
      searchMessages: root.querySelector('.header__search-input'),
    },
  };
}
