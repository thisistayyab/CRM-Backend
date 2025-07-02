import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

cloudinary.config({ 
    cloud_name: 'dxvs4jtl1', 
    api_key: '397191661255793', 
    api_secret: '-cP6pjzS3c2f-2t9n24ULkx3hmI' 
});

const uploadOnCloudinary = async (path) =>{
    try {
        if(!path) return null;
        const response = await cloudinary.uploader.upload(path, {
            resource_type:"auto"
        })
        fs.unlinkSync(path)
        return response
    } catch (error) {
        fs.unlinkSync(path)
        return null;
    }
}

export {uploadOnCloudinary}