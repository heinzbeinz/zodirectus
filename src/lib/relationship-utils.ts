import { DirectusField } from '../types';

/**
 * Utilities for handling Directus relationships
 */
export class RelationshipUtils {
  private relationships: any[] = [];

  constructor(relationships: any[] = []) {
    this.relationships = relationships;
  }

  /**
   * Set relationships data
   */
  setRelationships(relationships: any[]): void {
    this.relationships = relationships;
  }

  /**
   * Get related collection name for a field
   */
  getRelatedCollectionName(field: DirectusField): string | null {
    const special = field.meta?.special || [];
    const options = field.meta?.options || {};

    // For M2O relations, get the foreign key table
    if (special.includes('m2o') && field.schema?.foreign_key_table) {
      return field.schema.foreign_key_table;
    }

    // For M2M relations, check junction table and related collection
    if (special.includes('m2m') || this.isManyToManyJunctionField(field)) {
      // Check for explicit junction table configuration
      if (options.junction_table) {
        return options.junction_table;
      }

      // Check for related collection in options
      if (options.related_collection) {
        return options.related_collection;
      }

      // Try to infer from field name for M2M relationships
      const fieldName = field.field;

      // For M2M fields, find the related collection from actual Directus relationships
      if (special.includes('m2m')) {
        // First check options for explicit configuration
        if (options.related_collection) {
          return options.related_collection;
        }

        if (options.junction_collection) {
          return options.junction_collection;
        }

        if (options.collection) {
          return options.collection;
        }

        if (options.many_collection) {
          return options.many_collection;
        }

        if (options.one_collection) {
          return options.one_collection;
        }

        // If we have junction table info, try to infer from it
        if (options.junction_table) {
          const junctionTable = options.junction_table;
          if (junctionTable.includes('_')) {
            const parts = junctionTable.split('_');
            const relatedPart = parts[parts.length - 1];
            return relatedPart + 's';
          }
          return junctionTable;
        }

        // Now try to find the relationship from the fetched relationships data
        if (this.relationships.length > 0) {
          const collectionName = field.meta?.collection;

          // Look for relationships where this collection is the "one" side of a many-to-many
          const m2mRelation = this.relationships.find(
            (rel: any) =>
              rel.one_collection === collectionName &&
              rel.one_field === fieldName &&
              rel.many_collection !== collectionName
          );

          if (m2mRelation) {
            return m2mRelation.many_collection;
          }

          // Look for relationships where this collection is the "many" side
          const reverseM2mRelation = this.relationships.find(
            (rel: any) =>
              rel.many_collection === collectionName &&
              rel.many_field === fieldName &&
              rel.one_collection !== collectionName
          );

          if (reverseM2mRelation) {
            return reverseM2mRelation.one_collection;
          }

          // Look for junction table relationships
          const junctionRelation = this.relationships.find(
            (rel: any) =>
              rel.junction_collection === collectionName &&
              (rel.one_collection !== collectionName ||
                rel.many_collection !== collectionName)
          );

          if (junctionRelation) {
            // Return the other collection (not the current one)
            return junctionRelation.one_collection === collectionName
              ? junctionRelation.many_collection
              : junctionRelation.one_collection;
          }
        }

        // No relationship found, return null
        return null;
      }

      // Try to infer from junction field name (for junction table fields)
      if (fieldName.includes('_')) {
        const parts = fieldName.split('_');
        if (parts.length >= 2) {
          // Assume the last part is the related collection name
          return parts[parts.length - 1] + 's';
        }
      }
    }

    // For O2M relations, we need to infer from the field name or options
    if (special.includes('o2m')) {
      // Check for explicit related collection
      if (options.related_collection) {
        return options.related_collection;
      }

      // For O2M, the field name usually indicates the related collection
      // e.g., 'activity_logs' field in 'audit_sessions' relates to 'audit_activity_logs'
      const fieldName = field.field;
      if (fieldName === 'activity_logs') {
        return 'audit_activity_logs';
      }
      // Add more patterns as needed
    }

    // No relationship found, return null
    return null;
  }

  /**
   * Check if a field is a many-to-many junction field
   */
  private isManyToManyJunctionField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';

    return (
      special.includes('m2m') ||
      interface_.includes('m2m') ||
      interface_.includes('many-to-many')
    );
  }
}
