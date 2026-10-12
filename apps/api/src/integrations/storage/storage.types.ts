export const PRIVATE_STORAGE = Symbol('PRIVATE_STORAGE');

export interface UploadObjectInput {
  bucket: string;
  path: string;
  content: Buffer;
  contentType: string;
}

export interface PrivateStorage {
  upload(input: UploadObjectInput): Promise<void>;
  remove(bucket: string, path: string): Promise<void>;
  createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string>;
}
