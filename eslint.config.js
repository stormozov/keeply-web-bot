import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';

export default [
  {
    ignores: [
      'dist',
      'node_modules',
      'build',
      'coverage',
      '.yarn',
      '.yarnrc',
      '.pnp.cjs',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      // TypeScript ESLint рекомендованные правила
      ...ts.configs.recommended.rules,

      // Кастомные правила
      'no-console': ['warn'], // Добавляет предупреждение при использовании console.log
      'no-debugger': ['error'], // Выключает использование debugger
      '@typescript-eslint/no-array-delete': ['error'], // Выключает использование delete при удалении элемента массива
      '@typescript-eslint/no-duplicate-enum-values': ['error'], // Выключает использование одинаковых значений в enum
      '@typescript-eslint/no-duplicate-type-constituents': ['error'], // Выключает использование одинаковых типов в объявлении типа
      '@typescript-eslint/no-explicit-any': ['warn'], // Предупреждение при использовании any
      '@typescript-eslint/no-empty-interface': ['warn'], // Предупреждение при использовании пустых интерфейсов
      '@typescript-eslint/no-extra-non-null-assertion': ['error'], // Выключает использование дополнительных утверждений !
      '@typescript-eslint/no-extraneous-class': ['error'], // Выключает использование классов только с статическими методами
      '@typescript-eslint/no-unused-vars': ['error'], // Выключает использование неиспользуемых переменных
      '@typescript-eslint/no-unnecessary-parameter-property-assignment': [
        'error',
      ], // Предупреждение при использовании ненужного присваивания свойству параметра
      '@typescript-eslint/no-unnecessary-qualifier': ['error'], // Предупреждение при использовании ненужного квалификатора
      '@typescript-eslint/no-unnecessary-template-expression': ['error'], // Предупреждение при использовании ненужного выражения шаблона
      '@typescript-eslint/no-unsafe-call': ['error'], // Предупреждение при использовании небезопасного вызова
      '@typescript-eslint/no-useless-empty-export': ['error'], // Предупреждение при использовании пустого экспорта
      '@typescript-eslint/no-use-before-define': ['error'], // Предупреждение при использовании переменных до объявления
      '@typescript-eslint/no-require-imports': ['error'], // Требуем использования import вместо require
      '@typescript-eslint/no-redundant-type-constituents': ['error'], // Предупреждение при использовании одинаковых типов в объявлении типа
      '@typescript-eslint/no-confusing-non-null-assertion': ['error'], // Это правило выделяет неоднознач. утверждения !
      '@typescript-eslint/no-floating-promises': ['error'], // Предупреждение при использовании неоднозначных промисов
      '@typescript-eslint/no-for-in-array': ['error'], // Предупреждение при использовании for-in с массивом
      '@typescript-eslint/no-implied-eval': ['error'], // Предупреждение при использовании eval()
      '@typescript-eslint/no-misused-new': ['error'], // Предупреждение при использовании new в классе
      '@typescript-eslint/no-mixed-enums': ['error'], // Предупреждение при использовании разных типов в enum
      '@typescript-eslint/no-namespace': ['error'], // Предупреждение при использовании namespace
      '@typescript-eslint/no-non-null-asserted-optional-chain': ['error'], // Предупреждение при использовании ! в опциональной цепочке
      '@typescript-eslint/no-non-null-assertion': ['error'], // Предупреждение при использовании утверждения, не являющиеся нулевыми, с помощью постфиксного оператора !
      '@typescript-eslint/no-this-alias': ['error'], // Предупреждение при использовании this в переменной вместо this в контексте стрелочной функции
      '@typescript-eslint/explicit-function-return-type': ['error'], // Требуем явного указания типа возвращаемого значения функции
      '@typescript-eslint/only-throw-error': ['error'], // Запрещает неправильное использование значений, не являющихся ошибками, в качестве исключений.
      '@typescript-eslint/prefer-for-of': ['error'], // Требуем использования for-of вместо стандартного for цикла
      '@typescript-eslint/prefer-enum-initializers': ['error'], // Требуем явное использование инициализаторов в enum
      '@typescript-eslint/prefer-optional-chain': ['error'], // Требуем использование опциональной цепочки вместо цепочки &&
      '@typescript-eslint/prefer-reduce-type-parameter': ['error'], // Требуем использование параметра вместо приведения типа в reduce
      '@typescript-eslint/prefer-return-this-type': ['error'], // Требуем использование this только в том случае, когда возвращается сам this
      '@typescript-eslint/prefer-string-starts-ends-with': ['error'], // Требуем использование startsWith и endsWith вместо indexOf
      '@typescript-eslint/promise-function-async': ['error'], // Требуем, чтобы любая функция или метод, возвращающие промис, были помечены как async.
      '@typescript-eslint/related-getter-setter-pairs': ['error'], // Предупреждение при использовании несвязанных геттеров и сеттеров
      '@typescript-eslint/restrict-plus-operands': ['error'], // Предупреждение при использовании оператора + с несовместимыми типами
      '@typescript-eslint/max-params': ['error', { maximum: 6 }], // Требуем не более 6 параметров в функции
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/member-ordering': [
        'error',
        {
          classes: ['field', 'constructor', 'method'],
          classExpressions: ['field', 'constructor', 'method'],
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'allow',
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: true,
          },
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
          custom: {
            regex: '^E[A-Z]',
            match: true,
          },
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          prefix: ['T'],
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase'],
          prefix: ['is', 'should', 'has', 'can', 'did', 'will'],
        },
      ],
    },
  },
  {
    // Отключает правила, конфликтующие с Prettier
    ...prettier,
  },
  {
    // Включает Prettier как правило ESLint
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      prettier: pluginPrettier,
    },
    rules: {
      'prettier/prettier': ['error'],
    },
  },
];
