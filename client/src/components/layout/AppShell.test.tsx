import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GlobalWindow } from 'happy-dom';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Header } from './Header';
import { BottomNav, NAV_ITEMS } from './BottomNav';
import { AppShell } from './AppShell';

let window: GlobalWindow;
let container: any;

beforeEach(() => {
  window = new GlobalWindow();
  Object.assign(globalThis, {
    window,
    document: window.document,
    navigator: window.navigator,
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    CustomEvent: window.CustomEvent,
    Event: window.Event,
  });
  container = window.document.createElement('div');
  window.document.body.appendChild(container);
});

afterEach(() => {
  if (container) {
    container.remove();
  }
});

function render(ui: React.ReactElement) {
  const root = createRoot(container);
  flushSync(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      flushSync(() => {
        root.unmount();
      });
    },
  };
}

describe('Layout Components', () => {
  describe('Header', () => {
    test('renders default Finara branding and status badge', () => {
      render(<Header />);
      expect(container.textContent).toContain('Finara');
      expect(container.textContent).toContain('Online');
      const headerEl = container.querySelector('header');
      expect(headerEl).not.toBeNull();
      expect(headerEl?.className).toContain('h-14');
      expect(headerEl?.className).toContain('bg-[#12141D]');
    });

    test('supports custom title and custom rightElement', () => {
      render(
        <Header
          title="Custom Title"
          rightElement={<button id="test-btn">Action</button>}
        />
      );
      expect(container.textContent).toContain('Custom Title');
      expect(container.querySelector('#test-btn')?.textContent).toBe('Action');
    });

    test('hides status badge when showStatus is false', () => {
      render(<Header showStatus={false} />);
      expect(container.textContent).toContain('Finara');
      expect(container.textContent).not.toContain('Online');
    });
  });

  describe('BottomNav', () => {
    test('defines 4 standard navigation tabs with >=44px touch targets', () => {
      expect(NAV_ITEMS.length).toBe(4);
      expect(NAV_ITEMS.map((t) => t.id)).toEqual(['home', 'activity', 'budget', 'profile']);
      expect(NAV_ITEMS.map((t) => t.label)).toEqual(['Home', 'Aktivitas', 'Budget', 'Profil']);

      render(<BottomNav activeTab="home" onTabChange={() => {}} />);
      const buttons = Array.from(container.querySelectorAll('button[role="tab"]')) as any[];
      expect(buttons.length).toBe(4);

      // Verify touch target requirements (>=44px min-w and min-h)
      buttons.forEach((btn: any) => {
        expect(btn.className).toContain('min-h-[48px]');
        expect(btn.className).toContain('min-w-[44px]');
      });
    });

    test('applies active styling to the selected tab and muted styling to others', () => {
      render(<BottomNav activeTab="budget" onTabChange={() => {}} />);
      const buttons = Array.from(container.querySelectorAll('button[role="tab"]')) as any[];

      const budgetBtn = buttons.find((btn: any) => btn.getAttribute('aria-label') === 'Budget');
      const homeBtn = buttons.find((btn: any) => btn.getAttribute('aria-label') === 'Home');

      expect(budgetBtn?.getAttribute('aria-selected')).toBe('true');
      expect(budgetBtn?.className).toContain('text-emerald-400');
      expect(budgetBtn?.className).toContain('bg-emerald-500/10');

      expect(homeBtn?.getAttribute('aria-selected')).toBe('false');
      expect(homeBtn?.className).toContain('text-[#94A3B8]');
    });

    test('calls onTabChange with correct tab ID when clicked', () => {
      let selectedTab: string = '';
      render(
        <BottomNav
          activeTab="home"
          onTabChange={(tab) => {
            selectedTab = tab;
          }}
        />
      );

      const buttons = Array.from(container.querySelectorAll('button[role="tab"]')) as any[];
      const activityBtn = buttons.find((btn: any) => btn.getAttribute('aria-label') === 'Aktivitas');
      expect(activityBtn).not.toBeNull();

      activityBtn.click();
      expect(selectedTab).toBe('activity');
    });
  });

  describe('AppShell', () => {
    test('enforces max-w-[440px] centered layout container', () => {
      render(
        <AppShell>
          <div id="content">Content Area</div>
        </AppShell>
      );

      const maxWContainer = container.querySelector('.max-w-\\[440px\\]');
      expect(maxWContainer).not.toBeNull();
      expect(maxWContainer?.className).toContain('min-h-screen');
      expect(maxWContainer?.className).toContain('relative');
      expect(maxWContainer?.className).toContain('flex-col');
      expect(container.querySelector('#content')?.textContent).toBe('Content Area');
    });

    test('renders header and bottom nav by default when onTabChange provided', () => {
      render(
        <AppShell activeTab="home" onTabChange={() => {}}>
          <div>Body</div>
        </AppShell>
      );

      expect(container.querySelector('header')).not.toBeNull();
      expect(container.querySelector('nav[role="tablist"]')).not.toBeNull();
    });

    test('can hide header or navigation via props', () => {
      render(
        <AppShell showHeader={false} showNav={false}>
          <div>Minimal Screen</div>
        </AppShell>
      );

      expect(container.querySelector('header')).toBeNull();
      expect(container.querySelector('nav[role="tablist"]')).toBeNull();
      expect(container.textContent).toContain('Minimal Screen');
    });
  });
});
