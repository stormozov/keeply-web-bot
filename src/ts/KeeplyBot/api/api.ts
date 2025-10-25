import { IBotCapabilities, IUserMessageCard } from '../shared/interfaces';

/**
 * URL-адрес сервера
 */
export const SERVER_URL = process.env.SERVER_URL || 'http://localhost:7070';
const URL = SERVER_URL;

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
 * Получение сообщений с сервера с пагинацией
 *
 * @param {number} offset - Количество сообщений, которые нужно пропустить (для пагинации)
 * @param {number} limit - Максимальное количество сообщений для загрузки
 * @returns {Promise<IUserMessageCard[]>} - Массив сообщений в формате IUserMessageCard
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export const fetchMessages = async (
  offset: number = 0,
  limit: number = 10
): Promise<IUserMessageCard[]> => {
  let messages: IUserMessageCard[] = [];

  try {
    const response = await fetch(
      `${URL}/api/messages?offset=${offset}&limit=${limit}`
    );
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
 * @param {File[]} files - Массив файлов для отправки
 * @returns {Promise<IUserMessageCard[]>} - Промис с массивом карточек сообщений
 * @throws {Error} - Если
 *  - запрос не удался
 *  - сервер вернул ошибку
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export const sendMessage = async (
  message: string,
  files: File[] = []
): Promise<IUserMessageCard[]> => {
  try {
    const formData = new FormData();
    formData.append('message', message);

    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await fetch(`${URL}/api/messages`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Удаляет сообщение с указанным идентификатором через API.
 *
 * Эта функция отправляет DELETE-запрос к эндпоинту `/api/messages/{messageId}`.
 * В случае успеха (HTTP 2xx) возвращает `true`. При любых ошибках — сетевых,
 * серверных или валидации входных данных — возвращает `false` и записывает
 * соответствующее сообщение в консоль.
 *
 * @param {string} messageId - Уникальный идентификатор сообщения. Должен быть
 * непустой строкой. Если параметр отсутствует или пуст, функция немедленно
 * вернёт `false` и выведет предупреждение в консоль.
 * @returns {Promise<boolean>}
 * - `true`, если удаление сообщения прошло успешно
 * - `false` в противном случае
 */
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  if (!messageId) {
    console.warn('deleteMessage: messageId is required');
    return false;
  }

  try {
    const response = await fetch(`${URL}/api/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (response.ok) return true;

    // Опционально: логируем тело ошибки, если сервер его возвращает
    let errorMessage = `Failed to delete message. Status: ${response.status}`;
    try {
      const errorData = await response.json().catch(() => ({}));
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Игнорируем ошибки при парсинге тела ошибки
    }

    console.error(errorMessage);
    return false;
  } catch (error) {
    const err = error as Error;
    console.error('Network error while deleting message:', err.message);
    return false;
  }
};

/**
 * Очищает весь чат через API.
 *
 * Эта функция отправляет DELETE-запрос к эндпоинту `/api/messages`.
 * В случае успеха (HTTP 2xx) возвращает `true`. При любых ошибках — сетевых,
 * серверных или валидации входных данных — возвращает `false` и записывает
 * соответствующее сообщение в консоль.
 *
 * @returns {Promise<boolean>}
 * - `true`, если очистка чата прошла успешно
 * - `false` в противном случае
 */
export const deleteAllMessages = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${URL}/api/messages`, {
      method: 'DELETE',
    });

    if (response.ok) return true;

    let errorMessage = `Failed to clear chat. Status: ${response.status}`;
    try {
      const errorData = await response.json().catch(() => ({}));
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Игнорируем ошибки при парсинге тела ошибки
    }

    console.error(errorMessage);
    return false;
  } catch (error) {
    const err = error as Error;
    console.error('Network error while clearing chat:', err.message);
    return false;
  }
};
