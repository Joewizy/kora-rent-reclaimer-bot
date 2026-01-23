import fs from 'fs';
import path from 'path';
import logger from './logger';

export function readJSON<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err: any) {
    logger.error(`Failed to read JSON file ${filePath}:`, err);
    throw err;
  }
}

export function writeJSON(filePath: string, data: any): void {
  try {
    const dirPath = path.dirname(filePath);
    fs.mkdirSync(dirPath, { recursive: true });
    
    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString, 'utf-8');
    
    // Verify write was successful
    const verify = fs.readFileSync(filePath, 'utf-8');
    if (verify !== jsonString) {
      throw new Error('Write verification failed');
    }
  } catch (err: any) {
    logger.error(`Failed to write JSON file ${filePath}:`, err);
    throw err;
  }
}

export default { readJSON, writeJSON };
