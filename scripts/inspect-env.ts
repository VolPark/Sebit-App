
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log("Available Env Keys:");
Object.keys(process.env).forEach(key => {
    if (key.includes('DB') || key.includes('URL') || key.includes('POSTGRES')) {
        console.log(key);
    }
});
