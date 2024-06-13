import debug from 'debug';
import { Hash, createHash } from 'crypto'
import fs from 'fs';
import { Readable } from 'stream';

export type Algorithm = typeof createHash['arguments'][0];
export type Encoding = typeof Hash['arguments'][0];

export type HashOptions = {
  algorithm: Algorithm;
  encoding: Encoding;
  length: number;
}

export class AdapterCache implements HashOptions {
  public algorithm: Algorithm;
  public encoding: Encoding;
  public length: number;
  static readonly defaults: HashOptions = {
    algorithm: 'sha256',
    encoding: 'hex',
    length: 14,
  }
  readonly log = debug('imagejs:cache');

  constructor(options: Partial<HashOptions> = {}) {
    this.algorithm = options.algorithm ?? AdapterCache.defaults.algorithm;
    this.encoding = options.encoding ?? AdapterCache.defaults.encoding;
    this.length = options.length ?? AdapterCache.defaults.length;

    if (this.length <= 0) {
      throw new Error('The hash length must be greater than 0');
    }

    this.loadCache(this._cachePath).then(() => {
      this.throttleSaveCache(this._cachePath);
    })
  }

  computeBufferHash(
    buffer: Buffer,
    options: Partial<HashOptions> = {}
  ): string {
    this.log(`Computing hash for buffer of length ${buffer.length}`);
    return createHash(options.algorithm ?? this.algorithm)
      .update(buffer)
      .digest(options.encoding ?? this.encoding)
      .slice(0, options.length ?? this.length)
  }

  async computeStreamHash(
    stream: Readable,
    options: Partial<HashOptions> = {}
  ): Promise<string> {
    this.log(`Computing hash for stream`);
    return new Promise((resolve, reject) => {
      const hash = createHash(options.algorithm ?? this.algorithm);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => {
        resolve(hash.digest(options.encoding ?? this.encoding).slice(0, options.length ?? this.length));
      });
      stream.on('error', (err) => reject(err));
    });
  }

  computeAnyHash(
    value: unknown,
    options: Partial<HashOptions> = {}
  ): string {
    this.log(`Computing hash for value of type ${typeof value}`);
    return this.computeBufferHash(
      Buffer.from(JSON.stringify(value)),
      options
    )
  }

  /**
   * Get the hash for an identifier.
   * @param id - The identifier to get the hash for.
   * @returns The hash for the identifier.
   */
  get(id: string) {
    this.log(`Getting hash for identifier "${id}"`);
    return this._cache.get(id);
  }

  /**
   * Set the hash for an identifier.
   * @param id - The identifier to set the hash for.
   * @param hash - The hash to set for the identifier.
   */
  set(id: string, hash: string) {
    this.log(`Setting hash for identifier "${id}"`);
    this._cache.set(id, hash);
    this.throttleSaveCache();
  }

  /**
   * Delete the hash for an identifier.
   * @param id - The identifier to delete the hash for.
   */
  delete(id: string) {
    this.log(`Deleting hash for identifier "${id}"`);
    this._cache.delete(id);
    this.throttleSaveCache();
  }

  /**
   * Clear the cache.
   */
  clear() {
    this.log(`Clearing cache`);
    this._cache.clear();
    this.throttleSaveCache();
  }

  /**
   * A cache for storing hashes of anything.
   * The key is the identifier you query the cache with.
   * The value is the hash of the identifier.
   * 
   * Say you have a file `image.jpg` and wan to check if it
   * has changed since you last checked. You would query the
   * cache with the file path `image.jpg` and get the hash
   * of the file. If the hash is different from the last time
   * you checked, the file has changed.
   */
  private _cache: Map<string, string> = new Map();
  private _cachePath: string = '.cache';
  private _cacheSaveEvery: number = 5000;
  private _cacheHash: string | null = null;

  /**
   * Load the cache into memory from a file.
   * @param from - The path to the cache file.
   * @returns A promise that resolves when the cache has been loaded.
   */
  private loadCache = async (from: string = this._cachePath) => {
    this.log(`Loading cache from file at path "${from}"`);
    await this.ensureCacheFileExists();
    const data = await fs.promises.readFile(from)
    const cache = JSON.parse(data.toString());
    this._cacheHash = this.computeAnyHash(cache);
    for (const [key, value] of Object.entries(cache)) {
      if (typeof value !== 'string') {
        this.log(`Skipping cache entry for key "${key}" with invalid value`);
        continue;
      }
      this.log(`Loaded cache entry for key "${key}"`);
      this._cache.set(key, value);
    }
    this.log(`Loaded cache from file at path "${from}"`);
  }

  private saveCache = async (to: string = this._cachePath) => {
    this.log(`Saving cache to file at path "${to}"`);
    await this.ensureCacheFileExists();
    return fs.promises.writeFile(to, JSON.stringify(Object.fromEntries(this._cache.entries())));
  }

  private _cacheFileExists = false;
  private ensureCacheFileExists = async () => {
    if (this._cacheFileExists) {
      return;
    }
    if (!fs.existsSync(this._cachePath)) {
      await fs.promises.writeFile(this._cachePath, JSON.stringify({}));
    }
    this._cacheFileExists = true;
  }

  private _throttleSaveCacheTimeout: NodeJS.Timeout | null = null;
  private throttleSaveCache = (to: string = this._cachePath) => {
    if (this._throttleSaveCacheTimeout) {
      this.log(`++ Cache save already scheduled, returning`);
      return;
    }
    this.log(`++ Saving cache in ${this._cacheSaveEvery}ms`);
    this._throttleSaveCacheTimeout = setTimeout(() => {
      this.throttleSaveRun(to);
    }, this._cacheSaveEvery);
  }
  private throttleSaveRun = (to: string = this._cachePath) => {
    const currCacheHash = this.computeAnyHash(Object.fromEntries(this._cache.entries()));
    if (currCacheHash === this._cacheHash) {
      this.log(`=== Cache has not changed, skipping save`);
      this._throttleSaveCacheTimeout = null;
      return;
    }
    this._cacheHash = currCacheHash;
    this.log(`=!= Cache has changed, saving`);
    this.saveCache(to);
    this._throttleSaveCacheTimeout = null;
  }
}