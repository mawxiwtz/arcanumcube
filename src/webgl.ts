import * as THREE from 'three';
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
} from './arcanumcube.js';
import type { Face, Twist, Sticker } from './arcanumcube.js';
import { type Skin, SkinMap, DefaultSkin } from './skins.js';
import { GLTFLoader /*, GLTF */ } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as TWEEN from '@tweenjs/tween.js';

const COLOR_SELECTED = new THREE.Vector4(1.0, 0.7, 0.0, 1.0);

const STICKER_FACE_2_ANGLE: Record<Face, [x: number, y: number, z: number]> = {
    [FACE.U]: [0, 0, 0],
    [FACE.F]: [90, 0, 0],
    [FACE.R]: [90, 90, 0],
    [FACE.D]: [180, 0, 0],
    [FACE.B]: [90, 180, 0],
    [FACE.L]: [90, -90, 0],
} as const;

async function _loadGLTFModel(filename: string): Promise<THREE.Mesh> {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./lib/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const result = await gltfLoader.loadAsync(filename).then((model) => {
        // const data = model;
        if (model.scene.children.length > 0) {
            const mesh = <THREE.Mesh>model.scene.children[0];
            return mesh;
        } else {
            throw new Error('Failed to load GLTF data.');
        }
    });
    return result;
}

async function _loadModels(skin: Skin) {
    skin.models[CUBE.AXIS] = await _loadGLTFModel(skin.modelFiles[CUBE.AXIS]);
    skin.models[CUBE.CENTER] = await _loadGLTFModel(skin.modelFiles[CUBE.CENTER]);
    skin.models[CUBE.EDGE] = await _loadGLTFModel(skin.modelFiles[CUBE.EDGE]);
    skin.models[CUBE.CORNER] = await _loadGLTFModel(skin.modelFiles[CUBE.CORNER]);
    skin.models[CUBE.STICKER] = await _loadGLTFModel(skin.modelFiles[CUBE.STICKER]);
}

type WebGLSticker = Sticker & {
    mesh?: THREE.Mesh;
};

class WebGLCube extends Cube {
    protected override _stickers: WebGLSticker[] = [];

    private _group = new THREE.Group();
    private _entityGroup = new THREE.Group();
    private _outlineGroup = new THREE.Group();
    private _scale = 1.0;
    private _stickerScale = 0.92;
    private _gap = 0.01;
    private _enableShadow = false;
    private _skin: Skin = DefaultSkin;
    private _envMap?: THREE.Texture;

    constructor(
        x: number,
        y: number,
        z: number,
        opts?: {
            scale?: number;
            stickerScale?: number;
            gap?: number;
            enableShadow?: boolean;
            skin?: string;
            envMap?: THREE.Texture;
        },
    ) {
        super(x, y, z);

        if (opts) {
            if (opts.scale != null) this._scale = opts.scale;
            if (opts.stickerScale != null) this._stickerScale = opts.stickerScale;
            if (opts.gap != null) this._gap = opts.gap;
            if (opts.enableShadow != null) this._enableShadow = opts.enableShadow;
            if (opts.skin != null) this._skin = SkinMap[opts.skin];
            if (opts.envMap != null) this._envMap = opts.envMap;
        }
    }

    getGroup(): THREE.Group {
        return this._group;
    }

    setStickerScale(scale: number) {
        this._stickerScale = scale;
    }

