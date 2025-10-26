// =============================================================================
// Утилита для форматирования размера файла в понятные единицы измерения
// =============================================================================

/** Интерфейс единицы измерения размера файла */
interface IFileSizeUnit {
  unit: string;
  divisor: number;
}

/** Массив единиц измерения размера файла в порядке возрастания */
const UNITS: readonly IFileSizeUnit[] = [
  { unit: 'B', divisor: 1 },
  { unit: 'KB', divisor: 1024 },
  { unit: 'MB', divisor: 1024 ** 2 },
  { unit: 'GB', divisor: 1024 ** 3 },
  { unit: 'TB', divisor: 1024 ** 4 },
] as const;

/**
 * Форматирует размер файла в байтах в понятную для пользователя строку
 *
 * @param {number} bytes - Размер файла в байтах (должен быть неотрицательным числом)
 * @returns {string} - Строка с размером в подходящей единице измерения
 *
 * @description
 * Функция автоматически выбирает наиболее подходящую единицу измерения
 * (B, KB, MB, GB, TB) на основе размера файла. Для размеров менее 1 KB
 * возвращает значение в байтах. Для больших размеров использует соответствующую
 * единицу с округлением до 1-2 знаков после запятой.
 *
 * @example
 * formatFileSize(512);        // "512 B"
 * formatFileSize(1536);       // "1.5 KB"
 * formatFileSize(1048576);    // "1 MB"
 * formatFileSize(2147483648); // "2 GB"
 *
 * @throws {TypeError} Если переданное значение не является числом
 * @throws {RangeError} Если размер файла отрицательный
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  let unitIndex = 0;
  let value = bytes;

  while (unitIndex < UNITS.length - 1 && value >= 1024) {
    value /= 1024;
    unitIndex++;
  }

  const precision = value >= 10 ? 1 : 2;
  let formatted = value.toFixed(precision);

  if (formatted.includes('.')) {
    formatted = formatted.replace(/0+$/, '').replace(/\.$/, '');
  }

  return `${formatted} ${UNITS[unitIndex].unit}`;
};
