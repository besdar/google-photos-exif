import { Command, Flags } from "@oclif/core";
import { executeGooglePhotosConversion } from "./utils";

export class GooglePhotosExif extends Command {
    static description = `Takes in a directory path for an extracted Google Photos Takeout. Extracts all photo/video files (based on the conigured list of file extensions) and places them into an output directory. All files will have their modified timestamp set to match the timestamp specified in Google's JSON metadata files (where present). In addition, for file types that support EXIF, the EXIF "DateTimeOriginal" field will be set to the timestamp from Google's JSON metadata, if the field is not already set in the EXIF metadata.`;

    static flags = {
        version: Flags.version(),
        help: Flags.help(),
        inputFolder: Flags.string({
            char: "i",
            description: "Directory containing the extracted contents of Google Photos Takeout zip file",
            required: true,
        }),
        outputFolder: Flags.string({
            char: "o",
            description: "Directory into which the processed output will be written",
            required: false,
        }),
        errorOutputFolder: Flags.string({
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
        const { mockProcess } = flags;

        await executeGooglePhotosConversion(flags, mockProcess);

        this.log("Done!");
        this.exit();
    }
}