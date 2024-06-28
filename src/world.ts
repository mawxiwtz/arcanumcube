import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { Pane, TabApi } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import * as ARCCUBE from './webgl.js';
import { PointerControls } from './pointing.js';
import * as tf from '@tensorflow/tfjs';
import HeapQueue from './heapqueue.js';

const SIDE_FACES = [
    [1, 2, 4, 5],
    [2, 0, 5, 3],
    [0, 1, 3, 4],
    [2, 1, 5, 4],
    [0, 2, 3, 5],
    [1, 0, 4, 3],
];

function getInitialState(up: number, front: number): ARCCUBE.StickerColor[] {
    const down = (up + 3) % 6;
    const side = SIDE_FACES[up];

    const state = new Array(ARCCUBE.CUBE_SIZE * ARCCUBE.CUBE_SIZE).fill(up);
    for (let i = 0; i < 4; i++) {
        if (i == 2) {
            const downs = [...Array(ARCCUBE.CUBE_SIZE * ARCCUBE.CUBE_SIZE)].fill(down);
            state.push(...downs);
        }
        const sides = [...Array(ARCCUBE.CUBE_SIZE * ARCCUBE.CUBE_SIZE)].fill(side[(front + i) % 4]);
        state.push(...sides);
    }

    return state;
}

function isSameArrays(arr1: number[], arr2: number[]): boolean {
    if (arr1.length !== arr2.length) return false;

    return !arr1.some((v, i) => v !== arr2[i]);
}

const GOAL_STATE_LIST: ARCCUBE.StickerColor[][] = [];
for (let up = 0; up < 6; up++) {
    for (let front = 0; front < 4; front++) {
        GOAL_STATE_LIST.push(getInitialState(up, front));
    }
}

/** World options */
export type WorldOptions = {
    /** draw area */
    container: HTMLElement;
    /** show info area */
    infoarea: HTMLElement;
    /** view area width */
    width: string;
    /** view area height */
    height: string;
};

type WorldConfig = {
    // basis
    debug: boolean;
    showSelectedCube: boolean;
    showTwistGroup: boolean;
    skin: string;
    // advanced
    clearColor: string;
    ambientLight: boolean;
    ambientColor: string;
    ambientIntensity: number;
    cameraFov: number; // fov: viewing angle
    cameraStartAngleX: number;
    cameraStartAngleY: number;
    cameraEndAngleX: number;
    cameraEndAngleY: number;
    sunLight: boolean;
    sunColor: string;
    sunIntensity: number;
    sunPosition: { x: number; y: number; z: number };
    spotLight: boolean;
    spotColor: string;
    spotIntensity: number;
    spotPosition: { x: number; y: number; z: number };
};

/** World class */
export class World {
    private _pane: Pane;
    private _paneTab: TabApi;
    private _container?: HTMLElement;
    private _infoarea?: HTMLElement;
    private _width: string = '80dvh';
    private _height: string = '60dvh';

    private _config: WorldConfig;
    private _canvas?: HTMLCanvasElement;
    private _renderer?: THREE.WebGLRenderer;
    private _scene?: THREE.Scene;
    private _camera?: THREE.PerspectiveCamera;
    private _control?: PointerControls;

    private _scale = 60.0;
    private _lookAt = new THREE.Vector3(0, 0, 0);
    private _floorColor = '#fff8f0';

    private _shiftL = false;
    private _pointers: Record<
        number,
        {
            x0: number;
            y0: number;
            x: number;
            y: number;
        }
    > = {};
    private _raycaster = new THREE.Raycaster();
    private _clock = new THREE.Clock();
    private _mixer?: THREE.AnimationMixer;
    private _fpsGraph?: EssentialsPlugin.FpsGraphBladeApi;

    private _arccube?: ARCCUBE.WebGLArcanumCube;

