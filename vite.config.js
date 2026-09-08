import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    base: './',
    plugins: [viteSingleFile()],
    server: {
        host: '0.0.0.0',
        port: 5173
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'esbuild'
    }
});
