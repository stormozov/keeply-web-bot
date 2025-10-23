// =============================================================================
// Модуль для управления формой чата, управляющий событиями ввода и отправки
// =============================================================================

export type FormSubmitHandler = (text: string) => Promise<void>;
export type FormInputHandler = () => void;

/**
 * Контроллер формы чата, управляющий событиями ввода и отправки.
 */
export class ChatFormController {
  constructor(
    private _form: HTMLFormElement | null,
    private _textarea: HTMLTextAreaElement | null,
    private _sendButton: HTMLButtonElement | null,
    private _onSubmit: FormSubmitHandler,
    private _onInput: FormInputHandler
  ) {}

  /**
   * Подключает обработчики событий к элементам формы.
   */
  init(): void {
    this._form?.addEventListener('submit', this._handleSubmit.bind(this));
    this._textarea?.addEventListener('input', this._onInput);
    this._textarea?.addEventListener('keydown', this._handleKeydown.bind(this));
  }

  /**
   * Программно обновляет состояние кнопки отправки.
   * (Опционально — можно вынести в KeeplyBot, но иногда удобно здесь)
   */
  updateSendButtonState(hasText: boolean, hasFiles: boolean): void {
    if (!this._sendButton) return;
    this._sendButton.disabled = !hasText && !hasFiles;
  }

  /**
   * Обрабатывает событие отправки формы.
   *
   * @param {Event} event - Событие отправки формы (`Event`).
   *
   */
  private _handleSubmit(event: Event): void {
    event.preventDefault();
    const text = this._textarea?.value.trim() || '';
    void this._onSubmit(text);
  }

  /**
   * Обрабатывает событие нажатия клавиши на элементе ввода.
   *
   * @param {KeyboardEvent} event - Событие нажатия клавиши (`KeyboardEvent`).
   *
   * @description
   * Метод предотвращает стандартное поведение браузера при нажатии Enter
   * без удержания Shift, если форма доступна и кнопка отправки не отключена.
   */
  private _handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (!this._form || this._sendButton?.disabled) return;

    event.preventDefault();
    this._form.requestSubmit();
  }
}