    constructor(opts?: WorldOptions) {
        this._config = {
            debug: false,
            showSelectedCube: false,
            showTwistGroup: false,
            skin: 'Standard',

            clearColor: '#f0f0f0',
            ambientLight: true,
            ambientColor: '#ffffff',
            ambientIntensity: 3,
            cameraFov: 45,
            cameraStartAngleX: 0,
            cameraStartAngleY: -135,
            cameraEndAngleX: -45,
            cameraEndAngleY: 30,
            sunLight: true,
            sunColor: '#ffffff',
            sunIntensity: 1,
            sunPosition: { x: -16, y: 80, z: 84 },
            spotLight: true,
            spotColor: '#ffffff',
            spotIntensity: 1,
            spotPosition: { x: -4, y: 7, z: -8 },
        };

        this._pane = new Pane({
            title: 'Control',
            expanded: false,
        });
        this._pane.registerPlugin(EssentialsPlugin);
        this._paneTab = this._pane.addTab({
            pages: [{ title: 'Parameters' }, { title: 'Advanced' }],
        });
        this._paneTab.pages[1].addBinding(this._config, 'debug').on('change', (ev) => {
            this._config.debug = ev.value;
            if (this._arccube) this._arccube.debug = ev.value;
        });
        this._paneTab.pages[1]
            .addBinding(this._config, 'showSelectedCube', { label: 'selected' })
            .on('change', (ev) => {
                if (this._arccube) {
                    if (!ev.value) this._arccube.deselectCube();
                    this._arccube.showSelectedCube = ev.value;
                }
            });
        this._paneTab.pages[1]
            .addBinding(this._config, 'showTwistGroup', { label: 'twist-grp' })
            .on('change', (ev) => {
                if (this._arccube) this._arccube.showTwistGroup = ev.value;
            });
        this._paneTab.pages[0]
            .addButton({ title: 'Scramble', label: 'scramble' })
            .on('click', () => {
                this._arccube?.scramble();
            });
        this._paneTab.pages[0].addButton({ title: 'Resolve', label: 'resolve' }).on('click', () => {
            this._resolve();
        });
        this._paneTab.pages[0].addButton({ title: 'Reset', label: 'reset' }).on('click', () => {
            this._arccube?.reset();
        });
        this._paneTab.pages[0].addButton({ title: 'Undo', label: 'undo' }).on('click', () => {
            this._arccube?.undo();
        });
        this._paneTab.pages[0]
            .addBinding(this._config, 'skin', {
                label: 'skin',
                options: {
                    Standard: 'Standard',
                    Metalic: 'Metalic',
                    Gold: 'Gold',
                    Acrylic: 'Acrylic',
                    Crystal: 'Crystal',
                },
            })
            .on('change', (ev) => {
                this._config.skin = ev.value;
                this._arccube?.setSkin(ev.value);
            });

        this.setConfig(opts!);
    }

    getArcanumCube(): ARCCUBE.WebGLArcanumCube {
        return this._arccube!;
    }

    setConfig(opts: WorldOptions) {
        if (opts) {
            if (opts.container != null) this._container = opts.container;
            if (opts.infoarea != null) this._infoarea = opts.infoarea;
            if (opts.width != null) this._width = opts.width;
            if (opts.height != null) this._height = opts.height;

            this.setup();
        }
    }

    setup() {
        // container
        if (!this._container) return;
        this._container.style.width = this._width;
        this._container.style.height = this._height;

        // renderer
        if (!this._renderer) {
            // create renderer
            const r = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true, // enable transparent
            });
            this._canvas = r.domElement;
            this._container.appendChild(this._canvas);
            this._canvas.tabIndex = 0; // enable receive key event on canvas element
            this._canvas.style.outline = 'none';
            this._canvas.focus();
            r.setClearColor(new THREE.Color(this._config.clearColor));
            r.domElement.style.width = '100%';
            r.domElement.style.height = '100%';
            r.shadowMap.enabled = true; // enable shadow
            this._renderer = r;

            this._paneTab.pages[1]
                .addBinding(this._config, 'clearColor', { label: 'background' })
                .on('change', (ev) => {
                    r.setClearColor(ev.value);
                });

            window.addEventListener('resize', this._onResize());

            // FPS graph
            this._fpsGraph = this._paneTab.pages[0].addBlade({
                view: 'fpsgraph',
                label: 'fps',
                rows: 2,
            }) as EssentialsPlugin.FpsGraphBladeApi;

            // set raycast
            this._canvas.addEventListener('pointermove', (event) => this._onPointerMove(event));
            this._canvas.addEventListener('pointerdown', (event) => this._onPointerDown(event));
            this._canvas.addEventListener('pointerup', (event) => this._onPointerUp(event));

