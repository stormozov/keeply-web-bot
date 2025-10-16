import TooltipManager from './utils/TooltipManager';

/**
 * Инициализация менеджера всплывающих подсказок
 */
const tooltipInit = (): TooltipManager => {
  return new TooltipManager({
    targetClass: 'has-tooltip',
    dataAttribute: 'data-tooltip',
  });
};

document.addEventListener('DOMContentLoaded', () => {
  tooltipInit();
});
