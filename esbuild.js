import esbuild from 'esbuild';
import chalk from 'chalk';
import fse from 'fs-extra';

const progname = 'arcanumcube';
const srcdir = './src';
const sources = [`${srcdir}/${progname}.ts`, `${srcdir}/core.ts`];
const externals = ['three'];
const destdir = './dist';
const staticdir = './static';
const isServeMode = process.argv.includes('--serve');

// create directory and copy files
try {
    fse.rmSync(destdir, { recursive: true, force: true });
    fse.mkdirsSync(destdir);
    fse.copyFileSync('./index.html', `${destdir}/index.html`);
} catch (err) {
    console.error(`[${chalk.red('copying files or directories for distibution failed:')}]\n`, err);
    process.exit(1);
}

// base build options
const buildOptions = {
    target: 'esnext',
    platform: 'node', // specify one of  'node' 'browser' 'neutral'
    format: 'esm',
    entryPoints: sources,
    bundle: true,
    minify: false,
    sourcemap: false,
    external: externals,
};

// build CommonJS library
await esbuild.build({
    ...buildOptions,
    format: 'cjs',
    entryNames: '[name]',
    outdir: `${destdir}/cjs`,
});

/////////////////////////////////////
// build ESM library and start server
const buildOptionsESMMinify = {
    ...buildOptions,
    format: 'esm',
    entryNames: '[name].module.min',
    outdir: `${destdir}/esm`,
    minify: true,
};
await esbuild.build(buildOptionsESMMinify);

const buildOptionsESM = {
    ...buildOptions,
    format: 'esm',
    entryNames: '/[name].module',
    outdir: `${destdir}/esm`,
};

if (isServeMode) {
    // with test server
    let ctx = await esbuild.context({
        ...buildOptionsESM,
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
    await esbuild.build(buildOptionsESM);
}
