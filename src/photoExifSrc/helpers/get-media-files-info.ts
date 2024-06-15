import { basename, extname, resolve } from "path";
import { CONFIG } from "../config";
import { MediaFileInfo, ProtoFile } from "../models/media-file-info";
import { generateUniqueOutputFileName } from "./generate-unique-output-file-name";
import { getCompanionJsonPathForMediaFile } from "./get-companion-json-path-for-media-file";

export async function getMediaFilesInfo(mediaFilePaths: string[], outputFolder?: string | null): Promise<MediaFileInfo[]> {
    const mediaFiles: MediaFileInfo[] = [];

    for (const mediaFilePath of mediaFilePaths) {
        const mediaFile: ProtoFile = { name: basename(mediaFilePath), extension: extname(mediaFilePath), path: mediaFilePath };

        const jsonFilePath = getCompanionJsonPathForMediaFile(mediaFilePath);
        let jsonFile: ProtoFile | null = null;
        if (jsonFilePath) {
            jsonFile = { name: basename(jsonFilePath), extension: extname(jsonFilePath), path: jsonFilePath };
        }

        let outputFile: ProtoFile | null = null;
        if (outputFolder) {
            const outputFileName = generateUniqueOutputFileName(mediaFilePath);
            outputFile = { name: outputFileName, extension: extname(outputFileName), path: resolve(outputFolder, outputFileName) };
        }

        mediaFiles.push({
            mediaFile,
            jsonFile,
            outputFile,
        });
    }

    return mediaFiles;
}
