import { DitherMethod, Palette, ProcessingParams } from '../types';
import { BAYER_2x2, BAYER_4x4, BAYER_8x8 } from '../constants';

// Helper to convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

// Find closest color in palette
const findClosestColor = (r: number, g: number, b: number, paletteColors: [number, number, number][]): [number, number, number] => {
  let minDist = Infinity;
  let closest = paletteColors[0];

  for (const color of paletteColors) {
    // Weighted Euclidean distance for better perceptual matching
    const dr = (r - color[0]) * 0.30;
    const dg = (g - color[1]) * 0.59;
    const db = (b - color[2]) * 0.11;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }
  return closest;
};

// Main processing function
export const processImage = (
  source: CanvasImageSource,
  canvas: HTMLCanvasElement,
  params: ProcessingParams,
  sourceWidth: number,
  sourceHeight: number
) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  // 1. Calculate dimensions based on pixel size
  // We want to process at a low resolution, then scale up
  
  // The processing resolution
  const procW = Math.ceil(sourceWidth / params.pixelSize);
  const procH = Math.ceil(sourceHeight / params.pixelSize);

  // Resize canvas to the small processing size
  if (canvas.width !== procW || canvas.height !== procH) {
    canvas.width = procW;
    canvas.height = procH;
  }

  // Draw original image scaled down
  ctx.drawImage(source, 0, 0, procW, procH);

  // Get raw pixel data
  const imageData = ctx.getImageData(0, 0, procW, procH);
  const data = imageData.data;
  const len = data.length;

  // Pre-calculate palette RGBs
  const paletteRGBs = params.palette.colors.map(hexToRgb);

  // Contrast factor calculation
  // Value range 0-100 mapped to somewhat usable curve
  // 0 -> 1 (no change), 100 -> high contrast
  const contrastFactor = (259 * (params.contrast + 255)) / (255 * (259 - params.contrast));

  const applyBrightnessContrast = (val: number): number => {
      // Brightness
      let v = val + params.brightness;
      // Contrast
      v = contrastFactor * (v - 128) + 128;
      return Math.max(0, Math.min(255, v));
  };

  // Processing loop
  // For error diffusion, we need to process differently than ordered dither
  const isErrorDiffusion = 
    params.ditherMethod === DitherMethod.FloydSteinberg || 
    params.ditherMethod === DitherMethod.Atkinson;

  if (isErrorDiffusion) {
    // Error Diffusion Loop
    for (let y = 0; y < procH; y++) {
      for (let x = 0; x < procW; x++) {
        const i = (y * procW + x) * 4;

        // Apply basic corrections
        const oldR = applyBrightnessContrast(data[i]);
        const oldG = applyBrightnessContrast(data[i + 1]);
        const oldB = applyBrightnessContrast(data[i + 2]);

        // Find closest palette color
        const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, paletteRGBs);

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
        // Alpha stays same (or 255)
        data[i + 3] = 255;

        // Calculate Error
        const errR = (oldR - newR);
        const errG = (oldG - newG);
        const errB = (oldB - newB);

        // Distribute Error
        if (params.ditherMethod === DitherMethod.FloydSteinberg) {
            // Floyd-Steinberg distribution
            //   X   7
            // 3 5   1
            // ( / 16 )
            const distribute = (dx: number, dy: number, factor: number) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < procW && ny >= 0 && ny < procH) {
                    const ni = (ny * procW + nx) * 4;
                    const d = params.ditherAmount; // Allow reducing effect
                    data[ni] += errR * factor * d;
                    data[ni+1] += errG * factor * d;
                    data[ni+2] += errB * factor * d;
                }
            };
            distribute(1, 0, 7/16);
            distribute(-1, 1, 3/16);
            distribute(0, 1, 5/16);
            distribute(1, 1, 1/16);
        } else {
             // Atkinson distribution (Classic Mac style, cleaner)
            const distribute = (dx: number, dy: number, factor: number) => {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < procW && ny >= 0 && ny < procH) {
                    const ni = (ny * procW + nx) * 4;
                    const d = params.ditherAmount; 
                    data[ni] += errR * factor * d;
                    data[ni+1] += errG * factor * d;
                    data[ni+2] += errB * factor * d;
                }
            };
            // 1/8 distribution
            distribute(1, 0, 1/8);
            distribute(2, 0, 1/8);
            distribute(-1, 1, 1/8);
            distribute(0, 1, 1/8);
            distribute(1, 1, 1/8);
            distribute(0, 2, 1/8);
        }
      }
    }
  } else {
    // Ordered Dithering & Threshold Loop
    // Determine matrix
    let matrix: number[][] | null = null;
    let matrixSize = 0;
    let divisor = 1;

    if (params.ditherMethod === DitherMethod.Bayer2x2) {
        matrix = BAYER_2x2; matrixSize = 2; divisor = 4;
    } else if (params.ditherMethod === DitherMethod.Bayer4x4) {
        matrix = BAYER_4x4; matrixSize = 4; divisor = 16;
    } else if (params.ditherMethod === DitherMethod.Bayer8x8) {
        matrix = BAYER_8x8; matrixSize = 8; divisor = 64;
    }

    for (let i = 0; i < len; i += 4) {
      const pixelIndex = i / 4;
      const x = pixelIndex % procW;
      const y = Math.floor(pixelIndex / procW);

      let r = applyBrightnessContrast(data[i]);
      let g = applyBrightnessContrast(data[i + 1]);
      let b = applyBrightnessContrast(data[i + 2]);

      // Apply Threshold Map (Ordered Dither)
      if (matrix) {
        const threshold = matrix[y % matrixSize][x % matrixSize];
        // Normalize threshold to -0.5 to 0.5 range roughly, then scale by 255
        // Or simpler: offset the color value based on threshold
        const normalizedT = (threshold / divisor) - 0.5;
        const ditherStrength = 64 * params.ditherAmount; // Magic number for standard bayer feel
        
        r += normalizedT * ditherStrength;
        g += normalizedT * ditherStrength;
        b += normalizedT * ditherStrength;
      }

      // Clamp
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // Map to Palette
      const [newR, newG, newB] = findClosestColor(r, g, b, paletteRGBs);

      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
      data[i + 3] = 255;
    }
  }

  // Put data back
  ctx.putImageData(imageData, 0, 0);
};