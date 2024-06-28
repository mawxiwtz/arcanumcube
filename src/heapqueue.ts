type HeapQueueValue<T> = {
    priority: number;
    counter: number;
    task: T;
};

class HeapQueue<T> {
    private _queue: HeapQueueValue<T>[];
    private _counter: number;

    constructor() {
        this._queue = [];
        this._counter = 0;
    }

    private _bubble(index: number, v: HeapQueueValue<T>) {
        if (index <= 0) return;
        const parent = (index - 1) >>> 1;
        const p = this._queue[parent];
        if (v.priority < p.priority || (v.priority === p.priority && v.counter < p.counter)) {
            this._queue[parent] = v;
            this._queue[index] = p;
            this._bubble(parent, v);
        }
    }

    private _sink(index: number, v: HeapQueueValue<T>) {
        const len = this._queue.length;
        const child = (index << 1) + 1;
        if (child >= len) return;
        const c = this._queue[child];
        const child2 = (index << 1) + 2;
        if (child2 < len) {
            const c2 = this._queue[child2];
            if (
                c2.priority < c.priority ||
                (c2.priority === c.priority && c2.counter < c.counter)
            ) {
                if (
                    v.priority > c2.priority ||
                    (v.priority === c2.priority && v.counter < c2.counter)
                ) {
                    this._queue[child2] = v;
                    this._queue[index] = c2;
                    this._sink(child2, v);
                    return;
                }
            }
        }
        if (v.priority > c.priority || (v.priority === c.priority && v.counter < c.counter)) {
            this._queue[child] = v;
            this._queue[index] = c;
            this._sink(child, v);
            return;
        }
        this._bubble(index, v);
    }

    heappush(priority: number, task: T) {
        const len = this._queue.length;
        const counter = this._counter++;
        const v: HeapQueueValue<T> = { priority, counter, task };
        this._queue.push(v);
        this._bubble(len, v);
    }

    heappop(): T | undefined {
        const len = this._queue.length;
        const v = len <= 0 ? undefined : this._queue[0];
        if (len > 0) {
            const n = this._queue.pop();
            if (len > 1) {
                this._queue[0] = n!;
                this._sink(0, n!);
            }
        }
        return v ? v.task : undefined;
    }

    length(): number {
        return this._queue.length;
    }

    clear() {
        this._queue = [];
    }
}

export default HeapQueue;
