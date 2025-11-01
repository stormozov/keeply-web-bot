// =============================================================================
// Атомарные элементы UI
// =============================================================================

import linkifyHtml from 'linkify-html';
import { ICreateElementOptions } from '../../../../shared/interfaces';
import { formatFileSize } from '../../../../utils/formatFileSize';
import { formatTelegramTime } from '../../../../utils/formatTime';

// === Опции linkify ===
const linkifyOptions = {
  className: 'chat__message-link link--glide-underline',
  rel: 'noopener noreferrer',
  target: '_blank',
  truncate: 50,
};

/**
 * Создает конфигурацию для роли сообщения
 *
 * @param {string} role - Роль сообщения
 * @returns {ICreateElementOptions} Конфигурация роли
 */
export function createRoleTextConfig(role: string): ICreateElementOptions {
  return {
    tag: 'span',
    className: 'chat__message-role-text',
    text: role,
  };
}

/**
 * Создаёт конфигурацию для создания текста сообщения
 *
 * @param {text} text - Текст сообщения
 * @returns {ICreateElementOptions} Конфигурация текста
 */
export function createMessageTextConfig(text: string): ICreateElementOptions {
  return {
    tag: 'p',
    className: 'chat__message-text',
    html: linkifyHtml(text, linkifyOptions),
  };
}

/**
 * Создаёт конфигурацию для создания времени сообщения
 *
 * @param {string} timestamp - Текст времени сообщения
 * @returns {ICreateElementOptions} Конфигурация времени
 */
export function createTimestamp(timestamp: string): ICreateElementOptions {
  return {
    tag: 'time',
    className: 'chat__message-timestamp',
    text: formatTelegramTime(timestamp),
    attrs: { datetime: timestamp },
  };
}

/**
 * Создаёт конфигурацию для создания кнопки скачивания файла
 *
 * @param {string} fileUrl - Ссылка на файл для скачивания
 * @param {string} filename - Имя файла
 *
 * @returns {ICreateElementOptions} Конфигурация кнопки
 */
export function createDownloadButton(
  fileUrl: string,
  filename: string
): ICreateElementOptions {
  return {
    tag: 'button',
    className: ['link-btn', 'chat__message-file-download'],
    attrs: { 'data-url': fileUrl, 'data-filename': filename },
    children: [
      { tag: 'span', className: 'material-symbols-outlined', text: 'download' },
      { tag: 'span', className: 'link-btn__text', text: 'Скачать' },
    ],
  };
}

/**
 * Создаёт конфигурацию для создания размера файла
 *
 * @param {number} size - Размер файла
 * @param {string} tooltip - Текст подсказки
 *
 * @returns {ICreateElementOptions} Конфигурация размера
 */
export function createFileSize(
  size: number,
  tooltip: string
): ICreateElementOptions {
  return {
    tag: 'p',
    className: ['chat__message-file-size', 'has-tooltip'],
    text: formatFileSize(size),
    attrs: { 'data-tooltip': tooltip },
  };
}

/**
 * Создаёт конфигурацию для создания имени файла
 *
 * @param {string} name - Имя файла
 * @param {string} tooltip - Текст подсказки
 *
 * @returns {ICreateElementOptions} Конфигурация имени файла
 */
export function createFileName(
  name: string,
  tooltip: string
): ICreateElementOptions {
  return {
    tag: 'p',
    className: ['chat__message-file-name', 'has-tooltip'],
    text: name,
    attrs: { 'data-tooltip': tooltip },
  };
}

/**
 * Создаёт конфигурацию для создания иконки увеличения картинки
 *
 * @returns {ICreateElementOptions} Конфигурация иконки
 */
export function createZoomIcon(): ICreateElementOptions {
  return {
    tag: 'span',
    className: ['material-symbols-outlined', 'chat__message-file-zoom-icon'],
    text: 'zoom_in',
  };
}

/**
 * Создаёт конфигурацию для создания картинки
 *
 * @param {string} src - Ссылка на картинку
 * @param {string} alt - Альтернативный текст картинки
 * @param {string} tooltip - Текст подсказки
 *
 * @returns {ICreateElementOptions} Конфигурация картинки
 */
export function createImageElement(
  src: string,
  alt: string,
  tooltip: string
): ICreateElementOptions {
  return {
    tag: 'img',
    className: ['chat__message-file-img', 'has-tooltip'],
    attrs: { src, alt, 'data-tooltip': tooltip },
  };
}

/**
 * Создаёт конфигурацию для создания видео
 *
 * @param {string} src - Ссылка на видео
 * @returns {ICreateElementOptions} Конфигурация видео
 */
export function createVideoElement(src: string): ICreateElementOptions {
  return {
    tag: 'video',
    className: 'chat__message-video',
    attrs: { src, controls: 'true' },
  };
}

/**
 * Создаёт конфигурацию для создания аудио-файла
 *
 * @param {string} src - Ссылка на аудио-файл
 * @returns {ICreateElementOptions} Конфигурация аудио-файла
 */
export function createAudioElement(src: string): ICreateElementOptions {
  return {
    tag: 'audio',
    className: 'chat__message-audio',
    attrs: { src, controls: 'true' },
  };
}

/**
 * Создаёт конфигурацию для создания прогресса загрузки
 *
 * @returns {ICreateElementOptions} Конфигурация прогресса
 */
export function createDownloadProgress(): ICreateElementOptions {
  return {
    tag: 'div',
    className: 'chat__message-download-progress hidden',
    children: [
      {
        tag: 'span',
        className: [
          'chat__message-download-progress-text',
          'material-symbols-outlined',
        ],
        text: 'download',
      },
    ],
  };
}

/**
 * Создаёт конфигурацию для создания контента сообщения
 *
 * @param {string} msg - Контент сообщения
 * @returns {ICreateElementOptions} Конфигурация контента
 *
 * @description
 * Используется для рендеринга html контента, полученного с сервера
 */
export function createMessageContentBlockConfig(
  msg: string
): ICreateElementOptions {
  return {
    tag: 'div',
    className: 'chat__message-content-block',
    html: msg,
  };
}
