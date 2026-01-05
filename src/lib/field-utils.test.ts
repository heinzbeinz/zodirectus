import { FieldUtils } from './field-utils';
import { DirectusField } from '../types';

describe('FieldUtils', () => {
  const mockField = (field: string, type: string, special?: string[], interfaceName?: string, options?: any): DirectusField => ({
    field,
    type,
    schema: {
      name: field,
      table: 'test_table',
      data_type: type,
      is_nullable: false,
      is_unique: false,
      is_primary_key: false,
      has_auto_increment: false,
    },
    meta: {
      id: 1,
      collection: 'test_table',
      field,
      required: true,
      readonly: false,
      hidden: false,
      interface: interfaceName,
      options,
      special,
    },
  });

  describe('isFileField', () => {
    it('should identify file fields correctly', () => {
      expect(FieldUtils.isFileField(mockField('avatar', 'uuid', ['file']))).toBe(true);
      expect(FieldUtils.isFileField(mockField('image', 'uuid', [], 'file-image'))).toBe(true);
      expect(FieldUtils.isFileField(mockField('gallery', 'json', ['files']))).toBe(true);
      expect(FieldUtils.isFileField(mockField('name', 'varchar'))).toBe(false);
    });
  });

  describe('isDividerField', () => {
    it('should identify divider fields correctly', () => {
      expect(FieldUtils.isDividerField(mockField('divider', 'alias', [], 'divider'))).toBe(true);
      expect(FieldUtils.isDividerField(mockField('separator', 'alias', [], 'divider'))).toBe(true);
      expect(FieldUtils.isDividerField(mockField('name', 'varchar'))).toBe(false);
    });
  });

  describe('isNoticeField', () => {
    it('should identify notice fields correctly', () => {
      expect(FieldUtils.isNoticeField(mockField('notice', 'alias', [], 'notice'))).toBe(true);
      expect(FieldUtils.isNoticeField(mockField('separator', 'alias', [], 'notice'))).toBe(true);
      expect(FieldUtils.isNoticeField(mockField('name', 'varchar'))).toBe(false);
    });
  });
  
  describe('isRelationField', () => {
    it('should identify relation fields correctly', () => {
      expect(FieldUtils.isRelationField(mockField('user_id', 'uuid', ['m2o']))).toBe(true);
      expect(FieldUtils.isRelationField(mockField('roles', 'json', ['m2m']))).toBe(true);
      expect(FieldUtils.isRelationField(mockField('posts', 'json', ['o2m']))).toBe(true);
      expect(FieldUtils.isRelationField(mockField('name', 'varchar'))).toBe(false);
    });
  });

  describe('isManyToManyJunctionField', () => {
    it('should identify M2M junction fields correctly', () => {
      expect(FieldUtils.isManyToManyJunctionField(mockField('user_id', 'uuid', ['m2m']))).toBe(true);
      expect(FieldUtils.isManyToManyJunctionField(mockField('role_id', 'uuid', ['m2m']))).toBe(true);
      expect(FieldUtils.isManyToManyJunctionField(mockField('name', 'varchar'))).toBe(false);
    });
  });

  describe('isJunctionTable', () => {
    it('should identify junction tables correctly', () => {
      const junctionCollection = {
        collection: 'user_roles',
        fields: [
          {
            field: 'id',
            type: 'uuid',
            schema: {
              name: 'id',
              table: 'user_roles',
              data_type: 'uuid',
              is_nullable: false,
              is_unique: true,
              is_primary_key: true,
              has_auto_increment: false,
            },
            meta: {
              id: 1,
              collection: 'user_roles',
              field: 'id',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'user_id',
            type: 'uuid',
            schema: {
              name: 'user_id',
              table: 'user_roles',
              data_type: 'uuid',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
              foreign_key_table: 'users',
            },
            meta: {
              id: 2,
              collection: 'user_roles',
              field: 'user_id',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
          {
            field: 'role_id',
            type: 'uuid',
            schema: {
              name: 'role_id',
              table: 'user_roles',
              data_type: 'uuid',
              is_nullable: false,
              is_unique: false,
              is_primary_key: false,
              has_auto_increment: false,
              foreign_key_table: 'roles',
            },
            meta: {
              id: 3,
              collection: 'user_roles',
              field: 'role_id',
              required: true,
              readonly: false,
              hidden: false,
            },
          },
        ],
      };
      expect(FieldUtils.isJunctionTable(junctionCollection)).toBe(true);
      
      const regularCollection = {
        collection: 'users',
        fields: [
          mockField('id', 'uuid', [], 'input'),
          mockField('name', 'varchar', [], 'input'),
        ],
      };
      expect(FieldUtils.isJunctionTable(regularCollection)).toBe(false);
    });
  });

  describe('getFieldsToOmitForCreate', () => {
    it('should return correct fields to omit for create operations', () => {
      const fields = [
        mockField('id', 'uuid', [], 'input'),
        mockField('name', 'varchar', [], 'input'),
        mockField('user_created', 'uuid', ['user-created'], 'input'),
        mockField('date_created', 'datetime', ['date-created'], 'datetime'),
      ];
      
      const fieldsToOmit = FieldUtils.getFieldsToOmitForCreate(fields, true);
      
      expect(fieldsToOmit).toContain('id');
      expect(fieldsToOmit).toContain('user_created');
      expect(fieldsToOmit).toContain('date_created');
      expect(fieldsToOmit).not.toContain('name');
    });

    it('should handle collections without system fields', () => {
      const fields = [
        mockField('id', 'uuid', [], 'input'),
        mockField('name', 'varchar', [], 'input'),
      ];
      
      const fieldsToOmit = FieldUtils.getFieldsToOmitForCreate(fields, true);
      
      expect(fieldsToOmit).toContain('id');
      expect(fieldsToOmit).not.toContain('name');
    });

    it('should handle collections without id field', () => {
      const fields = [
        mockField('name', 'varchar', [], 'input'),
        mockField('user_created', 'uuid', ['user-created'], 'input'),
      ];
      
      const fieldsToOmit = FieldUtils.getFieldsToOmitForCreate(fields, false);
      
      expect(fieldsToOmit).toContain('user_created');
      expect(fieldsToOmit).not.toContain('name');
    });
  });
});
