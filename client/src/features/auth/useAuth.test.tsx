import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AuthProvider, useAuth, type AuthContextType } from './useAuth';
import { AuthPages } from './AuthPages';
import { queryClient } from '../../lib/queryClient';

// Configure React act environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useAuth & Auth Flow', () => {
  let window: GlobalWindow;
  let container: any;
  let root: Root;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    window = new GlobalWindow();
    Object.assign(globalThis, {
      window,
      document: window.document,
      HTMLElement: window.HTMLElement,
      Element: window.Element,
      Node: window.Node,
      CustomEvent: window.CustomEvent,
      Event: window.Event,
      localStorage: window.localStorage,
    });
    window.localStorage.clear();

    container = window.document.createElement('div');
    window.document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('initial state when no token exists: unauthenticated and ready', async () => {
    let capturedAuth: AuthContextType | null = null;

    function TestComp() {
      const auth = useAuth();
      useEffect(() => {
        capturedAuth = auth;
      }, [auth]);
      return <div id="status">{auth.isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>;
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestComp />
        </AuthProvider>
      );
    });

    expect(capturedAuth).not.toBeNull();
    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.isLoading).toBe(false);
    expect(capturedAuth!.token).toBeNull();
    expect(capturedAuth!.user).toBeNull();
  });

  test('login: stores token in localStorage, populates user, and sets isAuthenticated = true', async () => {
    let capturedAuth: AuthContextType | null = null;

    globalThis.fetch = (async (url: any, opts: any) => {
      if (String(url).endsWith('/api/auth/login')) {
        const body = JSON.parse(opts.body);
        return new Response(
          JSON.stringify({
            token: 'test-token-123',
            user: { id: 'usr_1', name: 'Budi Santoso', email: body.email },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    function TestComp() {
      const auth = useAuth();
      capturedAuth = auth;
      return <div id="status">{auth.isAuthenticated ? 'logged-in' : 'logged-out'}</div>;
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestComp />
        </AuthProvider>
      );
    });

    await act(async () => {
      await capturedAuth!.login({ email: 'budi@finara.id', password: 'password123' });
    });

    expect(window.localStorage.getItem('finara_token')).toBe('test-token-123');
    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.token).toBe('test-token-123');
    expect(capturedAuth!.user).toEqual({
      id: 'usr_1',
      name: 'Budi Santoso',
      email: 'budi@finara.id',
    });
  });

  test('register (Zero Onboarding): immediately sets isAuthenticated = true and stores token', async () => {
    let capturedAuth: AuthContextType | null = null;

    globalThis.fetch = (async (url: any, opts: any) => {
      if (String(url).endsWith('/api/auth/register')) {
        const body = JSON.parse(opts.body);
        return new Response(
          JSON.stringify({
            token: 'test-reg-token-456',
            user: { id: 'usr_2', name: body.name, email: body.email },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    function TestComp() {
      const auth = useAuth();
      capturedAuth = auth;
      return <div id="status">{auth.isAuthenticated ? 'registered' : 'unregistered'}</div>;
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestComp />
        </AuthProvider>
      );
    });

    // Zero Onboarding requirement: directly transitions to authenticated home state without onboarding steps
    await act(async () => {
      await capturedAuth!.register({
        name: 'Siti Aminah',
        email: 'siti@finara.id',
        password: 'securepassword',
      });
    });

    expect(window.localStorage.getItem('finara_token')).toBe('test-reg-token-456');
    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.user?.name).toBe('Siti Aminah');
    expect(capturedAuth!.user?.email).toBe('siti@finara.id');
  });

  test('hydrates user on mount from existing localStorage token via /api/auth/me', async () => {
    window.localStorage.setItem('finara_token', 'persisted-jwt-token');

    let meAuthHeader: any = null;
    globalThis.fetch = (async (url: any, opts: any) => {
      if (String(url).endsWith('/api/auth/me')) {
        meAuthHeader = opts?.headers?.get?.('Authorization') ?? opts?.headers?.Authorization;
        return new Response(
          JSON.stringify({
            user: { id: 'usr_hydrated', name: 'Dewi Lestari', email: 'dewi@finara.id' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    let capturedAuth: AuthContextType | null = null;

    function TestComp() {
      const auth = useAuth();
      capturedAuth = auth;
      return (
        <div>
          <div id="loading">{auth.isLoading ? 'loading' : 'done'}</div>
          <div id="user">{auth.user?.name ?? 'none'}</div>
        </div>
      );
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestComp />
        </AuthProvider>
      );
    });

    expect(meAuthHeader).toBe('Bearer persisted-jwt-token');
    expect(capturedAuth!.isAuthenticated).toBe(true);
    expect(capturedAuth!.user?.name).toBe('Dewi Lestari');
    expect(capturedAuth!.isLoading).toBe(false);
  });

  test('clears token on hydration failure when token is invalid or expired', async () => {
    window.localStorage.setItem('finara_token', 'expired-token');

    globalThis.fetch = (async (url: any) => {
      if (String(url).endsWith('/api/auth/me')) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    let capturedAuth: AuthContextType | null = null;

    function TestComp() {
      const auth = useAuth();
      capturedAuth = auth;
      return <div>{auth.isLoading ? 'loading' : 'done'}</div>;
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestComp />
        </AuthProvider>
      );
    });

    expect(window.localStorage.getItem('finara_token')).toBeNull();
    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.user).toBeNull();
  });

  test('logout: clears token, clears user, and clears query cache', async () => {
    window.localStorage.setItem('finara_token', 'valid-token');

    globalThis.fetch = (async (url: any) => {
      if (String(url).endsWith('/api/auth/me')) {
        return new Response(
          JSON.stringify({ user: { id: 'usr_1', name: 'Budi', email: 'b@b.com' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (String(url).endsWith('/api/auth/logout')) {
        return new Response(JSON.stringify({ message: 'logged out' }), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    // Populate query cache to test clearing
    queryClient.setQueryData(['test-query'], { dummy: true });
    expect(queryClient.getQueryData(['test-query'])).toBeDefined();

    let capturedAuth: AuthContextType | null = null;

    function TestComp() {
      const auth = useAuth();
      capturedAuth = auth;
      return <div>Test</div>;
    }

    await act(async () => {
      root.render(
        <AuthProvider>
          <TestComp />
        </AuthProvider>
      );
    });

    expect(capturedAuth!.isAuthenticated).toBe(true);

    // Call logout
    await act(async () => {
      await capturedAuth!.logout();
    });

    expect(window.localStorage.getItem('finara_token')).toBeNull();
    expect(capturedAuth!.isAuthenticated).toBe(false);
    expect(capturedAuth!.user).toBeNull();
    expect(queryClient.getQueryData(['test-query'])).toBeUndefined();
  });

  test('AuthPages renders toggle, validates inputs, and triggers auth actions', async () => {
    let loginCalled = false;
    globalThis.fetch = (async (url: any, opts: any) => {
      if (String(url).endsWith('/api/auth/login')) {
        loginCalled = true;
        const body = JSON.parse(opts.body);
        return new Response(
          JSON.stringify({
            token: 'login-tok',
            user: { id: 'u1', name: 'Tester', email: body.email },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    await act(async () => {
      root.render(
        <AuthProvider>
          <AuthPages />
        </AuthProvider>
      );
    });

    // Check branding and anti-slop (no emojis)
    expect(container.textContent).toContain('Finara');
    expect(container.textContent).toContain('Presisi Keuangan Pribadi');

    // Check toggle tabs
    const tabs = Array.from(container.querySelectorAll('button[role="tab"]')) as HTMLButtonElement[];
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Masuk');
    expect(tabs[1].textContent).toContain('Daftar');

    // Switch to Register
    await act(async () => {
      tabs[1].click();
    });

    // Name field should now be present
    const nameInput = container.querySelector('#auth-name') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.className).toContain('text-base'); // 16px to prevent iOS auto-zoom

    // Switch back to Login
    await act(async () => {
      tabs[0].click();
    });
    expect(container.querySelector('#auth-name')).toBeNull();

    // Fill login form
    const emailInput = container.querySelector('#auth-email') as HTMLInputElement;
    const passwordInput = container.querySelector('#auth-password') as HTMLInputElement;
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    expect(emailInput.className).toContain('text-base');
    expect(submitBtn.className).toContain('min-h-[48px]');

    await act(async () => {
      emailInput.value = 'user@finara.id';
      emailInput.dispatchEvent(new (window as any).Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new (window as any).Event('change', { bubbles: true }));

      passwordInput.value = 'password123';
      passwordInput.dispatchEvent(new (window as any).Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new (window as any).Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new (window as any).Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(loginCalled).toBe(true);
    expect(window.localStorage.getItem('finara_token')).toBe('login-tok');
  });
});
