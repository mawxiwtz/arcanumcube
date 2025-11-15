import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as ARCCUBE from '@arcanumcube';

async function onLoad() {
    const viewarea = document.getElementById('viewarea');
    if (!viewarea) {
        throw new Error('Demo markup is missing required elements.');
    }

    const w = viewarea.clientWidth;
    const h = viewarea.clientHeight;
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor('#222');

    const canvas = renderer.domElement;
    viewarea.appendChild(canvas);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, w / h);
    camera.position.set(0, 0, 30);
    const controls = new OrbitControls(camera, viewarea);
    controls.autoRotate = true;

    // ambient light
    const light = new THREE.AmbientLight('#fff', 1.0);
    scene.add(light);

    // sun light
    const sunLight = new THREE.DirectionalLight('#fff', 1.0);
    sunLight.position.set(-16, 80, 48);
    scene.add(sunLight);

    // spot light
    const spotLight = new THREE.SpotLight('#fff', 4, 64, Math.PI / 6, 0.8, 0.01);
    spotLight.position.set(12, 12, 6);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);

    // arcanum cube
    const arccube = new ARCCUBE.WebGLArcanumCube();
    await arccube.init();
    const arccubeGroup = arccube.getGroup();
    arccubeGroup.position.set(0, 0, 0);
    scene.add(arccubeGroup);

    renderer.setAnimationLoop((/* time */) => {
        // animate twisting
        arccube.update();

        // orbit control
        controls.update();

        renderer.render(scene, camera);
    });

    // scramble(steps, duration);
    arccube.scramble(60, 12000);
}

window.addEventListener('load', onLoad);
