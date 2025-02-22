import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
//import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as TWEEN from '@tweenjs/tween.js';
import { OutlineShaderMaterial } from './materials.js';
import {
    SIDE_MAX,
    SIDE_MIN,
    CUBE,
    FACE,
    CUBE_ANGLES,
    TWIST_RULE,
    Cube,
    ArcanumCube,
    getRandomTwistList,
} from './core.js';
import type { Face, Twist, Sticker } from './core.js';
import { type Skin, DefaultSkin, DefaultModel } from './skins.js';

export const CUBE_SIDE_LEN = 1.9; // meter of one side of cube (100/1 scale)

const COLOR_SELECTED = new THREE.Vector4(1.0, 0.7, 0.0, 1.0);

const STICKER_FACE_2_ANGLE: Record<Face, [x: number, y: number, z: number]> = {
    [FACE.U]: [0, 0, 0],
    [FACE.F]: [90, 0, 0],
    [FACE.R]: [90, 90, 0],
    [FACE.D]: [180, 0, 0],
    [FACE.B]: [90, 180, 0],
    [FACE.L]: [90, -90, 0],
} as const;

const cacheGLTFModels: Record<string, THREE.Mesh> = {};

async function _loadGLTFModelGeometry(filename: string): Promise<THREE.Mesh> {
    const getMeshFromGLTF = (model: GLTF) => {
        const geos: THREE.BufferGeometry[] = [];
        model.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                geos.push(m.geometry);
                //m.receiveShadow = true;
                //m.castShadow = true;
            }
        });

        const geometry = BufferGeometryUtils.mergeGeometries(geos);
        return new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
    };

    /*
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./lib/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });
    */

    const gltfLoader = new GLTFLoader();
    //gltfLoader.setDRACOLoader(dracoLoader);

    const mesh =
        filename in DefaultModel
            ? await gltfLoader.parseAsync(atob(DefaultModel[filename]), '.').then(getMeshFromGLTF) // read from embedded code
            : await gltfLoader.loadAsync(filename).then(getMeshFromGLTF); // read fron gltf/glb file

    cacheGLTFModels[filename] = mesh;
    return mesh;
}

async function _loadModels(skin: Skin) {
    const files = [CUBE.AXIS, CUBE.CENTER, CUBE.EDGE, CUBE.CORNER, CUBE.STICKER];
    for (const f of files) {
        const filename = skin.modelFiles[f];
        skin.models[f] =
            filename in cacheGLTFModels
                ? cacheGLTFModels[filename]
                : await _loadGLTFModelGeometry(filename);
    }
}

type WebGLSticker = Sticker & {
    mesh?: THREE.Mesh;
};

export type WebGLCubeConfig = {
    scale: number;
    stickerScale: number;
    gap: number;
    enableShadow: boolean;
    skin: Skin;
    envMap?: THREE.Texture;
    wireframe: boolean;
};

class WebGLCube extends Cube {
    protected override _stickers: WebGLSticker[] = [];

    private _config: WebGLCubeConfig;
    private _skin: Skin;
    private _group: THREE.Group;
    private _entityGroup: THREE.Group;
    private _outlineGroup: THREE.Group;

    constructor(x: number, y: number, z: number, opts?: Partial<WebGLCubeConfig>) {
        super(x, y, z);

        this._group = new THREE.Group();
        this._entityGroup = new THREE.Group();
        this._outlineGroup = new THREE.Group();
        this._config = {
            scale: 1.0,
            stickerScale: 0.92,
            gap: 0.01,
            enableShadow: false,
            skin: DefaultSkin,
            wireframe: false,
        };

        if (opts) {
            // copy specified parameters
            Object.assign(this._config, opts);
        }

        this._skin = this._config.skin;
    }

    getGroup(): THREE.Group {
        return this._group;
    }

    setStickerScale(scale: number) {
        this._config.stickerScale = scale;
    }

    setGap(gap: number) {
        this._config.gap = gap;
    }

    override getStickers(): WebGLSticker[] {
        return this._stickers;
    }

    getEntityGroup(): THREE.Group {
        return this._entityGroup;
    }

