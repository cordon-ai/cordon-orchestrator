// Enhanced ResizeObserver error suppression utility
export const suppressResizeObserverErrors = () => {
  // Suppress console.error messages
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded') ||
        message.includes('ResizeObserver')) {
      return; // Suppress these specific errors
    }
    originalConsoleError.apply(console, args);
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