    setGap(gap: number) {
        this._gap = gap;
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

        this._group.clear();
        this._entityGroup = new THREE.Group();
        this._outlineGroup = new THREE.Group();
        this._outlineGroup.visible = false;

        // base
        const mesh = this._skin.models[this.type]; // model type
        const geo = mesh.geometry.clone();
        geo.scale(this._scale, this._scale, this._scale);
        const mat = this._skin.cube.material();
        if (
            this._skin.enableEnvMap &&
            this._envMap &&
            (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial)
        ) {
            mat.envMap = this._envMap;
        }
        const m = new THREE.Mesh(geo, mat);
        m.name = this.type;

        for (const r of angles) {
            const { axis, steps } = TWIST_RULE[r];
            m.geometry.rotateX((Math.PI * axis[0] * steps) / 2);
            m.geometry.rotateY((Math.PI * axis[1] * steps) / 2);
            m.geometry.rotateZ((Math.PI * axis[2] * steps) / 2);
        }
        m.castShadow = this._enableShadow;
        m.position.x += (x - 1) * (1 + this._gap) * this._scale;
        m.position.y += (y - 1) * (1 + this._gap) * this._scale;
        m.position.z += (z - 1) * (1 + this._gap) * this._scale;
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
            pgeo.scale(
                this._scale * this._stickerScale,
                this._scale,
                this._scale * this._stickerScale,
            );
            sticker.color = sticker.face; // face no === color no on initial time
            const pmat = this._skin.sticker.material(x, y, z, sticker.color);
            if (
                this._skin.enableEnvMap &&
                this._envMap &&
                (pmat instanceof THREE.MeshStandardMaterial ||
                    pmat instanceof THREE.MeshBasicMaterial)
            ) {
                pmat.envMap = this._envMap;
            }
            const pm = new THREE.Mesh(pgeo, pmat);
            pm.name = CUBE.STICKER;
            pm.castShadow = this._enableShadow;
            const stickerAngle = STICKER_FACE_2_ANGLE[sticker.face];
            pm.geometry.rotateX((Math.PI * stickerAngle[0]) / 180);
            pm.geometry.rotateY((Math.PI * stickerAngle[1]) / 180);
            pm.geometry.rotateZ((Math.PI * stickerAngle[2]) / 180);
            pm.position.x += (x - 1) * (1 + this._gap) * this._scale;
            pm.position.y += (y - 1) * (1 + this._gap) * this._scale;
            pm.position.z += (z - 1) * (1 + this._gap) * this._scale;
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

    override reset() {
        super.reset();
        this._group.rotation.set(0, 0, 0);
    }

    stretch(strength: number) {
        this._entityGroup.position.set(
            (this._initialPosition.x - 1) * strength * this._scale,
            (this._initialPosition.y - 1) * strength * this._scale,
            (this._initialPosition.z - 1) * strength * this._scale,
        );
        this._outlineGroup.position.set(
            (this._initialPosition.x - 1) * strength * this._scale,
            (this._initialPosition.y - 1) * strength * this._scale,
            (this._initialPosition.z - 1) * strength * this._scale,
        );
    }

    enableShadow(flag: boolean) {
        this._enableShadow = flag;
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

/** Arcanum Cube object for WebGL class */
class WebGLArcanumCube extends ArcanumCube {
    /** visualize focus */
    showSelectedCube = false;

    /** visualize the selection state */
    showTwistGroup = false;

    /** cube objects matrix */
    protected override _matrix: WebGLCube[][][] = [];

    /** WebGL THREE.js Group */
    private _group = new THREE.Group();

    /** Cube's scale */
    private _scale = 1.0;

    /** Sticker's relative scale */
    private _stickerScale = 0.92;

    /** Gap between cubes */
    private _gap = 0.01;

    /** Shadow */
    private _enableShadow = false;

    /** cube meshes */
    private _cubeObjectList: THREE.Group[] = [];

    /** cube map */
    private _cubeMap: Record<number, WebGLCube> = {};

    /** skin function */
    private _skin: string = DefaultSkin.name;

    /** texture for environment mapping */
    private _envMap?: THREE.Texture;

    /** selected cube */
    private _selectedCube?: WebGLCube;

    /** selected sticker */
    private _selectedSticker?: WebGLSticker;

    /** current rotating group */
    private _twistGroup?: THREE.Group;

    /** dragging state */
    private _draggingTwist?: { twist: Twist; rad: number; group: THREE.Group };

    /** max degree to cancel the dragging */
    private _cancelDragDeg = 15;

    constructor(options?: {
        debug?: boolean;
        scale?: number;
        stickerScale?: number;
        gap?: number;
        castShadow?: boolean;
        skin?: string;
        envMap?: THREE.Texture;
        showSelectedCube?: boolean;
        showTwistGroup?: boolean;
    }) {
        super(options);

        if (options) {
            if (options.debug != null) {
                this.debug = options.debug;
            }
            if (options.scale != null) {
                this._scale = options.scale;
            }
            if (options.stickerScale != null) {
                this._stickerScale = options.stickerScale;
            }
            if (options.gap != null) {
                this._gap = options.gap;
            }
            if (options.castShadow != null) {
                this._enableShadow = options.castShadow;
            }
            if (options.skin != null) {
                this._skin = options.skin;
            }
            if (options.envMap != null) {
                this._envMap = options.envMap;
            }
            if (options.showSelectedCube != null) {
                this.showSelectedCube = options.showSelectedCube;
            }
            if (options.showTwistGroup != null) {
                this.showTwistGroup = options.showTwistGroup;
            }
        }
    }

    getGroup(): THREE.Group {
        return this._group;
    }

    getCubeObjectList(): THREE.Group[] {
        return this._cubeObjectList;
    }

    static getSkinNameList(): string[] {
        return Object.keys(SkinMap);
    }

    override init() {
        const skin = SkinMap[this._skin];
        if (skin.modelLoading) {
            this._init();
        } else {
            // load models if not
            skin.modelLoading = true;
            _loadModels(skin).then(() => {
                this._init();
            });
        }
    }

    private _init() {
        //super.init();
        this._cubeObjectList = [];
        this._cubeMap = {};
        this._matrix = [];
        this._history = [];
        const fixedGroups = new THREE.Group();

        // set 3x3x3 cubes
        const yarray: WebGLCube[][][] = [];
        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            const zarray: WebGLCube[][] = [];
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                const xarray: WebGLCube[] = [];
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const cube = new WebGLCube(x, y, z, {
                        scale: this._scale,
                        stickerScale: this._stickerScale,
                        gap: this._gap,
                        enableShadow: this._enableShadow,
                        skin: this._skin,
                        envMap: this._envMap,
                    });
                    cube.init();
                    xarray.push(cube);

                    const entityGroup = cube.getEntityGroup();
                    this._cubeObjectList.push(entityGroup);
                    this._cubeMap[entityGroup.id] = cube;
                    fixedGroups.add(cube.getGroup());
                }
                zarray.push(xarray);
            }
            yarray.push(zarray);
        }

        this._matrix = yarray;

        this._group.clear();
        this._group.add(fixedGroups);
    }

