import { exiftool } from 'exiftool-vendored';
import { promises as fspromises } from 'fs';
import { resolve } from 'path';
import { doesFileSupportExif } from './does-file-support-exif';
import { MediaFileInfo } from '../models/media-file-info';

const { unlink, copyFile } = fspromises;

export async function updateExifMetadata(fileInfo: MediaFileInfo, timeTaken: string, errorDir: string): Promise<void> {
  if (!doesFileSupportExif(fileInfo.outputFilePath)) {
    return;
  }

  try {
    await exiftool.write(fileInfo.outputFilePath, {
      DateTimeOriginal: timeTaken,
    });
  
    await unlink(`${fileInfo.outputFilePath}_original`); // exiftool will rename the old file to {filename}_original, we can delete that

  } catch (error) {
    await copyFile(fileInfo.outputFilePath,  resolve(errorDir, fileInfo.mediaFileName));
    if (fileInfo.jsonFileExists && fileInfo.jsonFileName && fileInfo.jsonFilePath) {
      await copyFile(fileInfo.jsonFilePath, resolve(errorDir, fileInfo.jsonFileName));
    }
  }
}
