/* eslint-disable @typescript-eslint/no-use-before-define */
// =============================================================================
// Модуль для создания фрагментов сообщений
// =============================================================================

import linkifyHtml from 'linkify-html';
import { ICreateElementOptions } from '../../../shared/interfaces';
import createElement from '../../../utils/createElementFunction';
import { formatFileSize } from '../../../utils/formatFileSize';
import { formatTelegramTime } from '../../../utils/formatTime';
import { SERVER_URL } from '../../api/api';
import {
  IFileTypeConfig,
  IMessageFile,
  IUserMessageCard,
} from '../../shared/interfaces';

/**
 * Опции для linkifyHtml
 * @see {@link https://linkify.js.org/docs/options.html} - Документация linkifyHtml
 */
const linkifyOptions = {
  className: 'chat__message-link',
  rel: 'noopener noreferrer',
  target: '_blank',
  truncate: 50,
};

/**
 * Конфигурация типов файлов с их ассоциированными настройками
 *
 * @description
 * Используется в buildMessageBodyConfig.
 *
 * Хранит конфигурации для категорий файлов (изображения, видео, аудио)
 * и позволяет:
 * 1. Тестировать MIME-типы на принадлежность к категории
 * 2. Создавать специфичные элементы интерфейса
 * 3. Определять иконки и заголовки для отображения
 *
 * @see {@link buildMessageBodyConfig} - Функция, использующая конфигурацию
 */
const FILE_TYPE_CONFIG = new Map<string, IFileTypeConfig>([
  [
    'image',
    {
      test: (mimetype): boolean => mimetype.startsWith('image/'),
      builder: buildImageFileItemConfig,
      icon: 'image',
      title: 'Изображения',
    },
  ],
  [
    'video',
    {
      test: (mimetype): boolean => mimetype.startsWith('video/'),
      builder: buildVideoFileItemConfig,
      icon: 'videocam',
      title: 'Видео',
    },
  ],
  [
    'audio',
    {
      test: (mimetype): boolean => mimetype.startsWith('audio/'),
      builder: buildAudioFileItemConfig,
      icon: 'audiotrack',
      title: 'Аудио',
    },
  ],
]);

