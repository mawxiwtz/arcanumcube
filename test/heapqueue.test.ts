import HeapQueue from '../src/heapqueue';

describe('Test for HeapQueue', () => {
    const hq = new HeapQueue<string>();

    test('test1', () => {
        hq.heappush(3, '1st');
        hq.heappush(5, '2nd');
        hq.heappush(1, '3rd');
        expect(hq.heappop()).toBe('3rd');
    });

    test('test2', () => {
        expect(hq.length()).toBe(2);
    });

    test('test3', () => {
        hq.heappush(8, '4th');
        hq.heappush(1.4, '5th');
        expect(hq.heappop()).toBe('5th');
    });

    test('test4', () => {
        expect(hq.length()).toBe(3);
    });

    test('test5', () => {
        hq.heappush(9, '6th');
        hq.heappush(10, '7th');
        hq.heappush(3, '8th');
        expect(hq.heappop()).toBe('1st');
    });

    test('test6', () => {
        hq.clear();
        expect(hq.length()).toBe(0);
    });

    test('test7', () => {
        hq.heappush(20, '1st');
        hq.heappush(30, '2nd');
        hq.heappush(10, '3rd');
        hq.heappush(5, '4th');
        hq.heappush(1, '5th');
        hq.heappush(2, '6th');
        hq.heappush(3, '7th');
        hq.heappush(6, '8th');
        hq.heappush(6, '9th');
        expect(hq.heappop()).toBe('5th');
        expect(hq.heappop()).toBe('6th');
    });
});
