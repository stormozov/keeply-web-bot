// =============================================================================
// Сборка выпадающего меню из кирпичиков
// =============================================================================

import { ICreateElementOptions } from '../../../../shared/interfaces';
import { IUserMessageCard } from '../../../shared/interfaces';
import {
  createDeleteItem,
  createDownloadAttachmentsItemConfig,
  createPinToggleItemConfig,
} from './menuItems';

/**
 * Создает конфигурацию выпадающего меню.
 *
 * @param {IUserMessageCard} msg - Объект карточки сообщения для условного
 * рендера кнопки скачивания.
 * @param {string | null} pinnedMessageId - ID закрепленного сообщения
 * для определения состояния кнопки.
 *
 * @returns {ICreateElementOptions} Конфигурация выпадающего меню.
 *
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
export function buildDropdownConfig(
  msg: IUserMessageCard,
  pinnedMessageId: string | null = null
): ICreateElementOptions {
  const items: ICreateElementOptions[] = [];

  // Условно добавляем "Скачать вложения"
  if (msg.files && msg.files.length > 0) {
    items.push(createDownloadAttachmentsItemConfig(msg.id));
  }

  // Кнопка закрепления
  const isPinned = pinnedMessageId === msg.id;
  items.push(createPinToggleItemConfig(isPinned));

  // Кнопка удаления
  items.push(createDeleteItem());

  return {
    tag: 'div',
    className: 'msg-dropdown',
    children: [
      {
        tag: 'button',
        className: ['msg-dropdown__more', 'material-symbols-outlined'],
        text: 'more_vert',
      },
      {
        tag: 'ul',
        className: 'msg-dropdown__list hidden',
        children: items,
      },
    ],
  };
}
