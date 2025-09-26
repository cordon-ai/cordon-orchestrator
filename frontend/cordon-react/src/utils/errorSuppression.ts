// Immediate global suppression - runs as soon as this file loads
if (typeof window !== 'undefined') {
  const originalError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && (
        message.includes('ResizeObserver') ||
        message.includes('loop completed with undelivered notifications') ||
        message.includes('loop limit exceeded'))) {
      return true; // Suppress the error
    }
    if (originalError) {
      return originalError(message, source, lineno, colno, error);
    }
    return false;
  };

}

// Enhanced ResizeObserver error suppression utility
export const suppressResizeObserverErrors = () => {
  // Suppress console.error messages
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded') ||
        message.includes('ResizeObserver') ||
        message.includes('ResizeObserver loop')) {
      return; // Suppress these specific errors
    }
    originalConsoleError.apply(console, args);
  };

  // Also suppress console.warn for ResizeObserver
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded') ||
        message.includes('ResizeObserver') ||
        message.includes('ResizeObserver loop')) {
      return; // Suppress these specific warnings
    }
    originalConsoleWarn.apply(console, args);
  };

  // Suppress window error events
  const handleError = (event: ErrorEvent) => {
    if (event.message && (
        event.message.includes('ResizeObserver loop completed with undelivered notifications') ||
        event.message.includes('ResizeObserver loop limit exceeded') ||
        event.message.includes('ResizeObserver'))) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  };

  // Suppress unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (event.reason && event.reason.message && (
        event.reason.message.includes('ResizeObserver loop completed with undelivered notifications') ||
        event.reason.message.includes('ResizeObserver loop limit exceeded') ||
        event.reason.message.includes('ResizeObserver'))) {
      event.preventDefault();
      return false;
    }
  };

  // Add event listeners
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Return cleanup function
  return () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

// Global error suppression that runs immediately
const globalErrorHandler = (event: ErrorEvent) => {
  if (event.message && (
      event.message.includes('ResizeObserver loop completed with undelivered notifications') ||
      event.message.includes('ResizeObserver loop limit exceeded'))) {
    event.preventDefault();
    event.stopPropagation();
    return false;
  }
};

const globalRejectionHandler = (event: PromiseRejectionEvent) => {
  if (event.reason && event.reason.message && (
      event.reason.message.includes('ResizeObserver loop completed with undelivered notifications') ||
      event.reason.message.includes('ResizeObserver loop limit exceeded'))) {
    event.preventDefault();
    return false;
  }
};

// Apply global suppression immediately
window.addEventListener('error', globalErrorHandler);
window.addEventListener('unhandledrejection', globalRejectionHandler);

// Aggressive ResizeObserver error suppression
const originalResizeObserver = window.ResizeObserver;
if (originalResizeObserver) {
  window.ResizeObserver = class extends originalResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      const wrappedCallback: ResizeObserverCallback = (entries, observer) => {
        try {
          callback(entries, observer);
        } catch (error) {
          // Silently ignore ResizeObserver errors
          if (error instanceof Error && error.message.includes('ResizeObserver')) {
            return;
          }
          throw error;
        }
      };
      super(wrappedCallback);
    }
  };
}

// Suppress all ResizeObserver console errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  if (message.includes('ResizeObserver') || 
      message.includes('loop completed with undelivered notifications') ||
      message.includes('loop limit exceeded')) {
    return; // Suppress these errors
  }
  originalConsoleError.apply(console, args);
};
