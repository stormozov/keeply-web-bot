// =============================================================================
// Утилита для форматирования времени в человеко-понятном формате
// =============================================================================

/**
 * Представляет допустимый входной тип для функции форматирования времени.
 *
 * Поддерживаются:
 * - ISO 8601 строка (например, `"2025-10-26T18:29:35.839Z"`)
 * - timestamp в миллисекундах или секундах (автоопределение)
 * - экземпляр `Date`
 */
type TimestampInput = string | number | Date;

/**
 * Представляет категорию времени для форматирования.
 * @internal
 */
type TimeCategory = 'today' | 'yesterday' | 'thisWeek' | 'older';

/**
 * Константа с сокращёнными названиями дней недели по порядку,
 * начиная с воскресенья (индекс 0), как возвращает {@link Date.getDay}.
 *
 * @internal
 */
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

/**
 * Безопасно преобразует входное значение в объект {@link Date}.
 *
 * @param {TimestampInput} input - Входное значение для парсинга.
 * @returns {Date | null} Валидный объект `Date` или `null`, если парсинг невозможен.
 * @internal
 */
const parseDate = (input: TimestampInput): Date | null => {
  try {
    let date: Date;

    if (typeof input === 'string') {
      date = new Date(input);
    } else if (typeof input === 'number') {
      date = new Date(input >= 1e13 ? input : input * 1000);
    } else if (input instanceof Date) {
      date = input;
    } else {
      return null;
    }

    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Определяет категорию временного интервала относительно текущего момента.
 *
 * @param {Date} date - Дата для классификации.
 * @param {Date} now - Текущая дата (по умолчанию — `new Date()`), используется
 * для тестирования.
 *
 * @returns {TimeCategory} Категория времени.
 * @internal
 */
const getTimeCategory = (date: Date, now: Date = new Date()): TimeCategory => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.floor(
    (today.getTime() - targetDay.getTime()) / 86400000
  ); // 24 * 60 * 60 * 1000

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1 && diffDays <= 6) return 'thisWeek';

  return 'older';
};

/**
 * Форматирует дату в строку в зависимости от её временной категории.
 *
 * @param {Date} date - Дата для форматирования.
 * @param {TimeCategory} category - Категория, определяющая формат вывода.
 *
 * @returns {string} Отформатированная строка.
 * @internal
 */
const formatByCategory = (date: Date, category: TimeCategory): string => {
  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  switch (category) {
    case 'today':
      return time;
    case 'yesterday':
      return `вчера ${time}`;
    case 'thisWeek':
      return `${WEEKDAYS[date.getDay()]} ${time}`;
    case 'older':
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}.${month}.${year}`;
  }
};

/**
 * Форматирует дату в человеко читаемом виде по аналогии с Telegram.
 *
 * Поведение:
 * - **Сегодня**: `"14:30"`
 * - **Вчера**: `"вчера 14:30"`
 * - **Последние 6 дней**: `"пн 14:30"`, `"вт 09:15"` и т.д.
 * - **Раньше**: `"05.03.24"` (без времени)
 *
 * Поддерживает вход в виде:
 * - ISO 8601 строки (`"2025-10-26T18:29:35.839Z"`)
 * - числового timestamp (в секундах или миллисекундах)
 * - экземпляра `Date`
 *
 * ⚠️ При некорректном входе возвращает `"—"` вместо выброса ошибки,
 * чтобы избежать падения пользовательского интерфейса.
 *
 * @param {TimestampInput} input - Входная дата в одном из поддерживаемых
 * форматов.
 * @returns Отформатированная строка в стиле Telegram или `"—"` при ошибке.
 *
 * @example
 * ```ts
 * formatTelegramTime("2025-10-26T18:29:35.839Z"); // "26.10.25"
 * formatTelegramTime(Date.now());                 // "14:30"
 * formatTelegramTime("invalid");                  // "—"
 * ```
 */
export const formatTelegramTime = (input: TimestampInput): string => {
  const date = parseDate(input);
  if (!date) return '—';
  return formatByCategory(date, getTimeCategory(date));
};
