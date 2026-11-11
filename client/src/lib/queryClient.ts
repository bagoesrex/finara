import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const getStorage = (): Storage | undefined => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return undefined;
};

// Safe storage wrapper that dynamically delegates to window.localStorage (SSR/test safe)
const dynamicStorage: Storage = {
  getItem: (key: string) => getStorage()?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    getStorage()?.setItem(key, value);
  },
  removeItem: (key: string) => {
    getStorage()?.removeItem(key);
  },
  clear: () => {
    getStorage()?.clear();
  },
  key: (index: number) => getStorage()?.key(index) ?? null,
  get length() {
    return getStorage()?.length ?? 0;
  },
};

export const persister = createSyncStoragePersister({
  storage: dynamicStorage,
  key: 'FINARA_QUERY_CACHE',
});
