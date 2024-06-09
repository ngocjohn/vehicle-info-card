import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';
import image from '@rollup/plugin-image';
import postcss from 'rollup-plugin-postcss';
import postcssPresetEnv from 'postcss-preset-env';
import postcssLit from 'rollup-plugin-postcss-lit';
import filesize from 'rollup-plugin-filesize';

const dev = process.env.ROLLUP_WATCH;
const port = process.env.PORT || 8235;

const serveopts = {
  contentBase: ['./dev'],
  port,
  allowCrossOrigin: true,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
};

const terserOpt = {
  module: true,
  compress: {
    drop_console: ['log', 'error'],
    module: false,
  },
};

const plugins = [
  nodeResolve({}),
  commonjs(),
  typescript(),
  json(),
  image(),
  babel({
    babelHelpers: 'bundled',
    exclude: 'node_modules/**',
  }),
  postcss({
    plugins: [
      postcssPresetEnv({
        stage: 1,
        features: {
          'nesting-rules': true,
        },
      }),
    ],
    extract: false,
  }),
  postcssLit(),
  dev && serve(serveopts),
  !dev && terser(terserOpt),
  !dev && filesize(),
];

export default [
  {
    input: 'src/vehicle-info-card.ts',
    output: {
      file: dev ? './dev/vehicle-info-card-dev.js' : './dist/vehicle-info-card.js',
      format: 'es',
      sourcemap: dev,
      inlineDynamicImports: true,
    },
    plugins: [...plugins],
    moduleContext: {
      // Set specific module contexts if needed
      'node_modules/@formatjs/intl-utils/lib/src/diff.js': 'window',
      'node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js': 'window',
      // Add other modules as needed
    },
  },
];
