import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

export const uploadAudio = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video', 
      folder: 'speakify/audio'
    });
    fs.unlinkSync(filePath); // delete local file
    return result;
  } catch (error) {
    console.error('Error uploading audio:', error);
    throw error;
  }
};
