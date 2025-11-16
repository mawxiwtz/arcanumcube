import fs from 'node:fs';
import path from 'node:path';
import dts from 'rollup-plugin-dts';

// ソースディレクトリ
const srcDir = 'src';
// typesを作る対象ソースファイルの拡張子
const extensions = ['.js', '.ts'];
// 出力ディレクトリ
const destDir = './dist/types';

function getDirFiles(dir) {
    const files = fs.readdirSync(dir);
    const entries = {};
    for (const file of files) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
            const name = path.basename(file, ext);
            entries[name] = path.join(dir, file);
        }
    }
    return entries;
}

const inputFiles = getDirFiles(srcDir);

export default {
    input: inputFiles,
    output: { dir: destDir, format: 'es', preserveModules: true },
    plugins: [dts()],
};
