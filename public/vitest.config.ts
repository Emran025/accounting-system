/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['./tests/**/*.test.ts', './tests/**/*.test.tsx'],
        coverage: {
            provider: 'v8',
            include: ['stores/**/*.ts'],
            exclude: ['stores/index.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
