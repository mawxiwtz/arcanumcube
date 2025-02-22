// cube size
export const CUBE_SIZE = 3;
export const SIDE_MAX = CUBE_SIZE - 1;
export const SIDE_MIN = 0;
export const SIDE_MIDDLE = Math.floor(CUBE_SIZE / 2);

// The color of the sticker on the face of each cube
export const STICKER_COLOR = {
    UP: 0,
    FRONT: 1,
    RIGHT: 2,
    DOWN: 3,
    BACK: 4,
    LEFT: 5,
    PLAIN: 6,
};
export type StickerColor = (typeof STICKER_COLOR)[keyof typeof STICKER_COLOR];

export const CUBE = {
    AXIS: 'axis',
    CENTER: 'center',
    EDGE: 'edge',
    CORNER: 'corner',
    STICKER: 'sticker',
} as const;

const CUBETYPE_LIST = [CUBE.AXIS, CUBE.CENTER, CUBE.EDGE, CUBE.CORNER] as const;
export type CubeType = (typeof CUBE)[keyof typeof CUBE];

const FACE_LIST: string[] = ['U', 'F', 'R', 'D', 'B', 'L'] as const;
export const FACE: Record<string, number> = Object.assign(
    {},
    ...FACE_LIST.map((k, i) => ({ [k]: i })),
);
export type Face = (typeof FACE)[keyof typeof FACE];

export const TWIST = {
    U: 'U',
    UR: "U'",
    F: 'F',
    FR: "F'",
    R: 'R',
    RR: "R'",
    D: 'D',
    DR: "D'",
    B: 'B',
    BR: "B'",
    L: 'L',
    LR: "L'",
    M: 'M',
    MR: "M'",
    E: 'E',
    ER: "E'",
    S: 'S',
    SR: "S'",
    U2: 'U2',
    F2: 'F2',
    R2: 'R2',
    D2: 'D2',
    B2: 'B2',
    L2: 'L2',
    M2: 'M2',
    E2: 'E2',
    S2: 'S2',
} as const;
export type Twist = (typeof TWIST)[keyof typeof TWIST];

export const SINGLE_TWIST_LIST = [
    TWIST.U,
    TWIST.UR,
    TWIST.F,
    TWIST.FR,
    TWIST.R,
    TWIST.RR,
    TWIST.D,
    TWIST.DR,
    TWIST.B,
    TWIST.BR,
    TWIST.L,
    TWIST.LR,
    TWIST.M,
    TWIST.MR,
    TWIST.E,
    TWIST.ER,
    TWIST.S,
    TWIST.SR,
] as const;

export const DOUBLE_TWIST_LIST = [
    TWIST.U2,
    TWIST.F2,
    TWIST.R2,
    TWIST.D2,
    TWIST.B2,
    TWIST.L2,
    TWIST.M2,
    TWIST.E2,
    TWIST.S2,
] as const;

export const TWIST_LIST = [...SINGLE_TWIST_LIST, ...DOUBLE_TWIST_LIST];

export const CUBE_ANGLES: Twist[][][][] = [
    [
        // down 3x3 cubes
        [
            [TWIST.B], // [0, 0, 90]
            [TWIST.B2], // [0, 0, 180]
            [TWIST.B2], // [0, 0, 180]
        ],
        [
            [TWIST.UR, TWIST.SR], // [0, 90, 90]
            [TWIST.M2], // [180, 0, 0]
            [TWIST.U, TWIST.S], // [0, -90, -90]
        ],
        [
            [TWIST.L2], // [180, 0, 0]
            [TWIST.M2], // [180, 0, 0]
            [TWIST.L, TWIST.UR, TWIST.F], // [90, 90, -90]
        ],
    ],
    [
        // middle 3x3 cubes
        [
            [TWIST.B], // [0, 0, 90]
            [TWIST.MR], // [-90, 0, 0]
            [TWIST.BR], // [0, 0, -90]
        ],
        [
            [TWIST.SR], // [0, 0, 90]
            [], // [0, 0, 0] original axis
            [TWIST.S], // [0, 0, -90]
        ],
        [
            [TWIST.M, TWIST.FR], // [90, 0, 90]
            [TWIST.M], // [90, 0, 0]
            [TWIST.M, TWIST.F], // [90, 0, -90]
        ],
    ],
    [
        // up 3x3 cubes
        [
            [], // [0, 0, 0] original corner
            [], // [0, 0, 0] original edge
            [TWIST.U], // [0, -90, 0]
        ],
        [
            [TWIST.UR], // [0, 90, 0]
            [], // [0, 0, 0] original center
            [TWIST.U], // [0, -90, 0]
        ],
        [
            [TWIST.UR], // [0, 90, 0]
            [TWIST.U2], // [0, 180, 0]
            [TWIST.U2], // [0, 180, 0]
        ],
    ],
] as const;

