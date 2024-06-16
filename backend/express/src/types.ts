import type { ImageJS } from '@imagejs/core';
import type { Request, Response, NextFunction } from 'express';
import type { CorsOptions } from 'cors';

export type ExpressController = ((req: Request, res: Response, next: NextFunction) => void | Promise<void>)
export type ImageJSMiddleware<
  Params extends unknown[] = unknown[],
> = (imageJS: ImageJS, ...params: Params) => ExpressController;

export type ExpressMiddlewareOptions = {
  /**
   * The main ImageJS instance
   */
  imageJS: ImageJS;
  /**
   * The primary image optimization this library provides.
   * All requests to source/input images will be resolved to
   * the optimized variant. The following query parameters
   * are supported:
   * 
   * - `f`: The image format to serve the image in, default `ImageJS#targetFormat`
   * - `s`: The size to serve the image in, default `original`
   * - `w`: The width of the image, default `null`
   * - `h`: The height of the image, default `null`
   * - `q`: The quality of the image, default `80`
   * 
   * Note: The `s` parameter and the `w`, `h`, `q` parameters are mutually exclusive. If `s` is provided, the other parameters are ignored.
   * 
   * @default true
   */
  serveOptimized?: boolean;
  /**
   * Should the /transform route should be enabled? Allows for dynamic
   * transformations of images. This route allows the following query
   * parameters:
   * 
   * - Everything from `serveOptimized`
   * - `p`: Progressive rendering, default `false`
   * - `t`: Trim the image, default `false`
   * - `c`: Crop the image, default `false`
   * - `flip`: Flip the image, default `false`
   * - `flop`: Flop the image, default `false`
   * - `bl`: Blur the image, default `false`
   * - `gs`: Grayscale the image, default `false`
   * - `gvt`: The gravity of the image, default `original`
   * - `bg`: The background color of the image, default `original`
   * - `r`: Rotate the image according to the EXIF orientation tag, default `false`
   *
   * @default true
   */
  serveTransform?: boolean;
  /**
   * Should we serve images in WebP format if the client supports it, with
   * respect to the accept header? If not, we'll serve the image in the
   * original format.
   * 
   * @default true
   */
  useWebpIfAvailable?: boolean;
  /**
   * Should we use ETag caching for images?
   * 
   * @default true
   */
  useEtagCaching?: boolean;
  /**
   * The CORS options to use for the route this middleware is attached to.
   * 
   * @default { origin: '*', methods: ['GET'], allowedHeaders: ['Content-Type'] }
   */
  corsOptions?: CorsOptions | null;
}