import { Injectable, Logger } from '@nestjs/common';
import {
  createClient,
  SupabaseClient,
  User,
  Session,
} from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';
export interface UploadSignedUrlResponse {
  path: string;
  signedUrl: string;
  token: string;
  servingPath: string;
}
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private static clientInstance: SupabaseClient;
  private readonly jwtSecret: string;
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;

  constructor() {
    this.jwtSecret = process.env.SUPABASE_JWT_SECRET;
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!this.jwtSecret || !this.supabaseUrl || !this.serviceRoleKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    this.logger.debug('SupabaseService instantiated');
  }
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn = 60,
  ): Promise<UploadSignedUrlResponse> {
    const clientInstance = this.getClient();

    try {
      const { data, error } = await clientInstance.storage
        .from(bucket)
        .createSignedUploadUrl(path);

      if (error) {
        this.logger.error('Error generating signed upload URL', {
          bucket,
          path,
          error,
        });
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      const { data: servingData } = await clientInstance.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        ...data,
        servingPath: servingData.publicUrl,
      };
    } catch (error) {
      this.logger.error('Error in createSignedUrl', { bucket, path, error });
      throw new Error(`Error generating signed URL: ${error.message}`);
    }
  }
  async getUserByToken(token: string): Promise<User | null> {
    if (!token || typeof token !== 'string') {
      this.logger.warn('Invalid token provided to getUserByToken');
      return null;
    }

    this.logger.debug('Getting user by token');
    try {
      const clientInstance = this.getClient();
      const { data, error } = await clientInstance.auth.getUser(token);

      if (error) {
        this.logger.warn('Failed to get user by token', error);
        return null;
      }

      this.logger.debug('Successfully retrieved user by token');
      return data.user;
    } catch (error) {
      this.logger.error('Error getting user by token', error);
      return null;
    }
  }
  async verifyToken(token: string) {
    if (!token || typeof token !== 'string') {
      this.logger.warn('Invalid token provided to verifyToken');
      return null;
    }

    this.logger.debug('Verifying token');
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      this.logger.debug('Token verified successfully');
      return decoded;
    } catch (err) {
      this.logger.warn('Token verification failed', err.message);
      return null;
    }
  }
  async getSession(token?: string): Promise<Session | null> {
    try {
      const clientInstance = this.getClient();

      if (token) {
        // Set the session with the provided token
        const { data, error } = await clientInstance.auth.setSession({
          access_token: token,
          refresh_token: '', // You might need to handle refresh tokens
        });

        if (error) {
          this.logger.warn('Failed to set session with token', error);
          return null;
        }

        return data.session;
      } else {
        // Get current session
        const { data, error } = await clientInstance.auth.getSession();

        if (error) {
          this.logger.warn('Failed to get current session', error);
          return null;
        }

        return data.session;
      }
    } catch (error) {
      this.logger.error('Error in getSession', error);
      return null;
    }
  }
  getClient(): SupabaseClient {
    if (!SupabaseService.clientInstance) {
      this.logger.debug('Initializing new Supabase client');
      SupabaseService.clientInstance = createClient(
        this.supabaseUrl,
        this.serviceRoleKey,
      );
    }
    return SupabaseService.clientInstance;
  }
}