export const TWIST_RULE: Record<
    Twist,
    { axis: [x: number, y: number, z: number]; levels: number[]; steps: number }
> = {
    [TWIST.U]: { axis: [0, -1, 0], levels: [2], steps: 1 },
    [TWIST.UR]: { axis: [0, 1, 0], levels: [2], steps: 1 },
    [TWIST.F]: { axis: [0, 0, -1], levels: [2], steps: 1 },
    [TWIST.FR]: { axis: [0, 0, 1], levels: [2], steps: 1 },
    [TWIST.R]: { axis: [-1, 0, 0], levels: [2], steps: 1 },
    [TWIST.RR]: { axis: [1, 0, 0], levels: [2], steps: 1 },
    [TWIST.D]: { axis: [0, 1, 0], levels: [0], steps: 1 },
    [TWIST.DR]: { axis: [0, -1, 0], levels: [0], steps: 1 },
    [TWIST.B]: { axis: [0, 0, 1], levels: [0], steps: 1 },
    [TWIST.BR]: { axis: [0, 0, -1], levels: [0], steps: 1 },
    [TWIST.L]: { axis: [1, 0, 0], levels: [0], steps: 1 },
    [TWIST.LR]: { axis: [-1, 0, 0], levels: [0], steps: 1 },
    [TWIST.M]: { axis: [1, 0, 0], levels: [1], steps: 1 },
    [TWIST.MR]: { axis: [-1, 0, 0], levels: [1], steps: 1 },
    [TWIST.E]: { axis: [0, 1, 0], levels: [1], steps: 1 },
    [TWIST.ER]: { axis: [0, -1, 0], levels: [1], steps: 1 },
    [TWIST.S]: { axis: [0, 0, -1], levels: [1], steps: 1 },
    [TWIST.SR]: { axis: [0, 0, 1], levels: [1], steps: 1 },
    [TWIST.U2]: { axis: [0, -1, 0], levels: [2], steps: 2 },
    [TWIST.F2]: { axis: [0, 0, -1], levels: [2], steps: 2 },
    [TWIST.R2]: { axis: [-1, 0, 0], levels: [2], steps: 2 },
    [TWIST.D2]: { axis: [0, 1, 0], levels: [0], steps: 2 },
    [TWIST.B2]: { axis: [0, 0, 1], levels: [0], steps: 2 },
    [TWIST.L2]: { axis: [1, 0, 0], levels: [0], steps: 2 },
    [TWIST.M2]: { axis: [1, 0, 0], levels: [1], steps: 2 },
    [TWIST.E2]: { axis: [0, 1, 0], levels: [1], steps: 2 },
    [TWIST.S2]: { axis: [0, 0, -1], levels: [1], steps: 2 },
} as const;

// convert from cube and face to sticker index
export function getStickerIndex(x: number, y: number, z: number, face: Face): number {
    let [px, py] = [0, 0];

    if (face === FACE.U) {
        px = x;
        py = z;
    } else if (face === FACE.D) {
        px = x;
        py = SIDE_MAX - z;
    } else if (face === FACE.F) {
        px = x;
        py = SIDE_MAX - y;
    } else if (face === FACE.B) {
        px = SIDE_MAX - x;
        py = SIDE_MAX - y;
    } else if (face === FACE.R) {
        px = SIDE_MAX - z;
        py = SIDE_MAX - y;
    } else if (face === FACE.L) {
        px = z;
        py = SIDE_MAX - y;
    }

    return face * CUBE_SIZE * CUBE_SIZE + py * CUBE_SIZE + px;
}

