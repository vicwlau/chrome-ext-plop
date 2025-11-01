/**
 * Debug Utilities for Development
 * 
 * Provides centralized debug logging with build-time stripping in production.
 * Use this for consistent debug logging across the application.
 */

/**
 * Global debug flag - set to false or use build-time flag to disable
 * In production, this should be stripped by the bundler using define/replace plugins
 */
export const DEBUG = import.meta.env.DEV ?? true;

/**
 * Create a namespaced logger for a specific module/hook
 * 
 * @param namespace - The name of the module (e.g., 'useDraggable', 'ImageUploader')
 * @param enabled - Override to force enable/disable (defaults to global DEBUG flag)
 * 
 * @example
 * ```typescript
 * const logger = createLogger('useDraggable');
 * logger.start({ dataType: 'image' });
 * logger.success('Image loaded');
 * logger.error(error);
 * logger.custom('🖱️', 'Mouse moved', { x, y });
 * ```
 */
export const createLogger = (namespace: string, enabled?: boolean) => {
  const isEnabled = enabled ?? DEBUG;

  const log = (emoji: string, action: string, data?: any) => {
    if (!isEnabled) return;
    if (data !== undefined) {
      console.log(`${emoji} [${namespace}] ${action}`, data);
    } else {
      console.log(`${emoji} [${namespace}] ${action}`);
    }
  };

  const warn = (emoji: string, action: string, data?: any) => {
    if (!isEnabled) return;
    if (data !== undefined) {
      console.warn(`${emoji} [${namespace}] ${action}`, data);
    } else {
      console.warn(`${emoji} [${namespace}] ${action}`);
    }
  };

  return {
    /**
     * Log the start of an operation
     */
    start: (data?: any) => log('🚀', 'Started', data),

    /**
     * Log successful completion
     */
    success: (data?: any) => log('✅', 'Success', data),

    /**
     * Log an error or warning
     */
    error: (err: any) => {
      if (!isEnabled) return;
      console.error(`❌ [${namespace}] Error:`, err);
    },

    /**
     * Log a warning
     */
    warn: (message: string, data?: any) => warn('⚠️', message, data),

    /**
     * Log general information
     */
    info: (message: string, data?: any) => log('ℹ️', message, data),

    /**
     * Log with a custom emoji and message
     */
    custom: (emoji: string, message: string, data?: any) => log(emoji, message, data),

    /**
     * Group related logs together (collapsible in browser console)
     */
    group: (label: string, collapsed = false) => {
      if (!isEnabled) return;
      if (collapsed) {
        console.groupCollapsed(`📦 [${namespace}] ${label}`);
      } else {
        console.group(`📦 [${namespace}] ${label}`);
      }
    },

    /**
     * End a log group
     */
    groupEnd: () => {
      if (!isEnabled) return;
      console.groupEnd();
    },

    /**
     * Log performance timing
     */
    time: (label: string) => {
      if (!isEnabled) return;
      console.time(`⏱️ [${namespace}] ${label}`);
    },

    /**
     * End performance timing
     */
    timeEnd: (label: string) => {
      if (!isEnabled) return;
      console.timeEnd(`⏱️ [${namespace}] ${label}`);
    },

    /**
     * Check if debugging is enabled
     */
    isEnabled: () => isEnabled,
  };
};

/**
 * Create a performance logger for measuring execution time
 * 
 * @example
 * ```typescript
 * const perf = createPerformanceLogger('ImageProcessing');
 * perf.start('resize');
 * // ... do work
 * perf.end('resize'); // logs time taken
 * ```
 */
export const createPerformanceLogger = (namespace: string) => {
  const timers = new Map<string, number>();

  return {
    start: (label: string) => {
      if (!DEBUG) return;
      timers.set(label, performance.now());
      console.log(`⏱️ [${namespace}] ${label} started`);
    },

    end: (label: string) => {
      if (!DEBUG) return;
      const startTime = timers.get(label);
      if (startTime) {
        const duration = performance.now() - startTime;
        console.log(`⏱️ [${namespace}] ${label} completed in ${duration.toFixed(2)}ms`);
        timers.delete(label);
      }
    },

    mark: (label: string) => {
      if (!DEBUG) return;
      const startTime = timers.get('__start__') || performance.now();
      timers.set('__start__', startTime);
      const elapsed = performance.now() - startTime;
      console.log(`⏱️ [${namespace}] ${label} at ${elapsed.toFixed(2)}ms`);
    },
  };
};

/**
 * Conditional debug wrapper - only executes code when DEBUG is enabled
 * Useful for expensive debug operations
 * 
 * @example
 * ```typescript
 * debug(() => {
 *   const expensiveData = computeExpensiveDebugInfo();
 *   console.log('Debug info:', expensiveData);
 * });
 * ```
 */
export const debug = (fn: () => void) => {
  if (DEBUG) {
    fn();
  }
};

/**
 * Assert function for development-time checks
 * Throws an error if condition is false (only in debug mode)
 */
export const debugAssert = (condition: boolean, message: string) => {
  if (DEBUG && !condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
};
