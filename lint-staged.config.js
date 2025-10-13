export default {
  // Форматируем только изменённые .ts и .tsx файлы
  'src/**/*.{ts,tsx}': ['yarn format', 'yarn lint:fix'],
  // Форматируем стили
  'src/**/*.{css,scss}': ['yarn format'],
  // Форматируем json
  '**/*.json': ['yarn format'],
};
