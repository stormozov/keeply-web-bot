import { IBotCapabilities } from '../shared/interfaces';

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
