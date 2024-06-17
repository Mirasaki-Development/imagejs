import { HashCache } from '../../modules';

const cache = new HashCache<string, string>({
  ttl: null,
  maxEntries: 10,
});

const id = 'key';
const value = 'value';

describe('cache', () => {
  describe('HashCache', () => {
    test('has', () => {
      expect(cache.has(id)).toBe(false);
      cache.set(id, value);
      expect(cache.has(id)).toBe(true);
    });

    test('size', () => {
      cache.delete(id);
      expect(cache.size).toBe(0);
      cache.set(id, value);
      expect(cache.size).toBe(1);
      cache.delete(id);
      expect(cache.size).toBe(0);
      for (let i = 0; i < 10; i++) {
        cache.set(`${id}-${i}`, value);
      }
      expect(cache.size).toBe(10);
      cache.clear();
      expect(cache.size).toBe(0);
    });

    test('keys', () => {
      cache.set(id, value);
      expect(Array.from(cache.keys())).toEqual([id]);
    });

    test('entries', () => {
      cache.set(id, value);
      expect(Array.from(cache.entries())).toEqual([[id, value]]);
    });

    test('values', () => {
      cache.set(id, value);
      expect(Array.from(cache.values())).toEqual([value]);
    });

    test('Symbol.iterator', () => {
      cache.set(id, value);
      expect(Array.from(cache)).toEqual([[id, value]]);
    });

    test('get', () => {
      cache.set(id, value);
      expect(cache.get(id)).toBe(value);
    });

    test('set', () => {
      cache.set(id, value);
      expect(cache.get(id)).toBe(value);
    });

    test('delete', () => {
      cache.set(id, value);
      cache.delete(id);
      expect(cache.get(id)).toBeUndefined();
    });

    test('clear', () => {
      cache.set(id, value);
      cache.clear();
      expect(cache.get(id)).toBeUndefined();
    });

    test('expiry', async () => {
      const ttl = 100;
      const cache = new HashCache<string, string>({
        ttl,
        maxEntries: 10,
      });
      cache.set(id, value);
      await new Promise((resolve) => setTimeout(resolve, ttl * 2));
      expect(cache.get(id)).toBeUndefined();
      cache.clear();
    });

    test('max entries', () => {
      const cache = new HashCache<string, string>({
        ttl: null,
        maxEntries: 10,
      });
      for (let i = 0; i < 10; i++) {
        cache.set(`${id}-${i}`, value);
      }
      cache.set(id, value);
      expect(cache.get(id)).toBe(value);
      expect(cache.size).toBe(10);
      cache.clear();
    });

    test('max entries with expiry', async () => {
      const ttl = 100;
      const cache = new HashCache<string, string>({
        ttl,
        maxEntries: 10,
      });
      for (let i = 0; i < 10; i++) {
        cache.set(`${id}-${i}`, value);
      }
      cache.set(id, value);
      await new Promise((resolve) => setTimeout(resolve, ttl * 2));
      expect(cache.get(id)).toBeUndefined();
      expect(cache.size).toBe(0);
      cache.clear();
    });

    test('max entries with expiry and new entries', async () => {
      const ttl = 100;
      const cache = new HashCache<string, string>({
        ttl,
        maxEntries: 10,
      });
      for (let i = 0; i < 10; i++) {
        cache.set(`${id}-${i}`, value);
      }
      cache.set(id, value);
      await new Promise((resolve) => setTimeout(resolve, ttl / 2));
      cache.set(`${id}-new`, value);
      await new Promise((resolve) => setTimeout(resolve, ttl / 2));
      expect(cache.get(id)).toBeUndefined();
      expect(cache.size).toBe(1);
      cache.clear();
    });
  });

  afterEach(() => {
    cache.clear();
  });
});