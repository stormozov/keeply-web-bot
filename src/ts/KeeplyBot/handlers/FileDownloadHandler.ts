// =============================================================================
// Модуль для обработчика событий скачивания файлов
// =============================================================================

import createElement from '../../utils/createElementFunction';

/**
 * Класс для обработки скачивания файлов по кнопке в чате
 *
 * @description
 * Реализует логику:
 * - Обработка клика по кнопке скачивания файла
 * - Получение URL и имени файла из атрибутов
 * - Выполнение HTTP-запроса и создание Blob-объекта
 * - Симуляция клика на временной ссылке для скачивания
 */
export default class FileDownloadHandler {
  private readonly _btnClass = '.chat__message-file-download';

  /**
   * Обрабатывает событие клика по кнопке скачивания
   *
   * @param {Event} event - Событие клика
   *
   * @description
   * 1. Предотвращает стандартное поведение браузера
   * 2. Находит ближайшую кнопку с классом из поля _btnClass
   * 3. Извлекает URL и имя файла из атрибутов data-url и data-filename
   * 4. Выполняет загрузку файла через метод _downloadFile
   */
  handle(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const button = target.closest(this._btnClass);
    if (!button) return;

    const url = button.getAttribute('data-url');
    const filename = button.getAttribute('data-filename') || 'file';

    if (!url) return;

    void this._downloadFile(url, filename);
  }

  /**
   * Выполняет загрузку файла по указанному URL
   *
   * @param {string} url - Адрес файла для загрузки
   * @param {string} filename - Желаемое имя файла при сохранении
   *
   * @see {@link URL.createObjectURL} - Создание временного URL для Blob
   * @see {@link URL.revokeObjectURL} - Освобождение ресурсов
   * @see {@link createElement} - Функция создания HTML-элемента
   */
  private async _downloadFile(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = createElement({
        tag: 'a',
        attrs: {
          href: blobUrl,
          download: filename,
          style: 'display: none',
          rel: 'noopener noreferrer',
        },
      });

      document.body.append(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(
        `FileDownloadHandler: ошибка при скачивании файла: ${error}`
      );
    }
  }
}
