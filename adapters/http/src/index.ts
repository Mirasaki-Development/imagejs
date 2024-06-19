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
  public acceptStatuses: number[] = [200];
  public prefixURL: string = this.basePath;
  private readonly fetchOptions: axios.AxiosRequestConfig = {
    maxRedirects: 5,
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
    options?: Partial<AdapterOptions> & {
      acceptStatuses?: number[],
    },
    axiosOptions?: axios.CreateAxiosDefaults,
  ) {
    super(prefixURL, options);
    this._client = axios.create({
      ...axiosOptions,
      baseURL: prefixURL,
    });
    if (options?.acceptStatuses) {
      this.acceptStatuses = options.acceptStatuses;
    }
  }

  override async has(id: string): Promise<boolean> {
    try {
      await this._client.head(id, this.fetchOptions);
      return true;
    } catch (error) {
      return false;
    }
  }

  override async fetch(id: string): Promise<AdapterResult | undefined> {
    const fileExtension = id.split('.').pop() as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      return undefined;
    }

    if (!await this.has(id)) {
      return undefined;
    }

    let response: Response;
    try {
      response = await this._client.get(id, {
        ...this.fetchOptions,
        responseType: 'arraybuffer',
      });
    } catch (error) {
      throw new Error(`Could not fetch image at URL "${id}": ${error}`);
    }

    if (!this.acceptStatuses.includes(response.status)) {
      return undefined;
    }

    return {
      // @ts-expect-error responseType is arraybuffer
      data: Buffer.from(response.data),
      format: fileExtension,
    };
  }

  override async stream(id: string): Promise<undefined | AdapterResult<Readable>> {
    const fileExtension = id.split('.').pop() as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      return undefined;
    }

    if (!await this.has(id)) {
      return undefined;
    }

    const response = await this._client.get(id, {
      responseType: 'stream',
      ...this.fetchOptions,
    });

    if (!this.acceptStatuses.includes(response.status)) {
      return undefined;
    }

    return {
      data: response.data,
      format: fileExtension,
    };
  }
}