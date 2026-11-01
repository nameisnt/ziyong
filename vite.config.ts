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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439

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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
    plugins: [
      vue({
        features: {
          optionsAPI: false,
<<<<<<< HEAD
          prodDevtools: visualMode,
=======
        prodDevtools: process.env.CI !== 'true',
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
        imports: [
          'vue',
          'pinia',
          '@vueuse/core',
          { from: '@sillytavern/scripts/i18n', imports: ['t'] },
          { from: 'klona', imports: ['klona'] },
<<<<<<< HEAD
          { from: 'toastr', imports: [['default', 'toastr']] },
=======
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439

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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439

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
>>>>>>> 54e64c5a2cb5526450906019170b7f49b7f83439
