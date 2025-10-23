// =============================================================================
// Модуль для работы с Drag & Drop
// =============================================================================

/**
 * Менеджер для обработки событий перетаскивания и отпускания файлов (Drag&Drop)
 *
 * @description
 * Реализует логику:
 * - Отслеживания перетаскивания файлов над целевым элементом
 * - Визуального индикации зоны загрузки
 * - Обработки фактической загрузки файлов при отпускании
 */
export class DragAndDropManager {
  private _dragEnterCounter: number = 0;
  private _targetElement: HTMLElement;
  private readonly _dragOverClassName = 'drag-over';

  /**
   * Создает экземпляр менеджера перетаскивания
   *
   * @param {HTMLElement} targetElement - Элемент, на котором будет работать D&D
   * @param {Function} _onFilesDropped - Callback для обработки массива
   * загруженных файлов
   *
   * @example
   * const manager = new DragAndDropManager(
   *   document.getElementById('drop-zone'),
   *   (files) => console.log('Загружены файлы:', files)
   * );
   */
  constructor(
    targetElement: HTMLElement,
    private _onFilesDropped: (files: File[]) => void
  ) {
    this._targetElement = targetElement;
  }

  /**
   * Подключает все обработчики событий Drag & Drop к целевому элементу
   */
  attach(): void {
    this._targetElement.addEventListener('dragover', this._handleDragOver);
    this._targetElement.addEventListener('dragenter', this._handleDragEnter);
    this._targetElement.addEventListener('dragleave', this._handleDragLeave);
    this._targetElement.addEventListener('drop', this._handleDrop);
  }

  /**
   * Удаляет все зарегистрированные обработчики событий Drag & Drop
   * из целевого элемента
   */
  detach(): void {
    this._targetElement.removeEventListener('dragover', this._handleDragOver);
    this._targetElement.removeEventListener('dragenter', this._handleDragEnter);
    this._targetElement.removeEventListener('dragleave', this._handleDragLeave);
    this._targetElement.removeEventListener('drop', this._handleDrop);
  }

  /**
   * Обработчик события dragover.
   *
   * @param {DragEvent} event - Событие перетаскивания
   */
  private _handleDragOver = (event: DragEvent): void => {
    event.preventDefault();
    this._setDragOverState(true);
  };

  /**
   * Обработчик события dragenter
   *
   * @param {DragEvent} event - Событие входа в зону перетаскивания
   */
  private _handleDragEnter = (event: DragEvent): void => {
    event.preventDefault();
    this._dragEnterCounter++;
    if (this._dragEnterCounter !== 1) return;
    this._setDragOverState(true);
  };

  /**
   * Обработчик события dragleave
   *
   * @param {DragEvent} event - Событие выхода из зоны перетаскивания
   */
  private _handleDragLeave = (event: DragEvent): void => {
    event.preventDefault();
    this._dragEnterCounter--;
    if (this._dragEnterCounter !== 0) return;
    this._setDragOverState(false);
  };

  /**
   * Обработчик события drop
   *
   * @param {DragEvent} event - Событие отпускания файлов
   */
  private _handleDrop = (event: DragEvent): void => {
    event.preventDefault();
    this._resetDragState();

    const files = event.dataTransfer?.files;
    if (!files?.length) return;

    this._onFilesDropped([...files]);
  };

  /**
   * Сбрасывает состояние перетаскивания
   */
  private _resetDragState(): void {
    this._dragEnterCounter = 0;
    this._setDragOverState(false);
  }

  /**
   * Устанавливает состояние перетаскивания через CSS класс
   *
   * @param {boolean} isOver - Флаг состояния:
   *  - true - добавляет класс перетаскивания
   *  - false - удаляет класс перетаскивания
   */
  private _setDragOverState(isOver: boolean): void {
    this._targetElement.classList.toggle(this._dragOverClassName, isOver);
  }
}
