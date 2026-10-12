import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PrivateStorage, UploadObjectInput } from './storage.types.js';

export class SupabaseStorageService implements PrivateStorage {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async upload(input: UploadObjectInput): Promise<void> {
    const { error } = await this.client.storage
      .from(input.bucket)
      .upload(input.path, input.content, {
        contentType: input.contentType,
        upsert: false,
      });

    if (error) throw error;
  }

  async remove(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);
    if (error) throw error;
  }

  async createSignedDownloadUrl(
    bucket: string,
    path: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  }
}
