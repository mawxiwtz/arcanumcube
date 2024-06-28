import * as THREE from 'three';
import * as ARCCUBE from './arcanumcube.js';

export type Skin = {
    name: string;
    enableEnvMap: boolean;
    modelFiles: Record<ARCCUBE.CubeType, string>;
    modelLoading: boolean;
    models: Record<string, THREE.Mesh>;
    cube: {
        material: () => THREE.Material;
        activate: (mesh: THREE.Mesh) => void;
        deactivate: (mesh: THREE.Mesh) => void;
    };
    sticker: {
        material: (x: number, y: number, z: number, color: ARCCUBE.StickerColor) => THREE.Material;
        activate: (mesh: THREE.Mesh) => void;
        deactivate: (mesh: THREE.Mesh) => void;
    };
};

const standardSkin: Skin = {
    name: 'Standard',
    enableEnvMap: false,
    modelFiles: {
        axis: './asset/standard/axis.glb',
        center: './asset/standard/center.glb',
        edge: './asset/standard/edge.glb',
        corner: './asset/standard/corner.glb',
        sticker: './asset/standard/sticker.glb',
    },
    modelLoading: false,
    models: {},
    cube: {
        material: () => {
            return new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.8,
                roughness: 0.4,
            });
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.3;
            mat.needsUpdate = true;
        },
    },
    sticker: {
        material: (x: number, y: number, z: number, color: ARCCUBE.StickerColor) => {
            const ColorList = [
                '#ffffff', // U: White
                '#00d800', // F: Green
                '#d80000', // R: Red
                '#ffff00', // D: Yellow
                '#0000d8', // B: Blue
                '#ff8000', // L: Orange
            ];

            const col = ColorList[color];
            let texture = undefined;
            if (x === ARCCUBE.SIDE_MIDDLE && y === ARCCUBE.SIDE_MAX && z === ARCCUBE.SIDE_MIDDLE) {
                // load texture
                texture = new THREE.TextureLoader().load('./asset/standard/logo.png');
                texture.flipY = false;
            }

            const mat = new THREE.MeshStandardMaterial({
                color: col,
                metalness: 0.4,
                roughness: 0.2,
            });
            if (texture != null) mat.map = texture;

            return mat;
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.3;
            mat.needsUpdate = true;
        },
    },
};

const metalicSkin: Skin = {
    name: 'Metalic',
    enableEnvMap: true,
    modelFiles: {
        axis: './asset/standard/axis.glb',
        center: './asset/standard/center.glb',
        edge: './asset/standard/edge.glb',
        corner: './asset/standard/corner.glb',
        sticker: './asset/standard/sticker.glb',
    },
    modelLoading: false,
    models: {},
    cube: {
        material: () => {
            return new THREE.MeshStandardMaterial({
                color: 0xe8e8e8,
                metalness: 1.0,
                roughness: 0.1,
            });
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.3;
            mat.needsUpdate = true;
        },
    },
    sticker: {
        material: (x: number, y: number, z: number, color: ARCCUBE.StickerColor) => {
            const ColorList = [
                '#ffffff', // U: White
                '#00d800', // F: Green
                '#d80000', // R: Red
                '#ffff00', // D: Yellow
                '#0000d8', // B: Blue
                '#ff8000', // L: Orange
            ];

            const col = ColorList[color];
            let texture = undefined;
            if (x === ARCCUBE.SIDE_MIDDLE && y === ARCCUBE.SIDE_MAX && z === ARCCUBE.SIDE_MIDDLE) {
                // load texture
                texture = new THREE.TextureLoader().load('./asset/standard/logo.png');
                texture.flipY = false;
            }

            const mat = new THREE.MeshStandardMaterial({
                color: col,
                metalness: 0.7,
                roughness: 0.1,
            });
            if (texture != null) mat.map = texture;

            return mat;
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.3;
            mat.needsUpdate = true;
        },
    },
};

