import * as fs from 'fs';
import * as path from 'path';
import { GeneratedSchema } from '../types';
import { StringUtils } from './string-utils';
import { DependencyUtils } from './dependency-utils';
import { ImportUtils } from './import-utils';

/**
 * Utilities for writing generated files to the output directory
 */
export class FileWriterUtils {
  /**
   * Write generated files to the output directory
   */
  static async writeFiles(
    results: GeneratedSchema[],
    outputDir: string
  ): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create system subdirectory for Directus system collections
    const systemDir = path.join(outputDir, 'system');
    if (!fs.existsSync(systemDir)) {
      fs.mkdirSync(systemDir, { recursive: true });
    }

    // Build dependency graph and detect circular dependencies
    const dependencyGraph = DependencyUtils.buildDependencyGraph(results);
    const circularDeps =
      DependencyUtils.detectCircularDependencies(dependencyGraph);

    // Separate system and regular collections
    const systemCollections = results.filter(r =>
      r.collectionName.startsWith('directus_')
    );
    const regularCollections = results.filter(
      r => !r.collectionName.startsWith('directus_')
    );

    // Write system collections to system/ subfolder
    for (const result of systemCollections) {
      console.log(
        `Writing system file for collection: ${result.collectionName}`
      );
      const fileName = StringUtils.toKebabCase(result.collectionName);
      const filePath = path.join(systemDir, `${fileName}.ts`);

      const fileContent = this.generateFileContent(
        result,
        results,
        circularDeps,
        true
      );

      // Write the file
      fs.writeFileSync(filePath, fileContent);
    }

    // Write regular collections to root folder
    for (const result of regularCollections) {
      console.log(`Writing file for collection: ${result.collectionName}`);
      const fileName = StringUtils.toKebabCase(result.collectionName);
      const filePath = path.join(outputDir, `${fileName}.ts`);

      const fileContent = this.generateFileContent(
        result,
        results,
        circularDeps,
        false
      );

      // Write the file
      fs.writeFileSync(filePath, fileContent);
    }
  }

  /**
   * Generate file content for a single collection
   */
  static generateFileContent(
    result: GeneratedSchema,
    results: GeneratedSchema[],
    circularDeps: string[][],
    isSystemCollection: boolean = false
  ): string {
    let fileContent = '';

    // Add zod import if needed
    fileContent += ImportUtils.generateZodImport(result);

    // Add file schemas import if needed
    fileContent += ImportUtils.generateFileSchemaImport(
      result,
      isSystemCollection
    );

    // Add imports for related collections
    fileContent += ImportUtils.generateImportStatements(
      result,
      results,
      circularDeps,
      isSystemCollection
    );

    // Add spacing after imports
    if (fileContent.includes('import')) {
      fileContent += '\n';
    }

    // Add schema
    if (result.schema) {
      fileContent += result.schema + '\n\n';
    }

    // Add type
    if (result.type) {
      fileContent += result.type + '\n';
    }

    return fileContent;
  }

  /**
   * Write file schemas to the output directory
   */
  static async writeFileSchemas(outputDir: string, client: any): Promise<void> {
    const fileSchemasPath = path.join(outputDir, 'file-schemas.ts');

    try {
      // Try to fetch the actual file collection structure from Directus
      const fileCollection =
        await client.getCollectionWithFields('directus_files');
      const fileFields = fileCollection.fields;

      const fileSchemasContent = this.generateDynamicFileSchemas(fileFields);

      fs.writeFileSync(fileSchemasPath, fileSchemasContent);
      console.log(`Generated: ${fileSchemasPath}`);
    } catch (error) {
      console.log(
        'Could not fetch file collection structure, using fallback schema'
      );
      // Fallback to static schema if we can't access the file collection
      const fallbackContent = this.generateFallbackFileSchemas();

      fs.writeFileSync(fileSchemasPath, fallbackContent);
      console.log(`Generated: ${fileSchemasPath} (fallback)`);
    }
  }

  /**
   * Generate dynamic file schemas based on actual Directus structure
   */
  static generateDynamicFileSchemas(fileFields: any[]): string {
    const { FileSchemaUtils } = require('./file-schema-utils');

    const fileSchemaFields =
      FileSchemaUtils.generateFileSchemaFields(fileFields);
    const imageFileSchemaFields =
      FileSchemaUtils.generateFileSchemaFields(fileFields);

    return `import { z } from 'zod';

/**
 * Directus file object schema (generated from actual Directus structure)
 */
export const DrxFileSchema = z.object({
${fileSchemaFields}
});

/**
 * Directus image file object schema (generated from actual Directus structure)
 */
export const DrxImageFileSchema = z.object({
${imageFileSchemaFields}
});

/**
 * TypeScript interfaces for Directus file objects
 */
export interface DrsFile {
${FileSchemaUtils.generateFileInterfaceFields(fileFields)}
}

export interface DrsImageFile {
${FileSchemaUtils.generateImageFileInterfaceFields(fileFields)}
}
`;
  }

  /**
   * Generate fallback file schemas when Directus structure cannot be accessed
   */
  static generateFallbackFileSchemas(): string {
    return `import { z } from 'zod';

/**
 * Directus file object schema (fallback)
 */
export const DrxFileSchema = z.object({
  id: z.string().uuid(),
  filename_disk: z.string(),
  filename_download: z.string(),
  title: z.string().optional(),
  type: z.string(),
  folder: z.string().uuid().optional(),
  uploaded_by: z.string().uuid().optional(),
  uploaded_on: z.string().datetime(),
  modified_by: z.string().uuid().optional(),
  modified_on: z.string().datetime(),
  charset: z.string().optional(),
  filesize: z.number().int(),
  description: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Directus image file object schema (fallback)
 */
export const DrxImageFileSchema = z.object({
  id: z.string().uuid(),
  filename_disk: z.string(),
  filename_download: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.string(),
  folder: z.string().uuid().optional(),
  uploaded_by: z.string().uuid().optional(),
  uploaded_on: z.string().datetime(),
  modified_by: z.string().uuid().optional(),
  modified_on: z.string().datetime(),
  charset: z.string().optional(),
  filesize: z.number().int(),
  width?: number;
  height?: number;
  duration?: number;
  embed?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
});

/**
 * TypeScript interfaces for Directus file objects (fallback)
 */
export interface DrsFile {
  id: string;
  filename_disk: string;
  filename_download: string;
  title?: string;
  type: string;
  folder?: string;
  uploaded_by?: string;
  uploaded_on: string;
  modified_by?: string;
  modified_on: string;
  charset?: string;
  filesize: number;
  description?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface DrsImageFile {
  id: string;
  filename_disk: string;
  filename_download: string;
  title?: string;
  description?: string;
  type: string;
  folder?: string;
  uploaded_by?: string;
  uploaded_on: string;
  modified_by?: string;
  modified_on: string;
  charset?: string;
  filesize: number;
  width?: number;
  height?: number;
  duration?: number;
  embed?: string;
  location?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
`;
  }
}
