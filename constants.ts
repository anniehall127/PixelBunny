import { Palette, DitherMethod, ProcessingParams } from './types';

export const PALETTES: Palette[] = [
  {
    name: 'Manga (Ink & Paper)',
    colors: ['#EBE5CE', '#1A1A1A'] // Beige background, Dark ink
  },
  {
    name: '1-Bit Classic',
    colors: ['#FFFFFF', '#000000']
  },
  {
    name: 'GameBoy',
    colors: ['#9bbc0f', '#8bac0f', '#306230', '#0f380f']
  },
  {
    name: 'Sepia',
    colors: ['#fdf5e6', '#d2b48c', '#a0522d', '#4b3621']
  },
  {
    name: 'Cyberpunk',
    colors: ['#0d0221', '#261447', '#ff00cc', '#33e1ed']
  },
  {
    name: 'Glitch',
    colors: ['#ffffff', '#ff00ff', '#00ffff', '#000000']
  }
];

export const DEFAULT_PARAMS: ProcessingParams = {
  pixelSize: 6,
  brightness: 0,
  contrast: 20,
  ditherMethod: DitherMethod.Bayer4x4,
  palette: PALETTES[0],
  ditherAmount: 1.0,
};

// Bayer Matrices
export const BAYER_2x2 = [
  [0, 2],
  [3, 1]
];

export const BAYER_4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

export const BAYER_8x8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];
