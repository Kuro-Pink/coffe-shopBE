import cloudinary from '../config/cloudinary';
import { ApiError } from './ApiError';

interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'coffee-shop'
): Promise<CloudinaryUploadResult> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(new ApiError(500, 'Error uploading to Cloudinary'));
          } else {
            resolve({
              url: result!.secure_url,
              publicId: result!.public_id,
            });
          }
        }
      );

      uploadStream.end(file.buffer);
    });
  } catch (error) {
    throw new ApiError(500, 'Error uploading image');
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
  }
};