// convert from sticker index to cube and face
export function getCubeFromStickerIndex(
    index: number,
): [x: number, y: number, z: number, face: Face] {
    const face = Math.floor(index / (CUBE_SIZE * CUBE_SIZE));
    const f = index - face * (CUBE_SIZE * CUBE_SIZE);
    const py = Math.floor(f / CUBE_SIZE);
    const px = f % CUBE_SIZE;
    let [x, y, z] = [0, 0, 0];

    if (face === FACE.U) {
        x = px;
        z = py;
    } else if (face === FACE.D) {
        x = px;
        z = SIDE_MAX - py;
    } else if (face === FACE.F) {
        x = px;
        y = SIDE_MAX - py;
    } else if (face === FACE.B) {
        x = SIDE_MAX - px;
        y = SIDE_MAX - py;
    } else if (face === FACE.R) {
        z = SIDE_MAX - px;
        y = SIDE_MAX - py;
    } else if (face === FACE.L) {
        z = px;
        y = SIDE_MAX - py;
    }

    return [x, y, z, face];
}

export function getRandomTwistList(steps: number = 0) {
    // decide twist steps
    const t = steps === 0 ? Math.floor(Math.random() * (30 - 15 + 1)) + 15 : steps;
    const len = SINGLE_TWIST_LIST.length;
    const isOffsetting = (a: string, b: string): boolean => {
        return a !== b && (a + "'").substring(0, 2) === (b + "'").substring(0, 2);
    };

    const list: Twist[] = [];
    let prev = '';
    for (let i = 0; i < t; i++) {
        let s: Twist;
        while (isOffsetting((s = SINGLE_TWIST_LIST[Math.floor(Math.random() * len)]), prev));
        list.push(s);
        prev = s;
    }

    return list;
}

export type Sticker = {
    face: Face;
    color: StickerColor;
};

export class Cube {
    type: string;
    position: { x: number; y: number; z: number };

    protected _stickers: Sticker[];
    protected _initialPosition: { x: number; y: number; z: number };

    constructor(x: number, y: number, z: number) {
        this._stickers = [];
        this._initialPosition = { x, y, z };
        this.position = { x, y, z };

        // calc faces
        let faces = 0;
        if (x === SIDE_MAX) faces++;
        if (x === SIDE_MIN) faces++;
        if (y === SIDE_MAX) faces++;
        if (y === SIDE_MIN) faces++;
        if (z === SIDE_MAX) faces++;
        if (z === SIDE_MIN) faces++;

        this.type = CUBETYPE_LIST[faces];
    }

    getStickers(): Sticker[] {
        return this._stickers;
    }

    init() {
        const { x, y, z } = this.position;
        const angles = CUBE_ANGLES[y][z][x];

        // init cube location
        this._stickers = [];
        if (this.type === CUBE.CENTER) {
            this._stickers = [{ face: FACE.U, color: STICKER_COLOR.PLAIN }];
        } else if (this.type === CUBE.EDGE) {
            this._stickers = [
                { face: FACE.U, color: STICKER_COLOR.PLAIN },
                { face: FACE.B, color: STICKER_COLOR.PLAIN },
            ];
        } else if (this.type === CUBE.CORNER) {
            this._stickers = [
                { face: FACE.U, color: STICKER_COLOR.PLAIN },
                { face: FACE.B, color: STICKER_COLOR.PLAIN },
                { face: FACE.L, color: STICKER_COLOR.PLAIN },
            ];
        }

        // rotate sticker face
        this.rotateStickerFace(angles, false, true);
    }

    reset() {
        const Faces: Face[] = [FACE.U, FACE.B, FACE.L];
        const { x, y, z } = this._initialPosition;
        this.position = { x, y, z };
        const angles = CUBE_ANGLES[y][z][x];

        // init cube faces
        for (let i = 0; i < this._stickers.length; i++) {
            this._stickers[i].face = Faces[i];
            this._stickers[i].color = STICKER_COLOR.PLAIN;
        }

        this.rotateStickerFace(angles, false, true);
    }

