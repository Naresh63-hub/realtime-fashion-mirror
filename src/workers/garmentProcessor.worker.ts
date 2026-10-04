import type { ClothingAnchorPoints, ClothingCategory, SegmentationMask } from '../types';
import { removeBackground, type ClothingBgConfig } from '../clothing/backgroundRemoval';
import { classifyGarment } from '../clothing/classifier';
import { detectAnchors } from '../clothing/anchorDetection';

export interface WorkerClothingConfig extends ClothingBgConfig {
  AUTO_BACKGROUND_REMOVAL: boolean;
}

interface ProcessMessage {
  type: 'process';
  imageDataTransfer: Uint8ClampedArray;
  width: number;
  height: number;
  url: string;
  name: string;
  clothingConfig: WorkerClothingConfig;
}

interface ResultMessage {
  type: 'result';
  result: {
    width: number;
    height: number;
    category: ClothingCategory;
    anchors: ClothingAnchorPoints;
    backgroundRemoved: boolean;
    processedPixels: Uint8ClampedArray;
  };
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type IncomingMessage = ProcessMessage;

function buildAlphaMask(imageData: ImageData): SegmentationMask {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < mask.length; i += 4, p++) {
    mask[p] = data[i + 3];
  }
  return { data: mask, width, height };
}

function countForeground(mask: SegmentationMask): number {
  let count = 0;
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] > 128) count++;
  }
  return count;
}

self.onmessage = (e: MessageEvent<IncomingMessage>): void => {
  try {
    const msg = e.data;
    if (msg.type !== 'process') return;

    const { imageDataTransfer, width, height, clothingConfig } = msg;
    const imageData = new ImageData(
      new Uint8ClampedArray(imageDataTransfer),
      width,
      height
    );

    let backgroundRemoved = false;
    if (clothingConfig.AUTO_BACKGROUND_REMOVAL) {
      const stats = removeBackground(imageData, clothingConfig);
      backgroundRemoved = stats.removed > 0;
    }

    const mask = buildAlphaMask(imageData);
    const fgRatio = countForeground(mask) / (width * height);
    if (fgRatio < 0.02) {
      throw new Error('no garment region found');
    }

    const category = classifyGarment(mask);
    const anchors = detectAnchors(mask);

    const processedPixels = new Uint8ClampedArray(imageData.data.buffer);

    const response: ResultMessage = {
      type: 'result',
      result: {
        width,
        height,
        category,
        anchors,
        backgroundRemoved,
        processedPixels,
      },
    };

    const transfer: Transferable[] = [];
    if (processedPixels.buffer instanceof ArrayBuffer) {
      transfer.push(processedPixels.buffer);
    }
    const workerSelf = self as unknown as {
      postMessage(message: unknown, transfer?: Transferable[]): void;
    };
    workerSelf.postMessage(response, transfer);
  } catch (err) {
    const response: ErrorMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
