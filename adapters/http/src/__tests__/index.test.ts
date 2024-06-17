import { ImageJS } from '@imagejs/core';
import HTTPAdapter from '..';

describe('HTTPAdapter', () => {
  let imageJS: ImageJS;

  beforeEach(() => {
    imageJS = new ImageJS(
      new HTTPAdapter('https://cdn.mirasaki.dev/assets/images', { ignorePatterns: ['optimized/**'] }),
      new HTTPAdapter('https://cdn.mirasaki.dev/assets/images'),
    );
  });

  it('should create an ImageJS instance', () => {
    expect(imageJS).toBeInstanceOf(ImageJS);
  });

  it('should have the correct base path', () => {
    expect(imageJS.inputAdapter.basePath).toBe('https://cdn.mirasaki.dev/assets/images');
    expect(imageJS.outputAdapter.basePath).toBe('https://cdn.mirasaki.dev/assets/images');
  });

  it('should have the correct ignore patterns', () => {
    expect(imageJS.inputAdapter.ignorePatterns).toEqual(['optimized/**']);
  });

  it('should have the correct log', () => {
    expect(imageJS.inputAdapter.log.namespace).toBe('imagejs:input');
    expect(imageJS.outputAdapter.log.namespace).toBe('imagejs:output');
  });

  it('should have the correct supports', () => {
    // Input adapters should not support save, delete, or clean
    expect(imageJS.inputAdapter.supportsSave).toBe(false);
    expect(imageJS.inputAdapter.supportsDelete).toBe(false);
    expect(imageJS.inputAdapter.supportsClean).toBe(false);
    expect(imageJS.inputAdapter.supportsList).toBe(false);
    expect(imageJS.inputAdapter.supportsStream).toBe(true);

    // Output adapters should support as much as they can
    expect(imageJS.outputAdapter.supportsSave).toBe(false);
    expect(imageJS.outputAdapter.supportsDelete).toBe(false);
    expect(imageJS.outputAdapter.supportsClean).toBe(false);
    expect(imageJS.outputAdapter.supportsList).toBe(false);
    expect(imageJS.outputAdapter.supportsStream).toBe(true);
  });

  it('should properly check if an image exists', async () => {
    const exists = await imageJS.inputAdapter.has('logo.png');
    expect(exists).toBe(true);
  });

  it('should properly fetch an input image', async () => {
    const image = await imageJS.inputAdapter.fetch('logo.png');
    expect(image).toBeDefined();
  });

  it('should properly fetch an output image', async () => {
    const image = await imageJS.outputAdapter.fetch('logo.png');
    expect(image).toBeDefined();
  });

  it('should properly stream an image', async () => {
    if (imageJS.inputAdapter.supportsStream) {
      const stream = await imageJS.inputAdapter.stream('logo.png');
      expect(stream).toBeDefined();
    }
  });

  it('should properly list images', async () => {
    if (imageJS.inputAdapter.supportsList) {
      const images = await imageJS.inputAdapter.listImages();
      expect(images).toHaveLength(4);
    }
  });

  // Note: Modified test - the HTTPAdapter does not support
  // generating optimized sizes
  it('should not be able to optimize images', async () => {
    const data = await imageJS.generateOptimizedSizes();
    const imageMap = imageJS.mapOptimizedImages(data);
    const firstImage = Object.keys(imageMap)[0];
    expect(firstImage).toBeUndefined();
  });

  it('should respect the ignore patterns', async () => {
    if (imageJS.inputAdapter.supportsList) {
      const ignoredFiles = await imageJS.inputAdapter.listImages('src/__tests__/images/optimized/blur/optimized');
      expect(ignoredFiles).toHaveLength(0);
    }
  });
});