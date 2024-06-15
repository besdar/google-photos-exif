import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerFlatpak } from "@electron-forge/maker-flatpak";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

const config: ForgeConfig = {
    packagerConfig: {
        asar: true
    },
    makers: [
        new MakerSquirrel(),
        new MakerFlatpak({
            options: {
                runtimeVersion: "23.08",
                files: [],
                baseVersion: "23.08",
                modules: [
                    // issue with zypak https://github.com/electron/forge/issues/2805
                    {
                        name: "zypak",
                        sources: [
                            {
                                type: "git",
                                url: "https://github.com/refi64/zypak",
                                tag: "v2022.03",
                            },
                        ],
                    },
                ],
            },
        }),
    ],
    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            // If you are familiar with Vite configuration, it will look really familiar.
            build: [
                {
                    // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                    entry: "src/main.ts",
                    config: "vite.main.config.ts",
                },
                {
                    entry: "src/preload.ts",
                    config: "vite.preload.config.ts",
                },
            ],
            renderer: [
                {
                    name: "main_window",
                    config: "vite.renderer.config.ts",
                },
            ],
        }),
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};

export default config;
