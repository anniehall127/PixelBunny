export enum DitherMethod {
  Threshold = 'Threshold',
  Bayer2x2 = 'Bayer 2x2',
  Bayer4x4 = 'Bayer 4x4',
  Bayer8x8 = 'Bayer 8x8',
  FloydSteinberg = 'Floyd-Steinberg',
  Atkinson = 'Atkinson'
}

export interface Palette {
  name: string;
  colors: string[]; // Hex codes
}

export interface ProcessingParams {
  pixelSize: number;
  brightness: number;
  contrast: number;
  ditherMethod: DitherMethod;
  palette: Palette;
  ditherAmount: number; // 0-1 mix
}

export interface ImageState {
  originalSrc: string | null;
  processedUrl: string | null;
  width: number;
  height: number;
  mediaType: 'image' | 'video';
}