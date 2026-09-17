import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        jogo: resolve(__dirname, 'jogo.html'),
        ranking: resolve(__dirname, 'ranking.html'),
        painel: resolve(__dirname, 'painel_secreto.html')
      }
    }
  }
});
