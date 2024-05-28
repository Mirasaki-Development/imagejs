import path from 'path';

import debug from 'debug';
import { Adapter, AdapterResult, PrivateAdapter } from '.';
import { MappedImages, OptimizedImageData } from '../types/wrapper';
import { ImageFormat, ImageJSOptions, ImageSize, ImageSizes, SizeKey } from '../types';
import { defaultSizes, removeImageFormat } from '../helpers';
import { ImageTransformer } from './transformers';

export class ImageJS implements ImageJSOptions {
  public inputAdapter: PrivateAdapter;
  public outputAdapter: PrivateAdapter;
  public sizes: ImageSizes;
  public targetFormat: ImageFormat = 'webp';
  protected readonly log = debug('imagejs');
  constructor(
    inputAdapter: Adapter,
    outputAdapter: Adapter,
    options?: ImageJSOptions
  ) {
    this.inputAdapter = new PrivateAdapter('input', inputAdapter);
    this.outputAdapter = new PrivateAdapter('output', outputAdapter);
    this.sizes = {
      blur: options?.sizes?.blur ?? defaultSizes.blur,
      small: options?.sizes?.small ?? defaultSizes.small,
      medium: options?.sizes?.medium ?? defaultSizes.medium,
      large: options?.sizes?.large ?? defaultSizes.large,
      original: options?.sizes?.original ?? defaultSizes.original,
    }
    if (options?.targetFormat) {
      this.targetFormat = options.targetFormat;
    }
  }

  /**
   * Resolve the id of the image - the path where the image is stored
   * 
   * Note: This method is not part of the Adapter class
   * because ids are standardized paths, and the Adapter
   * should handle fetching these standardized paths.
   * 
   * @param id The relative path of the original image
   * @param size The preferred size of the image
   * @returns The resolved id of the (optimized) image
   */
  resolveId(
    id: string,
    size: SizeKey,
    outputPath?: string
  ): string {
    const resolved = path.join(
      outputPath ?? this.outputAdapter.basePath,
      size,
      `${removeImageFormat(id.replace(this.inputAdapter.basePath, ''))}.${this.targetFormat}`
    );
    this.log(`Resolved id for "${id}" with size ${size}: ${resolved}`);
    return resolved;
  }

  /**
   * Fetch an image from the adapter
   * @param id The id of the image. Either a string representing the 
   * path to an optimized image, or an object with the (raw) id, and (preferred) size.
   * @returns The image buffer
   */
  async fetch(id: string | {
    id: string,
    size: SizeKey,
    outputPath?: string
  }): Promise<AdapterResult | undefined> {
    const resolvedId = typeof id === 'string'
    ? id
    : this.resolveId(id.id, id.size, id.outputPath);
    this.outputAdapter.log(`Fetching image with id: ${resolvedId}`);
    return this.outputAdapter.fetch(resolvedId);
  }

  /**
   * Optimize an image according to the specified size and format
   * @param image The path to the original image
   * @param size The preferred size of the image
   * @param format The target format of the image
   * @returns The optimized image as a Buffer
   */
  async optimizeImage(
    image: string,
    size: ImageSize,
    format: ImageFormat = 'webp',
  ): Promise<Buffer> {
    this.log(`Optimizing image "${image}" with size ${JSON.stringify(size)} and format ${format}`);
    return ImageTransformer.transformImage({
      image,
      size,
      format,
      progressive: true,
    })
  }

