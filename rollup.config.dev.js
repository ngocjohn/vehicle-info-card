import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import replace from '@rollup/plugin-replace';
import { version } from './package.json';
import { logCardInfo, defaultPlugins } from './rollup.config.helper.mjs';

const dev = process.env.ROLLUP_WATCH;
const port = process.env.PORT || 8235;
const debug = process.env.DEBUG;

const currentVersion = dev ? `DEV - v${version}` : `v${version}`;
const custombanner = logCardInfo(currentVersion);

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

const replaceOpts = {
  preventAssignment: true,
  'process.env.DEBUG': JSON.stringify(debug),
  __DEBUG__: debug || false,
};

const plugins = [dev && serve(serveopts), !dev && terser(terserOpt)];

export default [
  {
    input: 'src/main-b.ts',
    output: {
      file: 'dist/vehicle-info-card-legacy.js',
      format: 'es',
      sourcemap: false,
      inlineDynamicImports: true,
    },
    plugins: [replace(replaceOpts), ...defaultPlugins, ...plugins],
    watch: false,
  },
  {
    input: 'src/main.ts',
    output: [
      {
        file: 'dist/vehicle-info-card.js',
        format: 'es',
        sourcemap: true,
        inlineDynamicImports: true,
        banner: custombanner,
      },
    ],
    watch: {
      exclude: 'node_modules/**',
      buildDelay: 500,
    },
    plugins: [replace(replaceOpts), ...defaultPlugins, ...plugins],
    moduleContext: (id) => {
      const thisAsWindowForModules = [
        'node_modules/@formatjs/intl-utils/lib/src/diff.js',
        'node_modules/@formatjs/intl-utils/lib/src/resolve-locale.js',
      ];
      if (thisAsWindowForModules.some((id_) => id.trimRight().endsWith(id_))) {
        return 'window';
      }
    },
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return; // Ignore circular dependency warnings
      warn(warning); // Display other warnings
    },
  },
];
