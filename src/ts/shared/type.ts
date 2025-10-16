/**
 * Настройки менеджера всплывающих подсказок (tooltips).
 */
export type TooltipOptions = {
  /**
   * Класс, по которому ищутся элементы для отображения tooltip.
   * Пример: 'has-tooltip'
   */
  targetClass: string;

  /**
   * Имя data-атрибута, содержащего текст подсказки.
   * Пример: 'data-tooltip'
   */
  dataAttribute: string;
};
