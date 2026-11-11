import { describe, expect, it, afterEach } from 'bun:test';
import { generateUUID, financeApi } from './finance';

describe('finance API - UUID fallback', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: originalCrypto,
      configurable: true,
      writable: true,
    });
  });

  it('generateUUID produces valid UUID v4 format', () => {
    const uuid = generateUUID();
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidV4Regex.test(uuid)).toBe(true);
  });

  it('uses fallback UUID generator when crypto.randomUUID is not available', async () => {
    // Override crypto to simulate environment without randomUUID
    Object.defineProperty(globalThis, 'crypto', {
      value: {},
      configurable: true,
      writable: true,
    });

    let interceptedBody: string | undefined;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      interceptedBody = init?.body as string;
      return new Response(JSON.stringify({ id: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await financeApi.createTransaction({
        account_id: '11111111-1111-1111-1111-111111111111',
        category_id: '22222222-2222-2222-2222-222222222222',
        type: 'EXPENSE',
        amount: 50000,
        description: 'Test fallback UUID',
        transaction_date: '2026-11-12',
      });

      expect(interceptedBody).toBeDefined();
      const payload = JSON.parse(interceptedBody!);
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuidV4Regex.test(payload.client_request_id)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
