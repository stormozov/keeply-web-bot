// =============================================================================
// Менеджер боковой панели (Sidebar)
// =============================================================================

import { ICreateElementOptions } from '../../shared/interfaces';
import createElement from '../../utils/createElementFunction';

/**
 * Типы контента для sidebar
 */
export type SidebarContentType = 'favorites' | 'attachments' | 'settings';

/**
 * Класс для управления боковой панелью (sidebar)
 *
 * @description
 * Реализует логику:
 * - Открытия/закрытия сайдбара
 * - Обновления контента в зависимости от типа
 * - Обработки событий (клик по крестик, клик вне области)
 * - Управления активной кнопкой
 */
export default class SidebarManager {
  private _sidebarElement: HTMLElement | null;
  private _sidebarContent: HTMLElement | null;
  private _sidebarTitle: HTMLElement | null;
  private _sidebarClose: HTMLElement | null;
  private _body: HTMLElement;
  private _activeButton: HTMLElement | null = null;
  private _isOpen = false;

  /**
   * Создает экземпляр SidebarManager
   *
   * @param {HTMLElement} root - Корневой элемент, в котором ищутся элементы
   * сайдбара
   */
  constructor(root: HTMLElement) {
    this._body = document.body;
    this._sidebarElement = root.querySelector('.sidebar');
    this._sidebarContent = root.querySelector('.sidebar__content');
    this._sidebarTitle = root.querySelector('.sidebar__title');
    this._sidebarClose = root.querySelector('.sidebar__close');

    this._init();
  }

  /**
   * Открывает боковую панель с указанным типом контента
   *
   * @param {SidebarContentType} contentType - Тип контента сайдбара
   * @param {HTMLElement} button - Кнопка, вызвавшая открытие
   *
   * @description
   * 1. Проверяет, не открыт ли сайдбар с той же кнопкой
   * 2. Добавляет классы для отображения
   * 3. Обновляет активную кнопку и контент
   *
   * @example
   * const favoritesBtn = document.querySelector('.header__btn-favorites');
   * sidebarManager.open('favorites', favoritesBtn);
   */
  open(contentType: SidebarContentType, button: HTMLElement): void {
    if (this._isOpen && this._activeButton === button) {
      this.close();
      return;
    }

    // Закрываем предыдущий если открыт
    if (this._isOpen) this.close();

    this._activeButton = button;
    this._isOpen = true;

    // Добавляем классы
    this._body.classList.add('sidebar-open');
    this._sidebarElement?.classList.add('sidebar--open');
    button.classList.add('header__btn--active');

    // Обновляем контент
    this._updateContent(contentType);
  }

  /**
   * Закрывает боковую панель
   *
   * @description
   * 1. Удаляет классы открытия
   * 2. Сбрасывает активную кнопку
   *
   * @example
   * sidebarManager.close(); // При клике на крестик или вне области
   */
  close(): void {
    if (!this._isOpen) return;

    this._isOpen = false;

    // Убираем классы
    this._body.classList.remove('sidebar-open');
    this._sidebarElement?.classList.remove('sidebar--open');
    this._activeButton?.classList.remove('header__btn--active');

    this._activeButton = null;
  }

  /**
   * Инициализация обработчиков событий
   */
  private _init(): void {
    if (this._sidebarClose) {
      this._sidebarClose.addEventListener('click', () => this.close());
    }

    // Закрытие по клику вне sidebar
    document.addEventListener('click', (e) => {
      if (
        this._isOpen &&
        this._sidebarElement &&
        !this._sidebarElement.contains(e.target as Node) &&
        this._activeButton &&
        !this._activeButton.contains(e.target as Node)
      ) {
        this.close();
      }
    });
  }

  /**
   * Обновляет контент сайдбара в зависимости от типа
   */
  private _updateContent(contentType: SidebarContentType): void {
    if (!this._sidebarContent || !this._sidebarTitle) return;

    let title = '';
    let content: HTMLElement | null = null;

    switch (contentType) {
      case 'favorites':
        title = 'Избранное';
        content = this._createFavoritesContent();
        break;
      case 'attachments':
        title = 'Вложения';
        content = this._createAttachmentsContent();
        break;
      case 'settings':
        title = 'Настройки';
        content = this._createSettingsContent();
        break;
    }

    this._sidebarTitle.textContent = title;
    this._sidebarContent.replaceChildren();
    if (content) this._sidebarContent.appendChild(content);
  }

  /**
   * Создает элемент списка избранного в сайдбаре
   *
   * @return {HTMLElement} HTMLElement списка избранного
   *
   * @see {@link createElement} - Функция создания HTML-элемента
   */
  private _createFavoritesContent(): HTMLElement {
    return createElement({
      tag: 'div',
      className: 'sidebar__favorites',
      children: [this._createEmptyContent()],
    });
  }

  /**
   * Создает элемент списка вложений в сайдбаре
   *
   * @return {HTMLElement} HTMLElement списка вложений
   *
   * @see {@link createElement} - Функция создания HTML-элемента
   */
  private _createAttachmentsContent(): HTMLElement {
    return createElement({
      tag: 'div',
      className: 'sidebar__attachments',
      children: [this._createEmptyContent()],
    });
  }

  /**
   * Создает элемент списка настроек в сайдбаре
   *
   * @return {HTMLElement} HTMLElement списка настроек
   *
   * @see {@link createElement} - Функция создания HTML-элемента
   */
  private _createSettingsContent(): HTMLElement {
    return createElement({
      tag: 'div',
      className: 'sidebar__settings',
      children: [
        {
          tag: 'ul',
          className: 'sidebar__settings-list',
          children: [
            {
              tag: 'li',
              className: 'sidebar__settings-item',
              children: [
                {
                  tag: 'button',
                  className: ['btn', 'btn--secondary', 'sidebar__settings-btn'],
                  attrs: {
                    'data-action': 'clear-chat',
                  },
                  children: [
                    {
                      tag: 'span',
                      className: ['btn__icon', 'material-symbols-outlined'],
                      text: 'chat',
                    },
                    {
                      tag: 'p',
                      className: 'sidebar__settings-btn-text',
                      text: 'Чат',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  }

  /**
   * Создает конфигурацию для пустого контента
   *
   * @return {HTMLElement} Конфигурация пустого контента
   *
   * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
   */
  private _createEmptyContent(): ICreateElementOptions {
    return {
      tag: 'p',
      className: 'sidebar__empty',
      text: 'Пусто',
    };
  }
}
