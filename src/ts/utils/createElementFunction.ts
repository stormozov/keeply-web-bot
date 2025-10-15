import { ICreateElementOptions } from '../shared/interfaces';

/**
 * Функция создания DOM-элемента на основе переданного объекта конфигурации
 *
 * @param {ICreateElementOptions} options - Объект конфигурации для создания DOM-элемента
 * @param {string} options.tag - Тег элемента
 * @param {string | string[] | null} options.className - Класс элемента
 * @param {string | null} options.id - Идентификатор элемента
 * @param {string | undefined} options.text - Текстовый контент элемента
 * @param {string | undefined} options.html - HTML-контент элемента
 * @param {Record<string, string>} options.attrs - Атрибуты элемента
 * @param {(HTMLElement | string | ICreateElementOptions)[]} options.children - Дочерние элементы
 * @param {HTMLElement | null} options.parent - Родительский элемент
 *
 * @returns {HTMLElement} Созданный DOM-элемент
 */
export default function createElement({
  tag = 'div',
  className,
  id,
  text,
  html,
  attrs = {},
  children = [],
  parent,
}: ICreateElementOptions = {}): HTMLElement {
  const element = document.createElement(tag);

  if (className !== null) {
    if (typeof className === 'string') {
      element.className = className;
    } else if (Array.isArray(className)) {
      element.classList.add(...className);
    }
  }

  if (id) element.id = id;
  if (text !== undefined) element.textContent = text;
  if (html !== undefined) element.innerHTML = html;

  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  element.append(
    ...children.map((child) =>
      typeof child === 'string'
        ? document.createTextNode(child)
        : child instanceof HTMLElement
          ? child
          : createElement(child)
    )
  );

  if (parent) parent.append(element);

  return element;
}

/**
 * Функция создания нескольких DOM-элементов на основе массива объектов конфигурации
 *
 * Функция использует функцию createElement для создания каждого элемента
 *
 * @param {ICreateElementOptions[]} configs - Массив объектов конфигурации для создания DOM-элементов
 * @returns {HTMLElement[]} Массив созданных DOM-элементов
 */
export function createElements(
  configs: ICreateElementOptions[]
): HTMLElement[] {
  return configs.map((config) => createElement(config));
}
