// =============================================================================
// Конкретные пункты меню
// =============================================================================

import { ICreateElementOptions } from '../../../../shared/interfaces';
import {
  createDropdownButton,
  createDropdownIconConfig,
  createDropdownItem,
  createDropdownTextConfig,
} from './atomicBlocks';

/**
 * Создает конфигурацию для пункта "Скачать вложения"
 */
export function createDownloadAttachmentsItemConfig(
  messageId: string
): ICreateElementOptions {
  const button = createDropdownButton(
    [
      createDropdownIconConfig('download'),
      createDropdownTextConfig('Скачать вложения'),
    ],
    ['msg-dropdown__button--download-attachments'],
    { 'data-message-id': messageId }
  );
  return createDropdownItem(button);
}

/**
 * Создает конфигурацию для пункта "Закрепить/Открепить"
 *
 * @param {boolean} isPinned - Флаг, указывающий, закреплено ли сообщение
 * @return {ICreateElementOptions} Конфигурация пункта
 */
export function createPinToggleItemConfig(
  isPinned: boolean
): ICreateElementOptions {
  const button = createDropdownButton(
    [
      createDropdownIconConfig(isPinned ? 'keep_off' : 'keep'),
      createDropdownTextConfig(isPinned ? 'Открепить' : 'Закрепить'),
    ],
    [isPinned ? 'msg-dropdown__button--unpin' : 'msg-dropdown__button--pin']
  );
  return createDropdownItem(button);
}

/**
 * Создает конфигурацию для пункта "Удалить"
 *
 * @return {ICreateElementOptions} Конфигурация пункта
 */
export function createDeleteItem(): ICreateElementOptions {
  const button = createDropdownButton(
    [createDropdownIconConfig('delete'), createDropdownTextConfig('Удалить')],
    ['msg-dropdown__button--delete']
  );
  return createDropdownItem(button);
}
