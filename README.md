# Arcanum Cube

Arcanum Cube Arcanum Cube is a WebGL cube puzzle module written in TypeScript. You can create Three.js meshes group and twist cube.

## Demo Page

-   [Example1](https://mawxiwtz.github.io/arcanumcube/) \
    Rotation only

-   [Example2](https://mawxiwtz.github.io/arcanumcube-demo/) \
    Demo of playing and solving with AI

## Installation

You can add arcanumcube as an npm dependency:

```
npm install arcanumcube
```

## Usage

1. install dependencies

```
npm install arcanumcube
```

2. import Three.js and arcanumcube

```ts
import * as THREE from 'three';
import * as ARCCUBE from 'arcanumcube';
```

3. create a cube object

```ts
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
    arccube.update();

    renderer.render(scene, camera);
});
```

4. operations

```ts
// scramble 30 steps
arccube.scramble(30);
// twist 'U' direction
arccube.easingTwist('U');
// reset
arccube.reset();
```

## Document

Currently under construction

## License

Released under the MIT license

Copyright (c) 2024 mawxiwtz
