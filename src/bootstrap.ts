import { World, type WorldOptions } from './world.js';

declare global {
    interface Window {
        World: (opts: WorldOptions) => void;
    }
}

if (window) {
    window.World = (opts?: WorldOptions) => {
        return new World(opts);
    };
}
