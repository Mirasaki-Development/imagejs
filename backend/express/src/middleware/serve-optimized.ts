import { ImageJSMiddleware } from '../types';
import { resolveQueryParams, hasTransforms } from '@imagejs/core';

export const serveOptimizedMiddleware: ImageJSMiddleware<[
  useWebpIfAvailable?: boolean,
  serveTransform?: boolean,
]> = (imageJS, useWebpIfAvailable, serveTransform) => async (req, res, next) => {
  const id = req.params.id;
  if (!id || typeof id !== 'string') {
    next();
    return;
  }

  // Make sure the source/input image exists
  if (!(await imageJS.inputAdapter.has(id, true))) {
    next();
    imageJS.inputAdapter.log(`[express] Source image not found: ${id}`);
    return;
  }

  // Resolve the format/extension to use
  const acceptHeader = req.headers.accept;
  const resolveToFormat = useWebpIfAvailable && acceptHeader && (acceptHeader.includes('image/webp') || acceptHeader === '*/*' || acceptHeader === 'image/*' || acceptHeader === '*')
    ? 'webp'
    : 'original';

  // Resolve the query parameters and id
  const queryParams = resolveQueryParams(id, req.query, resolveToFormat);
  const resolvedId = imageJS.resolveId(
    id,
    typeof queryParams.size === 'string' ? queryParams.size : 'original',
    imageJS.targetFormat,
  );
  imageJS.inputAdapter.log(`[express] Resolved ID: ${resolvedId} with query parameters: ${JSON.stringify(queryParams)}`);

  // Try to hit the cache as early as possible
  const cacheKey = imageJS.transformer.cacheKey({
    ...queryParams,
    format: queryParams.format,
    resourceId: resolvedId,
    size: typeof queryParams.size === 'string' ? imageJS.sizes[queryParams.size] : queryParams.size,
  });
  const cached = imageJS.transformer.hashCache.get(cacheKey);
  if (cached) {
    imageJS.inputAdapter.log(`[express] Found cached image for key "${cacheKey}"`);
    res.type(`image/${queryParams.format}`);
    res.send(cached);
    return;
  }

  // Make sure the optimized image exists - if not, this is a library issue
  if (!(await imageJS.outputAdapter.has(resolvedId, false))) {
    throw new Error(`Optimized image not found: ${resolvedId}, please create a GitHub issue`);
  }

  // Transform the image if the query parameters require it
  if (serveTransform && hasTransforms(queryParams, imageJS)) {
    // Fetch the optimized image
    imageJS.inputAdapter.log(`[express] Transformation required, fetching optimized image: ${resolvedId}`);
    const optimizedOriginal = await imageJS.outputAdapter.fetch(resolvedId, false);
    if (!optimizedOriginal) {
      throw new Error(`Optimized image not found: ${resolvedId}, please create a GitHub issue`);
    }

    // Transform the image to the requested format
    const transformed = await imageJS.transformer.transformImage({
      ...queryParams,
      format: queryParams.format,
      image: optimizedOriginal.data,
      resourceId: resolvedId,
      size: typeof queryParams.size === 'string' ? imageJS.sizes[queryParams.size] : queryParams.size,
    });

    // Send the transformed image
    imageJS.inputAdapter.log(`[express] Sending transformed image: ${resolvedId}`);
    res.type(`image/${queryParams.format}`);
    res.send(transformed);
    return;
  }

  // Stream the optimized image if supported
  if (imageJS.outputAdapter.supportsStream) {
    imageJS.inputAdapter.log(`[express] Streaming optimized image: ${resolvedId}`);
    const response = await imageJS.outputAdapter.stream(resolvedId, false);
    if (!response) {
      throw new Error(`Optimized image not found: ${resolvedId}, please create a GitHub issue`);
    }
    res.type(`image/${response.format}`);
    response.data.pipe(res);
    return;
  }

  // Otherwise, fetch the optimized image and send it
  imageJS.inputAdapter.log(`[express] Sending optimized image: ${resolvedId}`);
  const optimized = await imageJS.outputAdapter.fetch(resolvedId, false);
  if (!optimized) {
    throw new Error(`Optimized image not found: ${resolvedId}, please create a GitHub issue`);
  }
  res.type(`image/${queryParams.format}`);
  res.send(optimized.data);
};