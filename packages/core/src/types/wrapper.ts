import { ImageSize, SizeKey } from '.';

export type OptimizedImageDataInner = readonly [string, {
  size: ImageSize;
  path: string;
  data: Buffer;
}[]];

export type OptimizedImageData = (OptimizedImageDataInner)[];

export type MappedImages = Record<string, Record<SizeKey, string>>;