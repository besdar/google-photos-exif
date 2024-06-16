import { extname, resolve } from "path";
import { promises as fspromises } from "fs";
import { CONFIG } from "../config";

const { readdir } = fspromises;

async function getAllFilesRecursively(dir: string): Promise<string[]> {
    const directoryEntries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        directoryEntries.map((directoryEntry) => {
            const res = resolve(dir, directoryEntry.name);
            return directoryEntry.isDirectory() ? getAllFilesRecursively(res) : [res];
        }),
    );

    return files.flat();
}

export async function findFilesWithExtensionRecursively(dirToSearch: string): Promise<string[]> {
    const matchingFiles = (await getAllFilesRecursively(dirToSearch)).filter((filePath) =>
        CONFIG.supportedMediaFileExtensions.includes(extname(filePath).toLowerCase()),
    );

    if (matchingFiles.length === 0) {
        throw new Error(
            "The search directory is empty, so there is no work to do. Check that your --inputFolder contains all of the Google Takeout data, and that any zips have been extracted before running this tool",
        );
    }

    return matchingFiles;
}
