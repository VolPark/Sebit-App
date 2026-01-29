/**
 * Structured Logger for SEBIT-APP
 * 
 * Provides consistent logging with:
 * - Log levels: debug, info, warn, error
 * - Development-only debug logs (disabled in production)
 * - Module prefixes for easy filtering
 * - Server/client compatibility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    /** Module name for prefix, e.g., 'Accounting', 'Auth' */
    module: string;
    /** Override default log level filtering */
    minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// In production, only show info and above (not debug)
const isProduction = process.env.NODE_ENV === 'production';
const defaultMinLevel: LogLevel = isProduction ? 'info' : 'debug';

/**
 * Creates a namespaced logger instance
 */
export function createLogger(config: LoggerConfig) {
    const { module, minLevel = defaultMinLevel } = config;
    const prefix = `[${module}]`;
    const minLevelNum = LOG_LEVELS[minLevel];

    const shouldLog = (level: LogLevel): boolean => {
        return LOG_LEVELS[level] >= minLevelNum;
    };

    const formatArgs = (args: unknown[]): unknown[] => {
        return args.map(arg => {
            if (arg instanceof Error) {
                return { message: arg.message, stack: arg.stack };
            }
            return arg;
        });
    };

    return {
        /**
         * Debug level - only shown in development
         * Use for verbose debugging information
         */
        debug: (...args: unknown[]) => {
            if (shouldLog('debug')) {
                console.debug(prefix, ...formatArgs(args));
            }
        },

        /**
         * Info level - shown in all environments
         * Use for important operational messages
         */
        info: (...args: unknown[]) => {
            if (shouldLog('info')) {
                console.info(prefix, ...formatArgs(args));
            }
        },

        /**
         * Warn level - shown in all environments
         * Use for potential issues that don't prevent operation
         */
        warn: (...args: unknown[]) => {
            if (shouldLog('warn')) {
                console.warn(prefix, ...formatArgs(args));
            }
        },

        /**
         * Error level - always shown
         * Use for errors that need attention
         */
        error: (...args: unknown[]) => {
            if (shouldLog('error')) {
                console.error(prefix, ...formatArgs(args));
            }
        },

        /**
         * Create a child logger with a sub-module prefix
         */
        child: (subModule: string) => {
            return createLogger({
                module: `${module}:${subModule}`,
                minLevel
            });
        },
    };
}

// Pre-configured loggers for common modules
export const logger = {
    accounting: createLogger({ module: 'Accounting' }),
    auth: createLogger({ module: 'Auth' }),
    api: createLogger({ module: 'API' }),
    sync: createLogger({ module: 'Sync' }),
    aml: createLogger({ module: 'AML' }),
    currency: createLogger({ module: 'Currency' }),
    middleware: createLogger({ module: 'Middleware' }),
};

// Default logger for general use
export default createLogger({ module: 'App' });
