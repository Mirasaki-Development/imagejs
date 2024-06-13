import debug from 'debug';
import { resolveSharpTransformer, resolveSize } from '../helpers';
import { ImageFormat, ImageSize } from '../types';

export type TransformImageInput = {
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
  protected static readonly log = debug('imagejs:transformer');
  static async transformImage(input: TransformImageInput) {
    this.log(`Transforming image to size ${JSON.stringify(input.size)} and format "${input.format}"`);
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
      this.log(`Cropping image to size ${JSON.stringify(resolvedSize)} with gravity "${gravity}"`);
      transformer.resize(resolvedSize.width, resolvedSize.height, {
        fit: 'cover',
        position: gravity ?? 'center',
      });
    } else {
      this.log(`Resizing image to size (fit:inside) with width ${resolvedSize.width} and height ${resolvedSize.height}`);
      transformer.resize(resolvedSize.width, resolvedSize.height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    return await transformer.toBuffer()
  }
}