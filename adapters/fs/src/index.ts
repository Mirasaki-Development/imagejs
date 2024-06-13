import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

import {
  Adapter,
  AdapterResult,
  AdapterOptions,
  globPattern,
  ImageFormat,
  imageFormats,
} from '@imagejs/core'
import { Readable } from 'stream';

export const isENOENT = (error: unknown) => error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';

export default class FSAdapter extends Adapter {
  override readonly supportsSave = true;
  override readonly supportsList = true;
  override readonly supportsDelete = true;
  override readonly supportsClean = true;
  override readonly supportsStream = true;

  constructor(path: string, options?: Partial<AdapterOptions>) {
    super(path, options);
  }

  override async fetch(id: string, prefixBase = true): Promise<AdapterResult | undefined> {
    const imagePath = prefixBase ? path.join(this.basePath, id) : id;
    const fileExtension = path.extname(imagePath).slice(1) as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      throw new Error(`Unsupported image format: ${fileExtension}`);
    }

    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(imagePath);
    } catch (error) {
      if (isENOENT(error)) {
        return undefined
      }
      throw new Error(`Could not read file at path "${imagePath}": ${error}`);
    }
    
    return {
      format: fileExtension,
      data: buffer,
    };
  }

  override stream(id: string, prefixBase = true): Readable {
    const imagePath = prefixBase ? path.join(this.basePath, id) : id;
    return fs.createReadStream(imagePath);
  }
  
  override async save(id: string, data: Buffer): Promise<void> {
    const dir = path.dirname(id);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(id, data);
  }

  override async listImages(dir: string): Promise<string[]> {
    return glob(
      globPattern,
      {
        cwd: path.join(process.cwd(), dir),
        nodir: true,
        ignore: this.ignorePatterns,
      }
    ).then((e) => e.map((image) => path.join(dir, image)))
  }

  override async delete(id: string): Promise<void> {
    try {
      await fs.promises.unlink(path.join(this.basePath, id));
    } catch (error) {
      throw new Error(`Could not delete file at path "${id}": ${error}`);
    }
  }

  override async clean(): Promise<void> {
    try {
      await fs.promises.rmdir(this.basePath, { recursive: true });
    } catch (error) {
      throw new Error(`Could not clean directory at path "${this.basePath}": ${error}`);
    }  
  }
}