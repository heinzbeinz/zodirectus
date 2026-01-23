import { RelationshipUtils } from './relationship-utils';
import { DirectusField } from '../types';

describe('RelationshipUtils', () => {
  let relationshipUtils: RelationshipUtils;

  const createMockField = (
    field: string,
    type: string,
    special?: string[],
    options?: any,
    foreignKeyTable?: string
  ): DirectusField => ({
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
      foreign_key_table: foreignKeyTable,
    },
    meta: {
      id: 1,
      collection: 'test_table',
      field,
      required: true,
      readonly: false,
      hidden: false,
      special,
      options,
    },
  });

  const mockRelationships = [
    {
      one_collection: 'users',
      one_field: 'roles',
      many_collection: 'roles',
      many_field: 'users',
      junction_collection: 'user_roles',
    },
    {
      one_collection: 'answers',
      one_field: 'enables',
      many_collection: 'enablers',
      many_field: 'answers',
      junction_collection: 'answer_enabler',
    },
    {
      one_collection: 'answers',
      one_field: 'disables',
      many_collection: 'enablers',
      many_field: 'answers',
      junction_collection: 'answer_enabler',
    },
    {
      one_collection: 'audit_sessions',
      one_field: 'activity_logs',
      many_collection: 'audit_activity_logs',
      many_field: 'session_id',
      junction_collection: null,
    },
  ];

  beforeEach(() => {
    relationshipUtils = new RelationshipUtils();
  });

  describe('constructor', () => {
    it('should initialize with empty relationships array by default', () => {
      const utils = new RelationshipUtils();
      // Cannot directly test private property, but we can test behavior
      expect(utils).toBeInstanceOf(RelationshipUtils);
    });

    it('should initialize with provided relationships', () => {
      const utils = new RelationshipUtils(mockRelationships);
      expect(utils).toBeInstanceOf(RelationshipUtils);
    });
  });

  describe('setRelationships', () => {
    it('should set relationships data', () => {
      relationshipUtils.setRelationships(mockRelationships);
      // Test by calling getRelatedCollectionName which uses relationships
      const field = createMockField('roles', 'json', ['m2m'], {}, undefined);
      field.meta!.collection = 'users';
      const result = relationshipUtils.getRelatedCollectionName(field);
      expect(result).toBe('roles');
    });
  });

  describe('getRelatedCollectionName', () => {
    describe('M2O relations', () => {
      it('should return foreign key table for M2O relations', () => {
        const field = createMockField('user_id', 'uuid', ['m2o'], {}, 'users');
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('users');
      });

      it('should return null for M2O without foreign key table', () => {
        const field = createMockField(
          'user_id',
          'uuid',
          ['m2o'],
          {},
          undefined
        );
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });
    });

    describe('M2M relations', () => {
      beforeEach(() => {
        relationshipUtils.setRelationships(mockRelationships);
      });

      it('should return junction table from options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          junction_table: 'user_roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('user_roles');
      });

      it('should return related collection from options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          related_collection: 'roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('roles');
      });

      it('should return junction collection from options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          junction_collection: 'user_roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('user_roles');
      });

      it('should return collection from options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          collection: 'roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('roles');
      });

      it('should return many_collection from options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          many_collection: 'roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('roles');
      });

      it('should return one_collection from options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          one_collection: 'roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('roles');
      });

      it('should find M2M relation from relationships data (one side)', () => {
        const field = createMockField('roles', 'json', ['m2m'], {});
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('roles');
      });

      it('should find M2M relation from relationships data (many side)', () => {
        const field = createMockField('users', 'json', ['m2m'], {});
        field.meta!.collection = 'roles';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('users');
      });

      it('should find junction table relationship', () => {
        const field = createMockField('answer_id', 'uuid', ['m2m'], {});
        field.meta!.collection = 'answer_enabler';
        const result = relationshipUtils.getRelatedCollectionName(field);
        // The junction collection 'answer_enabler' matches the collection name,
        // one_collection is 'answers' (different from collection name 'answer_enabler'),
        // so it should return one_collection which is 'answers'
        expect(result).toBe('answers');
      });

      it('should infer from junction table name in options', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          junction_table: 'user_roles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('user_roles');
      });

      it('should return null for M2M fields when no relationships are loaded and no options', () => {
        // Create a new instance without relationships to test M2M behavior
        const utilsWithoutRelationships = new RelationshipUtils([]);
        const field = createMockField('user_id', 'uuid', ['m2m'], {});
        field.meta!.collection = 'some_other_junction';
        const result =
          utilsWithoutRelationships.getRelatedCollectionName(field);
        // M2M fields without relationships and options should return null
        expect(result).toBeNull();
      });

      it('should return null when no relationship is found', () => {
        const field = createMockField('unknown', 'json', ['m2m'], {});
        field.meta!.collection = 'test_collection';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });
    });

    describe('O2M relations', () => {
      it('should return related collection from options', () => {
        const field = createMockField('activity_logs', 'json', ['o2m'], {
          related_collection: 'audit_activity_logs',
        });
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('audit_activity_logs');
      });

      it('should handle specific O2M pattern for activity_logs', () => {
        const field = createMockField('activity_logs', 'json', ['o2m'], {});
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('audit_activity_logs');
      });

      it('should return null for unknown O2M fields', () => {
        const field = createMockField('unknown_field', 'json', ['o2m'], {});
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });
    });

    describe('Non-relation fields', () => {
      it('should return null for regular fields', () => {
        const field = createMockField('name', 'varchar', [], {});
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });

      it('should return null for fields with no special property', () => {
        const field = createMockField('description', 'text');
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle field with empty options', () => {
        const field = createMockField('user_id', 'uuid', ['m2o'], {});
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });

      it('should handle field with undefined options', () => {
        const field = createMockField('user_id', 'uuid', ['m2o']);
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });

      it('should handle field with empty special array', () => {
        const field = createMockField('user_id', 'uuid', [], {});
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });

      it('should handle field with undefined special', () => {
        const field = createMockField('user_id', 'uuid');
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBeNull();
      });

      it('should handle junction table name without underscores', () => {
        const field = createMockField('roles', 'json', ['m2m'], {
          junction_table: 'userroles',
        });
        field.meta!.collection = 'users';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('userroles');
      });

      it('should return null for M2M fields with no relationships and no options (field name inference unreachable)', () => {
        // Create a new instance without relationships to test M2M behavior
        const utilsWithoutRelationships = new RelationshipUtils([]);
        const field = createMockField('user_id', 'uuid', ['m2m'], {}); // M2M field
        field.meta!.collection = 'junction_table';
        const result =
          utilsWithoutRelationships.getRelatedCollectionName(field);
        // The field name inference logic appears to be unreachable in current implementation
        expect(result).toBeNull();
      });
    });

    describe('Complex M2M scenarios', () => {
      beforeEach(() => {
        relationshipUtils.setRelationships(mockRelationships);
      });

      it('should handle enables field correctly', () => {
        const field = createMockField('enables', 'json', ['m2m'], {});
        field.meta!.collection = 'answers';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('enablers');
      });

      it('should handle disables field correctly', () => {
        const field = createMockField('disables', 'json', ['m2m'], {});
        field.meta!.collection = 'answers';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('enablers');
      });

      it('should handle junction table with different naming patterns', () => {
        const customRelationships = [
          {
            one_collection: 'posts',
            one_field: 'tags',
            many_collection: 'tags',
            many_field: 'posts',
            junction_collection: 'post_tags',
          },
        ];
        relationshipUtils.setRelationships(customRelationships);

        const field = createMockField('tags', 'json', ['m2m'], {});
        field.meta!.collection = 'posts';
        const result = relationshipUtils.getRelatedCollectionName(field);
        expect(result).toBe('tags');
      });
    });
  });
});
