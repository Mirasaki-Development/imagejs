import { HashOptions } from '../modules';

export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff' | 'gif' | 'heif' | 'raw';

export type SizeByWidth = {
  /** The width of the image */
  width: number | null;
};

export type SizeByHeight = {
  /** The height of the image */
  height: number | null;
};

export type SizeByDimensions = SizeByWidth & SizeByHeight;

export type SizeBySize = {
  /** The size of the image, both width and height */
  size: number | null;
};

export type SizeOptions = {
  /** The quality of the image, a number between 0 and 100 */
  quality?: number;
};

export type ImageSize = (SizeByDimensions | SizeBySize) & SizeOptions;

export type SizeKey = 'blur' | 'small' | 'medium' | 'large' | 'original';

export type ImageSizes = Record<SizeKey, ImageSize>;

export type ImageJSOptions = {
  /** The size of the image */
  sizes?: Partial<Record<SizeKey, ImageSize>>;
  /**
   * The target format of the image
   * 
   * @default 'webp'
   */
  targetFormat?: ImageFormat;
  /**
   * Configuration options for the hash cache
   */
  hashOptions?: Partial<HashOptions>;
  /**
   * Configuration options for the image cache
   */
  imageCacheOptions?: Partial<HashOptions>;
  /**
   * Should any sizes be permanently cached?
   */
  permCacheSizes?: Partial<Record<SizeKey, boolean>>;
};
