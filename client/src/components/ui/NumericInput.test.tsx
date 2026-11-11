import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow();
Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  Element: window.Element,
  Node: window.Node,
  Event: window.Event,
  KeyboardEvent: window.KeyboardEvent,
  CustomEvent: window.CustomEvent,
});

const { describe, test, expect, beforeEach, afterEach } = await import('bun:test');
const { useState } = await import('react');
import type { ReactElement } from 'react';
const { createRoot } = await import('react-dom/client');
const { flushSync } = await import('react-dom');
const { NumericInput, formatIDR } = await import('./NumericInput');

let container: any;
let currentRoot: any = null;

beforeEach(() => {
  container = window.document.createElement('div');
  window.document.body.appendChild(container);
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

function setInputValue(input: any, value: string) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  nativeSetter?.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }) as any);
}

describe('NumericInput Component', () => {
  test('strictly enforces inputMode="numeric" and pattern="[0-9]*"', () => {
    render(<NumericInput value={0} onChange={() => {}} />);
    const input = container.querySelector('input');

    expect(input).not.toBeNull();
    expect(input?.getAttribute('inputmode')).toBe('numeric');
    expect(input?.getAttribute('pattern')).toBe('[0-9]*');
  });

  test('formats value with IDR thousand dot separators', () => {
    render(<NumericInput value={50000} onChange={() => {}} />);
    const input = container.querySelector('input');
    expect(input?.value).toBe('50.000');

    // Also test helper formatIDR directly
    expect(formatIDR(1500)).toBe('1.500');
    expect(formatIDR(1000000)).toBe('1.000.000');
    expect(formatIDR(0)).toBe('');
    expect(formatIDR(-500)).toBe('');
  });

  test('renders integrated "Rp" prefix inside elevated container', () => {
    render(<NumericInput value={25000} onChange={() => {}} />);
    expect(container.textContent).toContain('Rp');

    const wrapper = container.firstElementChild as any;
    expect(wrapper?.className).toContain('bg-[#1A1D2B]');
    expect(wrapper?.className).toContain('border-[#232738]');
    expect(wrapper?.className).toContain('rounded-xl');
  });

  test('blocks non-digit keys in onKeyDown', () => {
    render(<NumericInput value={0} onChange={() => {}} />);
    const input = container.querySelector('input');

    // Disallowed keys
    const invalidKeys = ['-', '+', 'e', 'E', '.', ',', 'a', 'Z', '$'];
    for (const key of invalidKeys) {
      const event = new window.KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      input?.dispatchEvent(event as any);
      expect(event.defaultPrevented).toBe(true);
    }

    // Allowed keys (digits and controls)
    const validKeys = ['0', '5', '9', 'Backspace', 'Delete', 'ArrowLeft', 'Tab', 'Enter'];
    for (const key of validKeys) {
      const event = new window.KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      });
      input?.dispatchEvent(event as any);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  test('sanitizes input: strips negative symbols and non-digits to trigger onChange with exact integer', () => {
    let changedValue = 0;
    function Controlled() {
      const [val, setVal] = useState(0);
      return (
        <NumericInput
          value={val}
          onChange={(newVal) => {
            changedValue = newVal;
            setVal(newVal);
          }}
        />
      );
    }
    render(<Controlled />);
    const input = container.querySelector('input');

    // Valid digits
    setInputValue(input, '50000');
    expect(changedValue).toBe(50000);

    // Negative input is sanitized by stripping minus
    setInputValue(input, '-75000');
    expect(changedValue).toBe(75000);

    // Formatted or messy string is sanitized to digits
    setInputValue(input, 'Rp 120.500');
    expect(changedValue).toBe(120500);

    // Emptying field resets to 0
    setInputValue(input, '');
    expect(changedValue).toBe(0);
  });

  test('does not change value when only letters or symbols are entered', () => {
    let callCount = 0;
    render(
      <NumericInput
        value={50000}
        onChange={() => {
          callCount++;
        }}
      />
    );
    const input = container.querySelector('input');

    setInputValue(input, 'abc');
    expect(callCount).toBe(0);
  });

  test('quick clear button appears when value > 0 and resets to 0 on click', () => {
    let clearedValue: number = -1;

    // When value is 0, clear button should NOT exist
    const { unmount } = render(
      <NumericInput
        value={0}
        onChange={(val) => {
          clearedValue = val;
        }}
      />
    );
    expect(container.querySelector('button[aria-label="Hapus nominal"]')).toBeNull();
    unmount();

    // When value > 0, clear button appears and resets to 0
    render(
      <NumericInput
        value={150000}
        onChange={(val) => {
          clearedValue = val;
        }}
      />
    );
    const clearBtn = container.querySelector('button[aria-label="Hapus nominal"]');
    expect(clearBtn).not.toBeNull();

    clearBtn?.click();
    expect(clearedValue).toBe(0);
  });

  test('honors disabled prop', () => {
    render(<NumericInput value={50000} onChange={() => {}} disabled />);
    const input = container.querySelector('input');
    expect(input?.disabled).toBe(true);

    // Clear button should not be displayed when disabled
    expect(container.querySelector('button[aria-label="Hapus nominal"]')).toBeNull();
  });
});
