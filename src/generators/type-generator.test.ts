import { TypeGenerator } from './type-generator';
import { DirectusCollectionWithFields, ZodirectusConfig } from '../types';

describe('TypeGenerator', () => {
  let generator: TypeGenerator;
  let config: ZodirectusConfig;

  beforeEach(() => {
    config = {
      directusUrl: 'https://test.example.com',
      token: 'test-token',
    };
    generator = new TypeGenerator(config);
  });

  describe('generateType', () => {
    it('should generate a valid TypeScript interface for a collection', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'users',
        fields: [
          {
            field: 'id',
            type: 'uuid',
            schema: {
              name: 'id',
              table: 'users',
              data_type: 'uuid',
              is_nullable: false,
              is_unique: true,
              is_primary_key: true,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'users',
              field: 'id',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'email',
            type: 'varchar',
            schema: {
              name: 'email',
              table: 'users',
              data_type: 'varchar',
              max_length: 255,
              is_nullable: false,
              is_unique: true,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'users',
              field: 'email',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'first_name',
            type: 'varchar',
            schema: {
              name: 'first_name',
              table: 'users',
              data_type: 'varchar',
              max_length: 100,
              is_nullable: true,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 3,
              collection: 'users',
              field: 'first_name',
              required: false,
              readonly: false,
              hidden: false,
            },
          },
        ],
      };

      const result = generator.generateType(collection);

      expect(result).toContain('export interface DrsUser {');
      expect(result).toContain('id: string');
      expect(result).toContain('email: string');
      expect(result).toContain('first_name?: string');
    });

    it('should handle different field types correctly', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'test_types',
        fields: [
          {
            field: 'integer_field',
            type: 'integer',
            schema: {
              name: 'integer_field',
              table: 'test_types',
              data_type: 'integer',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'test_types',
              field: 'integer_field',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'boolean_field',
            type: 'boolean',
            schema: {
              name: 'boolean_field',
              table: 'test_types',
              data_type: 'boolean',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'test_types',
              field: 'boolean_field',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'json_field',
            type: 'json',
            schema: {
              name: 'json_field',
              table: 'test_types',
              data_type: 'json',
              is_nullable: true,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 3,
              collection: 'test_types',
              field: 'json_field',
              required: false,
              readonly: false,
              hidden: false,
            },
          },
        ],
      };

      const result = generator.generateType(collection);

      expect(result).toContain('integer_field: number');
      expect(result).toContain('boolean_field: boolean');
      expect(result).toContain('json_field?: any');
    });

    it('should exclude hidden fields', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'test_hidden',
        fields: [
          {
            field: 'visible_field',
            type: 'varchar',
            schema: {
              name: 'visible_field',
              table: 'test_hidden',
              data_type: 'varchar',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'test_hidden',
              field: 'visible_field',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'hidden_field',
            type: 'varchar',
            schema: {
              name: 'hidden_field',
              table: 'test_hidden',
              data_type: 'varchar',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'test_hidden',
              field: 'hidden_field',
              required: true,
              readonly: false,
              hidden: true,
            },
          },
        ],
      };

      const result = generator.generateType(collection);

      expect(result).toContain('visible_field: string');
      expect(result).toContain('hidden_field: string');
    });

    it('should generate Create, Update, and Get types', () => {
      const collection: DirectusCollectionWithFields = {
        collection: 'users',
        fields: [
          {
            field: 'id',
            type: 'uuid',
            schema: {
              name: 'id',
              table: 'users',
              data_type: 'uuid',
              is_nullable: false,
              is_unique: true,
              is_primary_key: true,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'users',
              field: 'id',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'name',
            type: 'varchar',
            schema: {
              name: 'name',
              table: 'users',
              data_type: 'varchar',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
            },
            meta: {
              id: 2,
              collection: 'users',
              field: 'name',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
        ],
      };

      const result = generator.generateType(collection);

      expect(result).toContain('export interface DrsUser {');
      expect(result).toContain(
        'export type DrsUserCreate = Omit<DrsUser, "id">'
      );
      expect(result).toContain(
        'export type DrsUserUpdate = Partial<DrsUser> & Required<Pick<DrsUser, "id">>'
      );
      expect(result).toContain('export type DrsUserGet = DrsUser');
    });
  });
});
