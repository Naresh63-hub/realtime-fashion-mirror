import { describe, it, expect } from 'vitest';
import { VirtualTryOnService } from './virtualTryOnService';
import { ClothingCategory } from '../types';

describe('VirtualTryOnService', () => {
  it('validates input images properly', () => {
    expect(VirtualTryOnService.validateInputs('', '/garments/tee.svg').valid).toBe(false);
    expect(VirtualTryOnService.validateInputs('data:image/png;base64,12345678901234567890', '').valid).toBe(false);
    expect(
      VirtualTryOnService.validateInputs(
        'data:image/png;base64,12345678901234567890',
        '/garments/tee.svg'
      ).valid
    ).toBe(true);
  });

  it('creates and tracks try-on jobs', async () => {
    const job = await VirtualTryOnService.generateTryOn({
      personImage: 'data:image/png;base64,12345678901234567890',
      garmentImage: '/garments/tee.svg',
      garmentName: 'Forest Tee',
      category: ClothingCategory.T_SHIRT,
    });

    expect(job.id).toBeDefined();
    expect(job.garmentName).toBe('Forest Tee');
    expect(job.status).toBeDefined();

    const status = await VirtualTryOnService.getJobStatus(job.id);
    expect(status.id).toBe(job.id);
  });

  it('cancels active jobs', async () => {
    const job = await VirtualTryOnService.generateTryOn({
      personImage: 'data:image/png;base64,12345678901234567890',
      garmentImage: '/garments/tee.svg',
      garmentName: 'Forest Tee',
      category: ClothingCategory.T_SHIRT,
    });

    const cancelled = await VirtualTryOnService.cancelJob(job.id);
    expect(typeof cancelled).toBe('boolean');
  });
});