    getOutlineGroup(): THREE.Group {
        return this._outlineGroup;
    }

    override init() {
        super.init();

        const { x, y, z } = this.position;
        const angles = CUBE_ANGLES[y][z][x];
        const config = this._config;
        const scale = config.scale;

        this._group.clear();
        this._entityGroup = new THREE.Group();
        this._outlineGroup = new THREE.Group();
        this._outlineGroup.visible = false;

        // base
        const mesh = this._skin.models[this.type]; // model type
        const geo = mesh.geometry.clone();
        geo.scale(scale, scale, scale);
        const mat = this._skin.cube.material();
        if (
            this._skin.enableEnvMap &&
            config.envMap &&
            (mat instanceof THREE.MeshStandardMaterial ||
                mat instanceof THREE.MeshBasicMaterial ||
                mat instanceof THREE.MeshPhysicalMaterial)
        ) {
            mat.envMap = config.envMap;
        }
        if (config.wireframe) {
            (<THREE.MeshBasicMaterial>mat).wireframe = config.wireframe;
            (<THREE.MeshBasicMaterial>mat).color = new THREE.Color('#080');
        }
        const m = new THREE.Mesh(geo, mat);
        m.name = this.type;

        for (const r of angles) {
            const { axis, steps } = TWIST_RULE[r];
            m.geometry.rotateX((Math.PI * axis[0] * steps) / 2);
            m.geometry.rotateY((Math.PI * axis[1] * steps) / 2);
            m.geometry.rotateZ((Math.PI * axis[2] * steps) / 2);
        }
        m.castShadow = config.enableShadow;
        m.receiveShadow = config.enableShadow;
        m.position.x += (x - 1) * CUBE_SIDE_LEN * (1 + config.gap) * scale;
        m.position.y += (y - 1) * CUBE_SIDE_LEN * (1 + config.gap) * scale;
        m.position.z += (z - 1) * CUBE_SIDE_LEN * (1 + config.gap) * scale;
        this._entityGroup.add(m);

        // outline mesh
        const outlineMaterial = new OutlineShaderMaterial(
            6, // outline thickness
            COLOR_SELECTED, // outline color
            true, // visible
            true, // enable depthmap
        );
        const m_o = new THREE.Mesh(geo, outlineMaterial);
        m_o.position.copy(m.position);
        m_o.quaternion.copy(m.quaternion);
        this._outlineGroup.add(m_o);

        // stickers
        this._stickers.forEach((sticker) => {
            const pmesh = this._skin.models[CUBE.STICKER];
            const pgeo = pmesh.geometry.clone();
            pgeo.scale(scale * config.stickerScale, scale, scale * config.stickerScale);
            sticker.color = sticker.face; // face no === color no on initial time
            const pmat = this._skin.sticker.material(x, y, z, sticker.color);
            if (
                this._skin.enableEnvMap &&
                config.envMap &&
                (pmat instanceof THREE.MeshStandardMaterial ||
                    pmat instanceof THREE.MeshBasicMaterial ||
                    pmat instanceof THREE.MeshPhysicalMaterial)
            ) {
                pmat.envMap = config.envMap;
            }
            if (config.wireframe) {
                (<THREE.MeshBasicMaterial>pmat).wireframe = config.wireframe;
                (<THREE.MeshBasicMaterial>pmat).color = new THREE.Color('#080');
            }
            const pm = new THREE.Mesh(pgeo, pmat);
            pm.name = CUBE.STICKER;
            pm.castShadow = config.enableShadow;
            m.receiveShadow = config.enableShadow;
            const stickerAngle = STICKER_FACE_2_ANGLE[sticker.face];
            pm.geometry.rotateX((Math.PI * stickerAngle[0]) / 180);
            pm.geometry.rotateY((Math.PI * stickerAngle[1]) / 180);
            pm.geometry.rotateZ((Math.PI * stickerAngle[2]) / 180);
            pm.position.x += (x - 1) * CUBE_SIDE_LEN * (1 + config.gap) * scale;
            pm.position.y += (y - 1) * CUBE_SIDE_LEN * (1 + config.gap) * scale;
            pm.position.z += (z - 1) * CUBE_SIDE_LEN * (1 + config.gap) * scale;
            this._entityGroup.add(pm);
            sticker.mesh = pm;

            // sticker outline mesh
            const pm_o = new THREE.Mesh(pgeo, outlineMaterial);
            pm_o.position.copy(pm.position);
            pm_o.quaternion.copy(pm.quaternion);
            this._outlineGroup.add(pm_o);
        });

        this.activate();

        this._group.add(this._entityGroup);
        this._group.add(this._outlineGroup);
    }