/**
 * Создаёт конфигурацию элемента списка файлов для изображений
 *
 * @param {IMessageFile} file - Объект файла сообщения, содержащий метаданные
 * (имя, размер и т.д.).
 * @param {string} fileUrl - Полный URL к изображению для атрибута `src`.
 *
 * @returns {ICreateElementOptions} Объект конфигурации элемента для
 * последующего создания через `createElement`.
 *
 * @see {@link IMessageFile} - Интерфейс для файлов сообщений
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
function buildImageFileItemConfig(
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
        attrs: {
          href: fileUrl,
        },
        children: [
          {
            tag: 'img',
            className: ['chat__message-file-img', 'has-tooltip'],
            attrs: {
              src: fileUrl,
              alt: file.originalname,
              'data-tooltip': file.originalname,
            },
          },
          {
            tag: 'span',
            className: [
              'material-symbols-outlined',
              'chat__message-file-zoom-icon',
            ],
            text: 'zoom_in',
          },
        ],
      },
      {
        tag: 'div',
        className: 'chat__message-file-info',
        children: [
          {
            tag: 'p',
            className: ['chat__message-file-size', 'has-tooltip'],
            text: formatFileSize(file.size),
            attrs: { 'data-tooltip': 'Размер изображения' },
          },
          {
            tag: 'button',
            className: ['link-btn', 'chat__message-file-download'],
            attrs: {
              'data-url': fileUrl,
              'data-filename': file.originalname,
            },
            children: [
              {
                tag: 'span',
                className: 'material-symbols-outlined',
                text: 'download',
              },
              {
                tag: 'span',
                className: 'link-btn__text',
                text: 'Скачать',
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Создаёт конфигурацию элемента списка файлов для видео
 *
 * @param {IMessageFile} file - Объект файла сообщения с метаданными.
 * @param {string} fileUrl - Полный URL к видео-файлу для атрибута `src`.
 *
 * @returns {ICreateElementOptions} Объект конфигурации элемента для
 * последующего создания через `createElement`.
 *
 * @see {@link IMessageFile} - Интерфейс для файлов сообщений
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
function buildVideoFileItemConfig(
  file: IMessageFile,
  fileUrl: string
): ICreateElementOptions {
  return {
    tag: 'li',
    className: ['chat__message-file', 'chat__message-file--video'],
    children: [
      {
        tag: 'video',
        className: 'chat__message-video',
        attrs: { src: fileUrl, controls: 'true' },
      },
      {
        tag: 'div',
        className: 'chat__message-file-info',
        children: [
          {
            tag: 'span',
            className: ['chat__message-file-size', 'has-tooltip'],
            text: formatFileSize(file.size),
            attrs: { 'data-tooltip': 'Размер видео-файла' },
          },
          {
            tag: 'button',
            className: ['link-btn', 'chat__message-file-download'],
            attrs: {
              'data-url': fileUrl,
              'data-filename': file.originalname,
            },
            children: [
              {
                tag: 'span',
                className: 'material-symbols-outlined',
                text: 'download',
              },
              {
                tag: 'span',
                className: 'link-btn__text',
                text: 'Скачать',
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Создаёт конфигурацию элемента списка файлов для аудио
 *
 * @param {IMessageFile} file - Объект файла сообщения с метаданными.
 * @param {string} fileUrl - Полный URL к аудиофайлу для атрибута `src`.
 *
 * @returns {ICreateElementOptions} Объект конфигурации элемента для
 * последующего создания через `createElement`.
 *
 * @see {@link IMessageFile} - Интерфейс для файлов сообщений
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
function buildAudioFileItemConfig(
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
          {
            tag: 'p',
            className: ['chat__message-file-name', 'has-tooltip'],
            text: file.originalname,
            attrs: { 'data-tooltip': 'Название аудио-файла' },
          },

          {
            tag: 'p',
            className: ['chat__message-file-size', 'has-tooltip'],
            text: formatFileSize(file.size),
            attrs: { 'data-tooltip': 'Размер аудио-файла' },
          },

          {
            tag: 'button',
            className: ['link-btn', 'chat__message-file-download'],
            attrs: {
              'data-url': fileUrl,
              'data-filename': file.originalname,
            },
            children: [
              {
                tag: 'span',
                className: 'material-symbols-outlined',
                text: 'download',
              },
              {
                tag: 'span',
                className: 'link-btn__text',
                text: 'Скачать',
              },
            ],
          },
        ],
      },
      {
        tag: 'audio',
        className: 'chat__message-audio',
        attrs: { src: fileUrl, controls: 'true' },
      },
    ],
  };
}

/**
 * Создаёт конфигурацию секции файлов одного указанного типа
 *
 * @param {string} icon - Иконка Material Symbols для заголовка
 * (например, 'image', 'videocam', 'audiotrack').
 * @param {string} title - Текст заголовка секции (например, 'Изображения').
 * @param {ICreateElementOptions[]} items - Массив элементов файлов, созданных
 * функциями вроде `buildImageFileElement`.
 *
 * @returns {ICreateElementOptions} Объект конфигурации секции для
 * последующего создания через `createElement`.
 *
 * @description
 * Функция создает конфигурацию секции необходимого указанного типа, содержащую
 * заголовок и список элементов.
 *
 * Возможные типы секции:
 * - 'image': Изображения
 * - 'videocam': Видео
 * - 'audiotrack': Аудио
 *
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
function buildFileSectionConfig(
  icon: string,
  title: string,
  items: ICreateElementOptions[]
): ICreateElementOptions {
  const sectionModifier =
    icon === 'image'
      ? 'chat__message-files-section--images'
      : icon === 'videocam'
        ? 'chat__message-files-section--videos'
        : 'chat__message-files-section--audios';

  return {
    tag: 'div',
    className: ['chat__message-files-section', sectionModifier],
    children: [
      {
        tag: 'h5',
        className: 'chat__message-files-title',
        children: [
          { tag: 'span', className: 'material-symbols-outlined', text: icon },
          { tag: 'span', text: title },
        ],
      },
      {
        tag: 'ul',
        className: 'chat__message-files-list',
        children: items,
      },
    ],
  };
}

/**
 * Создает конфигурацию тела сообщения пользователя.
 *
 * @param {IUserMessageCard} msg - Объект карточки сообщения пользователя.
 * @returns {ICreateElementOptions[]} Массив элементов DOM-конфигурации,
 * представляющих содержимое тела сообщения.
 *
 * @description
 * Содержимое тела сообщения состоит из:
 * - Текста сообщения
 * - Блока с секциями файлов (изображения, видео или аудио)
 * - Время отправки сообщения
 *
 * @see {@link IUserMessageCard} - Интерфейс для файлов сообщений
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
function buildMessageBodyConfig(
  msg: IUserMessageCard
): ICreateElementOptions[] {
  const bodyChildren: ICreateElementOptions[] = [];

  // Добавляем конфиг для текстового элемента в bodyChildren
  if (msg.message?.trim()) {
    bodyChildren.push({
      tag: 'p',
      className: 'chat__message-text',
      html: linkifyHtml(msg.message, linkifyOptions),
    });
  }

  // Добавляем конфиг для блока с файлами
  if (msg.files?.length) {
    /**
     * Временный аккумулятор данных для разделения файлов по типам, содержащий
     * списки элементов.
     */
    const buckets: Record<string, ICreateElementOptions[]> = {};
    for (const [type] of FILE_TYPE_CONFIG) buckets[type] = [];

    // Распределение файлов
    for (const file of msg.files) {
      const fileUrl = `${SERVER_URL}${file.url}`;
      for (const [type, config] of FILE_TYPE_CONFIG) {
        if (config.test(file.mimetype)) {
          buckets[type].push(config.builder(file, fileUrl, msg.id));
          break;
        }
      }
    }

    // Построение секций
    const filesSections: ICreateElementOptions[] = [];
    for (const [type, items] of Object.entries(buckets)) {
      if (items.length > 0) {
        const cfg = FILE_TYPE_CONFIG.get(type);
        if (cfg) {
          filesSections.push(
            buildFileSectionConfig(cfg.icon, cfg.title, items)
          );
        }
      }
    }

    // Добавляем контейнер с файлами только если есть хотя бы одна секция
    if (filesSections.length > 0) {
      bodyChildren.push({
        tag: 'div',
        className: 'chat__message-files-container',
        children: filesSections,
      });
    }
  }

  // Добавляем конфиг для временной метки в bodyChildren
  bodyChildren.push({
    tag: 'time',
    className: 'chat__message-timestamp',
    text: formatTelegramTime(msg.timestamp),
    attrs: { datetime: msg.timestamp },
  });

  return bodyChildren;
}

