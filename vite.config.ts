import path from 'node:path';
import { defineConfig } from 'vite';

const libEntry = path.resolve(__dirname, 'src/index.ts');

export default defineConfig({
    resolve: {
        alias: {
            '@arcanumcube': path.resolve(__dirname, 'src'),
        },
    },
    build: {
        lib: {
            entry: libEntry,
            name: 'Arcanumcube',
            fileName: (format) => {
                switch (format) {
                    case 'es':
                        return 'arcanumcube.esm.js';
                    case 'cjs':
                        return 'arcanumcube.cjs';
                    case 'umd':
                    default:
                        return 'arcanumcube.umd.js';
                }
            },
            formats: ['es', 'cjs', 'umd'],
        },
        minify: false,
        sourcemap: true,
        rollupOptions: {
            output: {
                exports: 'named',
                globals: {
                    three: 'THREE',
                    'three/examples/jsm/loaders/GLTFLoader.js': 'GLTFLoader_js',
                    'three/examples/jsm/utils/BufferGeometryUtils.js': 'BufferGeometryUtils',
                    '@tweenjs/tween.js': 'TWEEN',
                },
            },
            external: [
                'three',
                'three/examples/jsm/loaders/GLTFLoader.js',
                'three/examples/jsm/utils/BufferGeometryUtils.js',
                '@tweenjs/tween.js',
            ],
        },
    },
});
