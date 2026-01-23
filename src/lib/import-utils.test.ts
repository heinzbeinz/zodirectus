import { ImportUtils } from './import-utils';
import { GeneratedSchema } from '../types';

describe('ImportUtils', () => {
  const createMockSchema = (
    collectionName: string,
    schema?: string,
    type?: string
  ): GeneratedSchema => ({
    collectionName,
    schema,
    type,
  });

  describe('extractRelatedCollections', () => {
    it('should extract related collections from schema', () => {
      const result = createMockSchema(
        'posts',
        'export const DrxPostSchema = z.object({ author: DrxUserSchema.nullable().optional(), comments: z.array(DrxCommentSchema).optional() });'
      );

      const relatedCollections = ImportUtils.extractRelatedCollections(result);

      expect(relatedCollections).toContain('User');
      expect(relatedCollections).toContain('Comment');
    });

    it('should extract related collections from type', () => {
      const result = createMockSchema(
        'posts',
        undefined,
        'export interface DrsPost { author: DrsUser; comments: DrsComment[]; }'
      );

      const relatedCollections = ImportUtils.extractRelatedCollections(result);

      expect(relatedCollections).toContain('User');
      expect(relatedCollections).toContain('Comment');
    });

    it('should not extract self-references', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ posts: DrxPostSchema.nullable().optional(), parent: DrxUserSchema.nullable().optional() });'
      );

      const relatedCollections = ImportUtils.extractRelatedCollections(result);

      expect(relatedCollections).toContain('Post');
      expect(relatedCollections).not.toContain('User');
    });

    it('should not extract file schema references', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ avatar: DrxFileSchema.nullable().optional(), image: DrxImageFileSchema.nullable().optional() });'
      );

      const relatedCollections = ImportUtils.extractRelatedCollections(result);

      expect(relatedCollections).not.toContain('File');
      expect(relatedCollections).not.toContain('ImageFile');
    });

    it('should handle schemas with no related collections', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ name: z.string(), email: z.string() });'
      );

      const relatedCollections = ImportUtils.extractRelatedCollections(result);

      expect(relatedCollections.size).toBe(0);
    });
  });

  describe('generateImportStatements', () => {
    const mockResults: GeneratedSchema[] = [
      createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ name: z.string() });'
      ),
      createMockSchema(
        'posts',
        'export const DrxPostSchema = z.object({ author: DrxUserSchema.nullable().optional() });'
      ),
      createMockSchema(
        'directus_users',
        'export const DrxDirectusUserSchema = z.object({ email: z.string() });'
      ),
      createMockSchema(
        'directus_roles',
        'export const DrxDirectusRoleSchema = z.object({ name: z.string() });'
      ),
    ];

    it('should generate import statements for regular collections', () => {
      const result = createMockSchema(
        'comments',
        'export const DrxCommentSchema = z.object({ post: DrxPostSchema.nullable().optional() });'
      );

      const importStatements = ImportUtils.generateImportStatements(
        result,
        mockResults,
        [],
        false
      );

      expect(importStatements).toContain(
        "import { DrxPostSchema, type DrsPost } from './posts'"
      );
    });

    it('should generate import statements for system collections', () => {
      const result = createMockSchema(
        'directus_policies',
        'export const DrxDirectusPolicySchema = z.object({ role: DrxDirectusRoleSchema.nullable().optional() });'
      );

      const importStatements = ImportUtils.generateImportStatements(
        result,
        mockResults,
        [],
        true
      );

      expect(importStatements).toContain(
        "import { DrxDirectusRoleSchema, type DrsDirectusRole } from './directus-roles'"
      );
    });

    it('should generate cross-folder import statements', () => {
      const result = createMockSchema(
        'posts',
        'export const DrxPostSchema = z.object({ author: DrxDirectusUserSchema.nullable().optional() });'
      );

      const importStatements = ImportUtils.generateImportStatements(
        result,
        mockResults,
        [],
        false
      );

      expect(importStatements).toContain(
        "import { DrxDirectusUserSchema, type DrsDirectusUser } from './system/directus-users'"
      );
    });

    it('should generate parent folder import statements', () => {
      const result = createMockSchema(
        'directus_users',
        'export const DrxDirectusUserSchema = z.object({ posts: DrxPostSchema.nullable().optional() });'
      );

      const importStatements = ImportUtils.generateImportStatements(
        result,
        mockResults,
        [],
        true
      );

      expect(importStatements).toContain(
        "import { DrxPostSchema, type DrsPost } from '../posts'"
      );
    });

    it('should handle circular dependencies', () => {
      const circularDeps = [['User', 'Post', 'User']];
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ posts: DrxPostSchema.nullable().optional() });'
      );

      const importStatements = ImportUtils.generateImportStatements(
        result,
        mockResults,
        circularDeps,
        false
      );

      expect(importStatements).toContain(
        "import { DrxPostSchema, type DrsPost } from './posts'"
      );
    });

    it('should avoid duplicate imports', () => {
      const result = createMockSchema(
        'posts',
        'export const DrxPostSchema = z.object({ author: DrxUserSchema.nullable().optional(), creator: DrxUserSchema.nullable().optional() });'
      );

      const importStatements = ImportUtils.generateImportStatements(
        result,
        mockResults,
        [],
        false
      );

      const userImportCount = (importStatements.match(/DrxUserSchema/g) || [])
        .length;
      expect(userImportCount).toBe(1);
    });
  });

  describe('generateFileSchemaImport', () => {
    it('should generate file schema import when needed', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ avatar: DrxFileSchema.nullable().optional() });'
      );

      const importStatement = ImportUtils.generateFileSchemaImport(
        result,
        false
      );
      expect(importStatement).toContain(
        "import { DrxFileSchema, DrxImageFileSchema, type DrsFile, type DrsImageFile } from './file-schemas'"
      );
    });

    it('should generate file schema import for system collections', () => {
      const result = createMockSchema(
        'directus_users',
        'export const DrxDirectusUserSchema = z.object({ avatar: DrxFileSchema.nullable().optional() });'
      );

      const importStatement = ImportUtils.generateFileSchemaImport(
        result,
        true
      );
      expect(importStatement).toContain(
        "import { DrxFileSchema, DrxImageFileSchema, type DrsFile, type DrsImageFile } from '../file-schemas'"
      );
    });

    it('should not generate import when not needed', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ name: z.string() });'
      );

      const importStatement = ImportUtils.generateFileSchemaImport(
        result,
        false
      );
      expect(importStatement).toBe('');
    });
  });

  describe('generateZodImport', () => {
    it('should generate zod import when schema exists', () => {
      const result = createMockSchema(
        'users',
        'export const DrxUserSchema = z.object({ name: z.string() });'
      );
      const importStatement = ImportUtils.generateZodImport(result);
      expect(importStatement).toContain("import { z } from 'zod'");
    });

    it('should not generate zod import when no schema', () => {
      const result = createMockSchema('users', undefined);
      const importStatement = ImportUtils.generateZodImport(result);
      expect(importStatement).toBe('');
    });
  });
});
