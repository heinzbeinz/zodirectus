/**
 * Utilities for collection filtering and processing
 */
export class CollectionUtils {
  /**
   * Filter collections based on configuration
   */
  static filterCollections(collections: any[], config: any): any[] {
    // Filter collections if specific ones are requested
    let targetCollections = config.collections
      ? collections.filter(c => config.collections!.includes(c.collection))
      : collections;

    // Filter out system collections if not requested
    if (!config.includeSystemCollections) {
      targetCollections = targetCollections.filter(
        c => !c.collection.startsWith('directus_')
      );
    }

    // Filter out known folder names
    const foldersToFilter = [
      'Dialogues',
      'Expert_System',
      'Models',
      'settings',
    ];
    const actualCollections = targetCollections.filter(c => {
      if (foldersToFilter.includes(c.collection)) {
        console.log(`Filtering out folder: ${c.collection}`);
        return false;
      }
      return true;
    });

    return actualCollections;
  }

  /**
   * Get fields to omit for create operations
   */
  static getFieldsToOmitForCreate(
    fields: any[],
    hasIdField: boolean
  ): string[] {
    const fieldsToOmit: string[] = [];

    // Always omit ID field for create operations
    if (hasIdField) {
      fieldsToOmit.push('id');
    }

    // Check for system fields that should be omitted
    const systemFields = [
      'user_created',
      'date_created',
      'user_updated',
      'date_updated',
    ];

    systemFields.forEach(systemField => {
      if (fields.some(field => field.field === systemField)) {
        fieldsToOmit.push(systemField);
      }
    });

    return fieldsToOmit;
  }
}
