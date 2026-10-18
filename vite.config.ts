import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        host: '127.0.0.1',
        port: 5173,
        hmr: {
            host: '127.0.0.1',
        },
    },
    // PDF-компоненты рендерятся в Web Worker (@react-pdf/renderer): внедрение
    // /@react-refresh в их модули роняет worker с "window is not defined".
    // Fast Refresh и React Compiler остальных компонентов не трогаем.
    oxc: {
        jsxRefreshExclude: [
            '**/Labels/MatLabelDocument.tsx',
            '**/Labels/NapkinLabelDocument.tsx',
            '**/Labels/TagLabelDocument.tsx',
            '**/Labels/VerticalLabelLayout.tsx',
            '**/Labels/RecyclingSign.tsx',
        ],
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
