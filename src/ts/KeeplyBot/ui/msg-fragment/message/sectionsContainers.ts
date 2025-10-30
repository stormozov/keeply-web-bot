// =============================================================================
// Секции и контейнеры
// =============================================================================

import { ICreateElementOptions } from '../../../../shared/interfaces';

/**
 * Создает конфигурацию секции файлов с заголовком и списком файлов
 *
 * @param {string} icon - Иконка секции
 * @param {string} title - Заголовок секции
 * @param {ICreateElementOptions[]} items - Элементы списка
 *
 * @return {ICreateElementOptions} Конфигурация секции
 */
export function createFileSection(
  icon: string,
  title: string,
  items: ICreateElementOptions[]
): ICreateElementOptions {
  const modifier =
    icon === 'image'
      ? 'chat__message-files-section--images'
      : icon === 'videocam'
        ? 'chat__message-files-section--videos'
        : 'chat__message-files-section--audios';

  return {
    tag: 'div',
    className: ['chat__message-files-section', modifier],
    children: [
      {
        tag: 'h5',
        className: 'chat__message-files-title',
        children: [
          { tag: 'span', className: 'material-symbols-outlined', text: icon },
          { tag: 'span', text: title },
        ],
      },
      {
        tag: 'ul',
        className: 'chat__message-files-list',
        children: items,
      },
    ],
  };
}

/**
 * Создает конфигурацию контейнера для секций файлов
 *
 * @param {ICreateElementOptions[]} sections - Элементы секций
 * @return {ICreateElementOptions} Конфигурация контейнера
 */
export function createFilesContainer(
  sections: ICreateElementOptions[]
): ICreateElementOptions {
  return {
    tag: 'div',
    className: 'chat__message-files-container',
    children: sections,
  };
}
