import { DirectusField, DirectusCollectionWithFields } from '../types';

/**
 * Shared utilities for field detection and processing
 */
export class FieldUtils {
  /**
   * Check if a field is a divider field
   */
  static isDividerField(field: DirectusField): boolean {
    // Check if field name starts with 'divider-'
    if (field.field.startsWith('divider-')) {
      return true;
    }
    
    // Check if field interface is 'divider'
    if (field.meta?.interface === 'divider') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a field is a notice field
   */
  static isNoticeField(field: DirectusField): boolean {
    // Check if field name starts with 'notice-'
    if (field.field.startsWith('notice-')) {
      return true;
    }
    
    // Check if field interface is 'notice'
    if (field.meta?.interface === 'notice') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a field is a UI only field which can be skipped
   */
  static isUiOnlyField(field: DirectusField): boolean {
    return isDividerField(field) || isNoticeField(field);
  }

  /**
   * Check if a field is a file field
   */
  static isFileField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    
    return special.includes('file') || 
           special.includes('files') ||
           interface_ === 'file' || 
           interface_ === 'file-image' ||
           interface_ === 'files';
  }

  /**
   * Check if a field is a relation field
   */
  static isRelationField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    
    return special.includes('m2o') || 
           special.includes('o2m') || 
           special.includes('m2m') || 
           special.includes('m2a') ||
           field.schema?.foreign_key_table !== undefined;
  }

  /**
   * Check if a field is a many-to-many junction field
   */
  static isManyToManyJunctionField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    
    return special.includes('m2m') || 
           interface_.includes('m2m') || 
           interface_.includes('many-to-many');
  }

  /**
   * Check if a field is a radio button field
   */
  static isRadioButtonField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    return interface_ === 'radio-buttons';
  }

  /**
   * Check if a field is a dropdown multiple field
   */
  static isDropdownMultipleField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    return interface_ === 'dropdown-multiple';
  }

  /**
   * Check if a field is a checkbox tree field
   */
  static isCheckboxTreeField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    return interface_ === 'checkbox-tree';
  }

  /**
   * Check if a field is a date/time field
   */
  static isDateTimeField(field: DirectusField): boolean {
    const directusType = field.schema?.data_type || field.type;
    return directusType === 'date' || directusType === 'datetime' || directusType === 'time';
  }

  /**
   * Check if a field is an autocomplete field
   */
  static isAutocompleteField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    return interface_ === 'autocomplete';
  }

  /**
   * Check if a field is a tag field
   */
  static isTagField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    return interface_ === 'tags';
  }

  /**
   * Check if a field is a repeater field
   */
  static isRepeaterField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    return interface_ === 'repeater';
  }

  /**
   * Check if a collection is a junction table
   */
  static isJunctionTable(collection: DirectusCollectionWithFields): boolean {
    // Check if collection name follows junction table patterns
    const collectionName = collection.collection.toLowerCase();
    
    // Common junction table patterns
    if (collectionName.includes('_') && collectionName.split('_').length >= 3) {
      return true;
    }
    
    // Check if it has multiple foreign key fields (indicating it's a junction table)
    const foreignKeyFields = collection.fields.filter(field => 
      field.schema?.foreign_key_table !== undefined
    );
    
    return foreignKeyFields.length >= 2;
  }

  /**
   * Get fields to omit for create operations
   */
  static getFieldsToOmitForCreate(fields: DirectusField[], hasIdField: boolean): string[] {
    const fieldsToOmit: string[] = [];
    
    // Always omit ID field for create operations
    if (hasIdField) {
      fieldsToOmit.push('id');
    }
    
    // Check for system fields that should be omitted
    const systemFields = ['user_created', 'date_created', 'user_updated', 'date_updated'];
    
    systemFields.forEach(systemField => {
      if (fields.some(field => field.field === systemField)) {
        fieldsToOmit.push(systemField);
      }
    });
    
    return fieldsToOmit;
  }
}
