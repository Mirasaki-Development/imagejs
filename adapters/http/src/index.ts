import axios from 'axios';
import {
  Adapter,
  AdapterResult,
  AdapterOptions,
  ImageFormat,
  imageFormats,
} from '@imagejs/core';

import pkg from '../package.json';
import { Readable } from 'stream';

export default class HTTPAdapter extends Adapter {
  public prefixURL: string = this.basePath;
  private readonly fetchOptions: axios.AxiosRequestConfig = {
    headers: {
      'User-Agent': `${pkg.name}/${pkg.version}`,
      'Accept': 'image/*',
    },
  };

  override readonly supportsSave = false;
  override readonly supportsList = false;
  override readonly supportsDelete = false;
  override readonly supportsClean = false;
  override readonly supportsStream = true;

  private readonly _client: axios.AxiosInstance;

  constructor(
    prefixURL: string,
    options?: Partial<AdapterOptions>,
    axiosOptions?: axios.CreateAxiosDefaults,
  ) {
    super(prefixURL, options);
    this._client = axios.create({
      ...axiosOptions,
      baseURL: prefixURL,
    });
  }

  override async has(id: string): Promise<boolean> {
    const fullURL = new URL(id, this.prefixURL).toString();

    try {
      await this._client.head(fullURL, this.fetchOptions);
      return true;
    } catch (error) {
      return false;
    }
  }

  override async fetch(id: string): Promise<AdapterResult | undefined> {
    const fullURL = new URL(id, this.prefixURL).toString();

    let response: Response;
    try {
      response = await this._client.get(fullURL, this.fetchOptions);
    } catch (error) {
      throw new Error(`Could not fetch image at URL "${fullURL}": ${error}`);
    }

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      return undefined;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileExtension = contentType.split('/')[1] as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      return undefined;
    }

    return {
      format: fileExtension,
      data: buffer,
    };
  }

  override async stream(_id: string): Promise<undefined | AdapterResult<Readable>> {
    const fileExtension = _id.split('.').pop() as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      return undefined;
    }

    const response = await this._client.get(_id, {
      responseType: 'stream',
      ...this.fetchOptions,
    });

    if (response.status === 404) {
      return undefined;
    }

    return {
      data: response.data,
      format: fileExtension,
    };
  }
}