    rotateStickerFace(twists: Twist[], reverse: boolean = false, init: boolean = false) {
        const rotateMap: Face[][] = [
            /* x */
            [FACE.U, FACE.F, FACE.D, FACE.B],
            /* y */
            [FACE.F, FACE.R, FACE.B, FACE.L],
            /* z */
            [FACE.U, FACE.L, FACE.D, FACE.R],
        ];

        function getNext(face: Face, axis_index: number, twist: Twist): Face {
            const { axis, steps } = TWIST_RULE[twist];
            const map = rotateMap[axis_index];
            const i = map.indexOf(face);
            if (i < 0) return face; // no rotation
            const angle = axis[axis_index];
            const i2 = (i + 4 + (reverse ? -1 : 1) * angle * steps) % 4;
            return map[i2];
        }

        for (const sticker of this._stickers) {
            for (const r of twists) {
                sticker.face = getNext(sticker.face, 0, r);
                sticker.face = getNext(sticker.face, 1, r);
                sticker.face = getNext(sticker.face, 2, r);
            }
            if (init && sticker.color === STICKER_COLOR.PLAIN) {
                sticker.color = sticker.face;
            }
        }
    }
}

/** Arcanum Cube object class */
export class ArcanumCube {
    /** output debug information to console */
    debug: boolean;

    /** history of twisting */
    protected _history: Twist[];

    /** cube objects matrix */
    protected _matrix: Cube[][][];

    constructor(options?: { debug?: boolean }) {
        this.debug = false;
        this._history = [];
        this._matrix = [];

        if (options) {
            if (options.debug != null) {
                this.debug = options.debug;
            }
        }
    }

