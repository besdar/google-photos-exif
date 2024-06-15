import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: 'lib',
        target: 'node20',
        ssr: true,
        lib: {
            entry: 'src/photoExifSrc/console.ts',
            name: 'mylib',
            formats: ['umd']
        }
    },
  });