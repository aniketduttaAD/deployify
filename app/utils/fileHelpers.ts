// app/utils/fileHelpers.ts
export const validateZipContents = (files: string[]) => {
  return files.filter((name) => name.includes('node_modules'));
};
