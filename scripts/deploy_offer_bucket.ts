
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
    console.log('Creating bucket "offer-images"...');
    const { data, error } = await supabase.storage.createBucket('offer-images', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "offer-images" already exists.');
        } else {
            console.error('Error creating bucket:', error);
            process.exit(1);
        }
    } else {
        console.log('Bucket "offer-images" created successfully.');
    }
}

async function verifyUpload() {
    console.log('Verifying upload...');
    const fileName = `test_upload_${Date.now()}.txt`;
    const { data, error } = await supabase.storage
        .from('offer-images')
        .upload(fileName, 'Test content', {
            contentType: 'text/plain',
        });

    if (error) {
        console.error('Upload verification failed:', error);
        process.exit(1);
    }

    console.log('Upload verification successful:', data);

    // Cleanup
    const { error: deleteError } = await supabase.storage
        .from('offer-images')
        .remove([fileName]);

    if (deleteError) {
        console.warn('Failed to cleanup test file:', deleteError);
    } else {
        console.log('Cleanup successful.');
    }
}

async function run() {
    await createBucket();
    await verifyUpload();
}

run();
