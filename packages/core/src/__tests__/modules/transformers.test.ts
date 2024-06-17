import { HashCache, ImageTransformer, defaultQueryParams, defaultTransformQueryParams } from '../../modules';

const cache = new HashCache<string, Buffer>({
  ttl: null,
  maxEntries: 10,
});

const transformer = new ImageTransformer(cache);

const image = Buffer.from('image');
const params = {
  ...defaultQueryParams,
  ...defaultTransformQueryParams,
  resourceId: 'key',
  image,
  size: { size: 100 },
};

describe('transformer', () => {
  it('should transform an image', async () => {
    const transformed = await transformer.transformImage(params);
    expect(transformed).toBeInstanceOf(Buffer);
  });

  it('should cache the transformed image', async () => {
    await transformer.transformImage(params);
    const cached = cache.get(transformer.cacheKey(params));
    expect(cached).toBeInstanceOf(Buffer);
  });

  it('should return consistent cache keys', () => {
    const key1 = transformer.cacheKey(params);
    const key2 = transformer.cacheKey(params);
    expect(key1).toBe(key2);
  });

  describe('resolveUserInputScale', () => {
    it('should resolve the user input scale', () => {
      expect(transformer.resolveUserInputScale(-100)).toBe(0);
      expect(transformer.resolveUserInputScale(0)).toBe(1);
      expect(transformer.resolveUserInputScale(100)).toBe(2);
    });

    it('should resolve the user input scale for negative values', () => {
      expect(transformer.resolveUserInputScale(-50)).toBe(0.5);
      expect(transformer.resolveUserInputScale(-25)).toBe(0.75);
    });

    it('should resolve the user input scale for positive values', () => {
      expect(transformer.resolveUserInputScale(50)).toBe(1.5);
      expect(transformer.resolveUserInputScale(25)).toBe(1.25);
    });

    it('should resolve the user input scale for values over 100', () => {
      expect(transformer.resolveUserInputScale(150)).toBe(2);
      expect(transformer.resolveUserInputScale(200)).toBe(2);
    });

    it('should resolve the user input scale for values under -100', () => {
      expect(transformer.resolveUserInputScale(-150)).toBe(0);
      expect(transformer.resolveUserInputScale(-200)).toBe(0);
    });
  });
});