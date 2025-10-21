import { fetchCapabilities, fetchMessages, sendMessage } from '../api/api';
import { IBotCapabilities, IUserMessageCard } from '../shared/interfaces';

/**
 * Сервис для работы с API получения и отправки сообщений
 *
 * @description
 * Предоставляет методы для:
 * - Загрузки начального списка сообщений
 * - Загрузки дополнительных сообщений (пагинация)
 * - Отправки новых сообщений от пользователя
 * - Получения конфигурации доступных функций бота
 *
 * @see {@link fetchMessages} - Базовая функция загрузки сообщений
 * @see {@link sendMessage} - Функция отправки сообщений
 * @see {@link fetchCapabilities} - Функция получения возможностей бота
 */
export default class MessageService {
  /**
   * Загружает начальный набор сообщений
   *
   * @param {number} limit - Максимальное количество возвращаемых сообщений
   *
   * @returns {Promise<IUserMessageCard[]>} Обещание, разрешающееся в массив
   * карточек сообщений
   *
   * @example
   * const service = new MessageService();
   * const messages = await service.loadInitialMessages(10);
   * console.log('Начальные сообщения:', messages);
   *
   * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
   */
  async loadInitialMessages(limit: number): Promise<IUserMessageCard[]> {
    return await fetchMessages(0, limit);
  }

  /**
   * Загружает дополнительные сообщения (для пагинации)
   *
   * @param {number} offset - Смещение для выборки сообщений
   * @param {number} limit - Максимальное количество возвращаемых сообщений
   *
   * @returns {Promise<IUserMessageCard[]>} Обещание, разрешающееся в массив
   * карточек сообщений
   *
   * @example
   * // Загрузка следующих 10 сообщений после первых 5
   * const nextMessages = await service.loadMoreMessages(5, 10);
   *
   * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
   */
  async loadMoreMessages(
    offset: number,
    limit: number
  ): Promise<IUserMessageCard[]> {
    return await fetchMessages(offset, limit);
  }

  /**
   * Отправляет новое сообщение от пользователя
   *
   * @param {string} text - Текстовое содержимое сообщения
   * @param {File[]} files - Массив прикрепленных файлов
   *
   * @returns {Promise<IUserMessageCard[]>} Обещание, разрешающееся
   * в обновленный список сообщений
   *
   * @example
   * const newMessage = await service.submitUserMessage("Привет!", [file1, file2]);
   *
   * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
   */
  async submitUserMessage(
    text: string,
    files: File[]
  ): Promise<IUserMessageCard[]> {
    return await sendMessage(text, files);
  }

  /**
   * Получает конфигурацию доступных функций бота
   *
   * @returns {Promise<IBotCapabilities>} Обещание, разрешающееся
   * в объект возможностей (IBotCapabilities)
   *
   * @example
   * const capabilities = await service.loadCapabilities();
   * console.log('Доступные функции:', capabilities);
   *
   * @see {@link IBotCapabilities} - Интерфейс для Capabilities бота
   */
  async loadCapabilities(): Promise<IBotCapabilities> {
    return await fetchCapabilities();
  }
}
