# Arcanum Cube

Arcanum Cube is a cube puzzle module written in Typescript. Supports creation and manipulation of WebGL mesh groups.

[Demo Page](https://mawxiwtz.github.io/arcanumcube/)

## Usage

1. import Three.js and arcanumcube

```
import * as THREE from 'three';
import * as ARCCUBE from 'arcanumcube';
```

2. create a cube object

```
const arccube = new ARCCUBE.WebGLArcanumCube();
await arccube.init();
const arccubeGroup = arccube.getGroup();
arccubeGroup.position.set(0, 0, 0);
scene.add(arccubeGroup);

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

## License

Released under the MIT license

Copyright (c) 2024 mawxiwtz
