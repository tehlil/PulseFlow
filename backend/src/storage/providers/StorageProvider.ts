export interface StorageProvider {
  /**
   * Uploads a file to the storage provider
   * @param file Multer file object
   * @param path Subfolder/path inside the bucket or root
   * @returns Key or URL of the uploaded file
   */
  uploadFile(file: Express.Multer.File, path: string): Promise<string>;

  /**
   * Downloads a file from the storage provider
   * @param key File key or path identifier
   * @returns File content as a Buffer
   */
  downloadFile(key: string): Promise<Buffer>;

  /**
   * Deletes a file from the storage provider
   * @param key File key or path identifier
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Generates a secure, temporary pre-signed URL to read the file
   * @param key File key or path identifier
   * @param expiresInSeconds Expiration duration (default: 3600 seconds)
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
