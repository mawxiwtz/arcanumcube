# Arcanum Cube

Arcanum Cube Arcanum Cube is a WebGL cube puzzle module written in TypeScript. You can create Three.js meshes group and twist cube.

## Demo Page

- [Example](https://mawxiwtz.github.io/arcanumcube/) \
  Rotation only

## Installation

You can add arcanumcube as an npm dependency:

```
npm install arcanumcube
```

## Usage

1. import Three.js and arcanumcube

```
import * as THREE from 'three';
import * as ARCCUBE from 'arcanumcube';
```

2. create a cube object

```
const scene = new THREE.Scene();
    :
const arccube = new ARCCUBE.WebGLArcanumCube();
await arccube.init();
const arccubeGroup = arccube.getGroup();
arccubeGroup.position.set(0, 0, 0);
scene.add(arccubeGroup);
    :

renderer.setAnimationLoop((time) => {
    :

    // animate twisting
    arccube.updateTweens();

    renderer.render(scene, camera);
});
```

3. operations

```
// scramble 30 steps
arccube.scramble(30);
// twist 'U' direction
arccube.tweenTwist('U');
// reset
arccube.reset();
```

## Document

Currently under construction

## License

Released under the MIT license

Copyright (c) 2024 mawxiwtz
