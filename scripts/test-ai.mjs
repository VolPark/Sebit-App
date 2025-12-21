import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');

// 1. Load Env
if (fs.existsSync(envPath)) {
    let rawContent = fs.readFileSync(envPath);
    let content = rawContent.toString('utf-8');
    if (content.includes('\u0000')) {
        console.log("Detected UTF-16LE. decoding...");
        content = rawContent.toString('utf-16le');
    }

    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([^=]+?)\s*=\s*(.*)?$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            value = value.replace(/^["']|["']$/g, '').trim();
            if (key && !key.startsWith('#')) {
                process.env[key] = value;
            }
        }
    });
}

// 2. Test Loop
async function main() {
    console.log("\n--- Testing API Models ---");
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("Key Loaded:", !!apiKey);

    if (!apiKey) {
        console.error("No API Key.");
        return;
    }

    const models = [
        'gemini-1.5-flash',
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-pro'
    ];

    for (const m of models) {
        console.log(`Testing: ${m}...`);
        try {
            const result = await generateText({
                model: google(m, { apiKey }),
                prompt: 'Say OK',
            });
            console.log(`SUCCESS [${m}]: ${result.text}`);
            return;
        } catch (e) {
            // Check for 404 vs 400
            const msg = e.message || 'Unknown error';
            console.log(`FAILED [${m}]: ${msg.substring(0, 100)}...`);
        }
    }
    console.log("All models failed.");
}

main();
