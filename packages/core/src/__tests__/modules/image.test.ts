import { ImageJS } from '../../modules';
import { mockImageJS } from '../../mocks';

const imageJS = mockImageJS();

describe('image', () => {
  it('should create an ImageJS instance', () => {
    expect(imageJS).toBeInstanceOf(ImageJS);
  });

  it('should have the correct input adapter', () => {
    expect(imageJS.inputAdapter.basePath).toBe('images');
  });

  it('should have the correct output adapter', () => {
    expect(imageJS.outputAdapter.basePath).toBe('images/optimized');
  });

  it('should have the correct ignore patterns', () => {
    expect(imageJS.inputAdapter.ignorePatterns).toEqual(['optimized/**']);
  });

  it('should have the correct log', () => {
    expect(imageJS.inputAdapter.log.namespace).toBe('imagejs:input');
    expect(imageJS.outputAdapter.log.namespace).toBe('imagejs:output');
  });

  it('should have the correct supports', () => {
    expect(imageJS.inputAdapter.supportsSave).toBe(false);
    expect(imageJS.inputAdapter.supportsDelete).toBe(false);
    expect(imageJS.inputAdapter.supportsClean).toBe(false);
    expect(imageJS.inputAdapter.supportsList).toBe(false);
    expect(imageJS.inputAdapter.supportsStream).toBe(false);
  });

  it('should have the correct base path', () => {
    expect(imageJS.inputAdapter.basePath).toBe('images');
    expect(imageJS.outputAdapter.basePath).toBe('images/optimized');
  });

  it('should have the correct ignore patterns', () => {
    expect(imageJS.inputAdapter.ignorePatterns).toEqual(['optimized/**']);
  });
});