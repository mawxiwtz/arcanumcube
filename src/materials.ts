import * as THREE from 'three';

// material shader for outlines
export class OutlineShaderMaterial extends THREE.ShaderMaterial {
    constructor(
        offset: number, // outline thickness
        color: THREE.Vector4, // outline color
        visible: boolean = true, // visible
        depthWrite: boolean = false, // enable depth map
    ) {
        super({
            vertexShader: `
                uniform float offset;
                uniform vec4 color;
                varying vec4 vcolor;
                void main() {
                    vcolor = color;
                    float distance = length(position - cameraPosition) /2000.0;
                    vec4 pos = modelViewMatrix * vec4( position + normal * distance * offset, 1.0 );
                    gl_Position = projectionMatrix * pos;
                }
            `,
            fragmentShader: `
                varying vec4 vcolor;
                void main() {
                    gl_FragColor = vcolor;
                }
            `,
            uniforms: {
                offset: { value: offset },
                color: { value: color },
            },
        });

        this.visible = visible;
        this.depthWrite = depthWrite;
        // The outline is drawn only on the back side of the polygon
        this.side = THREE.BackSide;
    }
}
