import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars manually because we are outside of Next.js
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.warn("No .env.local found!");
}

async function main() {
    console.log("Testing Gemini API...");
    console.log("API Key present:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);

    try {
        const result = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: 'Hello, are you working?',
        });

        console.log("Success!");
        console.log("Response:", result.text);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
    }
}

main();
