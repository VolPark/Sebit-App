import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
    // Basic settings suitable for web display
    // Max 1920px width/height, 0.7 quality, keeping size reasonable
    const options = {
        maxSizeMB: 1, // Try to keep under 1MB
        maxWidthOrHeight: 1080,
        useWebWorker: true,
        fileType: 'image/jpeg', // Force convert to JPEG (good for HEIC)
        initialQuality: 0.7,
    };

    try {
        const compressedFile = await imageCompression(file, options);
        return compressedFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        // Fallback: return original file if compression fails, 
        // though strictly speaking we might want to throw if HEIC is not supported.
        // But throwing might block the user.
        return file;
    }
};
