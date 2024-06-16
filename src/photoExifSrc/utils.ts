import { existsSync, promises as fspromises, utimesSync } from "fs";
import { exiftool } from "exiftool-vendored";
import { resolve } from "path";
import { CONFIG } from "./config";
import { getMediaFilesInfo } from "./helpers/get-media-files-info";
import { Directories } from "./models/types";
import { readMetadataFromGoogleJson } from "./helpers/read-metadata-from-google-json";
import { findFilesWithExtensionRecursively } from "./helpers/find-files-with-extension-recursively";
import { getMediaFileCountsByExtension } from "./helpers/get-media-file-counts-by-extension";
import { MediaFileInfo, ProtoFile } from "./models/media-file-info";

const { mkdir, copyFile } = fspromises;

export let PROGRESS = 0

const checkDirIsEmptyAndCreateDirIfNotFound = async (directoryPath?: string | null): Promise<void> => {
    if (!directoryPath) {
        return;
    }

    const folderExists = existsSync(directoryPath);

    if (!folderExists) {
        console.log(`--- Creating directory: ${directoryPath} ---`);
        await mkdir(directoryPath);
    }
}

const scanMediaFiles = async (directories: Directories) => {
    console.log(`--- Finding supported media files (${CONFIG.supportedMediaFileExtensions.join(", ")}) ---`);

    const mediaFilePaths = await findFilesWithExtensionRecursively(directories.inputFolder);
    const mediaFiles = await getMediaFilesInfo(mediaFilePaths, directories.outputFolder);

    // Count how many files were found for each supported file extension
    const mediaFileCountsByExtension = getMediaFileCountsByExtension(mediaFiles);
    Object.keys(mediaFileCountsByExtension).forEach((supportedExtension) =>
        console.log(`${mediaFileCountsByExtension[supportedExtension]} files with extension ${supportedExtension}`)
    );

    console.log(`--- Scan complete ---`);

    return mediaFiles;
}

const updateModificationDate = (fileForUpdation: ProtoFile, dateString: string, mockProcess: boolean) => {
    if (!mockProcess) {
        utimesSync(fileForUpdation.path, new Date(dateString), new Date(dateString));
    }

    console.log(`File's (${fileForUpdation.name}) modification date has been updated`);
}

const processMediaFiles = async (mediaFiles: MediaFileInfo[], { errorOutputFolder }: Directories, mockProcess: boolean): Promise<void> => {
    console.log(`--- Processing media files ---`);

    for (let i = 0; i < mediaFiles.length; i += 1) {
        PROGRESS = i / mediaFiles.length;
        const { mediaFile, jsonFile, outputFile } = mediaFiles[i];
        console.log(`Processing file ${i} of ${mediaFiles.length}: ${mediaFile.path}`);

        if (outputFile) {
            console.log(`Copying file: ${mediaFile.path} -> ${outputFile.name}`);
            if (!mockProcess) {
                await copyFile(mediaFile.path, outputFile.path);
            }
        }

        const fileForUpdation = outputFile || mediaFile;
        const exifFileData = await exiftool.read(mediaFile.path);

        if (!jsonFile) {
            console.log(`There is no .json file for the ${mediaFile.path}. Skipping.`);

            if (exifFileData.DateTimeOriginal) {
                updateModificationDate(fileForUpdation, exifFileData.DateTimeOriginal.toString() as string, mockProcess);
            }

            continue;
        }

        const googleMetadata = await readMetadataFromGoogleJson(jsonFile);

        if (!googleMetadata.DateTimeOriginal) {
            console.log(`The file "${fileForUpdation.path}" doesn't have a date from the related JSON file. Skipping.`);

            if (exifFileData.DateTimeOriginal) {
                updateModificationDate(fileForUpdation, exifFileData.DateTimeOriginal.toString() as string, mockProcess);
            }

            continue;
        }

        if (
            exifFileData.DateTimeOriginal &&
            // There's some issue with timezones, so we fix the photo EXIF date when the difference with google JSON date is more than 24 hours
            Date.parse(exifFileData.DateTimeOriginal.toString() as string) - 86400000 <= Date.parse(googleMetadata.DateTimeOriginal.toString() as string)
        ) {
            console.log(
                `The file "${
                    fileForUpdation.path
                }" already have the EXIF date (${exifFileData.DateTimeOriginal.toString()}) that (almost) equal or older than the one from the related JSON file (${googleMetadata.DateTimeOriginal.toString()}). Skipping.`
            );

            updateModificationDate(fileForUpdation, exifFileData.DateTimeOriginal.toString() as string, mockProcess);

            continue;
        }

        try {
            if (CONFIG.exifMediaFileExtensions.includes(fileForUpdation.extension.toLowerCase())) {
                if (!mockProcess) {
                    await exiftool.write(fileForUpdation.path, googleMetadata, ["-overwrite_original"]);
                }

                console.log(
                    `Wrote "DateTimeOriginal" EXIF (new: "${googleMetadata.DateTimeOriginal.toString()}"; old: "${
                        exifFileData.DateTimeOriginal?.toString() || "empty"
                    }") and geo metadata ${JSON.stringify(googleMetadata)} to: ${fileForUpdation.name}`
                );
            }

            const googleOriginalDateString = googleMetadata.DateTimeOriginal?.toString();
            if (googleOriginalDateString) {
                updateModificationDate(fileForUpdation, googleOriginalDateString, mockProcess);
            }
        } catch (error) {
            console.log(`There was an error "${(error as Error)?.message}" for the file ${fileForUpdation.path}`);

            if (!errorOutputFolder || mockProcess) {
                continue;
            }

            await copyFile(fileForUpdation.path, resolve(errorOutputFolder, fileForUpdation.name));

            if (jsonFile) {
                await copyFile(jsonFile.path, resolve(errorOutputFolder, jsonFile.name));
            }
        }
    }

    console.log(`--- Finished processing media files ---`);
}

export const executeGooglePhotosConversion = async (directories: Directories, mockProcess = true) => {
    PROGRESS = 0;

    try {
        if (!directories.inputFolder || !existsSync(directories.inputFolder)) {
            throw new Error("The input directory must exist");
        }

        await Promise.all([
            checkDirIsEmptyAndCreateDirIfNotFound(directories.outputFolder),
            checkDirIsEmptyAndCreateDirIfNotFound(directories.errorOutputFolder),
        ]);

        const mediaFiles = await scanMediaFiles(directories);
        await processMediaFiles(mediaFiles, directories, mockProcess);
    } catch (error) {
        console.error(error as Error, { exit: 1 });
    }

    PROGRESS = 1
}