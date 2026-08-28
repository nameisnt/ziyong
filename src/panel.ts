<<<<<<< HEAD
import { initPhoneLifecycle } from '@/core/phoneLifecycle';

export function initPanel() {
  initPhoneLifecycle();
=======
import Panel from '@/Panel.vue';
import { App } from 'vue';

const app = createApp(Panel);

const pinia = createPinia();
app.use(pinia);

declare module 'vue' {
  interface ComponentCustomProperties {
    t: typeof t;
  }
}
const i18n = {
  install: (app: App) => {
    app.config.globalProperties.t = t;
  },
};
app.use(i18n);

export function initPanel() {
  const $app = $('<div id="tavern_extension_example">').appendTo('#extensions_settings2');
  app.mount($app[0]);
>>>>>>> 76aca4ec221690c3b2e123ce8cb7b0a3603be7c2
}
