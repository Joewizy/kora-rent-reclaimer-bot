export function readJSON<T = any>(filePath: string): T | null;
export function writeJSON(filePath: string, data: any): void;

declare const _default: {
  readJSON: typeof readJSON;
  writeJSON: typeof writeJSON;
};

export default _default;
