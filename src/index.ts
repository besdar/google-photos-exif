import { Command, Flags } from "@oclif/core";
import { existsSync, promises as fspromises, utimesSync } from "fs";
import { CONFIG } from "./config";
import { getMediaFilesInfo } from "./helpers/get-media-files-info";
import { Directories } from "./models/directories";
import { readMetadataFromGoogleJson } from "./helpers/read-metadata-from-google-json";
import { findFilesWithExtensionRecursively } from "./helpers/find-files-with-extension-recursively";
import { getMediaFileCountsByExtension } from "./helpers/get-media-file-counts-by-extension";
import { MediaFileInfo, ProtoFile } from "./models/media-file-info";
import { exiftool } from "exiftool-vendored";
import { resolve } from "path";

const { mkdir, copyFile } = fspromises;

export default class GooglePhotosExif extends Command {
    static description = `Takes in a directory path for an extracted Google Photos Takeout. Extracts all photo/video files (based on the conigured list of file extensions) and places them into an output directory. All files will have their modified timestamp set to match the timestamp specified in Google's JSON metadata files (where present). In addition, for file types that support EXIF, the EXIF "DateTimeOriginal" field will be set to the timestamp from Google's JSON metadata, if the field is not already set in the EXIF metadata.`;

    static flags = {
        version: Flags.version(),
        help: Flags.help(),
        inputDir: Flags.string({
            char: "i",
            description: "Directory containing the extracted contents of Google Photos Takeout zip file",
            required: true,
        }),
        outputDir: Flags.string({
            char: "o",
            description: "Directory into which the processed output will be written",
            required: false,
        }),
        errorDir: Flags.string({
            char: "e",
            description: "Directory for any files that have bad EXIF data - including the matching metadata files",
            required: false,
        }),
        mockProcess: Flags.boolean({
            required: false,
        }),
    };

    async run() {
        const { flags } = await this.parse(GooglePhotosExif);
        const { inputDir, outputDir, errorDir, mockProcess } = flags;

        try {
            if (!inputDir || !existsSync(inputDir)) {
                throw new Error("The input directory must exist");
            }

            await Promise.all([this.checkDirIsEmptyAndCreateDirIfNotFound(outputDir), this.checkDirIsEmptyAndCreateDirIfNotFound(errorDir)]);

            const mediaFiles = await this.scanMediaFiles(flags);
            await this.processMediaFiles(mediaFiles, flags, mockProcess);
        } catch (error) {
            this.error(error as Error, { exit: 1 });
        }

        this.log("Done!");
        this.exit(0);
    }

    private async checkDirIsEmptyAndCreateDirIfNotFound(directoryPath?: string | null): Promise<void> {
        if (!directoryPath) {
            return;
        }

        const folderExists = existsSync(directoryPath);

        if (!folderExists) {
            this.log(`--- Creating directory: ${directoryPath} ---`);
            await mkdir(directoryPath);
        }
    }

    private async scanMediaFiles(directories: Directories) {
        this.log(`--- Finding supported media files (${CONFIG.supportedMediaFileExtensions.join(", ")}) ---`);

        const mediaFilePaths = await findFilesWithExtensionRecursively(directories.inputDir);
        const mediaFiles = await getMediaFilesInfo(mediaFilePaths, directories.outputDir);

        // Count how many files were found for each supported file extension
        const mediaFileCountsByExtension = getMediaFileCountsByExtension(mediaFiles);
        Object.keys(mediaFileCountsByExtension).forEach((supportedExtension) =>
            this.log(`${mediaFileCountsByExtension[supportedExtension]} files with extension ${supportedExtension}`),
        );

        this.log(`--- Scan complete ---`);

        return mediaFiles;
    }

    private updateModificationDate(fileForUpdation: ProtoFile, dateString: string, mockProcess: boolean) {
        if (!mockProcess) {
            utimesSync(fileForUpdation.path, new Date(dateString), new Date(dateString));
        }

        this.log(`File's (${fileForUpdation.name}) modification date has been updated`);
    }

    private async processMediaFiles(mediaFiles: MediaFileInfo[], { errorDir }: Directories, mockProcess: boolean): Promise<void> {
        this.log(`--- Processing media files ---`);

        for (let i = 0; i < mediaFiles.length; i++) {
            const { mediaFile, jsonFile, outputFile } = mediaFiles[i];
            this.log(`Processing file ${i} of ${mediaFiles.length}: ${mediaFile.path}`);

            if (outputFile) {
                this.log(`Copying file: ${mediaFile.path} -> ${outputFile.name}`);
                if (!mockProcess) {
                    await copyFile(mediaFile.path, outputFile.path);
                }
            }

            const fileForUpdation = outputFile || mediaFile;
            const exifFileData = await exiftool.read(mediaFile.path);

            if (!jsonFile) {
                this.log(`There is no .json file for the ${mediaFile.path}. Skipping.`);

                if (exifFileData.DateTimeOriginal) {
                    this.updateModificationDate(fileForUpdation, exifFileData.DateTimeOriginal.toString() as string, mockProcess);
                }

                continue;
            }

            const googleMetadata = await readMetadataFromGoogleJson(jsonFile);

            if (!googleMetadata.DateTimeOriginal) {
                this.log(`The file "${fileForUpdation.path}" doesn't have a date from the related JSON file. Skipping.`);

                if (exifFileData.DateTimeOriginal) {
                    this.updateModificationDate(fileForUpdation, exifFileData.DateTimeOriginal.toString() as string, mockProcess);
                }

                continue;
            }

            if (
                exifFileData.DateTimeOriginal &&
                // There's some issue with timezones, so we fix the photo EXIF date when the difference with google JSON date is more than 24 hours
                Date.parse(exifFileData.DateTimeOriginal.toString() as string) - 86400000 <= Date.parse(googleMetadata.DateTimeOriginal.toString() as string)
            ) {
                this.log(
                    `The file "${
                        fileForUpdation.path
                    }" already have the EXIF date (${exifFileData.DateTimeOriginal.toString()}) that (almost) equal or older than the one from the related JSON file (${googleMetadata.DateTimeOriginal.toString()}). Skipping.`,
                );

                this.updateModificationDate(fileForUpdation, exifFileData.DateTimeOriginal.toString() as string, mockProcess);

                continue;
            }

            try {
                if (CONFIG.exifMediaFileExtensions.includes(fileForUpdation.extension.toLowerCase())) {
                    if (!mockProcess) {
                        await exiftool.write(fileForUpdation.path, googleMetadata, ["-overwrite_original"]);
                    }

                    this.log(
                        `Wrote "DateTimeOriginal" EXIF (new: "${googleMetadata.DateTimeOriginal.toString()}"; old: "${
                            exifFileData.DateTimeOriginal?.toString() || "empty"
                        }") and geo metadata ${JSON.stringify(googleMetadata)} to: ${fileForUpdation.name}`,
                    );
                }

                const googleOriginalDateString = googleMetadata.DateTimeOriginal?.toString();
                if (googleOriginalDateString) {
                    this.updateModificationDate(fileForUpdation, googleOriginalDateString, mockProcess);
                }
            } catch (error) {
                this.log(`There was an error "${(error as Error)?.message}" for the file ${fileForUpdation.path}`);

                if (!errorDir || mockProcess) {
                    continue;
                }

                await copyFile(fileForUpdation.path, resolve(errorDir, fileForUpdation.name));

                if (jsonFile) {
                    await copyFile(jsonFile.path, resolve(errorDir, jsonFile.name));
                }
            }
        }

        this.log(`--- Finished processing media files ---`);
    }
}
