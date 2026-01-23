import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ZodirectusConfig,
  DirectusCollection,
  DirectusCollectionWithFields,
} from '../types';

/**
 * Directus API Client for fetching collections and fields
 */
export class DirectusClient {
  private config: ZodirectusConfig;
  private axiosInstance: AxiosInstance;
  private accessToken?: string;

  constructor(config: ZodirectusConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: config.directusUrl,
      timeout: 30000,
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use(config => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
        for (const [key, value] of Object.entries(this.config.additionalHeaders || {})) {
          config.headers[key] = value;
        }
      }
      return config;
    });
  }

  /**
   * Authenticate with Directus
   */
  async authenticate(): Promise<void> {
    if (this.config.token) {
      this.accessToken = this.config.token;
      return;
    }

    if (this.config.email && this.config.password) {
      try {
        const response = await this.axiosInstance.post('/auth/login', {
          email: this.config.email,
          password: this.config.password,
        });

        this.accessToken = response.data.data.access_token;
      } catch (error) {
        throw new Error(
          `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } else {
      throw new Error(
        'Either token or email/password must be provided for authentication'
      );
    }
  }

  /**
   * Get all collections from Directus
   */
  async getCollections(): Promise<DirectusCollection[]> {
    try {
      const response: AxiosResponse<{ data: DirectusCollection[] }> =
        await this.axiosInstance.get('/collections');
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch collections: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a specific collection with its fields
   */
  async getCollectionWithFields(
    collectionName: string
  ): Promise<DirectusCollectionWithFields> {
    try {
      // Get collection metadata
      const collectionResponse: AxiosResponse<{ data: DirectusCollection }> =
        await this.axiosInstance.get(`/collections/${collectionName}`);
      const collection = collectionResponse.data.data;

      // Get fields for the collection
      const fieldsResponse: AxiosResponse<{ data: any[] }> =
        await this.axiosInstance.get(`/fields/${collectionName}`);
      const fields = fieldsResponse.data.data;

      return {
        ...collection,
        fields,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test the connection to Directus
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.authenticate();
      await this.axiosInstance.get('/server/ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/server/info');
      return response.data.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch server info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get relationship information for M2M fields
   */
  async getRelationships(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get('/relations');
      return response.data.data || [];
    } catch (error) {
      console.warn(
        'Could not fetch relationships from Directus:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  }

  /**
   * Get relationship information for a specific collection
   */
  async getCollectionRelationships(collectionName: string): Promise<any[]> {
    try {
      const allRelations = await this.getRelationships();
      return allRelations.filter(
        (relation: any) =>
          relation.one_collection === collectionName ||
          relation.many_collection === collectionName ||
          relation.junction_collection === collectionName
      );
    } catch (error) {
      console.warn(
        `Could not fetch relationships for collection ${collectionName}:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return [];
    }
  }
}
