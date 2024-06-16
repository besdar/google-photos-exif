import { promises as fspromises } from "fs";
import { Tags } from "exiftool-vendored";
import { GoogleMetadata } from "../models/google-metadata";
import { ProtoFile } from "../models/media-file-info";

const { readFile } = fspromises;

export async function readMetadataFromGoogleJson(jsonFile: ProtoFile): Promise<Tags> {
    const jsonContents = await readFile(jsonFile.path, "utf8");
    const googleJsonMetadata = JSON.parse(jsonContents) as Partial<GoogleMetadata>;

    const metadata: Tags = {};
    if (googleJsonMetadata?.photoTakenTime?.timestamp) {
        const photoTakenTimestamp = Number(`${googleJsonMetadata.photoTakenTime.timestamp  }000`);
        const timeTaken = new Date(photoTakenTimestamp);
        metadata.DateTimeOriginal = timeTaken.toISOString();
    }

    let {geoData} = googleJsonMetadata;
    if (!geoData || geoData.altitude === 0 || geoData.latitude === 0 || geoData.longitude === 0) {
        geoData = googleJsonMetadata.geoDataExif;
    }

    if (geoData && (geoData.altitude !== 0 || geoData.latitude !== 0 || geoData.longitude !== 0)) {
        metadata.GPSAltitude = geoData.altitude;
        if (geoData.latitude >= 0) {
            metadata.GPSLatitude = geoData.latitude;
            metadata.GPSLatitudeRef = "N";
        } else {
            metadata.GPSLatitude = -geoData.latitude;
            metadata.GPSLatitudeRef = "S";
        }

        if (geoData.longitude >= 0) {
            metadata.GPSLongitude = geoData.longitude;
            metadata.GPSLongitudeRef = "E";
        } else {
            metadata.GPSLongitude = -geoData.longitude;
            metadata.GPSLongitudeRef = "W";
        }
    }

    return metadata;
}
