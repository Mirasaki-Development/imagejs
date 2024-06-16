import { imageFormats, sizeKeys } from '../helpers';
import { Gravity, ImageFormat, Query, QueryParams, SizeKey, TransformQueryParams } from '../types'
import { ImageJS } from './image';

export const allGravities: Gravity[] = [
  'north', 'northeast', 'east', 'southeast',
  'south', 'southwest', 'west', 'northwest',
  'center', 'entropy', 'attention',
]

export const defaultQueryParams: QueryParams = {
  format: 'webp',
  size: 'original',
}

export const defaultTransformQueryParams: TransformQueryParams = {
  aspect_ratio: 'auto',
  sharpen: false,
  blur: 0,
  crop: null,
  crop_gravity: 'center',
  flip: false,
  flop: false,
  brightness: 0,
  saturation: 0,
  hue: 0,
  contrast: 0,
  sepia: 0,
  grayscale: false,
  trim: false,
}

export const transformQueryParamsKeys = Object.keys(defaultTransformQueryParams) as (keyof TransformQueryParams)[];

export const resolveQueryParams = (
  id: string,
  params: Query,
  defaultFormat: ImageFormat | 'original'
): QueryParams & TransformQueryParams => {
  const format = params.format;
  const size = params.size;
  const width = params.width;
  const height = params.height;
  const quality = params.quality;

  // Resolve Standard Query Parameters
  const extension = (id.split('.').pop() ?? 'webp');
  const _defaultFormat = defaultFormat === 'original'
    ? imageFormats.includes(extension as ImageFormat)
      ? extension as ImageFormat
      : 'webp'
    : defaultFormat;
  const resolvedFormat: ImageFormat = typeof format === 'string'
    ? imageFormats.includes(format as ImageFormat)
      ? format as ImageFormat
      : _defaultFormat
    : _defaultFormat;

  const hasWidth = typeof width === 'string' && !isNaN(parseInt(width, 10));
  const hasHeight = typeof height === 'string' && !isNaN(parseInt(height, 10));
  const hasSize = typeof size === 'string' && sizeKeys.includes(size as SizeKey);

  const resolvedSize = !hasSize && !hasWidth && !hasHeight
    ? 'original'
    : hasSize
      ? size as SizeKey
      : {
        width: hasWidth ? parseInt(width as string, 10) : null,
        height: hasHeight ? parseInt(height as string, 10) : null,
        quality: typeof quality === 'string' && !isNaN(parseInt(quality, 10))
          ? parseInt(quality as string, 10)
          : 80,
      };

  // Transforms
  const aspect_ratio = params.aspect_ratio;
  const sharpen = params.sharpen;
  const blur = params.blur;
  const crop = params.crop;
  const crop_gravity = params.crop_gravity;
  const flip = params.flip;
  const flop = params.flop;
  const brightness = params.brightness;
  const saturation = params.saturation;
  const hue = params.hue;
  const contrast = params.contrast;
  const sepia = params.sepia;
  const grayscale = params.grayscale;
  const trim = params.trim;

  // Resolve Transform Query Parameters
  const resolvedAspectRatio = typeof aspect_ratio === 'string'
    ? /^(\d+):(\d+)$/.test(aspect_ratio)
      ? aspect_ratio
      : defaultTransformQueryParams.aspect_ratio
    : defaultTransformQueryParams.aspect_ratio;
  const resolvedSharpen = sharpen === 'true';
  const resolvedBlur = typeof blur === 'string' && !isNaN(parseFloat(blur))
    ? Math.min(Math.max(parseFloat(blur), 0), 100)
    : defaultTransformQueryParams.blur;
  const resolvedCrop = (typeof crop === 'string' && /^(\d+),(\d+)(?:,(\d+),(\d+))?$/.test(crop)
    ? crop.split(',').map((n) => parseInt(n, 10)) as [number, number, number, number]
    : defaultTransformQueryParams.crop)
  const resolvedCropGravity = allGravities.includes(crop_gravity as Gravity)
    ? crop_gravity as Gravity
    : defaultTransformQueryParams.crop_gravity;
  const resolvedFlip = flip === 'true';
  const resolvedFlop = flop === 'true';
  const resolvedBrightness = typeof brightness === 'string' && !isNaN(parseFloat(brightness))
    ? Math.min(Math.max(parseFloat(brightness), 0), 100)
    : defaultTransformQueryParams.brightness;
  const resolvedSaturation = typeof saturation === 'string' && !isNaN(parseFloat(saturation))
    ? Math.min(Math.max(parseFloat(saturation), 0), 100)
    : defaultTransformQueryParams.saturation;
  const resolvedHue = typeof hue === 'string' && !isNaN(parseFloat(hue))
    ? Math.min(Math.max(parseFloat(hue), 0), 100)
    : defaultTransformQueryParams.hue;
  const resolvedContrast = typeof contrast === 'string' && !isNaN(parseFloat(contrast))
    ? Math.min(Math.max(parseFloat(contrast), 0), 100)
    : defaultTransformQueryParams.contrast;
  const resolvedSepia = typeof sepia === 'string' && !isNaN(parseFloat(sepia))
    ? Math.min(Math.max(parseFloat(sepia), 0), 100)
    : defaultTransformQueryParams.sepia;
  const resolvedGrayscale = grayscale === 'true';
  const resolvedTrim = trim === 'true';
  
  return {
    format: resolvedFormat,
    size: resolvedSize,

    aspect_ratio: resolvedAspectRatio,
    sharpen: resolvedSharpen,
    blur: resolvedBlur,
    crop: resolvedCrop,
    crop_gravity: resolvedCropGravity,
    flip: resolvedFlip,
    flop: resolvedFlop,
    brightness: resolvedBrightness,
    saturation: resolvedSaturation,
    hue: resolvedHue,
    contrast: resolvedContrast,
    sepia: resolvedSepia,
    grayscale: resolvedGrayscale,
    trim: resolvedTrim,
  };
}

export const hasTransforms = (
  params: ReturnType<typeof resolveQueryParams>,
  imageJS: ImageJS,
): boolean => {
  if (params.format !== imageJS.targetFormat) return true;
  if (typeof params.size !== 'string') return true;

  return transformQueryParamsKeys.some((key) => {
    const value = params[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== defaultTransformQueryParams[key];
    if (Array.isArray(value)) return value.some((v) => v !== defaultTransformQueryParams[key]);
    if (typeof value === 'string') return value !== defaultTransformQueryParams[key];
    return false;
  });
}
