import { ZodirectusConfig } from '../types';

/**
 * Base generator class with common functionality
 */
export abstract class BaseGenerator {
  protected config: ZodirectusConfig;
  protected client: any;

  constructor(config: ZodirectusConfig, client?: any) {
    this.config = config;
    this.client = client;
  }

  /**
   * Set relationships data for proper M2M field resolution
   */
  async setRelationships(): Promise<void> {
    if (this.client) {
      try {
        const relationships = await this.client.getRelationships();
        console.log(
          `Loaded ${relationships.length} relationships from Directus`
        );
      } catch (error) {
        console.warn('Could not load relationships:', error);
      }
    }
  }
}
