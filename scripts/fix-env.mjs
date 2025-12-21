import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
    const rawContent = fs.readFileSync(envPath);
    console.log("Original Size:", rawContent.length);

    let content = rawContent.toString('utf-8');

    // Simple heuristic for UTF-16LE: check for null bytes
    if (content.includes('\u0000')) {
        console.log("Detected UTF-16LE encoding (null bytes). Converting to UTF-8...");
        content = rawContent.toString('utf-16le');

        // Write back as UTF-8
        fs.writeFileSync(envPath, content, 'utf-8');
        console.log("File saved as UTF-8.");
    } else {
        console.log("File appears to be UTF-8 already.");
        // Ensure no BOM at start
        if (content.charCodeAt(0) === 0xFEFF) {
            console.log("Removing BOM...");
            fs.writeFileSync(envPath, content.substring(1), 'utf-8');
        }
    }
} else {
    console.log("No .env.local found.");
}
