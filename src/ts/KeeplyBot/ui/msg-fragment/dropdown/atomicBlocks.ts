// =============================================================================
// Атомарные элементы выпадающего меню
// =============================================================================

import { ICreateElementOptions } from '../../../../shared/interfaces';

/**
 * Создаёт конфигурацию для создания иконки для выпадающего меню сообщения
 *
 * @param {string} iconName - Имя иконки Material Symbols
 * @returns {ICreateElementOptions} Конфигурация иконки
 */
export function createDropdownIconConfig(
  iconName: string
): ICreateElementOptions {
  return {
    tag: 'span',
    className: ['msg-dropdown__icon', 'material-symbols-outlined'],
    text: iconName,
  };
}

/**
 * Создаёт конфигурацию для создания текста для выпадающего меню сообщения
 *
 * @param {string} text - Текст
 * @returns {ICreateElementOptions} Конфигурация текста
 */
export function createDropdownTextConfig(text: string): ICreateElementOptions {
  return {
    tag: 'span',
    className: 'msg-dropdown__text',
    text,
  };
}

/**
 * Создаёт конфигурацию для создания кнопки выпадающего меню сообщения
 *
 * @param {ICreateElementOptions[]} children - Дочерние элементы
 * @param {string[]} extraClasses - Дополнительные классы
 * @param {Record<string, string>} attrs - Атрибуты
 *
 * @returns {ICreateElementOptions} Конфигурация кнопки
 */
export function createDropdownButton(
  children: ICreateElementOptions[],
  extraClasses: string[] = [],
  attrs: Record<string, string> = {}
): ICreateElementOptions {
  return {
    tag: 'button',
    className: ['msg-dropdown__button', ...extraClasses],
    attrs,
    children,
  };
}

/**
 * Создаёт конфигурацию для создания элемента выпадающего меню сообщения
 *
 * @param {ICreateElementOptions} buttonConfig - Конфигурация кнопки
 * @returns {ICreateElementOptions} Конфигурация элемента
 */
export function createDropdownItem(
  buttonConfig: ICreateElementOptions
): ICreateElementOptions {
  return {
    tag: 'li',
    className: 'msg-dropdown__item',
    children: [buttonConfig],
  };
}
