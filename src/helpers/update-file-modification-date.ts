import { closeSync, openSync, utimesSync } from 'fs'

export async function updateFileModificationDate(filePath: string, time: Date): Promise<void> {
  try {
    utimesSync(filePath, time, time);
  } catch (error) {
    closeSync(openSync(filePath, 'w'));
  }
}