const goldSkin: Skin = {
    name: 'Gold',
    enableEnvMap: true,
    modelFiles: {
        axis: './asset/standard/axis.glb',
        center: './asset/standard/center.glb',
        edge: './asset/standard/edge.glb',
        corner: './asset/standard/corner.glb',
        sticker: './asset/standard/sticker.glb',
    },
    modelLoading: false,
    models: {},
    cube: {
        material: () => {
            return new THREE.MeshStandardMaterial({
                color: 0xfff060,
                metalness: 1.0,
                roughness: 0.0,
            });
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.3;
            mat.needsUpdate = true;
        },
    },
    sticker: {
        material: (x: number, y: number, z: number, color: ARCCUBE.StickerColor) => {
            const ColorList = [
                '#fff8d0', // U: White
                '#00c800', // F: Green
                '#e80000', // R: Red
                '#fff000', // D: Yellow
                '#0000c8', // B: Blue
                '#f87000', // L: Orange
            ];

            const col = ColorList[color];
            let texture = undefined;
            if (x === ARCCUBE.SIDE_MIDDLE && y === ARCCUBE.SIDE_MAX && z === ARCCUBE.SIDE_MIDDLE) {
                // load texture
                texture = new THREE.TextureLoader().load('./asset/standard/logo.png');
                texture.flipY = false;
            }

            const mat = new THREE.MeshStandardMaterial({
                color: col,
                metalness: 1.0,
                roughness: 0.0,
            });
            if (texture != null) mat.map = texture;

            return mat;
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = false;
            mat.opacity = 1.0;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.3;
            mat.needsUpdate = true;
        },
    },
};

const acrylicSkin: Skin = {
    name: 'Acrylic',
    enableEnvMap: true,
    modelFiles: {
        axis: './asset/standard/axis.glb',
        center: './asset/standard/center.glb',
        edge: './asset/standard/edge.glb',
        corner: './asset/standard/corner.glb',
        sticker: './asset/standard/sticker.glb',
    },
    modelLoading: false,
    models: {},
    cube: {
        material: () => {
            return new THREE.MeshStandardMaterial({
                color: 0xf4feff,
                metalness: 1.0,
                roughness: 0.0,
            });
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.6;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.2;
            mat.needsUpdate = true;
        },
    },
    sticker: {
        material: (x: number, y: number, z: number, color: ARCCUBE.StickerColor) => {
            const ColorList = [
                '#ffffff', // U: White
                '#00c800', // F: Green
                '#e80000', // R: Red
                '#fff000', // D: Yellow
                '#0000c8', // B: Blue
                '#f87000', // L: Orange
            ];

            const col = ColorList[color];
            let texture = undefined;
            if (x === ARCCUBE.SIDE_MIDDLE && y === ARCCUBE.SIDE_MAX && z === ARCCUBE.SIDE_MIDDLE) {
                // load texture
                texture = new THREE.TextureLoader().load('./asset/standard/logo.png');
                texture.flipY = false;
            }

            const mat = new THREE.MeshStandardMaterial({
                color: col,
                metalness: 1.0,
                roughness: 0.0,
            });
            if (texture != null) mat.map = texture;

            return mat;
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.7;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshStandardMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.2;
            mat.needsUpdate = true;
        },
    },
};

const crystalSkin: Skin = {
    name: 'Crystal',
    enableEnvMap: true,
    modelFiles: {
        axis: './asset/standard/axis.glb',
        center: './asset/standard/center.glb',
        edge: './asset/standard/edge.glb',
        corner: './asset/standard/corner.glb',
        sticker: './asset/standard/sticker.glb',
    },
    modelLoading: false,
    models: {},
    cube: {
        material: () => {
            return new THREE.MeshBasicMaterial({
                color: 0xffffff,
                refractionRatio: 0.75,
                reflectivity: 1,
            });
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshBasicMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.5;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshBasicMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.2;
            mat.needsUpdate = true;
        },
    },
    sticker: {
        material: (x: number, y: number, z: number, color: ARCCUBE.StickerColor) => {
            const ColorList = [
                '#ffffff', // U: White
                '#00c800', // F: Green
                '#e80000', // R: Red
                '#fff000', // D: Yellow
                '#0000c8', // B: Blue
                '#f87000', // L: Orange
            ];

            const col = ColorList[color];
            let texture = undefined;
            if (x === ARCCUBE.SIDE_MIDDLE && y === ARCCUBE.SIDE_MAX && z === ARCCUBE.SIDE_MIDDLE) {
                // load texture
                texture = new THREE.TextureLoader().load('./asset/standard/logo.png');
                texture.flipY = false;
            }

            const mat = new THREE.MeshBasicMaterial({
                color: col,
                refractionRatio: 0.75,
                reflectivity: 1,
            });
            if (texture != null) mat.map = texture;

            return mat;
        },
        activate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshBasicMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.5;
            mat.needsUpdate = true;
        },
        deactivate: (mesh: THREE.Mesh) => {
            const mat = <THREE.MeshBasicMaterial>mesh.material;
            mat.transparent = true;
            mat.opacity = 0.2;
            mat.needsUpdate = true;
        },
    },
};

export const DefaultSkin = standardSkin;

export const SkinMap: Record<string, Skin> = {
    [standardSkin.name]: standardSkin,
    [metalicSkin.name]: metalicSkin,
    [goldSkin.name]: goldSkin,
    [acrylicSkin.name]: acrylicSkin,
    [crystalSkin.name]: crystalSkin,
};
