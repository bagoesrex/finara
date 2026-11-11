import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  KeyboardEvent: window.KeyboardEvent,
  CustomEvent: window.CustomEvent,
});

const { describe, test, expect, beforeEach, afterEach } = await import('bun:test');
import type { ReactElement } from 'react';
const { createRoot } = await import('react-dom/client');
const { flushSync } = await import('react-dom');
const { BottomSheet } = await import('./BottomSheet');

let container: any;
let currentRoot: any = null;

beforeEach(() => {
  container = window.document.createElement('div');
  window.document.body.appendChild(container);
  window.document.body.style.overflow = '';
});

afterEach(() => {
  if (currentRoot) {
    flushSync(() => {
      currentRoot.unmount();
    });
    currentRoot = null;
  }
  if (container) {
    container.remove();
  }
});

function render(ui: ReactElement) {
  if (currentRoot) {
    flushSync(() => {
      currentRoot.unmount();
    });
  }
  currentRoot = createRoot(container);
  flushSync(() => {
    currentRoot.render(ui);
  });
  return {
    container,
    unmount: () => {
      if (currentRoot) {
        flushSync(() => {
          currentRoot.unmount();
        });
        currentRoot = null;
      }
    },
  };
}

describe('BottomSheet Component', () => {
  test('does not render when isOpen is false', () => {
    render(
      <BottomSheet isOpen={false} onClose={() => {}}>
        <div>Sheet Content</div>
      </BottomSheet>
    );

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).not.toContain('Sheet Content');
  });

  test('renders dialog, title, description, and content when isOpen is true', () => {
    render(
      <BottomSheet
        isOpen={true}
        onClose={() => {}}
        title="Pilih Kategori"
        description="Pilih kategori untuk transaksi ini"
      >
        <div id="content-test">Kategori Makanan</div>
      </BottomSheet>
    );

    const dialog = container.querySelector('[role="dialog"]') as any;
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(container.textContent).toContain('Pilih Kategori');
    expect(container.textContent).toContain('Pilih kategori untuk transaksi ini');
    expect(container.querySelector('#content-test')?.textContent).toBe('Kategori Makanan');
  });

  test('includes grab handle with 40px width, 4px height and rounded-full at top', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </BottomSheet>
    );

    const handle = container.querySelector('[data-testid="bottom-sheet-handle"]') as any;
    expect(handle).not.toBeNull();
    expect(handle?.className).toContain('w-10'); // 40px
    expect(handle?.className).toContain('h-1'); // 4px
    expect(handle?.className).toContain('rounded-full');
  });

  test('is anchored within max-w-[440px] mobile container and respects safe area', () => {
    render(
      <BottomSheet isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </BottomSheet>
    );

    const sheetContainer = container.querySelector('.max-w-\\[440px\\]') as any;
    expect(sheetContainer).not.toBeNull();
    expect(sheetContainer?.className).toContain('rounded-t-2xl');
    expect(sheetContainer?.className).toContain('bg-[#12141D]');
    expect(sheetContainer?.className).toContain('pb-['); // safe area padding
  });

  test('dismisses on backdrop click', () => {
    let closed = false;
    render(
      <BottomSheet isOpen={true} onClose={() => { closed = true; }}>
        <div>Content</div>
      </BottomSheet>
    );

    const backdrop = container.querySelector('[role="dialog"]') as any;
    backdrop?.click();
    expect(closed).toBe(true);
  });

  test('does not dismiss when clicking inside the sheet content', () => {
    let closed = false;
    render(
      <BottomSheet isOpen={true} onClose={() => { closed = true; }}>
        <button id="inside-btn">Click Me</button>
      </BottomSheet>
    );

    const insideBtn = container.querySelector('#inside-btn') as any;
    insideBtn?.click();
    expect(closed).toBe(false);
  });

  test('dismisses when clicking close button', () => {
    let closed = false;
    render(
      <BottomSheet isOpen={true} onClose={() => { closed = true; }} title="Judul Sheet">
        <div>Content</div>
      </BottomSheet>
    );

    const closeBtn = container.querySelector('button[aria-label="Tutup"]') as any;
    expect(closeBtn).not.toBeNull();
    closeBtn?.click();
    expect(closed).toBe(true);
  });

  test('dismisses when Escape key is pressed', () => {
    let closed = false;
    render(
      <BottomSheet isOpen={true} onClose={() => { closed = true; }}>
        <div>Content</div>
      </BottomSheet>
    );

    const escEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(escEvent as any);
    expect(closed).toBe(true);
  });

  test('locks document.body overflow when open and restores on unmount', () => {
    const { unmount } = render(
      <BottomSheet isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </BottomSheet>
    );

    expect(window.document.body.style.overflow).toBe('hidden');

    unmount();
    expect(window.document.body.style.overflow).toBe('');
  });
});
