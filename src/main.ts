import { createApp } from 'vue';
import App from './App.vue';

const appElement = document.getElementById('app');
if (!appElement) {
  throw new Error("Could not find app element to mount to");
}

createApp(App).mount(appElement);
