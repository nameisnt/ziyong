import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import unpluginAutoImport from 'unplugin-auto-import/vite';
import { VueUseComponentsResolver, VueUseDirectiveResolver } from 'unplugin-vue-components/resolvers';
import unpluginVueComponents from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import pluginExternal from 'vite-plugin-external';
<<<<<<< HEAD
import manifest from './manifest.json';
import packageInfo from './package.json';
=======
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7

const externals = {
  jquery: '$',
  hljs: 'hljs',
  lodash: '_',
  showdown: 'showdown',
  toastr: 'toastr',
  '@popperjs/core': 'Popper',
} as const;

<<<<<<< HEAD
const imageAssetExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

const publicPathIndex = __dirname.lastIndexOf('public');
const relative_sillytavern_path =
  publicPathIndex >= 0
    ? path.relative(path.join(__dirname, 'dist'), __dirname.substring(0, publicPathIndex + 'public'.length))
    : '../../../../../';

export default defineConfig(({ mode }) => {
  if (manifest.version !== packageInfo.version) throw new Error('manifest.json and package.json versions must match');
  const visualMode = mode === 'visual';

  return {
    base: './',
=======
const relative_sillytavern_path = path.relative(
  path.join(__dirname, 'dist'),
  __dirname.substring(0, __dirname.lastIndexOf('public') + 6),
);

export default defineConfig(({ mode }) => ({
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
    plugins: [
      vue({
        features: {
          optionsAPI: false,
<<<<<<< HEAD
          prodDevtools: visualMode,
=======
        prodDevtools: process.env.CI !== 'true',
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
          prodHydrationMismatchDetails: false,
        },
      }),
      unpluginAutoImport({
        dts: true,
        dtsMode: 'overwrite',
<<<<<<< HEAD
        // @types/toastr already declares the global; keep the runtime auto-import.
        ignoreDts: ['toastr'],
=======
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
        imports: [
          'vue',
          'pinia',
          '@vueuse/core',
          { from: '@sillytavern/scripts/i18n', imports: ['t'] },
          { from: 'klona', imports: ['klona'] },
<<<<<<< HEAD
          { from: 'toastr', imports: [['default', 'toastr']] },
=======
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
          { from: 'vue-final-modal', imports: ['useModal'] },
          { from: 'zod', imports: ['z'] },
        ],
        dirs: [{ glob: './src/panel/composable', types: true }],
      }),
      unpluginVueComponents({
        dts: true,
        syncMode: 'overwrite',
        // globs: ['src/panel/component/*.vue'],
        resolvers: [VueUseComponentsResolver(), VueUseDirectiveResolver()],
      }),
<<<<<<< HEAD
      !visualMode && {
=======
    {
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
        name: 'sillytavern_resolver',
        enforce: 'pre',
        resolveId(id) {
          if (id.startsWith('@sillytavern/')) {
            return {
              id: path.join(relative_sillytavern_path, id.replace('@sillytavern/', '')).replaceAll('\\', '/') + '.js',
              external: true,
            };
          }
        },
      },
      pluginExternal({
        externals: libname => {
          if (libname in externals) {
            return externals[libname as keyof typeof externals];
          }
        },
      }),
<<<<<<< HEAD
    ].filter(Boolean),
=======
  ],
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
<<<<<<< HEAD
        ...(visualMode
          ? {
              '@sillytavern/script': path.resolve(__dirname, 'src/testing/sillytavern-script.ts'),
              '@sillytavern/scripts/extensions': path.resolve(__dirname, 'src/testing/sillytavern-extensions.ts'),
              '@sillytavern/scripts/i18n': path.resolve(__dirname, 'src/testing/sillytavern-i18n.ts'),
              '@sillytavern/scripts/openai': path.resolve(__dirname, 'src/testing/sillytavern-openai.ts'),
              '@sillytavern/scripts/world-info': path.resolve(__dirname, 'src/testing/sillytavern-world-info.ts'),
              toastr: path.resolve(__dirname, 'src/testing/visual-toastr.ts'),
            }
          : {}),
=======
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
      },
    },

    build: {
      rollupOptions: {
        input: 'src/index.ts',
        output: {
          format: 'es',
          entryFileNames: '[name].js',
          chunkFileNames: '[name].[hash].chunk.js',
<<<<<<< HEAD
          assetFileNames: assetInfo =>
            imageAssetExtensions.has(path.extname(assetInfo.names[0] || '').toLowerCase())
              ? 'images/[name].[ext]'
              : '[name].[ext]',
=======
        assetFileNames: '[name].[ext]',
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
          preserveModules: false,
        },
      },

      outDir: 'dist',
<<<<<<< HEAD
      emptyOutDir: true,

      sourcemap: false,
=======
    emptyOutDir: false,

    sourcemap: mode === 'production' ? true : 'inline',
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7

      minify: mode === 'production' ? 'terser' : false,
      terserOptions:
        mode === 'production'
          ? {
              format: { quote_style: 1 },
              mangle: { reserved: ['_', 'toastr', 'YAML', '$', 'z'] },
            }
          : {
              format: { beautify: true, indent_level: 2 },
              compress: false,
              mangle: false,
            },

      target: 'esnext',
    },
<<<<<<< HEAD
  };
});
=======
}));
>>>>>>> 29792ccc77088474d2c4eeb7c42285cd2b57f1e7
