import { contextBridge, ipcRenderer } from "electron";
import { ProgramParameters } from "./photoExifSrc/models/types";

contextBridge.exposeInMainWorld("API", {
    electron: () => process.versions.electron,
    runPhotoConvertion: (formData: ProgramParameters) => ipcRenderer.invoke("runPhotoConvertion", formData),
    selectFolder: () => ipcRenderer.invoke("dialog:openDirectory"),
    // we can also expose variables, not just functions
});
