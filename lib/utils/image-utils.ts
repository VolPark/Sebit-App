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
        const compressedBlob = await imageCompression(file, options);
        // Create a new File object with the correct extension
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const compressedFile = new File([compressedBlob], newFileName, {
            type: "image/jpeg",
            lastModified: Date.now(),
        });
        return compressedFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        // Fallback: return original file if compression fails, 
        // though strictly speaking we might want to throw if HEIC is not supported.
        // But throwing might block the user.
        return file;
    }
};
