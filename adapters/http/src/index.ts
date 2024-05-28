import fetch from 'cross-fetch';
import {
  Adapter,
  AdapterResult,
  AdapterOptions,
  ImageFormat,
  imageFormats,
} from '@imagejs/core'

import pkg from '../package.json';

export default class HTTPAdapter extends Adapter {
  public prefixURL: string = this.basePath
  private readonly fetchOptions: RequestInit = {
    headers: {
      'User-Agent': `${pkg.name}/${pkg.version}`,
      'Accept': 'image/*',
    },
  };

  override readonly supportsSave = false;
  override readonly supportsLoad = false;
  override readonly supportsDelete = false;

  constructor(prefixURL: string, options?: Partial<AdapterOptions>) {
    super(prefixURL, options);
  }

  override async fetch(id: string): Promise<AdapterResult | undefined> {
    const fullURL = new URL(id, this.prefixURL).toString();

    let response: Response;
    try {
      response = await fetch(fullURL, this.fetchOptions);
    } catch (error) {
      throw new Error(`Could not fetch image at URL "${fullURL}": ${error}`);
    }

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(`Could not fetch image at URL "${fullURL}": ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Could not fetch image at URL "${fullURL}": Invalid/unsupported content type "${contentType}"`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileExtension = contentType.split('/')[1] as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      throw new Error(`Unsupported image format: ${fileExtension}`);
    }

    return {
      format: fileExtension,
      data: buffer,
    };
  }
}