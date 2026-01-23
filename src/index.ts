import { ZodirectusConfig, GeneratedSchema } from './types';
import { DirectusClient } from './utils/directus-client';
import { ZodGenerator } from './generators/zod-generator';
import { TypeGenerator } from './generators/type-generator';
import {
  StringUtils,
  DependencyUtils,
  FileSchemaUtils,
  CollectionUtils,
  ImportUtils,
  FileWriterUtils,
} from './lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Main Zodirectus class for generating Zod schemas and TypeScript types from Directus collections
 */
export class Zodirectus {
  private config: ZodirectusConfig;
  private client: DirectusClient;
  private zodGenerator: ZodGenerator;
  private typeGenerator: TypeGenerator;

  constructor(config: ZodirectusConfig) {
    this.config = {
      outputDir: './generated',
      generateTypes: true,
      generateSchemas: true,
      schemaFileName: 'schemas.ts',
      typesFileName: 'types.ts',
      includeSystemCollections: false,
      ...config,
    };

    this.client = new DirectusClient(this.config);
    this.zodGenerator = new ZodGenerator(this.config, this.client);
    this.typeGenerator = new TypeGenerator(this.config, this.client);
  }

  /**
   * Generate schemas and types for all configured collections
   */
  async generate(): Promise<GeneratedSchema[]> {
    try {
      // Authenticate with Directus
      await this.client.authenticate();

      // Load relationships data for proper M2M field resolution
      await this.zodGenerator.setRelationships();
      await this.typeGenerator.setRelationships();

      // Get collections
      const collections = await this.client.getCollections();

      // Filter collections using CollectionUtils
      const actualCollections = CollectionUtils.filterCollections(
        collections,
        this.config
      );

      console.log(`Found ${collections.length} total collections`);
      console.log(
        `After filtering: ${actualCollections.length} collections to process`
      );
      console.log(
        'Collections to process:',
        actualCollections.map(c => c.collection)
      );

      const results: GeneratedSchema[] = [];

      // Generate schemas and types for each collection
      for (const collection of actualCollections) {
        try {
          const collectionWithFields =
            await this.client.getCollectionWithFields(collection.collection);

          if (this.config.generateSchemas) {
            const schema =
              this.zodGenerator.generateSchema(collectionWithFields);
            results.push({
              collectionName: collection.collection,
              schema,
            });
          }

          if (this.config.generateTypes) {
            const type = this.typeGenerator.generateType(collectionWithFields);
            const existingResult = results.find(
              r => r.collectionName === collection.collection
            );
            if (existingResult) {
              existingResult.type = type;
            } else {
              results.push({
                collectionName: collection.collection,
                type,
              });
            }
          }
        } catch (error) {
          console.log(
            `Collection '${collection.collection}' skipped due to access error:`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      // After all schemas are generated, detect circular dependencies and regenerate lazy schemas
      const dependencyGraph = DependencyUtils.buildDependencyGraph(results);
      const circularDeps =
        DependencyUtils.detectCircularDependencies(dependencyGraph);

      // Regenerate schemas for collections that are part of circular dependencies
      for (const result of results) {
        if (result.schema) {
          const currentCollectionName = StringUtils.toSingular(
            StringUtils.toPascalCase(result.collectionName)
          );
          const isPartOfCircularDependency = circularDeps.some(cycle =>
            cycle.includes(currentCollectionName)
          );

          if (isPartOfCircularDependency) {
            // Find the collection and regenerate with lazy schemas
            const collection = actualCollections.find(
              c => c.collection === result.collectionName
            );
            if (collection) {
              const collectionWithFields =
                await this.client.getCollectionWithFields(
                  collection.collection
                );
              result.schema = this.zodGenerator.generateSchema(
                collectionWithFields,
                true
              );
            }
          }
        }
      }

      // Write files to output directory
      await this.writeFiles(results);

      return results;
    } catch (error) {
      throw new Error(
        `Failed to generate schemas: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate schema for a single collection
   */
  async generateForCollection(
    collectionName: string
  ): Promise<GeneratedSchema> {
    try {
      await this.client.authenticate();
      const collectionWithFields =
        await this.client.getCollectionWithFields(collectionName);

      const result: GeneratedSchema = {
        collectionName,
      };

      if (this.config.generateSchemas) {
        result.schema = this.zodGenerator.generateSchema(collectionWithFields);
      }

      if (this.config.generateTypes) {
        result.type = this.typeGenerator.generateType(collectionWithFields);
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to generate schema for collection ${collectionName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Write file schemas to the output directory based on actual Directus file collection structure
   */
  private async writeFileSchemas(outputDir: string): Promise<void> {
    await FileWriterUtils.writeFileSchemas(outputDir, this.client);
  }

  /**
   * Write generated files to the output directory
   */
  private async writeFiles(results: GeneratedSchema[]): Promise<void> {
    const outputDir = this.config.outputDir!;

    // Write file schemas first
    await this.writeFileSchemas(outputDir);

    // Write individual collection files
    await FileWriterUtils.writeFiles(results, outputDir);
  }

  /**
   * Get available collections from Directus
   */
  async getCollections(): Promise<string[]> {
    await this.client.authenticate();
    const collections = await this.client.getCollections();
    return collections.map(c => c.collection);
  }
}

// Export types and utilities
export * from './types';
export * from './generators/zod-generator';
export * from './generators/type-generator';
export * from './utils/directus-client';
