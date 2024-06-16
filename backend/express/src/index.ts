import cors from 'cors';
import { Router } from 'express';
import { ExpressController, ExpressMiddlewareOptions } from './types';
import { serveOptimizedMiddleware } from './middleware/serve-optimized';

export * from './middleware'
export * from './types'

export const expressMiddleware = ({
  imageJS,
  serveOptimized = true,
  serveTransform = true,
  useWebpIfAvailable = true,
  useEtagCaching = true,
  corsOptions = {
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type'],
  },
}: ExpressMiddlewareOptions): Router => {
  const middleware: ExpressController[] = [];
  if (serveOptimized) {
    middleware.push(serveOptimizedMiddleware(imageJS, useWebpIfAvailable, serveTransform));
  }

  const router = Router();
  if (corsOptions) {
    router.use(cors(corsOptions));
  }

  if (!useEtagCaching) {
    router.use((_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      res.removeHeader('ETag')
      next();
    });
  }

  router.get('/:id(*)', ...middleware);
  return router;
}