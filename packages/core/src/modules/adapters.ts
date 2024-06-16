import debug from 'debug';
import { ImageFormat } from '../types';
import { Readable } from 'stream';

export type AdapterType = 'input' | 'output';

export type AdapterResult<T = Buffer> = {
  format: ImageFormat;
  data: T;
};

export type AdapterOptions = {
  /**
   * The base path for the adapter. This setting is used
   * to resolve the path of the images when loading or saving
   * them. The base path is also used to resolve the path of
   * the images when optimizing them, making the output
   * an expected structure.
   */
  basePath: string;
  /**
   * An array of glob patterns to ignore when loading
   * all images from a source. This setting only works for
   * the input adapter, during the initial loading of images.
   */
  ignorePatterns: string[];
};

export type AdapterFunctions = {
  has: (id: string, prefixBase?: boolean) => boolean | Promise<boolean>;
  fetch: (id: string, prefixBase?: boolean) => Promise<AdapterResult | undefined>;
  stream: (id: string, prefixBase?: boolean) => undefined | AdapterResult<Readable> | Promise<undefined | AdapterResult<Readable>>;
  save: (id: string, data: Buffer) => void | Promise<void>;
  listImages: (dir: string) => string[] | Promise<string[]>;
  delete: (id: string) => void | Promise<void>;
  clean: () => void | Promise<void>;
};

export type AdapterConstructor = {
  new (basePath: string, options?: Partial<AdapterOptions>): Adapter;
};

export class Adapter implements AdapterFunctions, AdapterOptions {
  readonly supportsSave: boolean = false;
  readonly supportsList: boolean = false;
  readonly supportsStream: boolean = false;
  readonly supportsDelete: boolean = false;
  readonly supportsClean: boolean = false;

  basePath: string;
  ignorePatterns: string[];

  constructor(
    basePath: string,
    options?: Partial<AdapterOptions>,
  ) {
    this.basePath = basePath;
    this.ignorePatterns = options?.ignorePatterns ?? [];
  }

  has(_id: string, _prefixBase = true): boolean | Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  fetch(_id: string, _prefixBase = true): Promise<AdapterResult | undefined> {
    throw new Error('Method not implemented.');
  }

  stream(_id: string, _prefixBase = true): undefined | AdapterResult<Readable> | Promise<undefined | AdapterResult<Readable>> {
    throw new Error('Method not implemented.');
  }

  save(_id: string, _data: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  listImages(_dir: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  delete(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  clean() {
    throw new Error('Method not implemented.');
  }
}

// Note: `extends` gives us issues with the readonly `supportsX` properties
// and would mean users have to provide an AdapterType in the ImageJS constructor
// to facilitate the correct adapter type.
export class PrivateAdapter implements Adapter {
  readonly log: debug.Debugger;
  readonly supportsSave: boolean;
  readonly supportsList: boolean;
  readonly supportsStream: boolean;
  readonly supportsDelete: boolean;
  readonly supportsClean: boolean;
  
  basePath: string;
  ignorePatterns: string[];

  constructor(
    type: AdapterType,
    private _adapter: Adapter,
  ) {
    this.log = debug(`imagejs:${type}`);
    this.supportsSave = type === 'output' ? _adapter.supportsSave : false;
    this.supportsDelete = type === 'output' ? _adapter.supportsDelete : false;
    this.supportsClean = type === 'output' ? _adapter.supportsClean : false;
    // The output adapter is responsible for loading (optimized) images
    // The input adapter is responsible for loading the original images
    this.supportsList = _adapter.supportsList;
    this.supportsStream = _adapter.supportsStream;
    this.basePath = _adapter.basePath;
    this.ignorePatterns = _adapter.ignorePatterns;
  }

  async has(id: string, prefixBase = true): Promise<boolean> {
    return this._adapter.has(id, prefixBase);
  }

  async fetch(id: string, prefixBase = true): Promise<AdapterResult | undefined> {
    return this._adapter.fetch(id, prefixBase);
  }

  async stream(id: string, prefixBase = true): Promise<undefined | AdapterResult<Readable>> {
    return await this._adapter.stream(id, prefixBase);
  }

  async save(id: string, data: Buffer): Promise<void> {
    return this._adapter.save(id, data);
  }

  async listImages(dir: string): Promise<string[]> {
    return this._adapter.listImages(dir);
  }

  async delete(id: string): Promise<void> {
    return this._adapter.delete(id);
  }

  async clean() {
    return this._adapter.clean();
  }
}
