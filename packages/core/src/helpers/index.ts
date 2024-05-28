import sharp from 'sharp';
import { ImageFormat, ImageSize, ImageSizes, SizeByDimensions, SizeOptions } from '../types';

export const imageFormats: ImageFormat[] = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'gif', 'heif'];

export const globPattern = `**/*.{${imageFormats.join(',')}}`;

export const defaultSizes: ImageSizes = {
  blur: { size: 16, quality: 10 },
  small: { size: 320, quality: 70 },
  medium: { size: 640, quality: 80 },
  large: { size: 1280, quality: 90 },
  original: { size: null, },
};

export const resolveSize = (
  size: ImageSize,
): SizeByDimensions & SizeOptions => {
  if ('size' in size) {
    return { width: size.size, height: size.size };
  }
  return size;
}

export const imageExtensionRegex = /\.(jpe?g|png|webp|avif|tiff|gif|heif|raw)$/i

export const removeImageFormat = (image: string) => {
  return image.replace(imageExtensionRegex, '');
}

export const resolveSharpTransformer = (image: string, format: ImageFormat) => {
  const instance = sharp(image);
  switch (format) {
    case 'avif':
      return instance.avif.bind(instance)
    case 'png':
      return instance.png.bind(instance)
    case 'jpeg':
    case 'jpg':
      return instance.jpeg.bind(instance)
    case 'webp':
      return instance.webp.bind(instance)
    case 'tiff':
      return instance.tiff.bind(instance)
    case 'gif':
      return instance.gif.bind(instance)
    case 'heif':
      return instance.heif.bind(instance)
    case 'raw':
      return instance.raw.bind(instance)
    default:
      throw new Error(`Unsupported image format: ${format}`);
  }
}