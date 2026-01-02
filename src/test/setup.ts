import '@testing-library/jest-dom/vitest'

// Helpful polyfills for components that rely on browser APIs not provided by jsdom.
class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).ResizeObserver = ResizeObserver

// matchMedia is commonly used by charting/libs.
if (!globalThis.matchMedia) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	;(globalThis as any).matchMedia = () => ({
		matches: false,
		media: '',
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	})
}
