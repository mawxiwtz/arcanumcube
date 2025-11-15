export * from './core.js';
export * from './skins.js';
export * from './webgl.js';

import { ArcanumCube } from './core.js';

export const create = (opts?: { debug?: boolean }) => new ArcanumCube(opts);
