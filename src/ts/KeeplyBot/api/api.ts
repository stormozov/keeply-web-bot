import axios, { AxiosProgressEvent } from 'axios';
import { IBotCapabilities, IUserMessageCard } from '../shared/interfaces';

/**
 * URL-адрес сервера
 */
export const SERVER_URL =
  process.env.SERVER_URL || process.env.BACKUP_SERVER_URL;
const URL = SERVER_URL;

/**
 * Получение Capabilities бота от сервера
 *
 * @returns {Promise<IBotCapabilities>}
 *  - Capabilities бота в формате IBotCapabilities
 *
 * @throws {Error} - Если запрос не удался или сервер вернул ошибку
 *
 * @see {@link IBotCapabilities} - Интерфейс для Capabilities бота
 */
export const fetchCapabilities = async (): Promise<IBotCapabilities> => {
  try {
    const response = await fetch(`${URL}/api/capabilities`);
    if (!response.ok) {
      let errorMessage = `Failed to fetch capabilities. Status: ${response.status}`;
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Игнорируем ошибки при парсинге тела ошибки
      }
      throw new Error(errorMessage);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
};

/**
 * Получение сообщений с сервера с пагинацией
 *
 * @param {number} offset - Количество сообщений, которые нужно пропустить (для пагинации)
 * @param {number} limit - Максимальное количество сообщений для загрузки
 * @returns {Promise<IUserMessageCard[]>} - Массив сообщений в формате IUserMessageCard
 *
 * @throws {Error} - Если запрос не удался или сервер вернул ошибку
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export const fetchMessages = async (
  offset: number = 0,
  limit: number = 10
): Promise<IUserMessageCard[]> => {
  try {
    const response = await fetch(
      `${URL}/api/messages?offset=${offset}&limit=${limit}`
    );
    if (!response.ok) {
      let errorMessage = `Failed to fetch messages. Status: ${response.status}`;
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Игнорируем ошибки при парсинге тела ошибки
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    throw error;
  }
};

/**
 * Отправка сообщения боту на сервер
 *
 * @param {string} message - Сообщение пользователя
 * @param {File[]} files - Массив файлов для отправки
 * @param {(progress: number) => void} onUploadProgress - Коллбек для прогресса
 * загрузки
 *
 * @returns {Promise<IUserMessageCard[]>} - Промис с массивом карточек сообщений
 *
 * @throws {Error} - Если
 *  - запрос не удался
 *  - сервер вернул ошибку
 *
 * @see {@link IUserMessageCard} - Интерфейс для карточек сообщений
 */
export const sendMessage = async (
  message: string,
  files: File[] = [],
  onUploadProgress?: (progress: number) => void
): Promise<IUserMessageCard[]> => {
  try {
    const formData = new FormData();
    formData.append('message', message);

    files.forEach((file) => formData.append('files', file));

    const response = await axios.post(`${URL}/api/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(progress);
        }
      },
    });

    // Проверяем успешность ответа сервера
    if (response.data && response.data.success === false) {
      throw new Error(response.data.error || 'Ошибка сервера');
    }

    return response.data.data || response.data;
  } catch (error: any) {
    console.error('Error sending message:', error);

    // Если ошибка от сервера, используем её сообщение
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }

    // Иначе используем стандартное сообщение
    throw error;
  }
};

/**
 * Удаляет сообщение с указанным идентификатором через API.
 *
 * Эта функция отправляет DELETE-запрос к эндпоинту `/api/messages/{messageId}`.
 * В случае успеха (HTTP 2xx) возвращает `true`.
 *
 * @param {string} messageId - Уникальный идентификатор сообщения. Должен быть
 * непустой строкой.
 * @returns {Promise<boolean>}
 * - `true`, если удаление сообщения прошло успешно
 *
 * @throws {Error} - Если запрос не удался, сервер вернул ошибку или messageId пуст
 */
export const deleteMessage = async (messageId: string): Promise<boolean> => {
  if (!messageId) {
    throw new Error('deleteMessage: messageId is required');
  }

  try {
    const response = await fetch(`${URL}/api/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (response.ok) return true;

    let errorMessage = `Failed to delete message. Status: ${response.status}`;
    try {
      const errorData = await response.json().catch(() => ({}));
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Игнорируем ошибки при парсинге тела ошибки
    }

    throw new Error(errorMessage);
  } catch (error) {
    throw error;
  }
};

/**
 * Очищает весь чат через API.
 *
 * Эта функция отправляет DELETE-запрос к эндпоинту `/api/messages`.
 * В случае успеха (HTTP 2xx) возвращает `true`.
 *
 * @returns {Promise<boolean>}
 * - `true`, если очистка чата прошла успешно
 *
 * @throws {Error} - Если запрос не удался или сервер вернул ошибку
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
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Игнорируем ошибки при парсинге тела ошибки
    }

    throw new Error(errorMessage);
  } catch (error) {
    throw error;
  }
};

/**
 * Получает позицию сообщения в общем списке сообщений.
 *
 * Эта функция отправляет GET-запрос к эндпоинту
 * `/api/messages/{messageId}/position` и возвращает индекс сообщения
 * в отсортированном массиве (от 0 до total-1, где 0 - самое старое сообщение).
 *
 * @param {string} messageId - Уникальный идентификатор сообщения. Должен
 * быть непустой строкой.
 * @returns {Promise<number | null>} - Индекс сообщения или null, если сообщение
 * не найдено
 *
 * @throws {Error} - Если запрос не удался, сервер вернул ошибку или messageId
 * пуст
 */
export const getMessagePosition = async (
  messageId: string
): Promise<number | null> => {
  if (!messageId) {
    throw new Error('fetchMessagePosition: messageId is required');
  }

  try {
    const response = await fetch(`${URL}/api/messages/${messageId}/position`);
    if (!response.ok) {
      let errorMessage = `Failed to fetch message position. Status: ${response.status}`;
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Игнорируем ошибки при парсинге тела ошибки
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.success ? data.position : null;
  } catch (error) {
    throw error;
  }
};

/**
 * Скачивает вложения сообщения в виде ZIP-архива.
 *
 * Эта функция отправляет GET-запрос к эндпоинту
 * `/api/messages/{messageId}/attachments/download`, получает ZIP-архив
 * с вложениями и инициирует скачивание файла в браузере.
 *
 * @param {string} messageId - Уникальный идентификатор сообщения. Должен
 * быть непустой строкой.
 * @returns {Promise<Response>} - Ответ от сервера с содержимым ZIP-архива
 *
 * @throws {Error} - Если запрос не удался, сервер вернул ошибку или messageId
 * пуст
 */
export const downloadAttachments = async (
  messageId: string
): Promise<Response> => {
  if (!messageId) throw new Error('downloadAttachments: messageId is required');

  const url = `${URL}/api/messages/${messageId}/attachments/download`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Получает справочное сообщение от бота.
 *
 * Эта функция отправляет GET-запрос к эндпоинту `/api/messages/help`
 * и возвращает массив сообщений от бота.
 *
 * @returns {Promise<IUserMessageCard[]>} - Массив сообщений от бота
 *
 * @throws {Error} - Если запрос не удался или сервер вернул ошибку
 */
export const fetchHelpMessage = async (): Promise<IUserMessageCard[]> => {
  try {
    const response = await fetch(`${URL}/api/messages/help`);
    if (!response.ok) {
      let errorMessage = `Failed to fetch help message. Status: ${response.status}`;
      try {
        const errorData = await response.json().catch(() => ({}));
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Игнорируем ошибки при парсинге тела ошибки
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    throw error;
  }
};
