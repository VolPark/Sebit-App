
import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../lib/database.types.ts');
console.log(`Fixing encoding for ${filePath}`);

try {
    // Try reading as utf16le
    const content = fs.readFileSync(filePath, 'utf16le');
    // If it looks valid (e.g. starts with 'export type'), write back as utf8
    if (content.includes('export type') || content.includes('Json')) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Converted from UTF-16LE to UTF-8");
    } else {
        // Maybe it wasn't utf16le? Try utf8
        const content8 = fs.readFileSync(filePath, 'utf8');
        console.log("File content sample (UTF8 read):", content8.substring(0, 50));
        // If it looks okay, maybe do nothing?
        // But tsc failed.
        // Let's assume it IS utf16le because view_file complained.
    }
} catch (e) {
    console.error("Error:", e);
}
