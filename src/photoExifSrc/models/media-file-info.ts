export type ProtoFile = {
  name: string,
  extension: string,
  path: string
}

export interface MediaFileInfo {
  mediaFile: ProtoFile;
  jsonFile?: ProtoFile | null;
  outputFile?: ProtoFile | null;
}
