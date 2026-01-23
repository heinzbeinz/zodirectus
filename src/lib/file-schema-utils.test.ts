import { FileSchemaUtils } from './file-schema-utils';

describe('FileSchemaUtils', () => {
  const createMockFileField = (
    field: string,
    dataType: string,
    isNullable: boolean = false,
    isPrimaryKey: boolean = false,
    required: boolean = true
  ) => ({
    field,
    type: dataType,
    schema: {
      name: field,
      table: 'directus_files',
      data_type: dataType,
      is_nullable: isNullable,
      is_unique: false,
      is_primary_key: isPrimaryKey,
      has_auto_increment: false,
    },
    meta: {
      id: 1,
      collection: 'directus_files',
      field,
      required,
      readonly: false,
      hidden: false,
    },
  });

  describe('generateFileSchemaFields', () => {
    it('should generate correct Zod schema fields for file objects', () => {
      const fileFields = [
        createMockFileField('id', 'uuid', false, true),
        createMockFileField('filename_disk', 'varchar', false, false, false),
        createMockFileField(
          'filename_download',
          'varchar',
          false,
          false,
          false
        ),
        createMockFileField('title', 'varchar', true, false, false),
        createMockFileField('type', 'varchar', false, false, false),
        createMockFileField('filesize', 'int', false, false, false),
        createMockFileField('width', 'int', true, false, false),
        createMockFileField('height', 'int', true, false, false),
      ];

      const result = FileSchemaUtils.generateFileSchemaFields(fileFields);

      expect(result).toContain('id: z.string().uuid()');
      expect(result).toContain('filename_disk: z.string().optional()');
      expect(result).toContain('filename_download: z.string().optional()');
      expect(result).toContain('title: z.string().nullable()');
      expect(result).toContain('type: z.string().optional()');
      expect(result).toContain('filesize: z.number().int().optional()');
      expect(result).toContain('width: z.number().int().nullable()');
      expect(result).toContain('height: z.number().int().nullable()');
    });

    it('should handle different data types correctly', () => {
      const fileFields = [
        createMockFileField('id', 'uuid', false, true),
        createMockFileField('created_on', 'timestamp', false, false, false),
        createMockFileField('modified_on', 'datetime', false, false, false),
        createMockFileField('upload_date', 'date', false, false, false),
        createMockFileField('duration', 'time', false, false, false),
        createMockFileField('metadata', 'json', true, false, false),
        createMockFileField('tags', 'jsonb', true, false, false),
        createMockFileField('is_public', 'boolean', false, false, false),
        createMockFileField('file_size', 'bigint', false, false, false),
        createMockFileField('file_ratio', 'decimal', true, false, false),
      ];

      const result = FileSchemaUtils.generateFileSchemaFields(fileFields);

      expect(result).toContain('id: z.string().uuid()');
      expect(result).toContain('created_on: z.string().datetime().optional()');
      expect(result).toContain('modified_on: z.string().datetime().optional()');
      expect(result).toContain('upload_date: z.string().date().optional()');
      expect(result).toContain('duration: z.string().time().optional()');
      expect(result).toContain('metadata: z.any().nullable()');
      expect(result).toContain('tags: z.any().nullable()');
      expect(result).toContain('is_public: z.boolean().optional()');
      expect(result).toContain('file_size: z.number().int().optional()');
      expect(result).toContain('file_ratio: z.number().nullable()');
    });

    it('should handle nullable fields correctly', () => {
      const fileFields = [
        createMockFileField('id', 'uuid', false, true),
        createMockFileField('description', 'text', true, false, false),
        createMockFileField('folder', 'uuid', true, false, false),
      ];

      const result = FileSchemaUtils.generateFileSchemaFields(fileFields);

      expect(result).toContain('id: z.string().uuid()');
      expect(result).toContain('description: z.string().nullable()');
      expect(result).toContain('folder: z.string().uuid().nullable()');
    });

    it('should handle empty fields array', () => {
      const fileFields: any[] = [];
      const result = FileSchemaUtils.generateFileSchemaFields(fileFields);
      expect(result).toBe('');
    });
  });

  describe('generateFileInterfaceFields', () => {
    it('should generate correct TypeScript interface fields for file objects', () => {
      const fileFields = [
        createMockFileField('id', 'uuid', false, true),
        createMockFileField('filename_disk', 'varchar', false, false, false),
        createMockFileField('title', 'varchar', false, false, false),
        createMockFileField('filesize', 'int', false, false, false),
        createMockFileField('width', 'int', false, false, true),
        createMockFileField('metadata', 'json', false, false, true),
        createMockFileField('is_public', 'boolean', false, false, false),
      ];

      const result = FileSchemaUtils.generateFileInterfaceFields(fileFields);

      expect(result).toContain('id: string');
      expect(result).toContain('filename_disk?: string');
      expect(result).toContain('title?: string');
      expect(result).toContain('filesize?: number');
      expect(result).toContain('width?: number');
      expect(result).toContain('metadata?: any');
      expect(result).toContain('is_public?: boolean');
    });

    it('should handle different data types correctly', () => {
      const fileFields = [
        createMockFileField('created_on', 'timestamp', false, false, false),
        createMockFileField('upload_date', 'date', false, false, false),
        createMockFileField('duration', 'time', false, false, false),
        createMockFileField('file_size', 'bigint', false, false, false),
        createMockFileField('file_ratio', 'decimal', false, false, false),
      ];

      const result = FileSchemaUtils.generateFileInterfaceFields(fileFields);

      expect(result).toContain('created_on?: string');
      expect(result).toContain('upload_date?: string');
      expect(result).toContain('duration?: string');
      expect(result).toContain('file_size?: number');
      expect(result).toContain('file_ratio?: number');
    });

    it('should handle empty fields array', () => {
      const fileFields: any[] = [];
      const result = FileSchemaUtils.generateFileInterfaceFields(fileFields);
      expect(result).toBe('');
    });
  });

  describe('generateImageFileInterfaceFields', () => {
    it('should generate same interface fields as regular files', () => {
      const fileFields = [
        createMockFileField('id', 'uuid', false, true),
        createMockFileField('filename_disk', 'varchar'),
        createMockFileField('width', 'int', true),
        createMockFileField('height', 'int', true),
      ];

      const regularResult =
        FileSchemaUtils.generateFileInterfaceFields(fileFields);
      const imageResult =
        FileSchemaUtils.generateImageFileInterfaceFields(fileFields);

      expect(imageResult).toBe(regularResult);
    });
  });
});
