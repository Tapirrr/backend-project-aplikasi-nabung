import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "project_nabung/profiles", resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload gagal!"));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export default cloudinary;
