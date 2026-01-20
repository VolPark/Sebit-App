
import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, '../lib/database.types.ts');
try {
    const buffer = fs.readFileSync(filePath);
    console.log("First 50 bytes hex:", buffer.subarray(0, 50).toString('hex'));
    console.log("First 50 bytes utf8:", buffer.subarray(0, 50).toString('utf8'));
    console.log("First 50 bytes utf16le:", buffer.subarray(0, 50).toString('utf16le'));
} catch (e) {
    console.error(e);
}
