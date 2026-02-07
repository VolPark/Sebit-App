import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to control NODE_ENV for tests
const originalEnv = process.env.NODE_ENV;

describe('Logger', () => {
    let createLogger: typeof import('../logger').createLogger;

    beforeEach(() => {
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'info').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        process.env.NODE_ENV = originalEnv;
    });

    // Re-import to get fresh module with current NODE_ENV
    async function importLogger() {
        vi.resetModules();
        const mod = await import('../logger');
        return mod.createLogger;
    }

    describe('createLogger', () => {
        it('should prefix messages with module name', async () => {
            createLogger = await importLogger();
            const logger = createLogger({ module: 'TestModule' });

            logger.info('hello');

            expect(console.info).toHaveBeenCalledWith('[TestModule]', 'hello');
        });

        it('should log info messages', async () => {
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test' });

            logger.info('message', { key: 'value' });

            expect(console.info).toHaveBeenCalledWith('[Test]', 'message', { key: 'value' });
        });

        it('should log warn messages', async () => {
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test' });

            logger.warn('warning');

            expect(console.warn).toHaveBeenCalledWith('[Test]', 'warning');
        });

        it('should log error messages', async () => {
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test' });

            logger.error('error occurred');

            expect(console.error).toHaveBeenCalledWith('[Test]', 'error occurred');
        });

        it('should format Error objects with message and stack', async () => {
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test' });
            const err = new Error('test error');

            logger.error('failed:', err);

            expect(console.error).toHaveBeenCalledWith(
                '[Test]',
                'failed:',
                { message: 'test error', stack: expect.any(String) }
            );
        });

        it('should show debug logs in development', async () => {
            process.env.NODE_ENV = 'development';
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test' });

            logger.debug('debug info');

            expect(console.debug).toHaveBeenCalledWith('[Test]', 'debug info');
        });

        it('should hide debug logs in production', async () => {
            process.env.NODE_ENV = 'production';
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test' });

            logger.debug('debug info');

            expect(console.debug).not.toHaveBeenCalled();
        });

        it('should respect custom minLevel override', async () => {
            createLogger = await importLogger();
            const logger = createLogger({ module: 'Test', minLevel: 'warn' });

            logger.debug('hidden');
            logger.info('hidden');
            logger.warn('shown');
            logger.error('shown');

            expect(console.debug).not.toHaveBeenCalled();
            expect(console.info).not.toHaveBeenCalled();
            expect(console.warn).toHaveBeenCalledWith('[Test]', 'shown');
            expect(console.error).toHaveBeenCalledWith('[Test]', 'shown');
        });
    });

    describe('child logger', () => {
        it('should create child logger with combined prefix', async () => {
            createLogger = await importLogger();
            const parent = createLogger({ module: 'Parent' });
            const child = parent.child('Child');

            child.info('message');

            expect(console.info).toHaveBeenCalledWith('[Parent:Child]', 'message');
        });
    });
});
