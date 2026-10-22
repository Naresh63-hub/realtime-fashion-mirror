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

  it('discovers backend VTON configuration safely', async () => {
    // When backend fetch is offline or mocked
    const config = await VirtualTryOnService.getBackendVTONConfig();
    expect(config).toBeDefined();
    expect(typeof config.configured).toBe('boolean');
    expect(typeof config.provider).toBe('string');
    expect(typeof config.modelName).toBe('string');
  });

  it('handles cloud-genai submission failure cleanly when backend is offline or errors', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ detail: 'Cloud AI key not configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

    try {
      const job = await VirtualTryOnService.generateTryOn({
        personImage: 'data:image/png;base64,12345678901234567890',
        garmentImage: '/garments/tee.svg',
        garmentName: 'Linen Shirt',
        category: ClothingCategory.SHIRT,
        modelMode: 'cloud-genai',
      });

      expect(job.status).toBe('failed');
      expect(job.error).toContain('Cloud AI key not configured');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('retrieves completed results with distinct canvas and AI layers', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          job_id: 'vton_mock_test_123',
          status: 'succeeded',
          progress: 100,
          result_image_url: 'https://example.com/diffusion-result.png',
          model_name: 'IDM-VTON (Diffusion)',
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );

    try {
      const job = await VirtualTryOnService.generateTryOn({
        personImage: 'data:image/png;base64,12345678901234567890',
        garmentImage: '/garments/tee.svg',
        garmentName: 'Silk Top',
        category: ClothingCategory.TOP,
        modelMode: 'cloud-genai',
      });

      expect(job.status).toBe('succeeded');
      expect(job.resultImageUrl).toBe('https://example.com/diffusion-result.png');

      const result = await VirtualTryOnService.retrieveResult(job.id);
      expect(result.resultImageUrl).toBe('https://example.com/diffusion-result.png');
      expect(result.aiImageUrl).toBe('https://example.com/diffusion-result.png');
      expect(result.confidence).toBeGreaterThan(0.9);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('creates, polls, submits frame, and closes a live AI session', async () => {
    const originalFetch = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = url.toString();
      callCount++;
      if (urlStr.endsWith('/api/live/sessions') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            session_id: 'live_test_123',
            status: 'active',
            created_at: 1234567890,
            max_inactivity_seconds: 600,
            guidance: 'Live AI active',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/api/live/sessions/live_test_123/frame')) {
        return new Response(
          JSON.stringify({
            session_id: 'live_test_123',
            status: 'busy',
            dropped: false,
            message: 'In-flight inference',
            result_image_url: null,
            can_fallback_to_canvas: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/api/live/sessions/live_test_123') && init?.method === 'DELETE') {
        return new Response(
          JSON.stringify({ message: 'Session closed', session_id: 'live_test_123', closed: true }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/api/live/sessions/live_test_123')) {
        return new Response(
          JSON.stringify({
            session_id: 'live_test_123',
            status: 'active',
            is_processing: true,
            active_job_id: 'vton_123',
            job_progress: 45,
            latest_result_url: null,
            frames_received: 1,
            frames_dropped: 0,
            ai_configured: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', { status: 200 });
    };

    try {
      const session = await VirtualTryOnService.createLiveSession();
      expect(session.sessionId).toBe('live_test_123');
      expect(session.status).toBe('active');

      const submitRes = await VirtualTryOnService.submitLiveFrame(
        session.sessionId,
        'data:image/png;base64,frame123',
        '/garments/tee.svg'
      );
      expect(submitRes.status).toBe('busy');
      expect(submitRes.dropped).toBe(false);

      const statusRes = await VirtualTryOnService.getLiveSessionStatus(session.sessionId);
      expect(statusRes.jobProgress).toBe(45);
      expect(statusRes.isProcessing).toBe(true);

      const closed = await VirtualTryOnService.closeLiveSession(session.sessionId);
      expect(closed).toBe(true);
      expect(callCount).toBe(4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