    init() {
        this._matrix = [];

        // set 3x3x3 cubes
        const yarray: Cube[][][] = [];
        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            const zarray: Cube[][] = [];
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                const xarray: Cube[] = [];
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const cube = new Cube(x, y, z);
                    cube.init();
                    xarray.push(cube);
                }
                zarray.push(xarray);
            }
            yarray.push(zarray);
        }

        this._matrix = yarray;
    }

    reset() {
        const list = [];
        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const cube = this._matrix[y][z][x];
                    cube.reset();
                    list.push(cube);
                }
            }
        }

        list.forEach((cube) => {
            const n = cube.position;
            this._matrix[n.y][n.z][n.x] = cube;
        });

        this._history = [];
    }

    // twist randomly several steps
    scramble(steps?: number) {
        const list = getRandomTwistList(steps);
        if (this.debug) console.log('Scramble: ' + list.join(', '));
        this.twist(list, false);
    }

    undo(steps: number = 1) {
        const list = this.getUndoList(steps);
        this.twist(list, true);
    }

    getHistory(): Twist[] {
        return this._history;
    }

    getUndoList(steps: number = 1): Twist[] {
        let t = steps;
        if (t < 0) t = 0;
        if (t > this._history.length) t = this._history.length;
        return this._history.slice(-t).reverse();
    }

    twist(twist: Twist | Twist[], reverse = false) {
        if (Array.isArray(twist)) {
            if (twist.length == 0) return;
            for (const c of twist) {
                this._twist(c, reverse);
            }
        } else {
            this._twist(twist, reverse);
        }
    }

    private _twist(twist: Twist, reverse: boolean) {
        this.rotateMatrix(twist, reverse);
        if (this.debug) {
            this.dumpStickers();
        }
        if (reverse) {
            this._history.pop();
        } else {
            this._history.push(twist);
        }

        if (this.debug) console.log(this._history.join(' '));
    }

    rotateMatrix(twist: Twist, reverse: boolean = false) {
        const rule = TWIST_RULE[twist];
        const axis = rule.axis;
        const map: number[][] = new Array(3);
        for (const l of rule.levels) {
            let i = axis.indexOf(-1);
            if (i === -1) i = axis.indexOf(1);
            const s = (reverse ? -1 : 1) * axis[i];
            map[i] = Array(8).fill(l);
            map[(i + s + 3) % 3] = [0, 1, 2, 2, 2, 1, 0, 0];
            map[(i - s + 3) % 3] = [0, 0, 0, 1, 2, 2, 2, 1];

            const [x, y, z] = map;
            const tmp: Cube[] = [];
            for (let i = 0; i < 8; i++) {
                const cube = this._matrix[y[i]][z[i]][x[i]];
                cube.rotateStickerFace([twist], reverse);
                tmp.push(cube);
            }
            for (let i = 0; i < 8; i++) {
                const i2 = (i + rule.steps * 2) % 8;
                tmp[i].position = { x: x[i2], y: y[i2], z: z[i2] };
                this._matrix[y[i2]][z[i2]][x[i2]] = tmp[i];
            }
        }
    }

    getStickerColors(): StickerColor[] {
        const list: StickerColor[] = new Array(CUBE_SIZE * CUBE_SIZE * 6);

        for (let y = SIDE_MIN; y <= SIDE_MAX; y++) {
            for (let z = SIDE_MIN; z <= SIDE_MAX; z++) {
                for (let x = SIDE_MIN; x <= SIDE_MAX; x++) {
                    const cube = this._matrix[y][z][x];
                    const stickers = cube.getStickers();
                    for (const sticker of stickers) {
                        const index = getStickerIndex(x, y, z, sticker.face);
                        list[index] = sticker.color;
                    }
                }
            }
        }

        return list;
    }

    dumpStickers() {
        const list = this.getStickerColors();

        const STYLE = 'background-color:black; padding:1px 1px;';
        const Col2Str: Record<StickerColor, string> = {
            [STICKER_COLOR.UP]: 'color:white; ' + STYLE,
            [STICKER_COLOR.FRONT]: 'color:#00d800; ' + STYLE,
            [STICKER_COLOR.RIGHT]: 'color:#d80000; ' + STYLE,
            [STICKER_COLOR.DOWN]: 'color:yellow; ' + STYLE,
            [STICKER_COLOR.BACK]: 'color:#0000d8; ' + STYLE,
            [STICKER_COLOR.LEFT]: 'color:#ff8000; ' + STYLE,
        };
        const RESET = 'background-color:none; padding:0px 0px;';
        const result: string[] = [];
        const attrs: string[] = [];
        const getLine = (faces: Face[]) => {
            const line: string[] = [];
            for (let py = 0; py < 3; py++) {
                for (const f of faces) {
                    if (f === -1) {
                        // indent
                        line.push('           ');
                    } else {
                        line.push('%c\u25a0 %c\u25a0 %c\u25a0%c  ');
                        const index = f * CUBE_SIZE * CUBE_SIZE + py * CUBE_SIZE;
                        attrs.push(Col2Str[list[index + 0]]);
                        attrs.push(Col2Str[list[index + 1]]);
                        attrs.push(Col2Str[list[index + 2]]);
                        attrs.push(RESET);
                    }
                }
                line.push('\n');
            }
            line.push('\n');
            result.push(line.join(''));
        };

        getLine([-1, FACE.U]);
        getLine([FACE.L, FACE.F, FACE.R, FACE.B]);
        getLine([-1, FACE.D]);
        console.log(result.join('\n'), ...attrs);
    }
}

const STICKER_PERMUTATION_GROUP_MAP: Record<Twist | string, number[][]> =
    makeStickerPermutationGroupMap();

function makeStickerPermutationGroupMap(): Record<Twist | string, number[][]> {
    const result: Record<Twist | string, number[][]> = {};
    TWIST_LIST.forEach((twist) => {
        const tmp = getCubePermutationGroup(<Twist>twist).stickers;
        result[twist] = [tmp.before, tmp.after];
    });
    return result;
}

