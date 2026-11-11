import { describe, test, expect, beforeEach } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { queryClient, persister } from './queryClient';

describe('queryClient and persister', () => {
  let window: GlobalWindow;

  beforeEach(() => {
    window = new GlobalWindow();
    Object.assign(globalThis, {
      window,
      document: window.document,
      localStorage: window.localStorage,
    });
    window.localStorage.clear();
  });

  test('configures default query options as required', () => {
    const defaultQueries = queryClient.getDefaultOptions().queries;
    expect(defaultQueries).toBeDefined();
    expect(defaultQueries?.staleTime).toBe(1000 * 60 * 5); // 5 minutes
    expect(defaultQueries?.gcTime).toBe(1000 * 60 * 60 * 24); // 24 hours
    expect(defaultQueries?.refetchOnWindowFocus).toBe(false);
    expect(defaultQueries?.retry).toBe(1);
  });

  test('persister exports required interface methods', () => {
    expect(typeof persister.persistClient).toBe('function');
    expect(typeof persister.restoreClient).toBe('function');
    expect(typeof persister.removeClient).toBe('function');
  });

  test('persister interacts correctly with local storage', () => {
    const mockState = {
      timestamp: Date.now(),
      buster: 'test-v1',
      clientState: {
        queries: [],
        mutations: [],
      },
    };

    // Directly set in localStorage under FINARA_QUERY_CACHE
    window.localStorage.setItem('FINARA_QUERY_CACHE', JSON.stringify(mockState));

    // restoreClient should read and deserialize
    const restored = persister.restoreClient();
    expect(restored).toEqual(mockState);

    // removeClient should remove key from storage
    persister.removeClient();
    expect(window.localStorage.getItem('FINARA_QUERY_CACHE')).toBeNull();
    expect(persister.restoreClient()).toBeUndefined();
  });
});
