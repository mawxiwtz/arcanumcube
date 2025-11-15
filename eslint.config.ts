import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        files: ['**/*.{js,mjs,cjs}'],
        plugins: { js },
        extends: ['js/recommended'],
        languageOptions: { globals: globals.browser },
        ignores: ['dist/', 'node_modules/'],
    },
    [
        ...tseslint.configs.recommended,
        {
            ignores: ['dist/', 'node_modules/'],
        },
    ],
]);
