import fs from 'fs/promises';
import path from 'path';
import { StorageProvider } from './StorageProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(config.LOCAL_STORAGE_DIR);
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch (err) {
      logger.error('Failed to create local storage directory:', err);
    }
  }

  async uploadFile(file: Express.Multer.File, subPath: string): Promise<string> {
    const fileId = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    const relativeKey = path.join(subPath, fileId).replace(/\\/g, '/');
    const absolutePath = path.join(this.baseDir, relativeKey);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    logger.info(`File uploaded locally: ${relativeKey}`);
    return relativeKey;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const absolutePath = path.join(this.baseDir, key);
    try {
      return await fs.readFile(absolutePath);
    } catch (error) {
      logger.error(`Error downloading file from local storage [${key}]:`, error);
      throw new Error(`File not found: ${key}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    const absolutePath = path.join(this.baseDir, key);
    try {
      await fs.unlink(absolutePath);
      logger.info(`File deleted locally: ${key}`);
    } catch (error) {
      logger.warn(`Failed to delete local file [${key}]:`, error);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // For local storage, return a local API endpoint with token verification or key param
    // In production, this would serve files securely
    return `/api/v1/documents/download/${key}`;
  }
}
