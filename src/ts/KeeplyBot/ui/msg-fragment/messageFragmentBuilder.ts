import createElement from '../../../utils/createElementFunction';
import { IUserMessageCard } from '../../shared/interfaces';
import { buildDropdownConfig } from './dropdown/buildDropdown';
import { createDownloadProgress } from './message/atomicBlocks';
import {
  createMessageItemConfig,
  createMessageSideWrapper,
} from './message/compositeBlocks';
import { buildMessageBodyConfig } from './message/messageBodyBuilder';

/**
 * Создает карточку сообщения
 *
 * @param {IUserMessageCard} msg - Объект карточки сообщения
 * @param {string | null} pinnedMessageId - ID закрепленного сообщения
 *
 * @returns {HTMLElement} Карточка сообщения
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export function createMessageCard(
  msg: IUserMessageCard,
  pinnedMessageId?: string | null
): HTMLElement {
  const downloadProgress = createDownloadProgress();
  const dropdown = buildDropdownConfig(msg, pinnedMessageId);

  const itemConfig = createMessageItemConfig(String(msg.id), [
    buildMessageBodyConfig(msg),
    createMessageSideWrapper([downloadProgress, dropdown]),
  ]);

  return createElement(itemConfig);
}

/**
 * Создает фрагмент с карточками сообщений
 *
 * @param {IUserMessageCard[]} messages - Массив карточек сообщений
 * @param {string | null} pinnedMessageId - ID закрепленного сообщения
 *
 * @returns {DocumentFragment} Фрагмент с карточками сообщений
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export function buildMessageFragment(
  messages: IUserMessageCard[],
  pinnedMessageId?: string | null
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const msg of messages) {
    fragment.append(createMessageCard(msg, pinnedMessageId));
  }
  return fragment;
}
