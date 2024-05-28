import debug from 'debug';
import { ImageFormat } from '../types';

export type AdapterType = 'input' | 'output';

export type AdapterResult = {
  format: ImageFormat | null;
  data: Buffer;
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
  fetch: (id: string) => Promise<AdapterResult | undefined>;
  save: (id: string, data: Buffer) => Promise<void>;
  loadImages: (dir: string) => Promise<string[]>;
  delete: (id: string) => Promise<void>;
};

export type AdapterConstructor = {
  new (basePath: string, options?: Partial<AdapterOptions>): Adapter;
};

export class Adapter implements AdapterFunctions, AdapterOptions {
  readonly supportsSave: boolean = false;
  readonly supportsLoad: boolean = false;
  readonly supportsDelete: boolean = false;

  basePath: string;
  ignorePatterns: string[];

  constructor(
    basePath: string,
    options?: Partial<AdapterOptions>,
  ) {
    this.basePath = basePath;
    this.ignorePatterns = options?.ignorePatterns ?? [];
  }

  async fetch(_id: string): Promise<AdapterResult | undefined> {
    throw new Error('Method not implemented.');
  }

  async save(_id: string, _data: Buffer): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async loadImages(_dir: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

// Note: `extends` gives us issues with the readonly `supportsX` properties
// and would mean users have to provide an AdapterType in the ImageJS constructor
// to facilitate the correct adapter type. 
export class PrivateAdapter implements Adapter {
  readonly log: debug.Debugger;
  readonly supportsSave: boolean;
  readonly supportsLoad: boolean;
  readonly supportsDelete: boolean;
  
  basePath: string;
  ignorePatterns: string[];

  constructor(
    type: AdapterType,
    private _adapter: Adapter,
  ) {
    this.log = debug(`imagejs:${type}`);
    this.supportsSave = type === 'output' ? _adapter.supportsSave : false;
    this.supportsDelete = type === 'output' ? _adapter.supportsDelete : false;
    this.supportsLoad = _adapter.supportsLoad; // The output adapter is responsible for loading (optimized) images
    this.basePath = _adapter.basePath;
    this.ignorePatterns = _adapter.ignorePatterns;
  }
  async fetch(id: string): Promise<AdapterResult | undefined> {
    return this._adapter.fetch(id);
  }

  async save(id: string, data: Buffer): Promise<void> {
    return this._adapter.save(id, data);
  }

  async loadImages(dir: string): Promise<string[]> {
    return this._adapter.loadImages(dir);
  }

  async delete(id: string): Promise<void> {
    return this._adapter.delete(id);
  }
}
