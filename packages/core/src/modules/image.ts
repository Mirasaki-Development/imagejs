import path from 'path';

import debug from 'debug';
import { Adapter, AdapterResult, HashCache, PersistentHashCache, PrivateAdapter, defaultTransformQueryParams } from '.';
import { MappedImages, OptimizedImageData } from '../types/wrapper';
import { ImageFormat, ImageJSOptions, ImageSize, ImageSizes, SizeKey } from '../types';
import { defaultSizes, removeImageFormat } from '../helpers';
import { ImageTransformer } from './transformers';
import { Readable } from 'stream';

export class ImageJS implements ImageJSOptions {
  public inputAdapter: PrivateAdapter;
  public outputAdapter: PrivateAdapter;
  public sizes: ImageSizes;
  public targetFormat: ImageFormat = 'webp';
  protected readonly log = debug('imagejs');
  private readonly hashCache: PersistentHashCache;
  public readonly transformer: ImageTransformer;
  constructor(
    inputAdapter: Adapter,
    outputAdapter: Adapter,
    options?: ImageJSOptions,
  ) {
    this.inputAdapter = new PrivateAdapter('input', inputAdapter);
    this.outputAdapter = new PrivateAdapter('output', outputAdapter);
    this.sizes = {
      blur: options?.sizes?.blur ?? defaultSizes.blur,
      small: options?.sizes?.small ?? defaultSizes.small,
      medium: options?.sizes?.medium ?? defaultSizes.medium,
      large: options?.sizes?.large ?? defaultSizes.large,
      original: options?.sizes?.original ?? defaultSizes.original,
    };
    if (options?.targetFormat) {
      this.targetFormat = options.targetFormat;
    }
    this.hashCache = new PersistentHashCache({
      algorithm: options?.hashOptions?.algorithm ?? PersistentHashCache.defaults.algorithm,
      encoding: options?.hashOptions?.encoding ?? PersistentHashCache.defaults.encoding,
      length: options?.hashOptions?.length ?? PersistentHashCache.defaults.length,
      ttl: options?.hashOptions?.ttl ?? PersistentHashCache.defaults.ttl,
      maxEntries: options?.hashOptions?.maxEntries ?? PersistentHashCache.defaults.maxEntries,
    });
    this.transformer = new ImageTransformer(new HashCache<string, Buffer>({
      algorithm: options?.imageCacheOptions?.algorithm ?? HashCache.defaults.algorithm,
      encoding: options?.imageCacheOptions?.encoding ?? HashCache.defaults.encoding,
      length: options?.imageCacheOptions?.length ?? HashCache.defaults.length,
      ttl: options?.imageCacheOptions?.ttl ?? HashCache.defaults.ttl,
      maxEntries: options?.imageCacheOptions?.maxEntries ?? HashCache.defaults.maxEntries,
    }));
    for (const [k,v] of Object.entries(options?.permCacheSizes ?? {})) {
      if (v) this.permanentlyCacheImageSize(k as SizeKey);
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
   * @param outputPath (overwrite) The output path for the optimized image
   * @returns The resolved id of the (optimized) image
   */
  resolveId(
    id: string,
    size: SizeKey,
    format?: ImageFormat,
    outputPath?: string
  ): string {
    const resolved = path.join(
      outputPath ?? this.outputAdapter.basePath,
      size,
      `${removeImageFormat(id.replace(this.inputAdapter.basePath, ''))}.${format ?? this.targetFormat}`
    );
    // if (format && format !== this.targetFormat) {
    //   resolved = resolved.replace(path.extname(resolved), format)
    // }
    this.log(`Resolved id for "${id}" with size ${size}: ${resolved}`);
    return resolved;
  }

  /**
   * Optimize an image according to the specified size and format
   * @param image The path to the original image
   * @param size The preferred size of the image
   * @param format The target format of the image
   * @returns The optimized image as a Buffer
   */
  async optimizeImage(
    resourceId: string,
    image: Buffer,
    size: ImageSize,
    format: ImageFormat = this.targetFormat,
  ): Promise<Buffer> {
    this.log(`Optimizing image with size ${JSON.stringify(size)} and format ${format}`);
    return this.transformer.transformImage({
      ...defaultTransformQueryParams,
      resourceId,
      image,
      size,
      format,
    });
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
  async sync(force = false): Promise<void> {
    this.log('Syncing source and destination directories');
    if (!this.inputAdapter.supportsList) {
      this.inputAdapter.log('This adapter does not support listing images');
      return;
    }

    const start = process.hrtime.bigint();

    if (force) {
      this.outputAdapter.log('[SYNC] Cleaning destination directory');
      this.hashCache.clear();
      await this.outputAdapter.clean();
    }

    this.inputAdapter.log('[SYNC] Loading source images');
    const sourceImages = await this.inputAdapter.listImages(this.inputAdapter.basePath);
    const sourceImagesExpectedOutput = sourceImages // Map to expected target format output
      .map((e) => `${removeImageFormat(e)}.${this.targetFormat}`);

    this.outputAdapter.log('[SYNC] Loading destination images');
    const destinationImages = await this.outputAdapter.listImages(`${this.outputAdapter.basePath}/blur`);
    const destinationImagesSources = destinationImages // Map optimized images back to original (source) url
      .map((image) => image.replace(`${this.outputAdapter.basePath}/blur`, this.inputAdapter.basePath));

    const imagesToSave = sourceImagesExpectedOutput.filter((image) => !destinationImagesSources.includes(image));
    const imagesToDelete = destinationImagesSources.filter((image) => !sourceImagesExpectedOutput.includes(image));

    const saveMappedToOriginal = imagesToSave.map((image) => {
      const index = sourceImagesExpectedOutput.indexOf(image);
      return sourceImages[index] as string;
    });
    const resolveImageDeleteSizes = imagesToDelete.map((image) => {
      const index = destinationImagesSources.indexOf(image);
      const original = destinationImages[index] as string;
      return Object.keys(this.sizes).map((sizeKey) => {
        return original.replace(
          `${this.outputAdapter.basePath}/blur`,
          sizeKey
        );
      });
    }).flat();

    if (imagesToSave.length) this,this.outputAdapter.log('[SYNC] Saving images: %O', saveMappedToOriginal);
    if (imagesToDelete.length) {
      this.outputAdapter.log('[SYNC] Deleting images: %O', resolveImageDeleteSizes);
      imagesToDelete.forEach((image) => this.hashCache.delete(image));
    }

    await Promise.all([
      this.outputAdapter.supportsSave
        ? this.generateOptimizedSizes({
          save: true,
          inputDir: saveMappedToOriginal,
          outputDir: this.outputAdapter.basePath,
          callback: (id, buffer) => this.hashCache.set(id, this.hashCache.computeBufferHash(buffer)),
        })
        : null,
      ...(
        this.outputAdapter.supportsDelete
          ? resolveImageDeleteSizes.map((image) => this.outputAdapter.delete(image))
          : []
      ),
    ]);

    // Only check for changes if not hard-syncing
    // Has to be after the images are saved and deleted
    // as otherwise the cache would be out of sync
    let changes: null | string[] = null;
    if (!force) changes = await this.checkForChanges([
      ...saveMappedToOriginal,
      ...resolveImageDeleteSizes,
    ]);

    this.log(`
      [SYNC] Synced %d images, deleted %d images, updated %d changed images, completed in %dms`,
      saveMappedToOriginal.length,
      resolveImageDeleteSizes.length,
      changes ? changes.length : 0,
      Number(process.hrtime.bigint() - start) / 1e6
    );
  }

  /**
   * This function only checks for changes if the input adapter
   * supports listing and streaming images. Otherwise, we could
   * end up using too many system resources.
   * @returns 
   */
  async checkForChanges(
    ignore?: string[]
  ) {
    if (!this.inputAdapter.supportsList) {
      this.inputAdapter.log('This adapter does not support listing images');
      return null;
    }
    if (!this.inputAdapter.supportsStream) {
      this.outputAdapter.log('This adapter does not support streaming images');
      return null;
    }
    this.inputAdapter.log('Checking for changes in source images');
    const allImages = await this.inputAdapter.listImages(this.inputAdapter.basePath);
    const resolvedImages = ignore ? allImages.filter((e) => !ignore.includes(e)) : allImages;

    const response = await Promise.all(
      resolvedImages.map(async (e) => {
        const stream = await this.inputAdapter.stream(e, false) as AdapterResult<Readable>;
        const hashKey = await this.hashCache.computeStreamHash(stream.data);
        const fromCache = this.hashCache.get(e);
        if (fromCache === hashKey) {
          this.hashCache.log(`Image "${e}" has not changed`);
          return null;
        }

        this.hashCache.log(`Image "${e}" has changed, old hash: ${fromCache}, new hash: ${hashKey}`);
        this.hashCache.set(e, hashKey);
        return e;
      })
    );

    const toOptimize = response.filter((e) => e !== null) as string[];
    const optimizedImages = await this.generateOptimizedSizes({
      save: true,
      inputDir: toOptimize,
      outputDir: this.outputAdapter.basePath,
    });
    const mappedImages = this.mapOptimizedImages(optimizedImages);
    this.hashCache.log('Updated/changed images: %O', mappedImages);
    return Object.keys(mappedImages);
  }

  async permanentlyCacheImageSize(size: SizeKey) {
    if (!this.sizes[size]) {
      this.log(`Size "${size}" does not exist`);
      return;
    }
    if (!this.inputAdapter.supportsList) {
      this.inputAdapter.log('This adapter does not support listing images');
      return;
    }
    this.log(`Permanently caching size "${size}"`);
    const images = await this.inputAdapter.listImages(this.inputAdapter.basePath);
    const promises = images.map(async (image) => {
      const imageSizeId = this.resolveId(image, size, this.targetFormat);
      this.log(`Permanently caching image "${imageSizeId}"`);
      const response = await this.outputAdapter.fetch(imageSizeId, false) as AdapterResult<Buffer>;
      const cacheKey = this.transformer.cacheKey({
        resourceId: imageSizeId,
        size: this.sizes[size],
        format: this.targetFormat,
        ...defaultTransformQueryParams,
      });
      this.transformer.hashCache.set(cacheKey, response.data, null);
    });
    await Promise.all(promises);
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
    outputDir = this.outputAdapter.basePath,
    callback,
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
    outputDir?: string;
    /**
     * The callback to run for each image that will be optimized
     */
    callback?: (_id: string, _buffer: Buffer) => void;
  } = {}): Promise<OptimizedImageData> {
    this.log(`Generating optimized images from ${inputDir} to ${outputDir}`);
    if (typeof inputDir === 'string' && !this.inputAdapter.supportsList) {
      this.inputAdapter.log('This adapter does not support listing images');
      return [];
    }
    this.inputAdapter.log('Loading/resolving images from', inputDir);
    const images = typeof inputDir === 'string'
      ? await this.inputAdapter.listImages(inputDir)
      : inputDir;
    this.log('Images to optimize: %O', images);
    const promises = images.map(async (image) => {
      const response = await this.inputAdapter.fetch(image, false) as AdapterResult<Buffer>;
      if (callback) callback(image, response.data);
      const innerPromises = Object.entries(this.sizes).map(async ([sizeKey, size]) => {
        const outputPath = this.resolveId(image, sizeKey as SizeKey, this.targetFormat, outputDir);
        const data = await this.optimizeImage(image, response.data, size);
        if (save && this.outputAdapter.supportsSave) {
          this.outputAdapter.log(`Saving optimized image to ${outputPath}`);
          await this.outputAdapter.save(outputPath, data);
        }
        return { size, path: outputPath, data };
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