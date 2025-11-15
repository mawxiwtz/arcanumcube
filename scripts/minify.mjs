import path from 'node:path';
import process from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import { transform } from 'esbuild';

const distDir = path.resolve(process.cwd(), 'dist');

const targets = [
    {
        source: 'arcanumcube.esm.js',
        output: 'arcanumcube.esm.min.js',
        format: 'esm',
    },
    {
        source: 'arcanumcube.cjs',
        output: 'arcanumcube.min.cjs',
        format: 'cjs',
    },
    {
        source: 'arcanumcube.umd.js',
        output: 'arcanumcube.umd.min.js',
        format: 'iife',
    },
];

const run = async () => {
    for (const target of targets) {
        const sourcePath = path.join(distDir, target.source);
        const outputPath = path.join(distDir, target.output);

        const sourceCode = await readFile(sourcePath, 'utf8');

        const result = await transform(sourceCode, {
            format: target.format,
            minify: true,
            legalComments: 'none',
            sourcefile: target.source,
            sourcemap: true,
            globalName: target.format === 'iife' ? 'Arcanumcube' : '',
        });

        const sourceMapFile = `${path.basename(target.output)}.map`;
        const minifiedCode =
            result.code + (result.map ? `\n//# sourceMappingURL=${sourceMapFile}\n` : '\n');

        await writeFile(outputPath, minifiedCode, 'utf8');

        if (result.map) {
            await writeFile(`${outputPath}.map`, result.map, 'utf8');
        }
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
