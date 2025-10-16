import { TooltipOptions } from '../shared/type';
import createElement from './createElementFunction';

/**
 * Менеджер всплывающих подсказок (tooltips) с делегированием событий.
 * Автоматически обрабатывает все элементы на странице с указанным классом
 * и data-атрибутом.
 */
export default class TooltipManager {
  private readonly _targetClass: string;
  private readonly _dataAttribute: string;
  private _tooltipElement!: HTMLElement | null;
  private _currentTarget!: Element | null;

  /**
   * Конструктор менеджера всплывающих подсказок.
   *
   * @param {TooltipOptions} options - Настройки менеджера всплывающих подсказок.
   * @param {string} options.targetClass - CSS-класс целевого элемента.
   * @param {string} options.dataAttribute - Атрибут данных целевого элемента.
   *
   * @see {@link TooltipOptions} - Тип настроек менеджера всплывающих подсказок
   */
  constructor(options: TooltipOptions) {
    this._targetClass = options.targetClass;
    this._dataAttribute = options.dataAttribute;

    this._initEventListeners();
  }

  /**
   * Инициализация слушателей событий
   *
   * @private
   */
  private _initEventListeners(): void {
    document.addEventListener('mouseover', this._handleMouseOver);
    document.addEventListener('mouseout', this._handleMouseOut);
    document.addEventListener('mousemove', this._handleMouseMove);
  }

  /**
   * Создаёт и добавляет на страницу DOM-элемент для тултипа, если он ещё
   * не существует.
   *
   * Элемент создаётся один раз и кэшируется в свойстве `_tooltipElement`.
   * Он позиционируется фиксированно, скрыт от просмотра и не влияет на layout,
   * а также добавляется внутрь элемента с id="App", если такой существует.
   *
   * @private
   * @see {@link createElement} - функция создания DOM-элемента
   */
  private _ensureTooltipElement(): void {
    if (this._tooltipElement) return;

    this._tooltipElement = createElement({ tag: 'div', className: 'tooltip' });

    // Стили, гарантирующие, что элемент не влияет на layout
    Object.assign(this._tooltipElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });

    document.getElementById('App')?.append(this._tooltipElement);
  }

  /**
   * Обрабатывает событие `mouseover` для отображения тултипа.
   *
   * Если целевой элемент содержит указанный CSS-класс и требуемый data-атрибут,
   * извлекает содержимое тултипа из этого атрибута, создаёт (при необходимости)
   * DOM-элемент тултипа и делает его видимым.
   *
   * @private
   * @param {MouseEvent} event - Событие наведения мыши.
   */
  private _handleMouseOver = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (
      target.classList.contains(this._targetClass) &&
      target.hasAttribute(this._dataAttribute)
    ) {
      const content = target.getAttribute(this._dataAttribute);
      if (content) {
        this._currentTarget = target;
        this._ensureTooltipElement();
        if (this._tooltipElement) {
          this._tooltipElement.textContent = content;
          this._tooltipElement.style.visibility = 'visible';
        }
      }
    }
  };

  /**
   * Обрабатывает событие `mouseout`, чтобы скрыть тултип, когда курсор покидает
   * целевой элемент.
   *
   * Тултип скрывается, если курсор уходит за пределы текущего целевого элемента
   * (включая случаи, когда `relatedTarget` отсутствует или не является потомком
   * `_currentTarget`).
   *
   * @private
   * @param {MouseEvent} event - Событие ухода курсора с элемента.

   */
  private _handleMouseOut = (event: MouseEvent): void => {
    const relatedTarget = event.relatedTarget;

    if (!(relatedTarget instanceof Node)) {
      this._hideTooltip();
      return;
    }

    if (this._currentTarget && !this._currentTarget.contains(relatedTarget)) {
      this._hideTooltip();
    }
  };

  /**
   * Обрабатывает событие `mousemove`, чтобы динамически позиционировать тултип
   * рядом с курсором.
   *
   * Тултип размещается чуть правее и выше курсора, но с учётом границ окна
   * просмотра:
   *  - он не выходит за правый, левый, верхний или нижний край viewport.
   *  - Позиционирование применяется только если активны `_currentTarget`
   *  и `_tooltipElement`.
   *
   * @private
   * @param {MouseEvent} event - Событие движения мыши.
   */
  private _handleMouseMove = (event: MouseEvent): void => {
    if (this._currentTarget && this._tooltipElement) {
      const tooltip = this._tooltipElement;
      const rect = tooltip.getBoundingClientRect();

      // Базовое позиционирование: чуть правее и выше курсора
      let left = event.pageX + 10;
      let top = event.pageY - 8;

      // Ограничение по правому краю
      if (left + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width - 5; // 5px отступ от края
      }

      // Ограничение по нижнему краю
      if (top + rect.height > window.innerHeight) {
        top = window.innerHeight - rect.height - 5;
      }

      // Ограничение по левому краю (на случай очень маленького экрана)
      if (left < 0) left = 5;

      // Ограничение по верхнему краю
      if (top < 0) top = 5;

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
  };

  /**
   * Скрывает тултип, если он виден.
   *
   * @private
   */
  private _hideTooltip(): void {
    if (this._tooltipElement) {
      this._tooltipElement.style.visibility = 'hidden';
    }
    this._currentTarget = null;
  }

  /**
   * Удаляет слушатели событий и удаляет DOM-элемент тултипа, если он существует.
   *
   * @public
   */
  public destroy(): void {
    document.removeEventListener('mouseover', this._handleMouseOver);
    document.removeEventListener('mouseout', this._handleMouseOut);
    document.removeEventListener('mousemove', this._handleMouseMove);

    if (this._tooltipElement?.parentNode) {
      this._tooltipElement.parentNode.removeChild(this._tooltipElement);
      this._tooltipElement = null;
    }
  }
}
