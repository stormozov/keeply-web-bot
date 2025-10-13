import CopyPlugin from 'copy-webpack-plugin';
import Dotenv from 'dotenv-webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { getHtmlEntries } from './utils/utils.js';

const isAnalyze = process.env.ANALYZE === 'true';

// Получаем все HTML-плагины
const htmlPlugins = getHtmlEntries();

export default {
  entry: {
    index: './src/index.ts',
  },
  output: {
    filename: 'main.js',
    path: path.resolve(import.meta.dirname, '../dist'),
    clean: true,
    publicPath: './',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      // TypeScript
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
          {
            loader: 'ts-loader',
          },
        ],
        exclude: /node_modules/,
      },

      // SCSS
      {
        test: /\.s[ac]ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: {
                  'postcss-preset-env': {},
                },
              },
            },
          },
          'sass-loader',
        ],
      },

      // Изображения
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[name][ext]',
        },
      },

      // Шрифты
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: (pathData) => {
            const { sourceFilename } = pathData;
            if (!sourceFilename) return 'assets/fonts/[name][ext]';

            // Получаем путь относительно src
            const relativeToSrc = path.relative('src', sourceFilename);
            // Меняем расширение, если нужно, или оставляем как есть
            return `assets/${relativeToSrc}`;
          },
        },
      },
    ],
  },
  plugins: [
    ...htmlPlugins,
    new MiniCssExtractPlugin({
      filename: 'style.[name].[contenthash].css',
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(import.meta.dirname, '../src/assets/images'),
          to: path.resolve(import.meta.dirname, '../dist/assets/images'),
          globOptions: {
            ignore: ['**/.DS_Store'],
          },
          noErrorOnMissing: true,
        },
      ],
    }),
    new Dotenv(),
    ...(isAnalyze ? [new BundleAnalyzerPlugin()] : []),
  ],
};
