import KeeplyBot from './KeeplyBot/KeeplyBot';
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

/**
 * Инициализация приложения KeeplyBot
 */
const botInit = (): void => {
  const bot = new KeeplyBot();
  bot.init();
};

document.addEventListener('DOMContentLoaded', () => {
  tooltipInit();
  botInit();
});
