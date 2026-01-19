
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        console.log(`Proxying image: ${url}`);
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.statusText} (${response.status}) for URL: ${url}`);
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.error(`Invalid content-type: ${contentType} for URL: ${url}`);
            return new NextResponse(`Invalid content-type: ${contentType}`, { status: 400 });
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
            console.error(`Empty image buffer for URL: ${url}`);
            return new NextResponse('Empty image received', { status: 400 });
        }

        const buffer = Buffer.from(arrayBuffer);

        // Convert to JPEG using sharp
        const convertedBuffer = await sharp(buffer)
            .jpeg({ quality: 90 })
            .toBuffer();

        console.log(`Successfully converted image for URL: ${url}`);
        return new NextResponse(convertedBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error proxying image:', error);
        return new NextResponse('Error proxying image', { status: 500 });
    }
}