    stretch(strength: number) {
        const scale = this._config.scale;

        this._entityGroup.position.set(
            (this._initialPosition.x - 1) * CUBE_SIDE_LEN * strength * scale,
            (this._initialPosition.y - 1) * CUBE_SIDE_LEN * strength * scale,
            (this._initialPosition.z - 1) * CUBE_SIDE_LEN * strength * scale,
        );
        this._outlineGroup.position.set(
            (this._initialPosition.x - 1) * CUBE_SIDE_LEN * strength * scale,
            (this._initialPosition.y - 1) * CUBE_SIDE_LEN * strength * scale,
            (this._initialPosition.z - 1) * CUBE_SIDE_LEN * strength * scale,
        );
    }

    enableShadow(flag: boolean) {
        this._config.enableShadow = flag;
    }

    select(flag = true) {
        this._outlineGroup.visible = flag;
    }

    activate() {
        for (const mesh of this.getEntityGroup().children) {
            if (mesh instanceof THREE.Mesh) {
                if (mesh.name === CUBE.STICKER) {
                    // sticker
                    this._skin.sticker.activate(mesh);
                } else {
                    // cube
                    this._skin.cube.activate(mesh);
                }
            }
        }
    }

    deactivate() {
        for (const mesh of this.getEntityGroup().children) {
            if (mesh instanceof THREE.Mesh) {
                if (mesh.name === CUBE.STICKER) {
                    // sticker
                    this._skin.sticker.deactivate(mesh);
                } else {
                    // cube
                    this._skin.cube.deactivate(mesh);
                }
            }
        }
    }
}

export type WebGLArcanumCubeConfig = {
    debug: boolean;
    scale: number; // Cube's scale
    stickerScale: number; // Sticker's relative scale
    gap: number; // Gap between cubes
    enableShadow: boolean; // Shadow
    skin: Skin; // skin data
    envMap?: THREE.Texture; // texture for environment mapping
    showSelectedCube: boolean; // visualize focus
    showTwistGroup: boolean; // visualize the selection state
    enableLight: boolean; // grow up inner light
    wireframe: boolean; // wireframe mode
};

/** Arcanum Cube object for WebGL class */
class WebGLArcanumCube extends ArcanumCube {
    /** config */
    private _config: WebGLArcanumCubeConfig;

    /** cube objects matrix */
    protected override _matrix: WebGLCube[][][];

    /** WebGL THREE.js Group */
    private _group: THREE.Group;

    /** cube meshes */
    private _cubeObjectList: THREE.Group[];

    /** cube map */
    private _cubeMap: Record<number, WebGLCube>;

    /** selected cube */
    private _selectedCube?: WebGLCube;

    /** selected sticker */
    private _selectedSticker?: WebGLSticker;

    /** current rotating group */
    private _twistGroup?: THREE.Group;

    /** dragging state */
    private _draggingTwist?: { twist: Twist; rad: number; group: THREE.Group };

    /** max degree to cancel the dragging */
    private _cancelDragDeg: number;

    /** tween group */
    private _tweens: TWEEN.Group;

    /** light at the center of cube */
    private _pointLights: THREE.PointLight[];

    constructor(options?: Partial<WebGLArcanumCubeConfig>) {
        super(options);

        this._config = {
            debug: false,
            showSelectedCube: false,
            showTwistGroup: false,
            scale: 1.0,
            stickerScale: 0.92,
            gap: 0.01,
            enableShadow: false,
            skin: DefaultSkin,
            enableLight: false,
            wireframe: false,
        };
        this._matrix = [];
        this._group = new THREE.Group();
        this._cubeObjectList = [];
        this._cubeMap = {};
        this._cancelDragDeg = 15;
        this._tweens = new TWEEN.Group();
        this._pointLights = [];

        if (options) {
            // copy specified parameters
            Object.assign(this._config, options);
        }
    }

