// =============================================================================
// Модуль инициализации приложения
// =============================================================================

import { createKeeplyBot } from './KeeplyBot/factories/KeeplyBotFactory';
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
  const chatRoot = document.querySelector('#App') as HTMLElement | null;
  if (!chatRoot) {
    console.error('Chat root element not found');
    return;
  }

  const bot = createKeeplyBot(chatRoot);
  bot.init();
};

document.addEventListener('DOMContentLoaded', () => {
  tooltipInit();
  botInit();
});
