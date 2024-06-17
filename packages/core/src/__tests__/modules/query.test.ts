import { mockImageJS } from '../../mocks';

import { 
  allGravities,
  defaultQueryParams,
  defaultTransformQueryParams,
  hasTransforms,
  resolveQueryParams,
  transformQueryParamsKeys,
} from '../../modules';

const params = {
  ...defaultQueryParams,
  ...defaultTransformQueryParams,
};

const imageJS = mockImageJS();

describe('query', () => {
  it('should resolve the default query params', () => {
    const resolvedParams = resolveQueryParams('image.png', {
      format: 'jpeg',
      size: 'original',
    }, imageJS.targetFormat);
    expect(resolvedParams).toEqual({
      format: 'jpeg',
      size: 'original',
      ...defaultTransformQueryParams,
    });
  });

  it('should resolve the default query params with a target format', () => {
    const resolvedParams = resolveQueryParams('image.png', {
      size: 'blur',
    }, 'webp');
    expect(resolvedParams).toEqual({
      format: 'webp',
      size: 'blur',
      ...defaultTransformQueryParams,
    });
  });

  it('should resolve the default query params with a target format and no extension', () => {
    const resolvedParams = resolveQueryParams('image', {
      size: 'blur',
    }, 'webp');
    expect(resolvedParams).toEqual({
      format: 'webp',
      size: 'blur',
      ...defaultTransformQueryParams,
    });
  });

  describe('hasTransforms', () => {
    it('should return false if there are no transforms', () => {
      const has = hasTransforms(params, imageJS);
      expect(has).toBe(false);
    });

    it('should return true if there are transforms', () => {
      const has = hasTransforms({ ...params, blur: 10 }, imageJS);
      expect(has).toBe(true);
    });
  });

  describe('allGravities', () => {
    it('should have the expected keys', () => {
      expect(allGravities).toEqual([
        'north',
        'northeast',
        'east',
        'southeast',
        'south',
        'southwest',
        'west',
        'northwest',
        'center',
        'entropy',
        'attention',
      ]);
    });
  });

  describe('transformQueryParamsKeys', () => {
    it('should have the expected keys', () => {
      expect(transformQueryParamsKeys).toEqual([
        'aspect_ratio',
        'sharpen',
        'blur',
        'crop',
        'crop_gravity',
        'flip',
        'flop',
        'brightness',
        'saturation',
        'hue',
        'contrast',
        'sepia',
        'grayscale',
        'trim',
      ]);
    });
  });
});
