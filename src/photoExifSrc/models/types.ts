export type Directories = {
  inputFolder: string;
  outputFolder?: string | null;
  errorOutputFolder?: string | null;
}

export type ProgramParameters = Directories & {
  mockProcess?: boolean;
}