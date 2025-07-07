import { v2 as cloudinary } from "cloudinary";
import streamifier from 'streamifier';

cloudinary.config({ 
    cloud_name: 'dxvs4jtl1', 
    api_key: '397191661255793', 
    api_secret: '-cP6pjzS3c2f-2t9n24ULkx3hmI' 
});

const uploadOnCloudinary = async (fileBuffer) => {
    try {
        if (!fileBuffer) return null;
        return await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { resource_type: "auto" },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            streamifier.createReadStream(fileBuffer).pipe(stream);
        });
    } catch (error) {
        return null;
    }
}

export { uploadOnCloudinary }