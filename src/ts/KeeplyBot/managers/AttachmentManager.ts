// =============================================================================
// Модуль для работы с вложениями.
//
// Модуль отвечает за:
// - Выбор файлов (через кнопку и Drag & Drop)
// - Фильтрацию по типам и лимитам(на основе capabilities)
// - Категоризацию файлов: изображения / видео / аудио
// - Отображение превью
// - Удаление файлов из превью
// =============================================================================

import { ICreateElementOptions } from '../../shared/interfaces';
import createElement from '../../utils/createElementFunction';
import { IAttachmentConfig, IAttachmentState } from '../shared/interfaces';
import { FileType } from '../shared/types';

/**
 * Менеджер для работы с вложениями (изображения, видео, аудио)
 *
 * @description
 * Реализует:
 * - Хранение файлов по категориям
 * - Фильтрацию по MIME-типам
 * - Ограничение максимального количества файлов
 * - Отображение предварительного просмотра
 * - Управление состоянием вложений
 */
export class AttachmentManager {
  private _images: File[] = [];
  private _videos: File[] = [];
  private _audios: File[] = [];
  private _config: IAttachmentConfig = {};

  /**
   * Конструктор класса AttachmentManager
   *
   * @param {IAttachmentConfig} config - Конфигурация для управления вложениями
   *
   * @see {@link IAttachmentConfig} - Интерфейс для конфигурации вложений
   */
  constructor(config: IAttachmentConfig = {}) {
    this.updateConfig(config);
  }

  /**
   * Обновляет конфигурацию менеджера вложений
   *
   * @param {IAttachmentConfig} config - Новый объект конфигурации
   *
   * @see {@link IAttachmentConfig} - Интерфейс, описывающий параметры конфигурации
   */
  updateConfig(config: IAttachmentConfig): void {
    this._config = { ...config };
  }

  /**
   * Добавляет файлы в соответствующие массивы после фильтрации по MIME-типам
   * и проверки лимитов
   *
   * @param {File[]} files - Массив загруженных файлов для добавления
   *
   * @description
   * 1. Получает разрешенные типы из конфигурации (`this._config.types`)
   * 2. Определяет общий лимит файлов (по умолчанию 20)
   * 3. Фильтрует файлы:
   *    - Для шаблонов вида "type/*" проверяет префикс MIME-типа
   *    - Для точных типов проверяет полное совпадение
   * 4. Добавляет подходящие файлы в соответствующие массивы:
   *    - `this._images` для изображений
   *    - `this._videos` для видео
   *    - `this._audios` для аудио
   * 5. Уважает установленный лимит общего количества файлов
   */
  addFiles(files: File[]): void {
    const allowedTypes = this._config.types || [];
    const limit = this._config.limit ?? 20;

    // Фильтруем по MIME-типу, если заданы разрешённые типы
    let filteredFiles = files;
    if (allowedTypes.length > 0) {
      filteredFiles = files.filter((file) =>
        allowedTypes.some((pattern) => {
          if (pattern.endsWith('/*')) {
            const prefix = pattern.slice(0, -2);
            return file.type.startsWith(prefix);
          }
          return file.type === pattern;
        })
      );
    }

    // Добавляем, соблюдая общий лимит
    for (const file of filteredFiles) {
      const total =
        this._images.length + this._videos.length + this._audios.length;
      if (total >= limit) break;

      if (file.type.startsWith('image/')) {
        this._images.push(file);
      } else if (file.type.startsWith('video/')) {
        this._videos.push(file);
      } else if (file.type.startsWith('audio/')) {
        this._audios.push(file);
      }
    }
  }

  /**
   * Удаляет файл определенного типа по указанному индексу
   *
   * @param {FileType} type - Тип файла ('image', 'video', 'audio')
   * @param {number} index - Индекс элемента в массиве для удаления
   */
  removeFile(type: FileType, index: number): void {
    if (index < 0) return;
    switch (type) {
      case 'image':
        this._images.splice(index, 1);
        break;
      case 'video':
        this._videos.splice(index, 1);
        break;
      case 'audio':
        this._audios.splice(index, 1);
        break;
    }
  }

  /**
   * Возвращает текущее состояние вложений в виде копий внутренних массивов
   *
   * @returns {IAttachmentState} Объект со структурированными данными о вложениях.
   *
   * @description
   * 1. Создает поверхностные копии массивов с помощью оператора spread (`[...]`)
   * 2. Гарантирует, что внешний код не сможет модифицировать внутреннее состояние
   * 3. Полезно для получения актуального состояния перед отправкой данных
   *
   * @see {@link IAttachmentState} - Интерфейс, определяющий структуру
   * возвращаемых данных
   */
  getState(): IAttachmentState {
    return {
      images: [...this._images],
      videos: [...this._videos],
      audios: [...this._audios],
    };
  }

