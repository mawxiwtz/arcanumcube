import * as THREE from 'three';

type PointerInfo = {
    x0: number;
    y0: number;
    x: number;
    y: number;
};

export class PointerControls {
    enableRotate = true;
    enableZoom = true;

    private _container: HTMLElement;
    private _camera: THREE.Camera;
    private _cameraQuotanion = new THREE.Quaternion();
    private _cameraQuotanionInverse = new THREE.Quaternion();

    private _zoom: number = 1.0;
    private _zoomMax = Infinity;
    private _zoomMin = 0;
    private _isRotating = false;
    private _pointers: Record<number, PointerInfo> = {};
    private _target = new THREE.Vector3(); // point of view

    private _spherical = new THREE.Spherical(); // camera spherical orbit
    private _sphericalDelta = new THREE.Spherical();
    private _rotateDelta = new THREE.Vector3();
    private _rotateSpeed = 1.0;
    private _zoomSpeed = 1.0;
    private _shiftL = false;

    private _axisObject?: THREE.Group;

    constructor(camera: THREE.Camera, container: HTMLElement) {
        this._container = container;
        this._camera = camera;
        this._cameraQuotanion.setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0)); // camera quotanion
        this._cameraQuotanionInverse = this._cameraQuotanion.clone().invert();

        // disable pinch in-out by browser
        this._container.addEventListener('touchstart', (event) => {
            event.preventDefault();
        });

        // set pointer events
        this._container.addEventListener('pointerdown', this.handlerPointerDown());
        this._container.addEventListener('pointerup', this.handlerPointerUp());
        this._container.addEventListener('pointermove', this.handlerPointerMove());
        this._container.addEventListener('wheel', this.handlerMouseWheel());
        //this._container.addEventListener('gotpointercapture', this.handlerGotPointerCapture());
        //this._container.addEventListener('lostpointercapture', this.handlerLostPointerCapture());

        this._container.addEventListener('keydown', this.handlerKeyDown());
        this._container.addEventListener('keyup', this.handlerKeyUp());
    }

    setTarget(target: THREE.Vector3): void;
    setTarget(x: number, y: number, z: number): void;
    setTarget(x: number | THREE.Vector3, y?: number, z?: number): void {
        if (x instanceof THREE.Vector3) {
            this._target = x;
        } else {
            this._target = new THREE.Vector3(x, y, z);
        }
        this.update();
    }

    getTarget(): THREE.Vector3 {
        return this._target;
    }

    handlerPointerDown() {
        return (e: PointerEvent) => {
            this._isRotating = true;
            this._pointers[e.pointerId] = {
                x0: e.offsetX,
                y0: e.offsetY,
                x: e.offsetX,
                y: e.offsetY,
            };
            const element = <HTMLCanvasElement>e.currentTarget;
            element.setPointerCapture(e.pointerId);
        };
    }

    handlerPointerUp() {
        return (e: PointerEvent) => {
            this._isRotating = false;
            const element = <HTMLCanvasElement>e.currentTarget;
            element.releasePointerCapture(e.pointerId);
            delete this._pointers[e.pointerId];
        };
    }

    handlerPointerMove() {
        return (e: PointerEvent) => {
            if (!this.enableRotate) this._isRotating = false;
            if (this._isRotating && e.pointerId in this._pointers) {
                this._pointers[e.pointerId].x = e.offsetX;
                this._pointers[e.pointerId].y = e.offsetY;
                this._calcDistance();
            }
        };
    }

    handlerGotPointerCapture() {
        return (e: PointerEvent) => {
            this._pointers[e.pointerId] = {
                x0: e.offsetX,
                y0: e.offsetY,
                x: e.offsetX,
                y: e.offsetY,
            };
        };
    }

    handlerLostPointerCapture() {
        return (e: PointerEvent) => {
            delete this._pointers[e.pointerId];
        };
    }

    handlerMouseWheel() {
        return (e: WheelEvent) => {
            // disable wheel action by browser
            e.preventDefault();

            this._zooming(e.deltaY, this._zoomSpeed);
        };
    }

    handlerKeyDown() {
        const keyMap: Record<string, () => void> = {
            ShiftLeft: () => {
                this._shiftL = true;
            },
        };

        return (e: KeyboardEvent) => {
            const func = keyMap[e.code];
            if (func) func();
        };
    }

    handlerKeyUp() {
        const keyMap: Record<string, () => void> = {
            ShiftLeft: () => {
                this._shiftL = false;
            },
        };

        return (e: KeyboardEvent) => {
            const func = keyMap[e.code];
            if (func) func();
        };
    }

    // increase or decrease zoom parameter
    private _zooming(delta: number, speed: number) {
        let z = this._zoom;
        if (delta < 0) {
            z += -0.1 * speed;
            if (z < this._zoomMin) z = this._zoomMin;
        } else if (delta > 0) {
            z += 0.1 * speed;
            if (z > this._zoomMax) z = this._zoomMax;
        } else {
            return;
        }
        this._zoom = z;
    }

    // calculate rotation or pinch distance
    private _calcDistance() {
        const [w, h] = [this._container.clientWidth, this._container.clientHeight];
        const pointer_list = Object.values(this._pointers);
        if (pointer_list.length === 1) {
            // moving mouse or pen for rotate with one finger
            // for trackball
            const p0 = pointer_list[0];
            if (this._shiftL) {
                const v0 = new THREE.Vector2(p0.x0 / w - 0.5, p0.y0 / h - 0.5);
                const v1 = new THREE.Vector2(p0.x / w - 0.5, p0.y / h - 0.5);
                const sign = v0.cross(v1) < 0 ? -1 : 1;
                this._rotateDelta.z += v0.angleTo(v1) * sign;
            } else {
                this._rotateDelta.x += p0.x - p0.x0;
                this._rotateDelta.y += p0.y - p0.y0;
            }
            // for orbit
            this._sphericalDelta.theta =
                -((2 * Math.PI * this._rotateDelta.x) / w) * this._rotateSpeed;
            this._sphericalDelta.phi =
                -((2 * Math.PI * this._rotateDelta.y) / h) * this._rotateSpeed;
        } else if (pointer_list.length >= 2) {
            // vectorize
            const [p0, p1] = [pointer_list[0], pointer_list[1]];
            const v00 = new THREE.Vector2(p0.x0 / w - 0.5, p0.y0 / h - 0.5);
            const v01 = new THREE.Vector2(p0.x / w - 0.5, p0.y / h - 0.5);
            const v10 = new THREE.Vector2(p1.x0 / w - 0.5, p1.y0 / h - 0.5);
            const v11 = new THREE.Vector2(p1.x / w - 0.5, p1.y / h - 0.5);

            if (pointer_list.length === 2) {
                // pinch in-out multi-touch for zoom
                // (zoom is enabled with two fingers only)
                const dist0 = v00.distanceTo(v10);
                const dist1 = v01.distanceTo(v11);
                const deltaDist = dist0 - dist1;
                this._zooming(deltaDist, this._zoomSpeed / 2);
            }

            // enable rotation with two/three fingers
            const c00 = v00.clone().add(v10).divideScalar(2);
            const c01 = v01.clone().add(v11).divideScalar(2);
            v00.sub(c00);
            v10.sub(c00);
            v01.sub(c01);
            v11.sub(c01);
            const delta0 = v00.angleTo(v01) * (v00.cross(v01) < 0 ? -1 : 1);
            const delta1 = v10.angleTo(v11) * (v10.cross(v11) < 0 ? -1 : 1);
            const deltaRad = (delta0 + delta1) / 2;
            this._rotateDelta.z += deltaRad;
        }

        for (const p of pointer_list) {
            p.x0 = p.x;
            p.y0 = p.y;
        }
    }

    update() {
        // camera rotation
        const moving = new THREE.Vector2(
            (2 * Math.PI * this._rotateDelta.x) / this._container.clientWidth,
            (2 * Math.PI * this._rotateDelta.y) / this._container.clientHeight,
        );
        let angle = moving.length();
        let rad = this._rotateDelta.z;

        // trackball
        const eye = this._camera.position.clone().sub(this._target);
        const quaternion = new THREE.Quaternion();
        const quaternionZ = new THREE.Quaternion();

        if (this.enableRotate) {
            if (rad != 0) {
                // rotate the camera around the line of sight
                const axis = eye.clone().normalize();
                rad *= this._rotateSpeed * 2.0;
                quaternionZ.setFromAxisAngle(axis, rad);

                eye.applyQuaternion(quaternionZ);
                this._camera.up.applyQuaternion(quaternionZ);
            }
            if (angle > 0) {
                // rotate around x and y axis
                const eyeDirection = new THREE.Vector3().copy(eye).normalize();
                const objectUpDirection = this._camera.up.clone().normalize();
                const objectSidewaysDirection = new THREE.Vector3()
                    .crossVectors(objectUpDirection, eyeDirection)
                    .normalize();

                objectUpDirection.setLength(-moving.y);
                objectSidewaysDirection.setLength(moving.x);

                const moveDirection = new THREE.Vector3().copy(
                    objectUpDirection.add(objectSidewaysDirection),
                );

                const axis = new THREE.Vector3().crossVectors(moveDirection, eye).normalize();

                // update axis mesh objects
                this._updateAxisObject(axis);

                angle *= this._rotateSpeed * 2.0;
                quaternion.setFromAxisAngle(axis, angle);

                eye.applyQuaternion(quaternion);
                this._camera.up.applyQuaternion(quaternion);
            }
        }

        // camera zooming
        if (this.enableZoom) {
            eye.setLength(eye.length() * this._zoom);
        }

        this._camera.position.copy(this._target).add(eye);

        // orbit
        /*
        const offset = this._camera.position.clone().sub(this._target); // back to origin temporarily
        offset.applyQuaternion(this._cameraQuotanion);

        this._spherical.setFromVector3(offset);
        this._spherical.theta += this._sphericalDelta.theta;
        this._spherical.phi += this._sphericalDelta.phi;
        this._spherical.makeSafe();
        this._spherical.radius *= this._zoom;
        offset.setFromSpherical(this._spherical);

        offset.applyQuaternion(this._cameraQuotanionInverse);

        this._camera.position.copy(this._target).add(offset);
        */
        this._camera.lookAt(this._target);

        this._zoom = 1;
        this._rotateDelta.set(0, 0, 0);
        this._sphericalDelta.set(0, 0, 0);
    }

    // draw axis for test
    private _updateAxisObject(axis: THREE.Vector3) {
        if (!this._axisObject) return;

        this._axisObject.clear();
        const line_group = new THREE.Group();
        const scale = 70;

        const linex_geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0.8, 0, -0.2),
            new THREE.Vector3(0.8, 0, 0.2),
            new THREE.Vector3(1, 0, 0),
        ]);
        const linex_mat = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const linex_mesh = new THREE.Line(linex_geo, linex_mat);
        linex_mesh.geometry.scale(axis.x * scale, axis.x * scale, axis.x * scale);

        const liney_geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0.8, -0.2),
            new THREE.Vector3(0, 0.8, 0.2),
            new THREE.Vector3(0, 1, 0),
        ]);
        const liney_mat = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const liney_mesh = new THREE.Line(liney_geo, liney_mat);
        liney_mesh.geometry.scale(axis.y * scale, axis.y * scale, axis.y * scale);

        const linez_geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(-0.2, 0, 0.8),
            new THREE.Vector3(0.2, 0, 0.8),
            new THREE.Vector3(0, 0, 1),
        ]);
        const linez_mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const linez_mesh = new THREE.Line(linez_geo, linez_mat);
        linez_mesh.geometry.scale(axis.z * scale, axis.z * scale, axis.z * scale);

        const lineA_geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axis.x, axis.y, axis.z),
        ]);
        const lineA_mat = new THREE.LineBasicMaterial({ color: 0xff00ff });
        const lineA_mesh = new THREE.Line(lineA_geo, lineA_mat);
        lineA_mesh.geometry.scale(scale, scale, scale);

        line_group.add(linex_mesh, liney_mesh, linez_mesh, lineA_mesh);
        line_group.position.set(0, 0, 0);
        this._axisObject.add(line_group);

        this._axisObject.position.copy(this._target);
    }

    // return axis mesh object group
    getAxisObject(): THREE.Group {
        if (!this._axisObject) this._axisObject = new THREE.Group();
        return this._axisObject;
    }
}
