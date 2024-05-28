import path from 'path';

import {
  S3Client,
  S3ClientConfig,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

import {
  Adapter,
  AdapterResult,
  AdapterOptions,
  ImageFormat,
  imageFormats,
} from '@imagejs/core'

export default class AWSAdapter extends Adapter {
  private readonly client: S3Client;
  override readonly supportsSave = true;
  override readonly supportsLoad = true;
  override readonly supportsDelete = true;

  constructor(
    s3: S3Client | S3ClientConfig,
    public readonly bucket: string,
    path: string,
    options?: Partial<AdapterOptions>
  ) {
    super(path, options);
    this.client = s3 instanceof S3Client ? s3 : new S3Client(s3);
  }

  override async fetch(id: string): Promise<AdapterResult | undefined> {
    const imagePath = path.join(this.basePath, id);
    const fileExtension = path.extname(imagePath).slice(1) as ImageFormat;
    if (!imageFormats.includes(fileExtension)) {
      throw new Error(`Unsupported image format: ${fileExtension}`);
    }

    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.client.send(new GetObjectCommand({
          Bucket: this.bucket,
          Key: id,
        }));

        if (!response.Body) {
          resolve(undefined);
          return;
        }

        resolve({
          data: Buffer.from(await response.Body.transformToByteArray()),
          format: fileExtension,
        });
      } catch (err) {
        return reject(err)
      } 
    })
  }
  
  override async save(id: string, data: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: id,
      Body: data,
    }));
  }

  override async loadImages(dir: string): Promise<string[]> {
    const response = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: dir,
    }));
    if (!response.Contents) return [];
    return (response.Contents
      .map((content) => content.Key)
      .filter(Boolean) as string[]) ?? [];
  }

  override async delete(id: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: id,
    }));
  }
}