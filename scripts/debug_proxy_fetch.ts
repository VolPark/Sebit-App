
import fetch from 'node-fetch';

const targetUrl = 'https://www.drmax.cz/_i/-31740039.webp?m2=%2Fmedia%2Fcatalog%2Fproduct%2F8%2F5%2F8595678413297.jpg&fit=contain&w=350&h=350&format=webp';
const proxyEndpoint = 'http://localhost:3000/api/proxy-image';

async function testProxy() {
    const encodedUrl = encodeURIComponent(targetUrl);
    const fullUrl = `${proxyEndpoint}?url=${encodedUrl}`;

    console.log('Testing Proxy Endpoint:', fullUrl);

    try {
        const response = await fetch(fullUrl);
        console.log('Proxy Status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.log('Proxy Error Body:', text);
        } else {
            const buffer = await response.arrayBuffer();
            console.log('Success! Received image size:', buffer.byteLength);
            console.log('Content-Type:', response.headers.get('content-type'));
        }

    } catch (error) {
        console.error('Proxy test error (is server running?):', error);
    }
}

testProxy();
