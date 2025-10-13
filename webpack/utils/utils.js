import { glob } from 'glob';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';

/**
 * Вспомогательная функция: находит все HTML-файлы в папке src/
 *
 * @returns
 */
export const getHtmlEntries = () => {
  const htmlFiles = glob.sync(['./src/**/*.html', './public/**/*.html']);
  return htmlFiles.map((file) => {
    const name = path.parse(file).name;

    return new HtmlWebpackPlugin({
      template: file,
      filename: `${name}.html`,
      chunks: ['index'], // используем один и тот же entry
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
    });
  });
};