    getGroup(): THREE.Group {
        return this._group;
    }

    getCubeObjectList(): THREE.Group[] {
        return this._cubeObjectList;
    }

    override async init() {
        const skin = this._config.skin;
        if (skin.modelLoading) {
            this._init();
        } else {
            // load models if not
            await _loadModels(skin);
            skin.modelLoading = true;
            this._init();
        }
    }

    private _init() {
        //super.init();
        this._cubeObjectList = [];
        this._cubeMap = {};
        this._matrix = [];
        this._history = [];
        this._pointLights = [];
        const fixedGroups = new THREE.Group();
        const config = this._config;

        // set 3x3x3 cubes
        const yarray: WebGLCube[][][] = [];
        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            const zarray: WebGLCube[][] = [];
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                const xarray: WebGLCube[] = [];
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const cube = new WebGLCube(x, y, z, {
                        scale: config.scale,
                        stickerScale: config.stickerScale,
                        gap: config.gap,
                        enableShadow: config.enableShadow,
                        skin: config.skin,
                        envMap: config.envMap,
                        wireframe: config.wireframe,
                    });
                    cube.init();
                    xarray.push(cube);

                    const entityGroup = cube.getEntityGroup();
                    this._cubeObjectList.push(entityGroup);
                    this._cubeMap[entityGroup.id] = cube;
                    fixedGroups.add(cube.getGroup());

                    if (config.enableLight) {
                        // point light
                        if (x !== SIDE_MIN && y !== SIDE_MIN && z !== SIDE_MIN) {
                            const light = new THREE.PointLight(
                                config.wireframe ? 0x008000 : 0x0080ff,
                                30,
                                20,
                                0.1,
                            );
                            light.position.x =
                                (x - 1 / 2) * CUBE_SIDE_LEN * (1 + config.gap) * config.scale;
                            light.position.y =
                                (y - 1 / 2) * CUBE_SIDE_LEN * (1 + config.gap) * config.scale;
                            light.position.z +=
                                (z - 1 / 2) * CUBE_SIDE_LEN * (1 + config.gap) * config.scale;
                            this._pointLights.push(light);
                        }
                    }
                }
                zarray.push(xarray);
            }
            yarray.push(zarray);
        }

        this._matrix = yarray;

        this._group.clear();
        if (config.enableLight) {
            this._pointLights.forEach((light) => {
                this._group.add(light);
            });
        }
        this._group.add(fixedGroups);
    }

    async setSkin(skin: Skin) {
        const dispose = (obj: THREE.Object3D) => {
            if (obj instanceof THREE.Group) {
                for (const o of obj.children) {
                    dispose(o);
                }
                obj.clear();
            } else if (obj instanceof THREE.Mesh) {
                obj.material.dispose();
                obj.geometry.dispose();
            }
        };

        this._config.skin = skin;
        for (const obj of this._group.children) {
            dispose(obj);
        }

        await this.init();
    }

    override reset(duration: number = 1800) {
        if (this._tweens.getAll().length > 0) return;

        if (this._selectedCube) this.deselectCube();
        if (this._selectedSticker) this.deselectSticker();
        this._twistGroup = undefined;
        this._draggingTwist = undefined;

        const stretchSize = 1.5;
        const qb = new THREE.Quaternion();
        const cubeList = Object.values(this._cubeMap);

        if (duration === 0) {
            cubeList.forEach((cube, index) => {
                cube.getGroup().quaternion.copy(qb);
            });
            super.reset();
        } else {
            const qa: THREE.Quaternion[] = [];

            cubeList.forEach((cube) => {
                qa.push(cube.getGroup().quaternion.clone());
            });

            const params = { t: 0 };
            const tweenExplode = new TWEEN.Tween(params)
                .to({ t: 1 }, (duration * 5) / 18)
                .easing(TWEEN.Easing.Quartic.Out)
                .onUpdate(() => {
                    cubeList.forEach((cube) => {
                        cube.stretch(stretchSize * params.t);
                    });
                })
                .onComplete(() => {
                    this._tweens.remove(tweenExplode);
                });

            const params2 = { t: 0 };
            const tweenReset = new TWEEN.Tween(params2)
                .to({ t: 1 }, (duration * 8) / 18)
                .easing(TWEEN.Easing.Quartic.Out)
                .onUpdate(() => {
                    cubeList.forEach((cube, index) => {
                        cube.getGroup().quaternion.slerpQuaternions(qa[index], qb, params2.t);
                    });
                })
                .onComplete(() => {
                    // process when tween is finished
                    super.reset();
                    this._tweens.remove(tweenReset);
                });

            const params3 = { t: 1 };
            const tweenContract = new TWEEN.Tween(params3)
                .to({ t: 0 }, (duration * 5) / 18)
                .easing(TWEEN.Easing.Quartic.Out)
                .onUpdate(() => {
                    cubeList.forEach((cube) => {
                        cube.stretch(stretchSize * params3.t);
                    });
                })
                .onComplete(() => {
                    this._tweens.remove(tweenContract);
                });

            tweenExplode.chain(tweenReset);
            tweenReset.chain(tweenContract);
            this._tweens.add(tweenExplode, tweenReset, tweenContract);
            tweenExplode.start();
        }
    }

    selectedCube(): WebGLCube | undefined {
        return this._selectedCube;
    }

    selectedSticker(): WebGLSticker | undefined {
        return this._selectedSticker;
    }

    getCubeFromObject(object: THREE.Object3D): WebGLCube | undefined {
        let entityGroup: THREE.Group | null = null;

        if (object instanceof THREE.Mesh) {
            // cube base or sticker
            entityGroup = <THREE.Group>object.parent;
        } else if (object instanceof THREE.Group) {
            entityGroup = object;
        }
        if (entityGroup == null) return undefined;

        // find cube
        const cube = this._cubeMap[entityGroup.id];
        return cube;
    }

    getStickerFromMesh(mesh: THREE.Object3D, cube?: WebGLCube): WebGLSticker | undefined {
        if (!(mesh instanceof THREE.Mesh)) return undefined;

        let pi = cube;
        if (!pi) {
            pi = this.getCubeFromObject(mesh);
            if (!pi) return undefined;
        }

        // find selected sticker
        const stickers = pi.getStickers();
        const sticker = stickers.find((s) => {
            return s.mesh === mesh;
        });
        return sticker;
    }

    selectCube(cube?: WebGLCube) {
        this._selectedCube = cube;

        if (!this._config.showSelectedCube) return;
        const cubes = Object.values(this._cubeMap);
        for (const c of cubes) {
            c.select(cube ? c === cube : false);
        }
    }

    deselectCube() {
        this.selectCube();
    }

    // display the cubes with transparency so that you
    // can see the direction in which they can be twisted.
    selectSticker(mesh: THREE.Object3D) {
        if (!(mesh instanceof THREE.Mesh)) return;

        const cube = this.getCubeFromObject(mesh);
        if (!cube) return;

        // find selected sticker
        const sticker = this.getStickerFromMesh(mesh, cube);
        if (!sticker) return;
        this._selectedSticker = sticker;

        // get cube location
        const pos = cube.position;
        if (pos.x < 0) return;

        if (!this._config.showTwistGroup) return;

        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const c = this._matrix[y][z][x];
                    if (
                        ((sticker.face === FACE.U ||
                            sticker.face === FACE.D ||
                            sticker.face === FACE.F ||
                            sticker.face === FACE.B) &&
                            x === pos.x) ||
                        ((sticker.face === FACE.F ||
                            sticker.face === FACE.B ||
                            sticker.face === FACE.R ||
                            sticker.face === FACE.L) &&
                            y === pos.y) ||
                        ((sticker.face === FACE.U ||
                            sticker.face === FACE.D ||
                            sticker.face === FACE.R ||
                            sticker.face === FACE.L) &&
                            z === pos.z)
                    ) {
                        c.activate(); // activate (normal)
                    } else {
                        c.deactivate(); // deactivate
                    }
                }
            }
        }
    }

    deselectSticker() {
        if (this._config.showTwistGroup) {
            for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
                for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                    for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                        const c = this._matrix[y][z][x];
                        c.activate(); // normal
                    }
                }
            }
        }
        this._selectedSticker = undefined;
    }

    getMovementList(sticker: WebGLSticker, position: [x: number, y: number, z: number]) {
        const d = sticker.face;

        // get candidate movement list for selected cube
        const twists: Twist[] = [];
        Object.entries(TWIST_RULE).forEach(([k, v]) => {
            if (v.steps !== 1) return;
            const axis = v.axis;
            let i = axis.indexOf(-1);
            if (i === -1) i = axis.indexOf(1);
            if (v.levels.indexOf(position[i]) >= 0) {
                twists.push(<Twist>k);
            }
        });

        // make list of the map twist:normal-vector
        const list: { twist: Twist; normal: [number, number, number] }[] = [];
        for (const twist of twists) {
            const axis = TWIST_RULE[twist].axis;
            let i = axis.indexOf(-1);
            if (i === -1) i = axis.indexOf(1);
            const v = axis[i];
            const normal: [number, number, number] = [0, 0, 0];
            if (i === d) normal[(i + 2) % 3] = v;
            else if (i + 3 === d) normal[(i + 2) % 3] = -v;
            else if ((i + 1) % 3 === d) normal[(i + 1) % 3] = -v;
            else if (((i + 1) % 3) + 3 === d) normal[(i + 1) % 3] = v;
            else continue;
            list.push({ twist, normal });
        }

        return list;
    }

    private _reconstructGroups(twist: Twist): THREE.Group {
        const twistGroup = new THREE.Group();
        const fixedGroup = new THREE.Group();

        const axis = TWIST_RULE[twist].axis;
        const levels = TWIST_RULE[twist].levels;
        let i = axis.indexOf(-1);
        if (i === -1) i = axis.indexOf(1);

        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const c = this._matrix[y][z][x];
                    const v = [x, y, z][i];
                    if (levels.indexOf(v) >= 0) {
                        twistGroup.add(c.getGroup());
                    } else {
                        fixedGroup.add(c.getGroup());
                    }
                }
            }
        }

        this._group.clear();
        if (this._config.enableLight) {
            this._pointLights.forEach((light) => {
                this._group.add(light);
            });
        }
        this._group.add(twistGroup);
        this._group.add(fixedGroup);

        return twistGroup;
    }

    dragTwist(twist: Twist, rad: number) {
        if (this._tweens.getAll().length > 0) return;

        if (!this._draggingTwist || this._draggingTwist.twist != twist) {
            this._draggingTwist = {
                twist,
                rad: rad,
                group: this._reconstructGroups(twist),
            };
        }
        const q = new THREE.Quaternion();
        const axis = TWIST_RULE[twist].axis;
        q.setFromAxisAngle(new THREE.Vector3(axis[0], axis[1], axis[2]), rad);
        this._draggingTwist.rad = rad;
        this._draggingTwist.group.quaternion.copy(q);
    }

    dragTwistEnd() {
        if (this._tweens.getAll().length > 0) return;

        if (this._draggingTwist) {
            const deg = (this._draggingTwist.rad * 180) / Math.PI;
            if (deg > this._cancelDragDeg) {
                // twist
                this.tweenTwist(this._draggingTwist.twist);
            } else {
                // cancel twist
                this.tweenTwist(this._draggingTwist.twist, false, 100, true);
            }
        }
    }

    // twist randomly several steps
    override scramble(steps: number = 0, duration: number = 3000) {
        const list = getRandomTwistList(steps);
        this.tweenTwist(list, false, duration);
    }

    override undo(steps: number = 1, duration: number = 300) {
        const list = this.getUndoList(steps);
        this.tweenTwist(list, true, duration, false);
    }

    // twisting(複数回対応)
    // durationを0にするとTweenなしとなる
    tweenTwist(
        twist: Twist | Twist[],
        reverse: boolean = false,
        duration: number = 500,
        cancel: boolean = false,
    ) {
        if (this._tweens.getAll().length > 0) return;

        if (duration === 0) {
            if (Array.isArray(twist)) {
                if (twist.length == 0) return;
                for (const c of twist) {
                    this._immediatelyTwist(c, reverse);
                }
            } else {
                this._immediatelyTwist(twist, reverse);
            }
            return;
        }

        let firstTween: TWEEN.Tween<{ t: number }> | undefined = undefined;
        let tween: TWEEN.Tween<{ t: number }> | undefined = undefined;
        if (Array.isArray(twist)) {
            if (twist.length == 0) return;
            const lap = duration / twist.length;
            for (const c of twist) {
                const t = this._tweenTwist(c, reverse, lap, cancel);
                this._tweens.add(t);
                if (!tween) {
                    firstTween = tween = t;
                } else {
                    tween.chain(t);
                    tween = t;
                }
            }
        } else {
            firstTween = this._tweenTwist(twist, reverse, duration, cancel);
            this._tweens.add(firstTween);
        }
        if (firstTween) {
            firstTween.start();
        }
    }

    // twist immediately
    private _immediatelyTwist(twist: Twist, reverse: boolean) {
        const { axis, steps } = TWIST_RULE[twist];
        const rad = (reverse ? -1 : 1) * Math.PI * (steps / 2);
        const qb = new THREE.Quaternion(); // end quaternion
        qb.setFromAxisAngle(new THREE.Vector3(axis[0], axis[1], axis[2]), rad);

        this._twistGroup = this._reconstructGroups(twist);
        this._twistGroup.quaternion.copy(qb);

        for (const cubeObject of this._twistGroup.children) {
            cubeObject.quaternion.copy(
                this._twistGroup.quaternion.clone().multiply(cubeObject.quaternion),
            );
        }
        this._twistGroup.rotation.set(0, 0, 0);
        this._twistGroup = undefined;
        super.twist(twist, reverse);
    }

    // twist with tween
    private _tweenTwist(
        twist: Twist,
        reverse: boolean,
        duration: number,
        cancel: boolean,
    ): TWEEN.Tween<{ t: number }> {
        let qa: THREE.Quaternion;
        if (this._draggingTwist) {
            this._twistGroup = this._draggingTwist.group;
            this._draggingTwist = undefined;
            qa = this._twistGroup.quaternion.clone(); // start quaternion
        } else {
            qa = new THREE.Quaternion(); // start quaternion
        }

        const { axis, steps } = TWIST_RULE[twist];
        const rad = (reverse ? -1 : 1) * Math.PI * (steps / 2);
        const qb = new THREE.Quaternion(); // end quaternion
        if (!cancel) {
            qb.setFromAxisAngle(new THREE.Vector3(axis[0], axis[1], axis[2]), rad);
        }

        const params = { t: 0 };
        const tween = new TWEEN.Tween(params)
            .to({ t: 1 }, duration)
            .easing(TWEEN.Easing.Quartic.Out) // graph: https://sbcode.net/threejs/tween/
            .onUpdate(() => {
                if (!this._twistGroup) {
                    this._twistGroup = this._reconstructGroups(twist);
                }
                this._twistGroup.quaternion.slerpQuaternions(qa, qb, params.t);
            })
            .onComplete(() => {
                // process when tween is finished
                if (this._twistGroup) {
                    if (!cancel) {
                        for (const cubeObject of this._twistGroup.children) {
                            cubeObject.quaternion.copy(
                                this._twistGroup.quaternion.clone().multiply(cubeObject.quaternion),
                            );
                        }
                    }
                    this._twistGroup.rotation.set(0, 0, 0);
                    this._twistGroup = undefined;
                }
                if (!cancel) {
                    super.twist(twist, reverse);
                }
                this._tweens.remove(tween);
            });

        return tween;
    }

    updateTweens() {
        this._tweens.update();
    }
}

export * from './core.js';
export { WebGLArcanumCube };
