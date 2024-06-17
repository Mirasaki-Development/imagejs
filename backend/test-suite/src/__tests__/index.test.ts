import { nested } from '..';

const imageJS = nested();

describe('imageJS', () => {
  describe('optimize', () => {
    it('should successfully optimize the input', async () => {
      const data = await imageJS.generateOptimizedSizes();
      const imageMap = imageJS.mapOptimizedImages(data);
      const imageKeys = Object.keys(imageMap);
      const firstImage = imageKeys[0];
      expect(firstImage).toBeDefined();
      expect(imageKeys).toHaveLength(4);
    });
    it('should respect the ignorePatterns', () => {
      expect(imageJS.inputAdapter.ignorePatterns).toEqual(['optimized/**']);
      const ignoredFiles = imageJS.inputAdapter.listImages('public/images/optimized/blur/optimized');
      expect(ignoredFiles).toHaveLength(0);
    });
  });

  describe('sync', () => {
    it('should sync the optimized images', async () => {
      await imageJS.sync();
    });
    // [DEV] We need to continue testing adding, removing, and changing images
    // it('should detect an image was removed from the input', async () => {
    //   await imageJS.inputAdapter.delete('banner.webp');
    //   const changed = await imageJS.sync();
    //   const exists = await imageJS.outputAdapter.has(imageJS.resolveId('banner.webp', 'blur'));
    //   expect(exists).toBe(false);
    //   expect(changed.deleted.length).toBe(1);
    // });
  });

  it('should resolve optimized images', async () => {
    const image = await imageJS.outputAdapter.fetch(imageJS.resolveId('banner.webp', 'blur'), false);
    expect(image).toBeDefined();
  });
});