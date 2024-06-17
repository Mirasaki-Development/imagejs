import { imageFormats, defaultSizes, removeImageFormat, resolveSize } from '../helpers';

describe('helpers', () => {
  describe('defaultSizes', () => {
    it('should have the expected keys', () => {
      expect(Object.keys(defaultSizes)).toEqual(['blur', 'small', 'medium', 'large', 'original']);
    });
  });

  describe('resolveSize', () => {
    it('should return the size as an object with width and height when size is a number', () => {
      const size = resolveSize({ size: 100 });
      expect(size).toEqual({ width: 100, height: 100 });
    });

    it('should return the size as an object with width and height when size is width and height', () => {
      const size = resolveSize({ width: 100, height: 200 });
      expect(size).toEqual({ width: 100, height: 200 });
    });
  });

  describe('removeImageFormat', () => {
    it('should remove the image format from the image', () => {
      const image = removeImageFormat('image.jpg');
      expect(image).toBe('image');
    });
    it('should do so for all image formats', () => {
      imageFormats.forEach((format) => {
        const image = removeImageFormat(`image.${format}`);
        expect(image).toBe('image');
      });
    });
  });
});