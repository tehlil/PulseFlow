import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './StorageProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class S3StorageProvider implements StorageProvider {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY || !config.AWS_S3_BUCKET) {
      logger.warn('⚠️ AWS S3 configuration is incomplete. S3StorageProvider may fail.');
    }
    this.s3Client = new S3Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId: config.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucket = config.AWS_S3_BUCKET || 'clinic-predict-documents';
  }

  async uploadFile(file: Express.Multer.File, subPath: string): Promise<string> {
    const fileId = `${Date.now()}-${Math.round(Math.random() * 1e9)}${file.originalname}`;
    const key = `${subPath}/${fileId}`.replace(/\\/g, '/');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
    logger.info(`File uploaded to S3: ${key}`);
    return key;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new Error('Empty file body returned from S3');
      }
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error) {
      logger.error(`Error downloading file from S3 [${key}]:`, error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete S3 file [${key}]:`, error);
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      logger.error(`Failed to generate S3 pre-signed URL [${key}]:`, error);
      throw error;
    }
  }
}
