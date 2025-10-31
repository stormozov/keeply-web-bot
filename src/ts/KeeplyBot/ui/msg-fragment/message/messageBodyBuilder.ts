// =============================================================================
// Сборка тела сообщения — композиция секций
// =============================================================================

import { ICreateElementOptions } from '../../../../shared/interfaces';
import { SERVER_URL } from '../../../api/api';
import { IFileTypeConfig, IUserMessageCard } from '../../../shared/interfaces';
import { createMessageTextConfig, createTimestamp } from './atomicBlocks';
import {
  createAudioFileItem,
  createImageFileItem,
  createRoleBotBlock,
  createVideoFileItem,
} from './compositeBlocks';
import { createFileSection, createFilesContainer } from './sectionsContainers';

const FILE_TYPE_CONFIG = new Map<string, IFileTypeConfig>([
  [
    'image',
    {
      test: (m): boolean => m.startsWith('image/'),
      builder: createImageFileItem,
      icon: 'image',
      title: 'Изображения',
    },
  ],
  [
    'video',
    {
      test: (m): boolean => m.startsWith('video/'),
      builder: createVideoFileItem,
      icon: 'videocam',
      title: 'Видео',
    },
  ],
  [
    'audio',
    {
      test: (m): boolean => m.startsWith('audio/'),
      builder: createAudioFileItem,
      icon: 'audiotrack',
      title: 'Аудио',
    },
  ],
]);

/**
 * Создает конфигурацию для сборки тела сообщения
 *
 * @param {IUserMessageCard} msg - Карточка сообщения
 * @returns {ICreateElementOptions[]} Конфигурация тела сообщения
 */
export function buildMessageBodyPartsConfig(
  msg: IUserMessageCard
): ICreateElementOptions[] {
  const parts: ICreateElementOptions[] = [];

  if (msg.sender === 'bot') parts.push(createRoleBotBlock('KeeplyBot'));

  if (msg.message?.trim()) parts.push(createMessageTextConfig(msg.message));

  if (msg.files?.length) {
    const buckets: Record<string, ICreateElementOptions[]> = {};
    for (const [type] of FILE_TYPE_CONFIG) buckets[type] = [];

    for (const file of msg.files) {
      const fileUrl = `${SERVER_URL}${file.url}`;
      for (const [type, config] of FILE_TYPE_CONFIG) {
        if (config.test(file.mimetype)) {
          buckets[type].push(config.builder(file, fileUrl, msg.id));
          break;
        }
      }
    }

    const sections = Object.entries(buckets)
      .filter(([, items]) => items.length > 0)
      .map(([type, items]) => {
        const cfg = FILE_TYPE_CONFIG.get(type) as IFileTypeConfig;
        return createFileSection(cfg.icon, cfg.title, items);
      });

    if (sections.length > 0) parts.push(createFilesContainer(sections));
  }

  parts.push(createTimestamp(msg.timestamp));

  return parts;
}

/**
 * Создает конфигурацию для тела сообщения
 *
 * @param {IUserMessageCard} msg - Карточка сообщения
 * @returns {ICreateElementOptions} Конфигурация тела сообщения
 */
export function buildMessageBodyConfig(
  msg: IUserMessageCard
): ICreateElementOptions {
  const msgRole =
    msg.sender === 'bot'
      ? 'chat__message-body--bot'
      : 'chat__message-body--user';

  return {
    tag: 'div',
    className: ['chat__message-body', msgRole],
    children: buildMessageBodyPartsConfig(msg),
  };
}
