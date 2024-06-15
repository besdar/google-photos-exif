import { CONFIG } from "../config";
import { MediaFileInfo } from "../models/media-file-info";

export function getMediaFileCountsByExtension(mediaFiles: MediaFileInfo[]) {
    const mediaFileCountsByExtension = mediaFiles.reduce((acc, supportedExtension) => {
        const extension = supportedExtension.mediaFile.extension.toLowerCase()
        if (!acc[extension]) {
            acc[extension] = 0
        }

        acc[extension] += +CONFIG.supportedMediaFileExtensions.includes(extension);

        return acc;
    }, {} as Record<string, number>);

    return mediaFileCountsByExtension;
}
