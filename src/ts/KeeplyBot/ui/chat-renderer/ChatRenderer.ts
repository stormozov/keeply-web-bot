// =============================================================================
// Модуль для рендеринга сообщений в чате
// =============================================================================

import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.css';
import createElement from '../../../utils/createElementFunction';
import { IRenderOptions, IUserMessageCard } from '../../shared/interfaces';
import { buildMessageFragment } from '../msg-fragment/messageFragmentBuilder';
import PinnedMessageManager from '../../managers/PinnedMessageManager';

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
   * Инициализирует SimpleLightbox для изображений в сообщении
   *
   * @param {HTMLElement} list - Список картинок в сообщении
   *
   * @see {@link https://simplelightbox.js.org/} - Документация SimpleLightbox
   */
  initSimpleLightbox(list: HTMLElement, selector: string): void {
    const messageItems = list.querySelectorAll(selector);
    messageItems.forEach((item) => {
      new SimpleLightbox(`.simplelightbox-${item.id}`, {
        // Опции SimpleLightbox
        captionsData: 'alt',
        captionDelay: 250,
        spinner: true,
      });
    });
  }

  /**
   * Отображает список всех отправленных сообщений в интерфейсе чата
   *
   * @param {IUserMessageCard[]} messages - Массив карточек сообщений
   * для отображения
   * @param {IRenderOptions} options - Параметры для рендеринга
   * @param {HTMLElement | null} options.container - Контейнер для отображения
   * элементов
   * @param {string | null} options.pinnedMessageId - Идентификатор
   * закрепленного сообщения
   * @param {(fragment: DocumentFragment) => void} options.initDownloadHandlers -
   * Функция для инициализации обработчиков загрузки вложений
   *
   * @description
   * 1. Очищает текущее содержимое чата
   * 2. Если нет сообщений:
   *    - Показывает блок "Пустой чат"
   * 3. Если есть сообщения:
   *    - Скрывает блок "Пустой чат"
   *    - Создает и добавляет список сообщений
   *    - Инициализирует SimpleLightbox для изображений
   *    - Инициализирует обработчики скачивания вложений
   *
   * @see {@link buildMessageFragment} - Функция рендеринга сообщений
   * в DOM-фрагмент
   */
  render(messages: IUserMessageCard[], options: IRenderOptions = {}): void {
    const {
      container = this._chatContent,
      pinnedMessageId = null,
      initDownloadHandlers,
    } = options;

    container?.replaceChildren();

    if (messages.length === 0) {
      if (!this._emptyBlock) return;
      container?.append(this._emptyBlock);
    }

    const list = createElement({
      tag: 'ul',
      className: 'chat__messages-list',
    });
    const fragment = buildMessageFragment(messages, pinnedMessageId);
    if (initDownloadHandlers) initDownloadHandlers(fragment);

    list.append(fragment);
    container?.append(list);

    // Инициализация SimpleLightbox для изображений в каждом сообщении
    this.initSimpleLightbox(list, '.chat__message-item');

    // Обновляем состояние кнопок закрепления после рендеринга
    new PinnedMessageManager().updatePinButtonsUI(pinnedMessageId);
  }
}
