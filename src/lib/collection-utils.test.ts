import { CollectionUtils } from './collection-utils';

describe('CollectionUtils', () => {
  const createMockCollection = (collection: string) => ({
    collection,
    schema: 'public',
    meta: {
      collection,
      icon: null,
      note: null,
      display_template: null,
      hidden: false,
      singleton: false,
      translations: null,
      archive_field: null,
      archive_app_filter: true,
      archive_value: null,
      unarchive_value: null,
      sort_field: null,
      accountability: 'all',
      color: null,
      item_duplication_fields: null,
      sort: null,
      group: null,
      collapse: 'open',
    },
  });

  describe('filterCollections', () => {
    it('should filter collections based on specific collections config', () => {
      const collections = [
        createMockCollection('users'),
        createMockCollection('posts'),
        createMockCollection('comments'),
      ];
      const config = { collections: ['users', 'comments'] };

      const filtered = CollectionUtils.filterCollections(collections, config);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.collection)).toEqual(['users', 'comments']);
    });

    it('should return all collections when no specific collections config', () => {
      const collections = [
        createMockCollection('users'),
        createMockCollection('posts'),
        createMockCollection('comments'),
      ];
      const config = {};

      const filtered = CollectionUtils.filterCollections(collections, config);

      expect(filtered).toHaveLength(3);
    });

    it('should filter out system collections when includeSystemCollections is false', () => {
      const collections = [
        createMockCollection('users'),
        createMockCollection('posts'),
        createMockCollection('directus_users'),
        createMockCollection('directus_roles'),
      ];
      const config = { includeSystemCollections: false };

      const filtered = CollectionUtils.filterCollections(collections, config);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.collection)).toEqual(['users', 'posts']);
    });

    it('should include system collections when includeSystemCollections is true', () => {
      const collections = [
        createMockCollection('users'),
        createMockCollection('posts'),
        createMockCollection('directus_users'),
        createMockCollection('directus_roles'),
      ];
      const config = { includeSystemCollections: true };

      const filtered = CollectionUtils.filterCollections(collections, config);

      expect(filtered).toHaveLength(4);
    });

    it('should filter out known folder names', () => {
      const collections = [
        createMockCollection('users'),
        createMockCollection('posts'),
        createMockCollection('Dialogues'),
        createMockCollection('Expert_System'),
        createMockCollection('Models'),
        createMockCollection('settings'),
      ];
      const config = { includeSystemCollections: true };

      const filtered = CollectionUtils.filterCollections(collections, config);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.collection)).toEqual(['users', 'posts']);
    });

    it('should handle combined filtering', () => {
      const collections = [
        createMockCollection('users'),
        createMockCollection('posts'),
        createMockCollection('comments'),
        createMockCollection('directus_users'),
        createMockCollection('directus_roles'),
        createMockCollection('Dialogues'),
      ];
      const config = {
        collections: ['users', 'posts', 'directus_users'],
        includeSystemCollections: false,
      };

      const filtered = CollectionUtils.filterCollections(collections, config);

      expect(filtered).toHaveLength(2);
      expect(filtered.map(c => c.collection)).toEqual(['users', 'posts']);
    });
  });

  describe('getFieldsToOmitForCreate', () => {
    const createMockField = (field: string) => ({
      field,
      type: 'varchar',
      schema: {
        name: field,
        table: 'test_table',
        data_type: 'varchar',
        is_nullable: false,
        is_unique: false,
        is_primary_key: field === 'id',
        has_auto_increment: false,
      },
      meta: {
        id: 1,
        collection: 'test_table',
        field,
        required: true,
        readonly: false,
        hidden: false,
      },
    });

    it('should return correct fields to omit for create operations', () => {
      const fields = [
        createMockField('id'),
        createMockField('name'),
        createMockField('user_created'),
        createMockField('date_created'),
        createMockField('user_updated'),
        createMockField('date_updated'),
      ];

      const fieldsToOmit = CollectionUtils.getFieldsToOmitForCreate(
        fields,
        true
      );

      expect(fieldsToOmit).toContain('id');
      expect(fieldsToOmit).toContain('user_created');
      expect(fieldsToOmit).toContain('date_created');
      expect(fieldsToOmit).toContain('user_updated');
      expect(fieldsToOmit).toContain('date_updated');
      expect(fieldsToOmit).not.toContain('name');
    });

    it('should handle collections without id field', () => {
      const fields = [
        createMockField('name'),
        createMockField('user_created'),
        createMockField('date_created'),
      ];

      const fieldsToOmit = CollectionUtils.getFieldsToOmitForCreate(
        fields,
        false
      );

      expect(fieldsToOmit).not.toContain('id');
      expect(fieldsToOmit).toContain('user_created');
      expect(fieldsToOmit).toContain('date_created');
      expect(fieldsToOmit).not.toContain('name');
    });

    it('should handle collections without system fields', () => {
      const fields = [
        createMockField('id'),
        createMockField('name'),
        createMockField('description'),
      ];

      const fieldsToOmit = CollectionUtils.getFieldsToOmitForCreate(
        fields,
        true
      );

      expect(fieldsToOmit).toContain('id');
      expect(fieldsToOmit).not.toContain('user_created');
      expect(fieldsToOmit).not.toContain('date_created');
      expect(fieldsToOmit).not.toContain('name');
      expect(fieldsToOmit).not.toContain('description');
    });

    it('should handle empty fields array', () => {
      const fields: any[] = [];
      const fieldsToOmit = CollectionUtils.getFieldsToOmitForCreate(
        fields,
        true
      );
      expect(fieldsToOmit).toEqual(['id']);
    });
  });
});