    setSkin(name: string) {
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

        this._skin = name;
        for (const obj of this._group.children) {
            dispose(obj);
        }

        this.init();
    }

    override reset() {
        if (TWEEN.getAll().length > 0) return;
        if (this._selectedCube) this.deselectCube();
        if (this._selectedSticker) this.deselectSticker();
        this._twistGroup = undefined;
        this._draggingTwist = undefined;

        const stretchSize = 1.5;
        const qa: THREE.Quaternion[] = [];
        const qb = new THREE.Quaternion();
        const cubeList = Object.values(this._cubeMap);

        cubeList.forEach((cube) => {
            qa.push(cube.getGroup().quaternion.clone());
        });

        const params = { t: 0 };
        const tweenExplode = new TWEEN.Tween(params)
            .to({ t: 1 }, 500)
            .easing(TWEEN.Easing.Quartic.Out)
            .onUpdate(() => {
                cubeList.forEach((cube) => {
                    cube.stretch(stretchSize * params.t);
                });
            })
            .onComplete(() => {
                // do nothing
            });

        const params2 = { t: 0 };
        const tweenReset = new TWEEN.Tween(params2)
            .to({ t: 1 }, 800)
            .easing(TWEEN.Easing.Quartic.Out)
            .onUpdate(() => {
                cubeList.forEach((cube, index) => {
                    cube.getGroup().quaternion.slerpQuaternions(qa[index], qb, params2.t);
                });
            })
            .onComplete(() => {
                // process when tween is finished
                super.reset();
            });

        const params3 = { t: 1 };
        const tweenContract = new TWEEN.Tween(params3)
            .to({ t: 0 }, 500)
            .easing(TWEEN.Easing.Quartic.Out)
            .onUpdate(() => {
                cubeList.forEach((cube) => {
                    cube.stretch(stretchSize * params3.t);
                });
            })
            .onComplete(() => {
                // do nothing
            });

        tweenExplode.chain(tweenReset);
        tweenReset.chain(tweenContract);
        tweenExplode.start();
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

        if (!this.showSelectedCube) return;
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

        if (!this.showTwistGroup) return;

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
        if (this.showTwistGroup) {
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
        this._group.add(twistGroup);
        this._group.add(fixedGroup);

        return twistGroup;
    }

    dragTwist(twist: Twist, rad: number) {
        if (TWEEN.getAll().length > 0) return;

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
        if (TWEEN.getAll().length > 0) return;

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
    override scramble(steps?: number) {
        const list = getRandomTwistList(steps);
        this.tweenTwist(list, false, 3000);
    }

    override undo(steps: number = 1) {
        const list = this.getUndoList(steps);
        this.tweenTwist(list, true, 300, false);
    }

    tweenTwist(
        twist: Twist | Twist[],
        reverse = false,
        speed: number = 500,
        cancel: boolean = false,
    ) {
        if (TWEEN.getAll().length > 0) return;

        let firstTween: TWEEN.Tween<{ t: number }> | undefined = undefined;
        let tween: TWEEN.Tween<{ t: number }> | undefined = undefined;
        if (Array.isArray(twist)) {
            if (twist.length == 0) return;
            const lap = speed / twist.length;
            for (const c of twist) {
                const t = this._tweenTwist(c, reverse, lap, cancel);
                if (!tween) {
                    firstTween = tween = t;
                } else {
                    tween.chain(t);
                    tween = t;
                }
            }
        } else {
            firstTween = this._tweenTwist(twist, reverse, speed, cancel);
        }
        if (firstTween) firstTween.start();
    }

    private _tweenTwist(
        twist: Twist,
        reverse: boolean,
        speed: number,
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
            .to({ t: 1 }, speed)
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
            });

        return tween;
    }
}

export * from './arcanumcube.js';
export { WebGLArcanumCube };
