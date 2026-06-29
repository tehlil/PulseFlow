import { StorageProvider } from './providers/StorageProvider';
import { LocalStorageProvider } from './providers/LocalStorageProvider';
import { S3StorageProvider } from './providers/S3StorageProvider';
import { config } from '../config';
import { logger } from '../utils/logger';

let provider: StorageProvider;

try {
  if (config.STORAGE_PROVIDER === 'S3') {
    logger.info('📦 Storage system: S3StorageProvider selected');
    provider = new S3StorageProvider();
  } else {
    logger.info('📦 Storage system: LocalStorageProvider selected');
    provider = new LocalStorageProvider();
  }
} catch (error) {
  logger.error('Failed to initialize storage provider, defaulting to local storage:', error);
  provider = new LocalStorageProvider();
}

export const storage = provider;
export * from './providers/StorageProvider';