  /**
   * Syncs the destination directory with the source directory.
   * 
   * If `force` is set to `true`, the destination directory will be
   * cleaned, and populated with the optimized images. If set to `false`,
   * the optimized images will still be saved in the destination
   * directory, but any files that are not present in the source
   * will not be removed.
   *
   * Note: Caching is not implemented yet, so the adapter
   * will always optimize the images, even if they haven't changed
   * and are already optimized. This is prone to change in the future.
   */ // [DEV]
  async sync(): Promise<void> {
    this.log('Syncing source and destination directories');
    if (!this.inputAdapter.supportsLoad) {
      this.inputAdapter.log('This adapter does not support loading images');
      return;
    }

    this.inputAdapter.log('[SYNC] Loading source images');
    const sourceImages = await this.inputAdapter.loadImages(this.inputAdapter.basePath);
    const sourceImagesExpectedOutput = sourceImages // Map to expected target format output
      .map((e) => `${removeImageFormat(e)}.${this.targetFormat}`);

    this.outputAdapter.log('[SYNC] Loading destination images');
    const destinationImages = await this.outputAdapter.loadImages(`${this.outputAdapter.basePath}/blur`)
    const destinationImagesSources = destinationImages // Map optimized images back to original (source) url
      .map((image) => image.replace(`${this.outputAdapter.basePath}/blur`, this.inputAdapter.basePath));

    const imagesToSave = sourceImagesExpectedOutput.filter((image) => !destinationImagesSources.includes(image));
    const imagesToDelete = destinationImagesSources.filter((image) => !sourceImagesExpectedOutput.includes(image));

    if (!imagesToSave.length && !imagesToDelete.length) {
      this.log('[SYNC] No images to save or delete');
      return;
    }

    const saveMappedToOriginal = imagesToSave.map((image) => {
      const index = sourceImagesExpectedOutput.indexOf(image);
      return sourceImages[index] as string;
    })
    const resolveImageDeleteSizes = imagesToDelete.map((image) => {
      const index = destinationImagesSources.indexOf(image);
      const original = destinationImages[index] as string;
      return Object.keys(this.sizes).map((sizeKey) => {
        return original.replace(
          `${this.outputAdapter.basePath}/blur`,
          sizeKey
        )
      });
    }).flat()

    if (imagesToSave.length) this,this.outputAdapter.log('[SYNC] Saving images:', saveMappedToOriginal)
    if (imagesToDelete.length) this.outputAdapter.log('[SYNC] Deleting images:', resolveImageDeleteSizes)

    await Promise.all([
      this.outputAdapter.supportsSave
        ? this.generateOptimizedSizes({
          save: true,
          inputDir: saveMappedToOriginal,
          outputDir: this.outputAdapter.basePath
        })
        : null,
      ...(
        this.outputAdapter.supportsDelete
          ? resolveImageDeleteSizes.map((image) => this.outputAdapter.delete(image))
          : []
      ),
    ])

    this.log(`[SYNC] Synced ${saveMappedToOriginal.length} images and deleted ${resolveImageDeleteSizes.length} images`);
  }

  /**
   * Optimize all images in the input directory. Note that this method
   * will only work if the input adapter supports loading images.
   * @param save Whether to save the optimized images
   * @param inputDir The input directory for the images
   * @param outputDir The output directory for the optimized images
   * @returns The optimized images
   */
  async generateOptimizedSizes({
    save = true,
    inputDir = this.inputAdapter.basePath,
    outputDir = this.outputAdapter.basePath
  }: {
    /**
     * Whether to save the optimized images
     * Only works if the output adapter supports saving images.
     */
    save?: boolean,
    /**
     * The input directory for the images.
     * If an array is provided, the paths in the array will
     * not be read, instead - an array is threated as a list
     * of images/paths to optimize.
     * 
     * @default this.inputAdapter.basePath
     */
    inputDir?: string | string[];
    outputDir?: string
  } = {}): Promise<OptimizedImageData> {
    this.log(`Generating optimized images from ${inputDir} to ${outputDir}`);
    if (!this.inputAdapter.supportsLoad) {
      this.inputAdapter.log('This adapter does not support loading images');
      return [];
    }
    this.inputAdapter.log('Loading/resolving images from', inputDir);
    const images = typeof inputDir === 'string'
      ? await this.inputAdapter.loadImages(inputDir)
      : inputDir;
    this.log('Images to optimize:', images);
    const promises = images.map(async (image) => {
      const innerPromises = Object.entries(this.sizes).map(async ([sizeKey, size]) => {
        const outputPath = this.resolveId(image, sizeKey as SizeKey, outputDir);
        const data = await this.optimizeImage(image, size);
        if (save && this.outputAdapter.supportsSave) {
          this.outputAdapter.log(`Saving optimized image to ${outputPath}`);
          await this.outputAdapter.save(outputPath, data);
        }
        return { size, path: outputPath, data }
      });
      return [ image, await Promise.all(innerPromises) ] as const;
    });
    return await Promise.all(promises);
  }

  /**
   * Map the optimized image data to a more readable format
   * @param data The optimized images
   * @returns The mapped images
   */
  mapOptimizedImages(data: OptimizedImageData): MappedImages {
    return Object.fromEntries(data.map(([ image, innerPromises ]) => {
      return [ image, Object.fromEntries(innerPromises.map((data, index) => {
        return [ Object.keys(this.sizes)[index], data.path ];
      })) ];
    }));
  }
}