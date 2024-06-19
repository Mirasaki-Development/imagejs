import path from 'path';

import {
  S3Client,
  S3ClientConfig,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import {
  Adapter,
  AdapterResult,
  AdapterOptions,
  ImageFormat,
  imageFormats,
} from '@imagejs/core';

export * from '@aws-sdk/client-s3';

export default class AWSAdapter extends Adapter {
  private readonly client: S3Client;
  override readonly supportsSave = true;
  override readonly supportsList = true;
  override readonly supportsDelete = true;
  override readonly supportsClean = true;
  override readonly supportsStream = false;

  constructor(
    s3: S3Client | S3ClientConfig,
    public readonly bucket: string,
    path: string,
    options?: Partial<AdapterOptions>
  ) {
    super(path, options);
    this.client = s3 instanceof S3Client ? s3 : new S3Client(s3);
  }

  override async has(id: string, prefixBase = true): Promise<boolean> {
    const imagePath = prefixBase ? path.join(this.basePath, id) : id;
    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: imagePath,
      }));
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  override async fetch(id: string, prefixBase = true): Promise<AdapterResult | undefined> {
    const imagePath = prefixBase ? path.join(this.basePath, id) : id;
    const fileExtension = path.extname(imagePath).slice(1) as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      undefined;
    }

    if (!await this.has(id, prefixBase)) {
      return undefined;
    }

    return new Promise((resolve, reject) => {
      try {
        this.client.send(new GetObjectCommand({
          Bucket: this.bucket,
          Key: id,
        })).then((response) => {
          if (!response.Body) {
            resolve(undefined);
            return;
          }

          response.Body.transformToByteArray().then((data) => {
            resolve({
              data: Buffer.from(data),
              format: fileExtension,
            });
          });
        });

      } catch (err) {
        if (typeof err === 'object' && err !== null && 'Code' in err && err.Code === 'NoSuchKey') {
          return resolve(undefined);
        }
        return reject(err);
      } 
    });
  }

  override async save(id: string, data: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: id,
      Body: data,
    }));
  }

  override async listImages(dir?: string): Promise<string[]> {
    const response = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: dir ?? this.basePath,
    }));
    if (!response.Contents) return [];
    return (response.Contents
      .map((content) => content.Key)
      .filter((key): key is string => !!key));
  }

  override async delete(id: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: id,
    }));
  }

  override async clean(): Promise<void> {
    const images = await this.listImages(this.basePath);
    await Promise.all(images.map((image) => this.delete(image)));
  }
}