  /**
   * Очищает все хранимые файлы определенного типа
   *
   * @description
   * Сбрасывает внутренние массивы для хранения:
   * - Изображений (_images)
   * - Видео (_videos)
   * - Аудио (_audios)
   */
  clear(): void {
    this._images = [];
    this._videos = [];
    this._audios = [];
  }

  /**
   * Отрисовывает предварительный просмотр загруженных файлов в указанном контейнере
   *
   * @param {HTMLElement} container - DOM-элемент, в который будет вставлен preview
   * @description
   * 1. Очищает содержимое контейнера
   * 2. Группирует файлы по типам (изображения, видео, аудио)
   * 3. Для каждой группы:
   *    - Создает секцию с соответствующим иконками и заголовком
   *    - Отображает превью файлов или иконки для каждого типа
   *    - Добавляет кнопки удаления с индексами
   *
   * @example
   * const attachmentManager = new AttachmentManager();
   * const previewContainer = document.getElementById('preview');
   * attachmentManager.renderPreview(previewContainer);
   *
   * @see _createSection - Метод создания отдельной секции с файлами
   * @see groupFilesByType - Функция группировки файлов по категориям
   */
  renderPreview(container: HTMLElement): void {
    container.replaceChildren();

    const total =
      this._images.length + this._videos.length + this._audios.length;
    if (total === 0) {
      container.classList.add('hidden');
      return;
    }
    container.classList.remove('hidden');

    this._createSection(
      container,
      this._images,
      'image',
      'image',
      'Изображения'
    );
    this._createSection(container, this._videos, 'video', 'videocam', 'Видео');
    this._createSection(
      container,
      this._audios,
      'audio',
      'audiotrack',
      'Аудио'
    );
  }

  /**
   * Создает секцию предварительного просмотра вложений определенного типа
   *
   * @param {HTMLElement} container - Контейнер, в который будет добавлена секция
   * @param {File[]} files - Массив файлов для отображения
   * @param {FileType} type - Тип файлов (image, video, audio)
   * @param {string} icon - Иконка Material Symbols для отображения в заголовке
   * @param {string} title - Название категории файлов
   *
   * @description
   * 1. Создает контейнер секции с соответствующими классами
   * 2. Формирует заголовок с иконкой и названием категории
   * 3. Для каждого файла:
   *    - Создает элемент списка с превью (для изображений)
   *      или иконкой (для остальных типов)
   *    - Добавляет кнопку удаления с атрибутами data-type и data-index
   *    - Показывает имя файла с подсказкой
   *
   * @see {@link ICreateElementOptions} - Интерфейс для создания DOM-элементов
   * @see {@link https://developer.mozilla.org/ru/docs/Web/API/URL} - Создание
   * временного URL для изображений
   */
  private _createSection(
    container: HTMLElement,
    files: File[],
    type: FileType,
    icon: string,
    title: string
  ): void {
    if (files.length === 0) return;

    createElement({
      tag: 'div',
      className: ['form-att-prev__section', `form-att-prev__section--${type}s`],
      children: [
        {
          tag: 'h5',
          className: 'form-att-prev__section-title',
          children: [
            {
              tag: 'span',
              className: 'material-symbols-outlined',
              text: icon,
            },
            { tag: 'span', text: title },
          ],
        },
        {
          tag: 'ul',
          className: 'form-att-prev__list',
          children: files.map(
            (file, index): ICreateElementOptions => ({
              tag: 'li',
              className: 'form-att-prev__item',
              children: [
                {
                  tag: 'div',
                  className: 'form-att-prev__image-wrapper',
                  children: [
                    type === 'image'
                      ? {
                          tag: 'img',
                          className: 'form-att-prev__image',
                          attrs: {
                            src: URL.createObjectURL(file),
                            alt: file.name,
                          },
                        }
                      : {
                          tag: 'div',
                          className: 'form-att-prev__file-icon',
                          children: [
                            {
                              tag: 'span',
                              className: 'material-symbols-outlined',
                              text:
                                type === 'video' ? 'videocam' : 'audiotrack',
                            },
                          ],
                        },
                    {
                      tag: 'button',
                      className: 'form-att-prev__remove',
                      attrs: {
                        'data-type': type,
                        'data-index': String(index),
                      },
                      children: [
                        {
                          tag: 'span',
                          className: 'material-symbols-outlined',
                          text: 'close',
                        },
                      ],
                    },
                  ],
                },
                {
                  tag: 'span',
                  className: ['form-att-prev__name', 'has-tooltip'],
                  text: file.name,
                  attrs: { 'data-tooltip': file.name },
                },
              ],
            })
          ),
        },
      ],
      parent: container,
    });
  }
}
