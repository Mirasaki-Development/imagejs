import { imageFormats } from './helpers';
import { Adapter, AdapterOptions, AdapterType, ImageJS, PrivateAdapter } from './modules';

// Note: This file shouldn't be exported in the final package

export const images = [
  'images/image1.jpg',
  'images/image2.jpg',
  'images/image3.jpg',
  'images/dir/image4.jpg',
  'images/dir/image5.jpg',
];

Adapter.prototype.has = jest.fn((id: string) => images.includes(id));
Adapter.prototype.fetch = jest.fn(async (id: string) => {
  if (!images.includes(id)) {
    return undefined;
  }
  return {
    format: imageFormats.find((format) => id.endsWith(format))!,
    data: Buffer.from('image data'),
  };
});
Adapter.prototype.stream = jest.fn(async (_id) => {
  return undefined;
});
Adapter.prototype.save = jest.fn(async (id) => {
  images.push(id);
});
Adapter.prototype.listImages = jest.fn(async (dir?: string) => {
  if (dir) {
    return images.filter((image) => image.startsWith(dir));
  }
  return images;
});
Adapter.prototype.delete = jest.fn(async (id) => {
  const index = images.indexOf(id);
  if (index !== -1) {
    images.splice(index, 1);
  }
});
Adapter.prototype.clean = jest.fn(async () => {
  images.length = 0;
});

export const mockAdapter = (basePath: string, options?: Partial<AdapterOptions>) => {
  return new Adapter(basePath, options);
};

export const mockPrivateAdapter = (type: AdapterType, _adapter: Adapter) => {
  return new PrivateAdapter(type, _adapter);
};

export const mockAdapterFunctions = () => {
  return {
    has: Adapter.prototype.has,
    fetch: Adapter.prototype.fetch,
    stream: Adapter.prototype.stream,
    save: Adapter.prototype.save,
    listImages: Adapter.prototype.listImages,
    delete: Adapter.prototype.delete,
    clean: Adapter.prototype.clean,
  };
};

export const mockImageJS = () => {
  return new ImageJS(
    mockAdapter('images', { ignorePatterns: ['optimized/**'] }),
    mockAdapter('images/optimized'),
  );
};
