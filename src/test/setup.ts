import "@testing-library/jest-dom/vitest";

class TestResizeObserver implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly scrollMargin = "";
  readonly thresholds = [];

  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = TestResizeObserver;
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = TestIntersectionObserver;
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  });
}

if (!globalThis.scrollTo) {
  globalThis.scrollTo = () => {};
}