export function getNextStickerColors(stickers: StickerColor[], twist: Twist): StickerColor[] {
    const result = [...stickers]; // clone
    const [bef, aft] = STICKER_PERMUTATION_GROUP_MAP[twist];
    for (let i = 0; i < bef.length; i++) {
        result[aft[i]] = stickers[bef[i]];
    }
    return result;
}

export function getArrayForTensor(stickers: StickerColor[]) {
    const array: number[][][] = [...Array(3)].map(() =>
        [...Array(3)].map(() => Array(6 * 6).fill(0)),
    );

    // 3 x 3 stickers with by 6 faces x 6 colors
    for (let i = 0; i < stickers.length; i++) {
        const face = Math.floor(i / (CUBE_SIZE * CUBE_SIZE));
        const c = i - face * (CUBE_SIZE * CUBE_SIZE);
        const row = Math.floor(c / CUBE_SIZE);
        const column = c - row * CUBE_SIZE;
        const color = stickers[i];
        array[row][column][color * 6 /* faces */ + face] = 1;
    }

    return array;
}

export function getCubePermutationGroup(twist: Twist, reverse: boolean = false) {
    const rule = TWIST_RULE[twist];
    const axis = rule.axis;
    const result: {
        before: number[][];
        after: number[][];
        stickers: { before: number[]; after: number[] };
    } = { before: [], after: [], stickers: { before: [], after: [] } };
    const map: number[][] = new Array(3);
    for (const l of rule.levels) {
        let i = axis.indexOf(-1);
        if (i === -1) i = axis.indexOf(1);
        const s = (reverse ? -1 : 1) * axis[i];
        map[i] = Array(8).fill(l);
        map[(i + s + 3) % 3] = [0, 1, 2, 2, 2, 1, 0, 0];
        map[(i - s + 3) % 3] = [0, 0, 0, 1, 2, 2, 2, 1];

        const [x, y, z] = map;
        for (let i = 0; i < 8; i++) {
            const i2 = (i + rule.steps * 2) % 8;
            result.before.push([x[i], y[i], z[i]]);
            result.after.push([x[i2], y[i2], z[i2]]);
            const list = getStickerPermutationGroup(
                [x[i], y[i], z[i]],
                [x[i2], y[i2], z[i2]],
                [twist],
                reverse,
            );
            result.stickers.before.push(...list.before);
            result.stickers.after.push(...list.after);
        }
    }

    return result;
}

export function getStickerPermutationGroup(
    position: [x: number, y: number, z: number],
    position2: [x: number, y: number, z: number],
    twists: Twist[],
    reverse: boolean = false,
) {
    const rotateMap: Face[][] = [
        /* x */
        [FACE.U, FACE.F, FACE.D, FACE.B],
        /* y */
        [FACE.F, FACE.R, FACE.B, FACE.L],
        /* z */
        [FACE.U, FACE.L, FACE.D, FACE.R],
    ];

    function getNext(face: Face, axis_index: number, twist: Twist): Face {
        const { axis, steps } = TWIST_RULE[twist];
        const map = rotateMap[axis_index];
        const i = map.indexOf(face);
        if (i < 0) return face; // no rotation
        const angle = axis[axis_index];
        const i2 = (i + 4 + (reverse ? -1 : 1) * angle * steps) % 4;
        return map[i2];
    }

    const result: { before: number[]; after: number[] } = { before: [], after: [] };
    const [x, y, z] = position;
    const [x2, y2, z2] = position2;
    const faces: Face[] = [];
    if (x === SIDE_MAX) faces.push(FACE.R);
    if (x === SIDE_MIN) faces.push(FACE.L);
    if (y === SIDE_MAX) faces.push(FACE.U);
    if (y === SIDE_MIN) faces.push(FACE.D);
    if (z === SIDE_MAX) faces.push(FACE.F);
    if (z === SIDE_MIN) faces.push(FACE.B);

    for (const face of faces) {
        let f = face;
        result.before.push(getStickerIndex(x, y, z, f));
        for (const t of twists) {
            f = getNext(f, 0, t);
            f = getNext(f, 1, t);
            f = getNext(f, 2, t);
        }
        result.after.push(getStickerIndex(x2, y2, z2, f));
    }

    return result;
}
