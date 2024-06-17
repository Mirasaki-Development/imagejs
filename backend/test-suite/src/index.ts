import express from 'express';

import { ImageJS } from '@imagejs/core';
import FSAdapter from '@imagejs/fs';
import { expressMiddleware } from '@imagejs/express';

export const separate = () => {
  const imageJS = new ImageJS(
    new FSAdapter('public/images'),
    new FSAdapter('public/optimized'),
    { permCacheSizes: { original: true } }
  );
  return imageJS;
};

export const nested = () => {
  const imageJS = new ImageJS(
    new FSAdapter('public/images', { ignorePatterns: ['optimized/**'] }),
    new FSAdapter('public/images/optimized'),
    { permCacheSizes: { original: true } }
  );
  return imageJS;
};

export const main = async () => {
  const app = express();
  app.get('/', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  const imageJS = separate();
  // const imageJS = await nested();

  await imageJS.sync();

  // Before Static Files
  app.use('/images', expressMiddleware({
    imageJS,
    useWebpIfAvailable: true,
    useEtagCaching: false,
  }));

  // Static Files After ImageJS Middleware
  // app.use(express.static('public'));

  // Catch all
  app.use((_req, res) => {
    res.status(404).json({ status: 'not found' });
  });

  app.listen(3000, () => {
    console.info('Server is running on http://localhost:3000');
  });
};