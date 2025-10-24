// =============================================================================
// Модуль фабрики KeeplyBot
// =============================================================================

import FileDownloadHandler from '../handlers/FileDownloadHandler';
import KeeplyBot from '../KeeplyBot';
import { AttachmentManager } from '../managers/AttachmentManager';
import { CapabilitiesManager } from '../managers/CapabilitiesManager';
import MessageService from '../services/MessageService';
import { extractBotUiStructure } from '../utils/uiStructureExtractor';

/**
 * Создаёт и настраивает экземпляр KeeplyBot.
 *
 * @param {HTMLElement} rootElement - корневой DOM-элемент чата (обычно `.chat`)
 * @returns {KeeplyBot} настроенный экземпляр KeeplyBot
 */
export function createKeeplyBot(rootElement: HTMLElement): KeeplyBot {
  const messageService = new MessageService();
  const capabilitiesManager = new CapabilitiesManager(messageService);
  const attachmentManager = new AttachmentManager();
  const fileDownloadHandler = new FileDownloadHandler();

  const botUi = extractBotUiStructure(rootElement);

  return new KeeplyBot(
    rootElement,
    botUi,
    messageService,
    capabilitiesManager,
    attachmentManager,
    fileDownloadHandler
  );
}
