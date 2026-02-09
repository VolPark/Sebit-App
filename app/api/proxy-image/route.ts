
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { createLogger } from '@/lib/logger';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { z } from 'zod';

const log = createLogger({ module: 'API:ProxyImage' });

// Check if hostname is a private/internal IP
function isPrivateOrLocalhost(hostname: string): boolean {
    const privatePatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,  // Link-local
        /^0\./,
        /^\[::1\]$/,     // IPv6 localhost
        /^\[fe80:/i,     // IPv6 link-local
        /^\[fc00:/i,     // IPv6 private
        /^\[fd00:/i,     // IPv6 private
    ];
    return privatePatterns.some(pattern => pattern.test(hostname));
}

export async function GET(request: NextRequest) {
    const session = await verifySession(request);
    if (!session) return unauthorizedResponse();

    const searchParams = request.nextUrl.searchParams;
    const urlSchema = z.string().url('Invalid URL format');
    const urlResult = urlSchema.safeParse(searchParams.get('url'));
    if (!urlResult.success) {
        return new NextResponse('Missing or invalid URL parameter', { status: 400 });
    }
    const url = urlResult.data;

    // Security: Validate URL
    const parsedUrl = new URL(url); // Safe - already validated by Zod

    // Security: Block private/internal IPs (SSRF protection)
    if (isPrivateOrLocalhost(parsedUrl.hostname)) {
        log.warn(`Blocked private/localhost URL: ${url}`);
        return new NextResponse('Invalid URL: private addresses not allowed', { status: 403 });
    }

    // Security: Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
        log.warn(`Blocked non-HTTPS URL: ${url}`);
        return new NextResponse('Invalid URL: only HTTPS allowed', { status: 403 });
    }

    try {
        log.debug(`Proxying image: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            log.error(`Failed to fetch image: ${response.statusText} (${response.status}) for URL: ${url}`);
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            log.error(`Invalid content-type: ${contentType} for URL: ${url}`);
            return new NextResponse(`Invalid content-type: ${contentType}`, { status: 400 });
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
            log.error(`Empty image buffer for URL: ${url}`);
            return new NextResponse('Empty image received', { status: 400 });
        }

        const buffer = Buffer.from(arrayBuffer);

        // Convert to JPEG using sharp
        const convertedBuffer = await sharp(buffer)
            .jpeg({ quality: 90 })
            .toBuffer();

        log.debug(`Successfully converted image for URL: ${url}`);
        return new NextResponse(convertedBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        log.error('Error proxying image:', error);
        return new NextResponse('Error proxying image', { status: 500 });
    }
}
