
const fs = require('fs');
const path = require('path');

const searchStr = "Default export is deprecated";
// Also search for "zustand" to be sure
const altStr = "zustand";

function traverse(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) {
        return;
    }

    for (const file of files) {
        if (file.startsWith('.')) continue; // skip hidden
        const fullPath = path.join(dir, file);

        let stat;
        try {
            stat = fs.statSync(fullPath);
        } catch (e) { continue; }

        if (stat.isDirectory()) {
            traverse(fullPath);
        } else if (stat.isFile()) {
            if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes(searchStr)) {
                        console.log(`FOUND STRING "${searchStr}" in: ${fullPath}`);
                    }
                    // Only check for "zustand" if not found deprecation msg to avoid noise, 
                    // OR check both. Let's checking substring might be noisy.
                    // But let's check for "from 'zustand'" or similar?
                    // actually just finding the file with the error message is enough.
                } catch (e) { }
            }
        }
    }
}

console.log("Starting search in node_modules...");
traverse(path.join(process.cwd(), 'node_modules'));
console.log("Search complete.");
