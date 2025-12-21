import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";
import { ReadableStream } from "stream/web";

// Polyfill Web APIs for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;

// Polyfill Request, Response, Headers, FormData for Cloudflare Workers tests
if (typeof Request === "undefined") {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || "GET";
      this.headers = new Headers(init.headers || {});
      this._body = init.body;
    }

    async json() {
      return JSON.parse(this._body);
    }

    async formData() {
      return this._body;
    }

    async text() {
      return this._body;
    }
  };
}

if (typeof Response === "undefined") {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || "OK";
      this.headers = new Headers(init.headers || {});
    }

    async json() {
      return JSON.parse(this.body);
    }

    async text() {
      return this.body;
    }
  };
}

if (typeof Headers === "undefined") {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.set(key, value);
        });
      }
    }

    get(name) {
      return this._headers.get(name.toLowerCase()) || null;
    }

    set(name, value) {
      this._headers.set(name.toLowerCase(), String(value));
    }

    has(name) {
      return this._headers.has(name.toLowerCase());
    }

    delete(name) {
      this._headers.delete(name.toLowerCase());
    }

    entries() {
      return this._headers.entries();
    }

    keys() {
      return this._headers.keys();
    }

    values() {
      return this._headers.values();
    }
  };
}

if (typeof FormData === "undefined") {
  global.FormData = class FormData {
    constructor() {
      this._data = new Map();
    }

    append(name, value) {
      this.set(name, value);
    }

    set(name, value) {
      this._data.set(name, value);
    }

    get(name) {
      return this._data.get(name);
    }

    has(name) {
      return this._data.has(name);
    }

    delete(name) {
      this._data.delete(name);
    }
  };
}

if (typeof File === "undefined") {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.bits = bits;
      this.name = name;
      this.type = options.type || "";
      this.size = bits.reduce(
        (acc, bit) => acc + (bit.byteLength || bit.length || 0),
        0,
      );
    }
  };
}

// Mock Next.js router
jest.mock("next/router", () => ({
  useRouter() {
    return {
      route: "/",
      pathname: "/",
      query: {},
      asPath: "/",
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return "/";
  },
}));

// Mock window.ethereum
Object.defineProperty(window, "ethereum", {
  writable: true,
  value: {
    isMetaMask: true,
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  },
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render is no longer supported") ||
        args[0].includes("Warning: An invalid form control") ||
        args[0].includes("WalletConnect"))
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("componentWillReceiveProps") ||
        args[0].includes("componentWillUpdate"))
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(10000);

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  useSearchParams() {
    return {
      get: jest.fn(),
      getAll: jest.fn(),
      has: jest.fn(),
      keys: jest.fn(),
      values: jest.fn(),
      entries: jest.fn(),
      forEach: jest.fn(),
      toString: jest.fn(),
    };
  },
  usePathname() {
    return "/";
  },
}));

// Mock window.ethereum
Object.defineProperty(window, "ethereum", {
  writable: true,
  value: {
    isMetaMask: true,
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    selectedAddress: null,
    chainId: "0x1",
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock crypto API
Object.defineProperty(global, "crypto", {
  writable: true,
  value: {
    // Note: Math.random() is acceptable here for test mocks (non-security context)
    // nosemgrep: insecure-random
    randomUUID: () => "test-uuid-" + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      importKey: jest.fn().mockResolvedValue({}),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
      verify: jest.fn().mockResolvedValue(true),
    },
  },
});

// Mock Sentry to prevent routing instrumentation errors
jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setContext: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  startSpan: jest.fn((config, callback) => callback()),
  withSentryConfig: jest.fn((config) => config),
  init: jest.fn(),
}));

// Mock IPFS dependencies
jest.mock("pinata", () => ({
  __esModule: true,
  PinataSDK: jest.fn().mockImplementation(() => ({
    upload: {
      file: jest.fn().mockResolvedValue({
        IpfsHash: "QmTestHash123",
        PinSize: 1024,
        Timestamp: new Date().toISOString(),
      }),
      json: jest.fn().mockResolvedValue({
        IpfsHash: "QmTestJSONHash123",
        PinSize: 512,
        Timestamp: new Date().toISOString(),
      }),
    },
    files: {
      delete: jest.fn().mockResolvedValue({}),
    },
    testAuthentication: jest.fn().mockResolvedValue({
      authenticated: true,
    }),
  })),
}));

// IPFS HTTP client is not used in the current implementation
// Using Pinata API directly instead

// Note: multiformats/cid mock removed as it's causing issues
// Tests should mock IPFS functionality at the service level instead

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
