import { ProgramParameters } from "./photoExifSrc/models/types";

declare global {
    interface Window {
        API: {
            runPhotoConvertion: (formData: ProgramParameters) => Promise<void>;
            selectFolder: () => Promise<string>;
        };
    }
}

window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('input[name="inputFolder"], input[name="outputFolder"], input[name="errorOutputFolder"]').forEach((el) => {
        el.addEventListener("click", async (e: MouseEvent) => {
            (e.target as HTMLInputElement).value = await window.API.selectFolder();
        });
    });

    document.getElementById("configForm").addEventListener("submit", (e: SubmitEvent) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const formObject = Object.fromEntries(
            formData.entries() as IterableIterator<[keyof ProgramParameters, ProgramParameters[keyof ProgramParameters]]>
        ) as ProgramParameters;
        
        const loader = document.getElementsByClassName('loader-wrapper')[0];

        loader.removeAttribute('hidden')

        return window.API.runPhotoConvertion(formObject).then(() => {
            loader.setAttribute('hidden', '')
        });
    });
});