            // key event
            this._canvas.addEventListener('keydown', (event) => this._onKeyDown(event));
            this._canvas.addEventListener('keyup', (event) => this._onKeyUp(event));
        }

        // make scene
        this.initScene();
        // resize screen
        this.resize();
    }

    resize() {
        if (!this._container || !this._renderer) return;
        const r = this._renderer;
        const width = this._container.clientWidth;
        const height = this._container.clientHeight;
        const dpr = window.devicePixelRatio;
        this.setFov();

        if (this._camera) {
            if (this._camera.constructor === THREE.PerspectiveCamera) {
                this._camera.aspect = width / height;
            }
            this._camera.updateProjectionMatrix();
        }

        r.setSize(width, height);
        r.setPixelRatio(dpr);
    }

    private _calcCameraDistance(fov: number): number {
        let h = window.innerHeight;
        if (this._canvas && this._canvas.clientHeight > 0) {
            h = this._canvas.clientHeight;
        }
        const rad = (fov / 2) * (Math.PI / 180);
        return h / 2 / Math.tan(rad);
    }

    setFov(modifyDistance = false) {
        if (!this._camera || this._camera.constructor !== THREE.PerspectiveCamera) {
            return;
        }

        const fov = this._config.cameraFov;
        this._camera.fov = fov;
        this._camera.updateProjectionMatrix();

        if (modifyDistance) {
            const distance = this._calcCameraDistance(fov);
            const eye = this._camera.position.clone().sub(this._lookAt).normalize();
            eye.setLength(distance);

            this._camera.position.copy(this._lookAt).add(eye);
            this._camera.lookAt(this._lookAt);
        }
    }

    _onResize() {
        return () => {
            this.resize();
        };
    }

    initScene() {
        // scene
        const scene = new THREE.Scene();
        // scene.background = new THREE.Color(this._clearColor);
        this._scene = scene;

        // animation in the scene
        this._mixer = new THREE.AnimationMixer(scene);

        // camera
        const camera = new THREE.PerspectiveCamera(
            this._config.cameraFov, // viewing angle (degrees)
            1.0, // aspect ratio
            0.1 * this._scale, // the shortest distance visible to the camera
            1000 * this._scale, // the longest distance visible to the camera
        );
        this._camera = camera;
        this._lookAt.y = 0.3 * this._scale;
        this._camera.position.copy(this._lookAt);
        this._camera.position.add(new THREE.Vector3(0, 0, 1 * this._scale));
        this._camera.lookAt(this._lookAt);
        this.setFov(true);

        this._paneTab.pages[1]
            .addBinding(this._config, 'cameraFov', {
                label: 'fov',
                view: 'slider',
                min: 10,
                max: 120.0,
            })
            .on('change', (ev) => {
                this._config.cameraFov = ev.value;
                this.setFov();
            });

        // camera control as orbit
        if (this._canvas) {
            const control = new PointerControls(this._camera, this._canvas);
            this._control = control;

            // show axis mesh object
            // this._scene.add(control.getAxisObject());
        }

        // camera tween action
        const distance = this._calcCameraDistance(this._config.cameraFov);
        const origin = new THREE.Vector3().copy(this._camera.position);
        const qa = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                (this._config.cameraStartAngleX * Math.PI) / 180,
                (this._config.cameraStartAngleY * Math.PI) / 180,
                0,
                'XYZ',
            ),
        );
        const qb = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                (this._config.cameraEndAngleX * Math.PI) / 180,
                (this._config.cameraEndAngleY * Math.PI) / 180,
                0,
                'XYZ',
            ),
        );

        const params = { t: 0, distance: distance * 3 };
        const tween = new TWEEN.Tween(params)
            .to({ t: 1, distance }, 1500)
            .easing(TWEEN.Easing.Quartic.Out) // graph: https://sbcode.net/threejs/tween/
            .onUpdate(() => {
                camera.position
                    .copy(origin)
                    .sub(this._lookAt)
                    .normalize()
                    .setLength(params.distance);
                const q = new THREE.Quaternion().slerpQuaternions(qa, qb, params.t);
                camera.position.applyQuaternion(q).add(this._lookAt);

                camera.lookAt(this._lookAt);
            });
        tween.start();

        // ambient light
        const light = new THREE.AmbientLight(
            this._config.ambientColor,
            this._config.ambientIntensity,
        );
        light.visible = this._config.ambientLight;
        scene.add(light);

        const ambientFolder = this._paneTab.pages[1].addFolder({
            title: 'Ambient Light',
            expanded: false,
        });
        ambientFolder
            .addBinding(this._config, 'ambientLight', { label: 'light' })
            .on('change', (ev) => {
                light.visible = ev.value;
            });
        ambientFolder
            .addBinding(this._config, 'ambientColor', { label: 'color' })
            .on('change', (ev) => {
                light.color = new THREE.Color(ev.value);
            });
        ambientFolder
            .addBinding(this._config, 'ambientIntensity', {
                label: 'bright',
                min: 0.0,
                max: 5.0,
            })
            .on('change', (ev) => {
                light.intensity = ev.value;
            });

        // sunlight (color, light intensity)
        const sunLight = new THREE.DirectionalLight(
            this._config.sunColor,
            this._config.sunIntensity,
        );
        sunLight.position.set(
            this._config.sunPosition.x * this._scale,
            this._config.sunPosition.y * this._scale,
            this._config.sunPosition.z * this._scale,
        );
        scene.add(sunLight);

        const sunFolder = this._paneTab.pages[1].addFolder({
            title: 'Sun Light',
            expanded: false,
        });
        sunFolder.addBinding(this._config, 'sunLight', { label: 'light' }).on('change', (ev) => {
            sunLight.visible = ev.value;
        });
        sunFolder.addBinding(this._config, 'sunColor', { label: 'color' }).on('change', (ev) => {
            sunLight.color = new THREE.Color(ev.value);
        });
        sunFolder
            .addBinding(this._config, 'sunIntensity', {
                label: 'bright',
                min: 0.0,
                max: 5.0,
            })
            .on('change', (ev) => {
                sunLight.intensity = ev.value;
            });
        const sunPosFolder = sunFolder.addFolder({
            title: 'Position',
        });
        sunPosFolder
            .addBinding(this._config.sunPosition, 'x', { label: 'x' })
            .on('change', (ev) => {
                sunLight.position.x = ev.value;
            });
        sunPosFolder
            .addBinding(this._config.sunPosition, 'y', { label: 'y' })
            .on('change', (ev) => {
                sunLight.position.y = ev.value;
            });
        sunPosFolder
            .addBinding(this._config.sunPosition, 'z', { label: 'z' })
            .on('change', (ev) => {
                sunLight.position.z = ev.value;
            });

        // spotlight (color, light intensity, distance, illumination angle, blur level, attenuation rate)
        // default：const spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 3, 0, 2);
        const spotLight = new THREE.SpotLight(
            this._config.spotColor,
            this._config.spotIntensity,
            12 * this._scale,
            Math.PI / 3,
            0.8,
            0.01,
        );
        spotLight.position.set(
            this._config.spotPosition.x * this._scale,
            this._config.spotPosition.y * this._scale,
            this._config.spotPosition.z * this._scale,
        );
        spotLight.target.position.set(0, 0, 0);
        spotLight.castShadow = true; // use as a light source to cast shadows
        scene.add(spotLight);

        const spotFolder = this._paneTab.pages[1].addFolder({
            title: 'Spot Light',
            expanded: false,
        });
        spotFolder.addBinding(this._config, 'spotLight', { label: 'light' }).on('change', (ev) => {
            spotLight.visible = ev.value;
        });
        spotFolder.addBinding(this._config, 'spotColor', { label: 'color' }).on('change', (ev) => {
            spotLight.color = new THREE.Color(ev.value);
        });
        spotFolder
            .addBinding(this._config, 'spotIntensity', {
                label: 'bright',
                min: 0.0,
                max: 5.0,
            })
            .on('change', (ev) => {
                spotLight.intensity = ev.value;
            });
        const spotPosFolder = spotFolder.addFolder({
            title: 'Position',
        });
        spotPosFolder
            .addBinding(this._config.spotPosition, 'x', { label: 'x' })
            .on('change', (ev) => {
                spotLight.position.x = ev.value;
            });
        spotPosFolder
            .addBinding(this._config.spotPosition, 'y', { label: 'y' })
            .on('change', (ev) => {
                spotLight.position.y = ev.value;
            });
        spotPosFolder
            .addBinding(this._config.spotPosition, 'z', { label: 'z' })
            .on('change', (ev) => {
                spotLight.position.z = ev.value;
            });

        // spotlight helper
        const spotLightHelper = new THREE.SpotLightHelper(spotLight);
        spotLightHelper.visible = true;
        //scene.add(spotLightHelper);

        // floor
        const floor1_geometry = new THREE.PlaneGeometry(16 * this._scale, 16 * this._scale, 1, 1);
        const floor1_material = new THREE.MeshLambertMaterial({
            color: this._floorColor,
            // color: 0xf8f0ff,
            side: THREE.DoubleSide,
        });
        const floor1 = new THREE.Mesh(floor1_geometry, floor1_material);
        floor1.rotateX(Math.PI / 2);
        floor1.translateZ(4 * this._scale);
        // floor1.renderOrder = -2; // render first (default 0)
        floor1.receiveShadow = true; // receive a shadow
        // scene.add(floor1);

        // add Arcanum Cube object (meshes or groups)
        const envMapTextureEquirectangular = new THREE.TextureLoader().load(
            'img/comfy_cafe_4k.png',
        );
        envMapTextureEquirectangular.mapping = THREE.EquirectangularReflectionMapping;
        envMapTextureEquirectangular.magFilter = THREE.LinearFilter;
        envMapTextureEquirectangular.minFilter = THREE.LinearMipMapLinearFilter;
        const arccube = new ARCCUBE.WebGLArcanumCube({
            debug: this._config.debug,
            scale: 0.9 * this._scale,
            castShadow: false,
            showSelectedCube: this._config.showSelectedCube,
            showTwistGroup: this._config.showTwistGroup,
            skin: this._config.skin,
            envMap: envMapTextureEquirectangular,
        });
        arccube.init();
        const arccubeGroup = arccube.getGroup();
        arccubeGroup.position.copy(this._lookAt);
        scene.add(arccubeGroup);
        this._arccube = arccube;

        if (this._control) {
            this._control.setTarget(this._lookAt);
        }
    }

    draw() {
        if (!this._renderer) return;

        this._renderer.setAnimationLoop((time) => {
            if (!this._renderer || !this._scene || !this._camera) return;
            const tick = this._clock.getDelta();
            // call animation mixer
            if (this._mixer) {
                this._mixer.update(tick);
            }
            // call animation camera
            if (this._control) {
                this._control.update();
            }

            // Tween
            TWEEN.update(time);

            // rendering
            this._fpsGraph && this._fpsGraph.begin();
            this._renderer.render(this._scene, this._camera);
            this._fpsGraph && this._fpsGraph.end();
        });
    }

    private _onPointerDown(event: PointerEvent) {
        event.preventDefault();
        this._canvas?.focus(); // canvas element gets focus
        this._pointers[event.pointerId] = {
            x0: event.offsetX,
            y0: event.offsetY,
            x: event.offsetX,
            y: event.offsetY,
        };
        const element = <HTMLCanvasElement>event.currentTarget;
        element.setPointerCapture(event.pointerId);
        this._checkRaycast(event);
        this._drag();
    }

    private _onPointerUp(event: PointerEvent) {
        const element = <HTMLCanvasElement>event.currentTarget;
        element.releasePointerCapture(event.pointerId);
        delete this._pointers[event.pointerId];
        if (this._control) this._control.enableRotate = true;
        this._arccube && this._arccube.deselectSticker();
        this._dragEnd();
    }

    private _onPointerMove(event: PointerEvent) {
        if (event.pointerId in this._pointers) {
            this._pointers[event.pointerId].x = event.offsetX;
            this._pointers[event.pointerId].y = event.offsetY;
        }
        this._drag();
    }

    private _checkRaycast(event: PointerEvent) {
        const element = <HTMLCanvasElement>event.currentTarget;
        const w = element.clientWidth;
        const h = element.clientHeight;
        const x = event.offsetX;
        const y = event.offsetY;

        const cursor = new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1);

        if (!this._camera || !this._arccube) return;

        // select the front object among the objects pointed to by raycast.
        // Otherwise return to normal.
        this._raycaster.setFromCamera(cursor, this._camera);
        const cubeObjects = this._arccube.getCubeObjectList();
        const intersects = this._raycaster.intersectObjects(cubeObjects, true);

        if (intersects.length > 0) {
            const obj = intersects[0].object;
            // show outline of selected cube
            const cube = this._arccube.getCubeFromObject(obj);
            this._arccube.selectCube(cube);
            this._arccube.selectSticker(obj);
            // lock camera moving
            this._control!.enableRotate = false;
        } else {
            // hide all outline
            this._arccube.deselectCube(); // clear selection
            // unlock camera moving
            this._control!.enableRotate = true;
        }
    }

    private _drag() {
        if (!this._canvas || !this._camera) return;
        const pointer_list = Object.values(this._pointers);
        if (pointer_list.length === 1) {
            // dragging cube
            const p = pointer_list[0];
            const movement = new THREE.Vector2(
                (p.x - p.x0) / this._canvas.clientWidth,
                (p.y0 - p.y) / this._canvas.clientHeight,
            );
            const m = movement.clone().normalize();

            if (!this._arccube) return;
            const cube = this._arccube.selectedCube();
            if (!cube) return;
            const sticker = this._arccube.selectedSticker();
            if (!sticker) return;

            const { x, y, z } = cube.position;
            const list = this._arccube.getMovementList(sticker, [x, y, z]);

            let dir = undefined;
            let tmp = -1;
            for (const item of list) {
                const n = item.normal;
                const v = new THREE.Vector3(n[0], n[1], n[2])
                    .applyQuaternion(this._arccube.getGroup().quaternion)
                    .project(this._camera);
                const v2 = new THREE.Vector2(v.x, v.y);
                const vdot = v2.dot(m); // calc vector dot product
                if (tmp < vdot) {
                    dir = item;
                    tmp = vdot;
                }
            }

            // dragging
            if (dir) {
                const rad = movement.length() * 3; // adjust to your liking to dragging
                this._arccube.dragTwist(dir.twist, rad);
            }
        } else if (pointer_list.length > 1) {
            // unlock camera moving
            this._control!.enableRotate = true;
        }
    }

    private _dragEnd() {
        this._arccube && this._arccube.dragTwistEnd();
    }

    private _onKeyDown(event: KeyboardEvent) {
        const keyMap: Record<string, () => void> = {
            ShiftLeft: () => {
                this._shiftL = true;
            },
            KeyU: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.UR : ARCCUBE.TWIST.U;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyD: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.DR : ARCCUBE.TWIST.D;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyF: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.FR : ARCCUBE.TWIST.F;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyB: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.BR : ARCCUBE.TWIST.B;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyR: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.RR : ARCCUBE.TWIST.R;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyL: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.LR : ARCCUBE.TWIST.L;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyM: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.MR : ARCCUBE.TWIST.M;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyE: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.ER : ARCCUBE.TWIST.E;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyS: () => {
                const twist = this._shiftL ? ARCCUBE.TWIST.SR : ARCCUBE.TWIST.S;
                this._arccube && this._arccube.tweenTwist(twist);
            },
            KeyZ: () => {
                this._arccube && this._arccube.undo();
            },
            Digit0: () => {
                this._arccube && this._arccube.scramble();
            },
            Digit1: () => {
                this._arccube && this._arccube.scramble(10);
            },
            Digit2: () => {
                this._arccube && this._arccube.scramble(20);
            },
            Digit3: () => {
                this._arccube && this._arccube.scramble(30);
            },
            Space: () => {
                this._upsideDownCamera();
            },
        };

        //console.log(event.code);
        const func = keyMap[event.code];
        if (func) func();
    }

    private _onKeyUp(event: KeyboardEvent) {
        if (event.code === 'ShiftLeft') {
            this._shiftL = false;
            return;
        }
    }

    // put the camera upside down
    private _upsideDownCamera() {
        if (!this._camera || !this._control) return;

        const camera = this._camera;

        const eye = this._camera.position.clone().sub(this._control.getTarget());
        eye.normalize();
        const qa = this._camera.quaternion.clone(); // start
        const qb = new THREE.Quaternion().setFromAxisAngle(eye, Math.PI).multiply(qa); // end

        const params = { t: 0 };
        const tween = new TWEEN.Tween(params)
            .to({ t: 1 }, 500)
            .easing(TWEEN.Easing.Quartic.Out)
            .onUpdate(() => {
                camera.quaternion.slerpQuaternions(qa, qb, params.t);
            })
            .onComplete(() => {
                // process when tween is finished
                // If you just rotate the camera, up will return to its
                // original state when lookAt() is executed, so use
                // negate() to reverse the up vector.
                camera.up.negate();
            });
        tween.start();
    }

    _resolve() {
        if (!this._arccube) return;

        const stickers = this._arccube.getStickerColors();
        this._getAnswer(stickers, 100, 150, 0.3).then((answer) => {
            if (answer.length > 0) {
                if (this._arccube) {
                    if (this._infoarea) {
                        const q = this._arccube.getHistory();
                        this._infoarea.innerHTML =
                            `<p>Question: (${q.length}) ${q.join(' ')}<br />` +
                            `Answer: (${answer.length}) ${answer.join(' ')}</p>`;
                    }
                    this._arccube.tweenTwist(answer, false, 3000);
                }
            }
        });
    }

    async _getAnswer(
        stickers: ARCCUBE.StickerColor[],
        batchSize: number,
        n: number,
        l: number,
    ): Promise<ARCCUBE.Twist[]> {
        if (!this._arccube) return [];

        tf.engine().startScope();
        //console.log(tf.memory());

        const has = (state: ARCCUBE.StickerColor[], list: ARCCUBE.StickerColor[][]): boolean => {
            return list.some((s) => isSameArrays(state, s));
        };

        function getNextStateAndAnswers(): [ARCCUBE.StickerColor[][], ARCCUBE.Twist[][]] {
            const s: ARCCUBE.StickerColor[][] = [];
            const t: ARCCUBE.Twist[][] = [];
            const range = Math.min(n, queue.length());
            for (let i = 0; i < range; i++) {
                const v = queue.heappop();
                if (!v) continue;

                for (const action of ARCCUBE.SINGLE_TWIST_LIST) {
                    const next_state = ARCCUBE.getNextStickerColors(v.state, action);
                    const next_answer = [...v.answer]; // clone
                    next_answer.push(action); // clone + push
                    const next_state_id = next_state.join('');
                    if (
                        !(next_state_id in visitedStates) ||
                        visitedStates[next_state_id] > next_answer.length
                    ) {
                        visitedStates[next_state_id] = next_answer.length;
                        s.push(next_state);
                        t.push(next_answer);
                    }
                }
            }

            return [s, t];
        }

        if (has(stickers, GOAL_STATE_LIST)) {
            console.log('Already resolved.');
            return [];
        }

        //const model = await tf.loadGraphModel('./asset/model/twist_cost/model.json');
        const model = await tf.loadLayersModel('./asset/model/twist_cost/model.json');
        //console.log(model.summary());

        // search queue
        const queue = new HeapQueue<{ state: ARCCUBE.StickerColor[]; answer: ARCCUBE.Twist[] }>();
        queue.heappush(0, { state: stickers, answer: [] });
        const visitedStates = { [stickers.join('')]: 0 };

        while (queue.length() > 0) {
            const [next_states, next_answers] = getNextStateAndAnswers();
            const x: number[][][][] = [];
            for (let i = 0; i < next_states.length; i++) {
                const next_state = next_states[i];
                const next_answer = next_answers[i];
                if (has(next_state, GOAL_STATE_LIST)) {
                    model.dispose();
                    tf.engine().endScope();
                    return next_answer;
                }
                const a = ARCCUBE.getArrayForTensor(next_state);
                x.push(a);
            }

            const cost_to_goals = tf.tidy(() => {
                const tx = tf.tensor(x);
                const y = model.predict(tx, { batchSize }) as tf.Tensor;
                const c = y.dataSync();
                return c;
            });
            //console.log(cost_to_goals);
            //console.log(tf.memory());

            next_answers.forEach((next_answer, i) => {
                queue.heappush(l * next_answer.length + cost_to_goals[i], {
                    state: next_states[i],
                    answer: next_answers[i],
                });
            });
        }

        // Answer not found
        tf.engine().endScope();
        console.log('Could not found any answers, give up.');
        return [];
    }
}
