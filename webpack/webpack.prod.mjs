import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ImageMinimizerPlugin from 'image-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import { merge } from 'webpack-merge';
import WebpackBar from 'webpackbar';
import common from './webpack.common.mjs';

export default merge(common, {
  mode: 'production',
  output: {
    filename: 'main.[contenthash].js',
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: {
            drop_console: true, // убрать console.log из продакшена
          },
        },
      }),
      new CssMinimizerPlugin(),
      new ImageMinimizerPlugin({
        generator: [
          {
            // Конвертируем изображения в .webp
            preset: 'webp',
            implementation: ImageMinimizerPlugin.imageminGenerate,
            options: {
              plugins: {
                'imagemin-mozjpeg': { quality: 75 },
                'imagemin-pngquant': { quality: [0.6, 0.8] },
                'imagemin-webp': { quality: 75 },
              },
            },
          },
        ],
      }),
    ],
    splitChunks: {
      chunks: 'all',
    },
  },
  plugins: [
    new WebpackBar({
      profile: true,
      basic: false,
    }),
  ],
});
