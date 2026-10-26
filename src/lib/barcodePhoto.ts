import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library';
import { decode as decodeJpeg } from 'jpeg-js';

/**
 * On-device barcode decoding for a captured photo.
 *
 * This deliberately uses only JavaScript libraries (ZXing + a JPEG decoder),
 * so it does not depend on Google Play Services, Google Code Scanner or the
 * native ML Kit model. It is the fallback when CameraView's live analyzer
 * cannot report a barcode on a particular device.
 */

const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

const FORMAT_NAMES: Partial<Record<BarcodeFormat, string>> = {
  [BarcodeFormat.EAN_13]: 'EAN-13',
  [BarcodeFormat.EAN_8]: 'EAN-8',
  [BarcodeFormat.UPC_A]: 'UPC-A',
  [BarcodeFormat.UPC_E]: 'UPC-E',
  [BarcodeFormat.CODE_128]: 'Code 128',
};

export interface PhotoBarcode {
  value: string;
  format: string;
}

export class BarcodePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BarcodePhotoError';
  }
}

function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let index = 0; index < alphabet.length; index += 1) {
    lookup[alphabet.charCodeAt(index)] = index;
  }

  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const length = clean.length;
  if (length === 0 || length % 4 !== 0) {
    throw new BarcodePhotoError('The captured photo was not valid image data.');
  }

  const bytes = new Uint8Array((length * 3) / 4 - padding);
  let output = 0;

  for (let index = 0; index < length; index += 4) {
    const a = lookup[clean.charCodeAt(index)];
    const b = lookup[clean.charCodeAt(index + 1)];
    const c = lookup[clean.charCodeAt(index + 2)];
    const d = lookup[clean.charCodeAt(index + 3)];

    bytes[output] = (a << 2) | (b >> 4);
    output += 1;
    if (output < bytes.length) {
      bytes[output] = ((b & 15) << 4) | (c >> 2);
      output += 1;
    }
    if (output < bytes.length) {
      bytes[output] = ((c & 3) << 6) | d;
      output += 1;
    }
  }

  return bytes;
}

function grayscale(
  rgba: Uint8Array,
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
): { pixels: Uint8ClampedArray; width: number; height: number } {
  const rotated = rotation === 90 || rotation === 270;
  const outputWidth = rotated ? height : width;
  const outputHeight = rotated ? width : height;
  const pixels = new Uint8ClampedArray(outputWidth * outputHeight);

  for (let y = 0; y < outputHeight; y += 1) {
    for (let x = 0; x < outputWidth; x += 1) {
      let sourceX: number;
      let sourceY: number;

      if (rotation === 0) {
        sourceX = x;
        sourceY = y;
      } else if (rotation === 90) {
        sourceX = y;
        sourceY = height - 1 - x;
      } else if (rotation === 180) {
        sourceX = width - 1 - x;
        sourceY = height - 1 - y;
      } else {
        sourceX = width - 1 - y;
        sourceY = x;
      }

      const offset = (sourceY * width + sourceX) * 4;
      pixels[y * outputWidth + x] =
        (rgba[offset] * 77 + rgba[offset + 1] * 150 + rgba[offset + 2] * 29) >> 8;
    }
  }

  return { pixels, width: outputWidth, height: outputHeight };
}

/**
 * Decodes a barcode from a JPEG captured by CameraView.
 *
 * Returns null when the photo is readable but contains no supported barcode;
 * throws BarcodePhotoError when the image itself cannot be decoded.
 */
export async function decodeBarcodeFromBase64(base64: string): Promise<PhotoBarcode | null> {
  const bytes = base64ToBytes(base64);

  let image: ReturnType<typeof decodeJpeg>;
  try {
    image = decodeJpeg(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      tolerantDecoding: true,
      maxResolutionInMP: 4,
      maxMemoryUsageInMB: 64,
    });
  } catch {
    throw new BarcodePhotoError('The captured photo could not be read as a JPEG image.');
  }

  if (!image.width || !image.height || image.data.length < image.width * image.height * 4) {
    throw new BarcodePhotoError('The captured photo had no usable image data.');
  }

  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);

  for (const rotation of [0, 90, 180, 270] as const) {
    const frame = grayscale(image.data, image.width, image.height, rotation);
    const source = new RGBLuminanceSource(frame.pixels, frame.width, frame.height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(source));
    const reader = new MultiFormatReader();

    try {
      const result = reader.decode(bitmap, hints);
      const value = result.getText()?.trim();
      if (!value) continue;

      return {
        value,
        format: FORMAT_NAMES[result.getBarcodeFormat()] ?? 'Barcode',
      };
    } catch {
      // NotFoundException is the normal "no barcode in this frame" result.
      // Continue with the remaining rotations before giving up.
    }
  }

  return null;
}
