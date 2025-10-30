// =============================================================================
// Композитные блоки — сборка из атомарных элементов
// =============================================================================

import { ICreateElementOptions } from '../../../../shared/interfaces';
import { IMessageFile } from '../../../shared/interfaces';
import {
  createAudioElement,
  createDownloadButton,
  createFileName,
  createFileSize,
  createImageElement,
  createVideoElement,
  createZoomIcon,
} from './atomicBlocks';

/**
 * Создаёт конфигурацию для создания элемента списка файлов изображений
 *
 * @param {IMessageFile} file - Файл изображения
 * @param {string} fileUrl - Ссылка на файл изображения
 * @param {string} messageId - Идентификатор сообщения
 *
 * @returns {ICreateElementOptions} Конфигурация элемента списка
 */
export function createImageFileItem(
  file: IMessageFile,
  fileUrl: string,
  messageId: string
): ICreateElementOptions {
  return {
    tag: 'li',
    className: ['chat__message-file', 'chat__message-file--image'],
    children: [
      {
        tag: 'a',
        className: `simplelightbox-${messageId}`,
        attrs: { href: fileUrl },
        children: [
          createImageElement(fileUrl, file.originalname, file.originalname),
          createZoomIcon(),
        ],
      },
      {
        tag: 'div',
        className: 'chat__message-file-info',
        children: [
          createFileSize(file.size, 'Размер изображения'),
          createDownloadButton(fileUrl, file.originalname),
        ],
      },
    ],
  };
}

/**
 * Создаёт конфигурацию для создания элемента списка видео файлов
 *
 * @param {IMessageFile} file - Файл видео
 * @param {string} fileUrl - Ссылка на файл видео
 *
 * @returns {ICreateElementOptions} Конфигурация элемента списка
 */
export function createVideoFileItem(
  file: IMessageFile,
  fileUrl: string
): ICreateElementOptions {
  return {
    tag: 'li',
    className: ['chat__message-file', 'chat__message-file--video'],
    children: [
      createVideoElement(fileUrl),
      {
        tag: 'div',
        className: 'chat__message-file-info',
        children: [
          createFileSize(file.size, 'Размер видео-файла'),
          createDownloadButton(fileUrl, file.originalname),
        ],
      },
    ],
  };
}

/**
 * Создаёт конфигурацию для создания элемента списка аудио файлов
 *
 * @param {IMessageFile} file - Файл аудио
 * @param {string} fileUrl - Ссылка на файл аудио
 *
 * @returns {ICreateElementOptions} Конфигурация элемента списка
 */
export function createAudioFileItem(
  file: IMessageFile,
  fileUrl: string
): ICreateElementOptions {
  return {
    tag: 'li',
    className: ['chat__message-file', 'chat__message-file--audio'],
    children: [
      {
        tag: 'div',
        className: 'chat__message-file-info',
        children: [
          createFileName(file.originalname, 'Название аудио-файла'),
          createFileSize(file.size, 'Размер аудио-файла'),
          createDownloadButton(fileUrl, file.originalname),
        ],
      },
      createAudioElement(fileUrl),
    ],
  };
}

/**
 * Создаёт конфигурацию для создания боковой обертки сообщения
 *
 * @param {ICreateElementOptions[]} subsidiaries - конфиг для дочерних элементов
 * @returns {ICreateElementOptions} Конфигурация боковой обертки сообщения
 */
export function createMessageSideWrapper(
  subsidiaries?: ICreateElementOptions[]
): ICreateElementOptions {
  return {
    tag: 'div',
    className: 'chat__message-side-wrapper',
    children: subsidiaries ? subsidiaries : undefined,
  };
}

/**
 * Создаёт конфигурацию для создания элемента списка сообщений
 *
 * @param {string} msgId - Идентификатор сообщения
 * @param {ICreateElementOptions[]} subsidiaries - конфиг для дочерних элементов
 *
 * @returns {ICreateElementOptions} Конфигурация элемента списка
 */
export function createMessageItemConfig(
  msgId: string,
  subsidiaries: ICreateElementOptions[]
): ICreateElementOptions {
  return {
    tag: 'li',
    className: 'chat__message-item',
    id: msgId,
    children: subsidiaries ? subsidiaries : undefined,
  };
}
