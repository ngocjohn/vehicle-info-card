import typescript from 'rollup-plugin-typescript2';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import postcss from 'rollup-plugin-postcss';
import postcssPresetEnv from 'postcss-preset-env';
import postcssLit from 'rollup-plugin-postcss-lit';
import filesize from 'rollup-plugin-filesize';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import { version } from './package.json';
import { logCardInfo } from './rollup.config.helper.mjs';

const dev = process.env.ROLLUP_WATCH;
const port = process.env.PORT || 8235;
const currentVersion = dev ? 'DEVELOPMENT' : `v${version}`;
const custombanner = logCardInfo(currentVersion);

const replaceOpts = {
  'process.env.ROLLUP_WATCH': JSON.stringify(dev),
  preventAssignment: true,
};

const serveopts = {
  contentBase: ['./dist'],
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
  nodeResolve({ preferBuiltins: false }),
  commonjs(),
  typescript(),
  babel({
    babelHelpers: 'bundled',
    exclude: 'node_modules/**',
  }),
  json(),
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
    inject: false,
  }),
  replace(replaceOpts),
  postcssLit(),
  dev && serve(serveopts),
  !dev && terser(terserOpt),
  !dev && filesize(),
];

export default [
  {
    input: 'src/vehicle-info-card.ts',
    output: [
      {
        dir: './dist',
        format: 'es',
        sourcemap: dev ? true : false,
        inlineDynamicImports: true,
        banner: custombanner,
      },
      {
        dir: './build',
        format: 'es',
        sourcemap: false,
        inlineDynamicImports: true,
        banner: custombanner,
      },
    ],
    watch: {
      exclude: 'node_modules/**',
    },
    plugins: [...plugins],
    moduleContext: (id) => {
      const thisAsWindowForModules = [
        'node_modules/@formatjs/intl-utils/lib/src/diff.js',
        'node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js',
      ];
      if (thisAsWindowForModules.some((id_) => id.trimRight().endsWith(id_))) {
        return 'window';
      }
    },
  },
];
