// =============================================================================
// Модуль для рендеринга сообщений в чате
// =============================================================================

import createElement from '../../../utils/createElementFunction';
import { IUserMessageCard } from '../../shared/interfaces';
import { buildMessageFragment } from '../msg-fragment/msgFragmentBuilder';

/**
 * Класс для управления отображением чата и его состоянием
 *
 * @description
 * Реализует:
 * - Прокрутку до последнего сообщения
 * - Рендеринг списка сообщений
 * - Управление состоянием "пустой чат"
 */
export default class ChatRenderer {
  /**
   * Создает экземпляр ChatRenderer
   *
   * @param {HTMLElement | null} _chatContent - Контейнер для отображения сообщ.
   * @param {HTMLElement | null} _emptyBlock - Блок "Пустой чат"
   */
  constructor(
    private readonly _chatContent: HTMLElement | null,
    private readonly _emptyBlock: HTMLElement | null
  ) {}

  /**
   * Прокручивает чат до самого последнего сообщения.
   *
   * @param {HTMLElement} container - Контейнер для прокрутки.
   */
  scrollToBottom(container: HTMLElement | null): void {
    if (!container) {
      console.warn(
        `ChatRenderer (scrollToBottom): Контейнер ${container} не найден`
      );
      return;
    }
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Отображает список всех отправленных сообщений в интерфейсе чата
   *
   * @param {IUserMessageCard[]} messages - Массив карточек сообщений
   * для отображения
   *
   * @description
   * 1. Очищает текущее содержимое чата
   * 2. Если нет сообщений:
   *    - Показывает блок "Пустой чат"
   * 3. Если есть сообщения:
   *    - Скрывает блок "Пустой чат"
   *    - Создает и добавляет список сообщений
   *
   * @see {@link buildMessageFragment} - Функция рендеринга сообщений
   * в DOM-фрагмент
   */
  render(messages: IUserMessageCard[]): void {
    this._chatContent?.replaceChildren();

    if (messages.length === 0) {
      if (this._emptyBlock) {
        this._chatContent?.append(this._emptyBlock);
      }
      return;
    }

    if (this._emptyBlock instanceof HTMLElement) {
      this._emptyBlock.style.display = 'none';
    }

    const list = createElement({
      tag: 'ul',
      className: 'chat__messages-list',
    });
    list.append(buildMessageFragment(messages));
    this._chatContent?.append(list);
  }
}
