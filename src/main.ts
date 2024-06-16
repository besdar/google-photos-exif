import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "path";
import { PROGRESS, executeGooglePhotosConversion } from "./photoExifSrc/utils";
import { ProgramParameters } from "./photoExifSrc/models/types";

app.disableHardwareAcceleration();

let progressInterval: NodeJS.Timeout;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
    app.quit();
}

const createWindow = () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            role: 'help',
            submenu: [
              {
                label: 'Learn More',
                click: () => {
                  const { shell } = require('electron');
    
                  return shell.openExternal('https://github.com/besdar/google-photos-exif')
                }
              }
            ]
          }
    ]));

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 400,
        height: 500,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
        fullscreenable: false,
        resizable: false,
        icon: path.join(__dirname, "../renderer/main_window/assets/favicon-*.png")
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    ipcMain.handle("runPhotoConvertion", (_, formData: ProgramParameters) => {
        mainWindow.setProgressBar(0);

        progressInterval = setInterval(() => {
            mainWindow.setProgressBar(PROGRESS);
        }, 100);

        return executeGooglePhotosConversion(formData, formData.mockProcess).finally(() => {
            clearInterval(progressInterval);
            mainWindow.setProgressBar(-1);
        });
    });

    ipcMain.handle("dialog:openDirectory", async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ["openDirectory"],
        });

        if (canceled || !filePaths?.length) {
            return "";
        }
        return filePaths[0];
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// before the app is terminated, clear both timers
app.on("before-quit", () => {
    clearInterval(progressInterval);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
