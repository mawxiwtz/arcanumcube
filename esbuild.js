import esbuild from 'esbuild';
import chalk from 'chalk';
import fse from 'fs-extra';

const progname = 'arcanumcube';
const srcdir = './src';
const sources = [
    `${srcdir}/${progname}.ts`,
    `${srcdir}/webgl.ts`,
    `${srcdir}/world.ts`,
    `${srcdir}/materials.ts`,
    `${srcdir}/skins.ts`,
    `${srcdir}/pointing.ts`,
    `${srcdir}/heapqueue.ts`,
];
const destdir = './dist';
const staticdir = './static';
const isServeMode = process.argv.includes('--serve');

// create directory and copy files
try {
    fse.rmSync(destdir, { recursive: true, force: true });
    fse.mkdirsSync(destdir);
    fse.mkdirsSync(`${destdir}/lib`);
    fse.copyFileSync(`${staticdir}/index.html`, `${destdir}/index.html`);
    fse.copySync(`${staticdir}/asset`, `${destdir}/asset`);
    fse.copySync(`${staticdir}/img`, `${destdir}/img`);
    fse.copySync(`${staticdir}/draco`, `${destdir}/lib/draco`);
} catch (err) {
    console.error(`[${chalk.red('copying files or directories for distibution failed:')}]\n`, err);
    process.exit(1);
}

// build CommonJS library
await esbuild.build({
    target: 'esnext',
    platform: 'node', // specify one of  'node' 'browser' 'neutral'
    format: 'cjs',
    entryPoints: sources,
    outdir: `${destdir}/lib/cjs`, // output directory
    bundle: false,
    minify: false,
    sourcemap: true,
});

// build ESM library
await esbuild.build({
    target: 'esnext',
    platform: 'node',
    format: 'esm',
    entryPoints: sources,
    outdir: `${destdir}/lib/esm`,
    bundle: false,
    minify: false,
    sourcemap: true,
});

//// build JavaScript library

// build options for JavaScript
const buildOptions = {
    target: 'es2017',
    platform: 'browser',
    format: 'iife',
    entryPoints: [`${srcdir}/bootstrap.ts`],
    outfile: `${destdir}/${progname}.min.js`,
    bundle: true,
    minify: true,
    sourcemap: true,
};

// build library without minified
await esbuild.build({
    ...buildOptions,
    outfile: `${destdir}/${progname}.js`,
    minify: false,
    sourcemap: false,
});

// build minified library and start server
if (isServeMode) {
    // with test server
    let ctx = await esbuild.context({
        ...buildOptions,
        plugins: [
            {
                name: 'on-end',
                setup(build) {
                    build.onEnd((result) => {
                        const message = `Sources rebuilded (error: ${result.errors.length}, warning: ${result.warnings.length})`;
                        console.log(`${chalk.cyan(message)}`);
                    });
                },
            },
        ],
    });

    await ctx.watch();
    console.log(`[${chalk.green('Watching source files ...')}]`);

    await ctx.serve({
        host: 'localhost',
        port: 3000,
        servedir: `${destdir}/`,
    });
    console.log(`[${chalk.green('Web server starting ...')}]`);
} else {
    // build only
    await esbuild.build(buildOptions);
}
