import debug from 'debug';
import { resolveSharpTransformer, resolveSize } from '../helpers';
import { ImageFormat, ImageSize } from '../types';
import { HashCache } from './cache';

export type TransformImageInput = {
  resourceId: string;
  image: Buffer;
  size: ImageSize;
  format: ImageFormat;
  progressive?: boolean;
  trim?: boolean;
  crop?: boolean;
  flip?: boolean;
  flop?: boolean;
  blur?: boolean;
  grayscale?: boolean;
  gravity?: string;
};

export class ImageTransformer {
  static hashCache = new HashCache<string, Buffer>({
    algorithm: 'sha256',
    encoding: 'hex',
    length: 14,
    ttl: null,
    maxEntries: 1000,
  });
  protected static readonly log = debug('imagejs:transformer');

  static cacheKey(input: TransformImageInput) {
    const { size, format, progressive, trim, crop, flip, flop, blur, grayscale, gravity } = input;
    return `transform:${input.resourceId}-${ImageTransformer.hashCache.computeAnyHash({ size, format, progressive, trim, crop, flip, flop, blur, grayscale, gravity })}`;
  }

  static async transformImage(input: TransformImageInput) {
    ImageTransformer.log(`Transforming image to size ${JSON.stringify(input.size)} and format "${input.format}"`);

    const cacheKey = ImageTransformer.cacheKey(input);
    const cached = ImageTransformer.hashCache.get(cacheKey);
    if (cached) {
      ImageTransformer.log(`Found cached image for key "${cacheKey}"`);
      return cached;
    }

    const {
      image, size, format, progressive,
      trim, crop, flip, flop, blur, grayscale, gravity,
    } = input;

    const resolvedSize = resolveSize(size);
    const transformer = resolveSharpTransformer(image, format)({ 
      quality: resolvedSize.quality,
      progressive,
    });

    transformer.rotate(); // Rotate based on EXIF Orientation tag

    if (flip) {
      transformer.flip();
    }

    if (flop) {
      transformer.flop();
    }

    if (grayscale) {
      transformer.grayscale();
    }

    if (trim) {
      transformer.trim();
    }

    if (blur) {
      transformer.blur();
    }

    if (crop) {
      ImageTransformer.log(`Cropping image to size ${JSON.stringify(resolvedSize)} with gravity "${gravity}"`);
      transformer.resize(resolvedSize.width, resolvedSize.height, {
        fit: 'cover',
        position: gravity ?? 'center',
      });
    } else {
      ImageTransformer.log(`Resizing image to size (fit:inside) with width ${resolvedSize.width} and height ${resolvedSize.height}`);
      transformer.resize(resolvedSize.width, resolvedSize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const buffer = await transformer.toBuffer()
    ImageTransformer.hashCache.set(cacheKey, buffer);

    return buffer;
  }
}