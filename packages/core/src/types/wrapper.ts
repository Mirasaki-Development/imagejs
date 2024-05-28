import { ImageSize, SizeKey } from '.';

export type OptimizedImageData = (readonly [string, {
  size: ImageSize;
  path: string;
  data: Buffer;
}[]])[];

export type MappedImages = Record<string, Record<SizeKey, string>>;