/**
 * Опции для создания DOM-элемента.
 * Используется в функции createElement для гибкого создания элементов.
 */
export interface ICreateElementOptions {
  /**
   * Тег создаваемого элемента
   */
  tag?: string;

  /**
   * CSS-класс(ы) элемента
   */
  className?: string | string[];

  /**
   * ID элемента
   */
  id?: string;

  /**
   * Текстовое содержимое элемента
   */
  text?: string;

  /**
   * HTML-содержимое элемента
   */
  html?: string;

  /**
   * Атрибуты элемента в виде объекта {ключ: значение}
   */
  attrs?: Record<string, string>;

  /**
   * Дочерние элементы (DOM-элементы, строки или конфиги элементов)
   */
  children?: (HTMLElement | string | ICreateElementOptions)[];

  /**
   * Родительский элемент, к которому будет добавлен созданный элемент
   */
  parent?: HTMLElement;
}
