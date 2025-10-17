import { IBotCapabilities, IUserMessageCard } from '../shared/interfaces';

/**
 * URL-адрес сервера
 */
const URL = process.env.SERVER_URL;

/**
 * Получение Capabilities бота от сервера
 *
 * @returns {Promise<IBotCapabilities>}
 *  - Capabilities бота в формате IBotCapabilities
 *  - Если запрос не удался, возвращает пустой объект
 *
 * @see {@link IBotCapabilities} - Интерфейс для Capabilities бота
 */
export const fetchCapabilities = async (): Promise<IBotCapabilities> => {
  try {
    const response = await fetch(`${URL}/api/capabilities`);
    if (!response.ok) return {} as IBotCapabilities;
    return response.json();
  } catch {
    return {} as IBotCapabilities;
  }
};

/**
 * Получение всех сообщений с сервера
 *
 * @returns {Promise<IUserMessageCard[]>} - Массив сообщений в формате IUserMessageCard
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export const fetchMessages = async (): Promise<IUserMessageCard[]> => {
  let messages: IUserMessageCard[] = [];

  try {
    const response = await fetch(`${URL}/api/messages`);
    if (!response.ok) messages = [];
    messages = await response.json();
  } catch {
    messages = [];
  }

  return messages;
};

/**
 * Отправка сообщения боту на сервер
 *
 * @param {string} message - Сообщение пользователя
 * @returns {Promise<IUserMessageCard[]>} - Промис с массивом карточек сообщений
 * @throws {Error} - Если
 *  - запрос не удался
 *  - сервер вернул ошибку
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export const sendMessage = async (
  message: string
): Promise<IUserMessageCard[]> => {
  try {
    const response = await fetch(`${URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