/**
 * Создает конфигурацию выпадающего меню.
 *
 * @param {IUserMessageCard} msg - Объект карточки сообщения для условного рендера кнопки скачивания.
 * @returns {ICreateElementOptions} Конфигурация выпадающего меню.
 *
 * @see {@link ICreateElementOptions} - Интерфейс для конфигурации элемента
 */
function buildDropdownConfig(msg: IUserMessageCard): ICreateElementOptions {
  const dropdownItems: ICreateElementOptions[] = [];

  // Условно добавляем кнопку "Скачать вложения" только если есть файлы
  if (msg.files && msg.files.length > 0) {
    dropdownItems.push({
      tag: 'li',
      className: 'msg-dropdown__item',
      children: [
        {
          tag: 'button',
          className: [
            'msg-dropdown__button',
            'msg-dropdown__button--download-attachments',
          ],
          attrs: {
            'data-message-id': msg.id,
          },
          children: [
            {
              tag: 'span',
              className: ['msg-dropdown__icon', 'material-symbols-outlined'],
              text: 'download',
            },
            {
              tag: 'span',
              className: 'msg-dropdown__text',
              text: 'Скачать вложения',
            },
          ],
        },
      ],
    });
  }

  // Всегда добавляем кнопку "Удалить"
  dropdownItems.push({
    tag: 'li',
    className: 'msg-dropdown__item',
    children: [
      {
        tag: 'button',
        className: ['msg-dropdown__button', 'msg-dropdown__button--delete'],
        children: [
          {
            tag: 'span',
            className: ['msg-dropdown__icon', 'material-symbols-outlined'],
            text: 'delete',
          },
          {
            tag: 'span',
            className: 'msg-dropdown__text',
            text: 'Удалить',
          },
        ],
      },
    ],
  });

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
        children: dropdownItems,
      },
    ],
  };
}

/**
 * Создает `DocumentFragment` с карточками сообщений для рендеринга.
 *
 * @param {IUserMessageCard[]} messages - Массив карточек сообщений для рендеринга.
 * @returns {DocumentFragment} `DocumentFragment`, содержащий все элементы сообщений.
 *
 * @description
 * Используется для эффективного пакетного обновления интерфейса чата.
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment}
 */

export function buildMessageFragment(
  messages: IUserMessageCard[]
): DocumentFragment {
  const fragment = document.createDocumentFragment();

  for (const msg of messages) {
    const bodyChildren = buildMessageBodyConfig(msg);
    const messageItem = createElement({
      tag: 'li',
      className: 'chat__message-item',
      id: msg.id,
      children: [
        {
          tag: 'div',
          className: 'chat__message-body',
          children: bodyChildren,
        },
        buildDropdownConfig(msg),
      ],
    });
    fragment.append(messageItem);
  }

  return fragment;
}
