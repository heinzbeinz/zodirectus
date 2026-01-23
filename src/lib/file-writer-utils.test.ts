import { FileWriterUtils } from './file-writer-utils';
import { GeneratedSchema } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FileWriterUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFileContent', () => {
    const createMockSchema = (
      collectionName: string,
      schema?: string,
      type?: string
    ): GeneratedSchema => ({
      collectionName,
      schema,
      type,
    });

    it('should generate file content with schema only', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ name: z.string() });'
      );
      const results = [result];
      const circularDeps: string[][] = [];

      const content = FileWriterUtils.generateFileContent(
        result,
        results,
        circularDeps,
        false
      );

      expect(content).toContain("import { z } from 'zod'");
      expect(content).toContain(
        'export const DrxUserSchema = z.object({ name: z.string() });'
      );
    });

    it('should generate file content with type only', () => {
      const result = createMockSchema(
        'users',
        undefined,
        'export interface DrsUser { name: string; }'
      );
      const results = [result];
      const circularDeps: string[][] = [];

      const content = FileWriterUtils.generateFileContent(
        result,
        results,
        circularDeps,
        false
      );

      expect(content).toContain('export interface DrsUser { name: string; }');
    });

    it('should generate file content with both schema and type', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ name: z.string() });',
        'export interface DrsUser { name: string; }'
      );
      const results = [result];
      const circularDeps: string[][] = [];

      const content = FileWriterUtils.generateFileContent(
        result,
        results,
        circularDeps,
        false
      );

      expect(content).toContain("import { z } from 'zod'");
      expect(content).toContain(
        'export const DrxUserSchema = z.object({ name: z.string() });'
      );
      expect(content).toContain('export interface DrsUser { name: string; }');
    });

    it('should add file schema imports when needed', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ avatar: DrxFileSchema.nullable().optional() });'
      );
      const results = [result];
      const circularDeps: string[][] = [];

      const content = FileWriterUtils.generateFileContent(
        result,
        results,
        circularDeps,
        false
      );

      expect(content).toContain(
        "import { DrxFileSchema, DrxImageFileSchema, type DrsFile, type DrsImageFile } from './file-schemas'"
      );
    });

    it('should add file schema imports with parent path for system collections', () => {
      const result = createMockSchema(
        'directus_users',
        'export const DrxDirectusUserSchema = z.object({ avatar: DrxFileSchema.nullable().optional() });'
      );
      const results = [result];
      const circularDeps: string[][] = [];

      const content = FileWriterUtils.generateFileContent(
        result,
        results,
        circularDeps,
        true
      );

      expect(content).toContain(
        "import { DrxFileSchema, DrxImageFileSchema, type DrsFile, type DrsImageFile } from '../file-schemas'"
      );
    });
  });

  describe('generateDynamicFileSchemas', () => {
    it('should generate dynamic file schemas with FileSchemaUtils', () => {
      const fileFields = [
        {
          field: 'id',
          type: 'uuid',
          schema: {
            name: 'id',
            table: 'directus_files',
            data_type: 'uuid',
            is_nullable: false,
            is_unique: false,
            is_primary_key: true,
            has_auto_increment: false,
          },
        },
        {
          field: 'filename_disk',
          type: 'varchar',
          schema: {
            name: 'filename_disk',
            table: 'directus_files',
            data_type: 'varchar',
            is_nullable: false,
            is_unique: false,
            is_primary_key: false,
            has_auto_increment: false,
          },
        },
      ];

      const result = FileWriterUtils.generateDynamicFileSchemas(fileFields);

      expect(result).toContain("import { z } from 'zod'");
      expect(result).toContain('export const DrxFileSchema = z.object({');
      expect(result).toContain('export const DrxImageFileSchema = z.object({');
      expect(result).toContain('export interface DrsFile {');
      expect(result).toContain('export interface DrsImageFile {');
    });
  });

  describe('generateFallbackFileSchemas', () => {
    it('should generate fallback file schemas', () => {
      const result = FileWriterUtils.generateFallbackFileSchemas();

      expect(result).toContain("import { z } from 'zod'");
      expect(result).toContain('export const DrxFileSchema = z.object({');
      expect(result).toContain('export const DrxImageFileSchema = z.object({');
      expect(result).toContain('export interface DrsFile {');
      expect(result).toContain('export interface DrsImageFile {');
      expect(result).toContain('id: z.string().uuid()');
      expect(result).toContain('filename_disk: z.string()');
    });
  });

  describe('writeFiles', () => {
    it('should create output directory if it does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => 'mocked' as any);

      const results: GeneratedSchema[] = [];
      const outputDir = './test-output';

      await FileWriterUtils.writeFiles(results, outputDir);

      expect(mockedFs.existsSync).toHaveBeenCalledWith(outputDir);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(outputDir, {
        recursive: true,
      });
    });

    it('should create system subdirectory', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => 'mocked' as any);

      const results: GeneratedSchema[] = [];
      const outputDir = './test-output';

      await FileWriterUtils.writeFiles(results, outputDir);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(outputDir, {
        recursive: true,
      });
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        path.join(outputDir, 'system'),
        { recursive: true }
      );
    });

    it('should write system collections to system folder', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.writeFileSync.mockImplementation(() => {});

      const results: GeneratedSchema[] = [
        {
          collectionName: 'directus_users',
          schema: 'export const DrxDirectusUserSchema = z.object({});',
        },
        {
          collectionName: 'users',
          schema: 'export const DrxUserSchema = z.object({});',
        },
      ];
      const outputDir = './test-output';

      await FileWriterUtils.writeFiles(results, outputDir);

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'system', 'directus-users.ts'),
        expect.any(String)
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(outputDir, 'users.ts'),
        expect.any(String)
      );
    });
  });

  describe('writeFileSchemas', () => {
    const mockClient = {
      getCollectionWithFields: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockedFs.writeFileSync.mockImplementation(() => {});
    });

    it('should write dynamic file schemas when client succeeds', async () => {
      const fileFields = [
        {
          field: 'id',
          type: 'uuid',
          schema: { data_type: 'uuid' },
        },
      ];
      mockClient.getCollectionWithFields.mockResolvedValue({
        fields: fileFields,
      });

      await FileWriterUtils.writeFileSchemas('./test-output', mockClient);

      expect(mockClient.getCollectionWithFields).toHaveBeenCalledWith(
        'directus_files'
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join('./test-output', 'file-schemas.ts'),
        expect.any(String)
      );
    });

    it('should write fallback file schemas when client fails', async () => {
      mockClient.getCollectionWithFields.mockRejectedValue(
        new Error('Access denied')
      );

      await FileWriterUtils.writeFileSchemas('./test-output', mockClient);

      expect(mockClient.getCollectionWithFields).toHaveBeenCalledWith(
        'directus_files'
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join('./test-output', 'file-schemas.ts'),
        expect.any(String)
      );
    });
  });
});
