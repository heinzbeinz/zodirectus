import { DirectusCollectionWithFields, DirectusField, ZodirectusConfig, GeneratedSchema } from '../types';

/**
 * TypeScript Type Generator for Directus collections
 */
export class TypeGenerator {
  private config: ZodirectusConfig;
  private relationships: any[] = [];
  private client: any;

  constructor(config: ZodirectusConfig, client?: any) {
    this.config = config;
    this.client = client;
  }

  /**
   * Set relationships data for proper M2M field resolution
   */
  async setRelationships(): Promise<void> {
    if (this.client) {
      try {
        this.relationships = await this.client.getRelationships();
        console.log(`Loaded ${this.relationships.length} relationships from Directus`);
      } catch (error) {
        console.warn('Could not load relationships:', error);
        this.relationships = [];
      }
    }
  }

  /**
   * Generate TypeScript type for a collection
   */
  generateType(collection: DirectusCollectionWithFields): string {
    const collectionName = this.toPascalCase(collection.collection);
    const singularName = this.toSingular(collectionName);
    const typeName = `Drs${singularName}`;
    
    const filteredFields = collection.fields
      .filter(field => !this.isUiOnlyField(field)); // Include all fields except UI fields
    
    // Check if ID field exists, if not add it
    const hasIdField = filteredFields.some(field => field.field === 'id');
    const fields = filteredFields.map(field => this.generateFieldType(field));
    
    if (!hasIdField) {
      fields.unshift('id?: string');
    }
    
    const fieldsString = fields.join(';\n  ');

    // Generate base interface
    const baseInterface = `export interface ${typeName} {
  ${fieldsString};
}`;

    // Generate Create interface using Omit utility type
    const createTypeName = `${typeName}Create`;
    const fieldsToOmit = this.getFieldsToOmitForCreate(filteredFields, hasIdField);
    const omitFieldsString = fieldsToOmit.map(field => `"${field}"`).join(' | ');
    const createInterface = `export type ${createTypeName} = Omit<${typeName}, ${omitFieldsString}>;`;

    // Generate Update interface using Partial utility type
    const updateTypeName = `${typeName}Update`;
    const updateInterface = `export type ${updateTypeName} = Partial<${typeName}> & Required<Pick<${typeName}, "id">>;`;

    // Generate Get interface (same as base for now)
    const getTypeName = `${typeName}Get`;
    const getInterface = `export type ${getTypeName} = ${typeName};`;

    return `${baseInterface}\n\n${createInterface}\n\n${updateInterface}\n\n${getInterface}`;
  }

  /**
   * Get fields that should be omitted in Create interface
   */
  private getFieldsToOmitForCreate(fields: DirectusField[], hasIdField: boolean): string[] {
    const fieldsToOmit: string[] = [];
    
    // Always omit id field (either existing or artificially added)
    fieldsToOmit.push('id');
    
    // Only omit system fields if they actually exist in the collection
    const systemFields = ['user_created', 'date_created', 'user_updated', 'date_updated'];
    for (const systemField of systemFields) {
      if (fields.some(field => field.field === systemField)) {
        fieldsToOmit.push(systemField);
      }
    }
    
    return fieldsToOmit;
  }

  /**
   * Check if a field is a file field
   */
  private isFileField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    
    return special.includes('file') || 
           special.includes('files') ||
           interface_ === 'file' || 
           interface_ === 'file-image' ||
           interface_ === 'files';
  }

  /**
   * Generate TypeScript type for a file field
   */
  private generateFileType(field: DirectusField): string {
    const interface_ = field.meta?.interface || '';
    const special = field.meta?.special || [];
    
    if (interface_ === 'files' || special.includes('files')) {
      // Multiple files - return array of file objects
      return 'DrsFile[]';
    } else if (interface_ === 'file-image') {
      return 'DrsImageFile';
    } else {
      return 'DrsFile';
    }
  }

  /**
   * Check if a field is a radio button field
   */
  private isRadioButtonField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    
    return interface_ === 'select-radio';
  }

  /**
   * Generate TypeScript type for a radio button field
   */
  private generateRadioButtonType(field: DirectusField): string {
    const options = field.meta?.options || {};
    const choices = options.choices || [];
    
    if (choices.length > 0) {
      // Extract all possible values from the choices
      const values = choices.map((choice: any) => choice.value);
      const uniqueValues = [...new Set(values)]; // Remove duplicates
      const valuesString = uniqueValues.map(v => `"${v}"`).join(' | ');
      
      return valuesString;
    } else {
      // If no choices, allow any string
      return 'string';
    }
  }

  /**
   * Check if a field is a dropdown_multiple field
   */
  private isDropdownMultipleField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    
    return interface_ === 'select-multiple-dropdown';
  }

  /**
   * Generate TypeScript type for a dropdown_multiple field
   */
  private generateDropdownMultipleType(field: DirectusField): string {
    const options = field.meta?.options || {};
    const choices = options.choices || [];
    
    if (choices.length > 0) {
      // Extract all possible values from the choices
      const values = choices.map((choice: any) => choice.value);
      const uniqueValues = [...new Set(values)]; // Remove duplicates
      const valuesString = uniqueValues.map(v => `"${v}"`).join(' | ');
      
      return `(${valuesString})[]`;
    } else {
      // If no choices, allow any string array
      return 'string[]';
    }
  }

  /**
   * Check if a field is a checkbox_tree field
   */
  private isCheckboxTreeField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    
    return interface_ === 'select-multiple-checkbox-tree';
  }

  /**
   * Generate TypeScript type for a checkbox_tree field
   */
  private generateCheckboxTreeType(field: DirectusField): string {
    const options = field.meta?.options || {};
    const choices = options.choices || [];
    
    if (choices.length > 0) {
      // Extract all possible values from the tree structure
      const extractValues = (items: any[]): string[] => {
        const values: string[] = [];
        items.forEach(item => {
          if (item.value) {
            values.push(item.value);
          }
          if (item.children && Array.isArray(item.children)) {
            values.push(...extractValues(item.children));
          }
        });
        return values;
      };
      
      const allValues = extractValues(choices);
      const uniqueValues = [...new Set(allValues)];
      const valuesString = uniqueValues.map(v => `"${v}"`).join(' | ');
      
      return `(${valuesString})[]`;
    } else {
      // If no choices, allow any string array
      return 'string[]';
    }
  }

  /**
   * Check if a field is a date/time field
   */
  private isDateTimeField(field: DirectusField): boolean {
    const directusType = field.schema?.data_type || field.type;
    const interface_ = field.meta?.interface || '';
    
    // Check for specific date/time types
    if (directusType === 'timestamp' || directusType === 'datetime' || directusType === 'date' || directusType === 'time') {
      return true;
    }
    
    // Check for date/time interfaces
    if (interface_ === 'datetime' || interface_ === 'date' || interface_ === 'time') {
      return true;
    }
    
    // Check field names that suggest date/time
    const fieldName = field.field.toLowerCase();
    if (fieldName.includes('date') || fieldName.includes('time') || fieldName === 'ts') {
      return true;
    }
    
    return false;
  }

  /**
   * Generate TypeScript type for a date/time field
   */
  private generateDateTimeType(field: DirectusField): string {
    const directusType = field.schema?.data_type || field.type;
    const interface_ = field.meta?.interface || '';
    const fieldName = field.field.toLowerCase();
    
    // Determine the appropriate TypeScript type based on field characteristics
    if (directusType === 'date' || interface_ === 'date' || fieldName === 'date') {
      return 'string'; // ISO date string
    } else if (directusType === 'time' || interface_ === 'time' || fieldName === 'time') {
      return 'string'; // ISO time string
    } else if (directusType === 'timestamp' || directusType === 'datetime' || interface_ === 'datetime' || fieldName.includes('datetime') || fieldName === 'ts') {
      return 'string'; // ISO datetime string
    } else {
      // Default to string for any date/time related field
      return 'string';
    }
  }

  /**
   * Check if a field is an autocomplete field
   */
  private isAutocompleteField(field: DirectusField): boolean {
    const interface_ = field.meta?.interface || '';
    
    return interface_ === 'autocomplete';
  }

  /**
   * Generate TypeScript type for an autocomplete field
   */
  private generateAutocompleteType(field: DirectusField): string {
    const options = field.meta?.options || {};
    const suggestions = options.suggestions || [];
    
    if (suggestions.length > 0) {
      // If there are predefined suggestions, create a union type
      const suggestionValues = suggestions.map((suggestion: string) => `"${suggestion}"`).join(' | ');
      return suggestionValues;
    } else {
      // If no suggestions, allow any string
      return 'string';
    }
  }

  /**
   * Check if a field is a tag field
   */
  private isTagField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    
    return special.includes('cast-json') && interface_ === 'tags';
  }

  /**
   * Generate TypeScript type for a tag field
   */
  private generateTagType(field: DirectusField): string {
    const options = field.meta?.options || {};
    const presets = options.presets || [];
    
    if (presets.length > 0) {
      // If there are predefined tags, create a union type
      const presetValues = presets.map((preset: string) => `"${preset}"`).join(' | ');
      return `(${presetValues})[]`;
    } else {
      // If no presets, allow any string array
      return 'string[]';
    }
  }

  /**
   * Check if a field is a repeater field
   */
  private isRepeaterField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    const options = field.meta?.options || {};
    
    return special.includes('cast-json') && 
           interface_ === 'list' && 
           options.fields && 
           Array.isArray(options.fields) && 
           options.fields.length > 0;
  }

  /**
   * Generate TypeScript type for a repeater field
   */
  private generateRepeaterType(field: DirectusField): string {
    const options = field.meta?.options || {};
    const repeaterFields = options.fields || [];
    
    if (repeaterFields.length === 0) {
      return 'any[]';
    }
    
    // Generate type for each sub-field
    const subFieldTypes = repeaterFields.map((subField: any) => {
      const subFieldName = subField.field;
      const subFieldType = subField.type;
      const subFieldMeta = subField.meta || {};
      
      // Generate TypeScript type for the sub-field
      const tsType = this.getTypeScriptTypeForSubField(subFieldType, subFieldMeta);
      
      return `${subFieldName}: ${tsType}`;
    });
    
    const subFieldsString = subFieldTypes.join('; ');
    
    return `{\n    ${subFieldsString};\n}[]`;
  }

  /**
   * Get TypeScript type for a sub-field in a repeater
   */
  private getTypeScriptTypeForSubField(fieldType: string, meta: any): string {
    switch (fieldType) {
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'number';
      
      case 'decimal':
      case 'float':
      case 'double':
        return 'number';
      
      case 'boolean':
        return 'boolean';
      
      case 'varchar':
      case 'char':
      case 'text':
      case 'longtext':
      case 'character varying':
        return 'string';
      
      case 'date':
        return 'string';
      
      case 'datetime':
      case 'timestamp':
        return 'string';
      
      case 'time':
        return 'string';
      
      case 'uuid':
        return 'string';
      
      case 'json':
        return 'any';
      
      default:
        return 'string';
    }
  }

  /**
   * Check if a field is a divider field that should be excluded
   */
  private isDividerField(field: DirectusField): boolean {
    // Check if field name starts with 'divider-'
    if (field.field.startsWith('divider-')) {
      return true;
    }
    
    // Check if field interface is 'divider'
    if (field.meta?.interface === 'divider') {
      return true;
    }
    
    // Check if field type is 'divider'
    if (field.type === 'divider') {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a field is a relation field
   */
  private isRelationField(field: DirectusField): boolean {
    const special = field.meta?.special || [];
    const interface_ = field.meta?.interface || '';
    
    return special.includes('m2o') || 
           special.includes('o2m') || 
           special.includes('m2a') ||
           special.includes('m2m') ||
           interface_.includes('m2o') ||
           interface_.includes('o2m') ||
           interface_.includes('m2a') ||
           interface_.includes('m2m') ||
           interface_.includes('many-to-many') ||
           this.isManyToManyJunctionField(field);
  }

  /**
   * Check if a field is a many-to-many junction field
   */
  private isManyToManyJunctionField(field: DirectusField): boolean {
    const fieldName = field.field;
    const options = field.meta?.options || {};
    const special = field.meta?.special || [];
    
    // Don't mark M2O fields as M2M junction fields - they are different
    if (special.includes('m2o')) {
      return false;
    }
    
    // Check for common many-to-many patterns
    // 1. Junction tables often have names like: table1_table2, table1_table2_id, etc.
    // 2. Fields that reference junction tables
    // 3. Fields with junction_table option
    if (options.junction_table) {
      return true;
    }
    
    // Check for many-to-many interface
    const interface_ = field.meta?.interface || '';
    if (interface_.includes('m2m') || interface_.includes('many-to-many')) {
      return true;
    }
    
    // Check for explicit M2M special type
    if (special.includes('m2m')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a collection is a junction table for many-to-many relationships
   */
  private isJunctionTable(collection: DirectusCollectionWithFields): boolean {
    const collectionName = collection.collection;
    const fields = collection.fields || [];
    
    // Junction tables typically have:
    // 1. Two or more foreign key fields
    // 2. Naming patterns like: table1_table2, junction_table_name, etc.
    // 3. Simple structure with mostly foreign keys
    
    // Check naming patterns
    if (collectionName.includes('_') && (
      collectionName.includes('_junction') ||
      collectionName.includes('_link') ||
      collectionName.includes('_relation')
    )) {
      return true;
    }
    
    // Check if it has exactly 2 foreign key fields (typical for M2M junction)
    const foreignKeyFields = fields.filter(field => 
      field.schema?.foreign_key_table || 
      field.meta?.special?.includes('m2o')
    );
    
    if (foreignKeyFields.length >= 2) {
      // Check if most fields are foreign keys (typical junction table pattern)
      const nonForeignKeyFields = fields.filter(field => 
        !field.schema?.foreign_key_table && 
        !field.meta?.special?.includes('m2o') &&
        field.field !== 'id' &&
        !field.field.startsWith('date_') &&
        !field.field.startsWith('user_')
      );
      
      // If there are few non-foreign-key fields, it's likely a junction table
      return nonForeignKeyFields.length <= 2;
    }
    
    return false;
  }

  /**
   * Get the related collection name for a relation field
   */
  private getRelatedCollectionName(field: DirectusField): string | null {
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
          const m2mRelation = this.relationships.find((rel: any) => 
            rel.one_collection === collectionName &&
            rel.one_field === fieldName &&
            rel.many_collection !== collectionName
          );
          
          if (m2mRelation) {
            return m2mRelation.many_collection;
          }
          
          // Look for relationships where this collection is the "many" side
          const reverseM2mRelation = this.relationships.find((rel: any) => 
            rel.many_collection === collectionName &&
            rel.many_field === fieldName &&
            rel.one_collection !== collectionName
          );
          
          if (reverseM2mRelation) {
            return reverseM2mRelation.one_collection;
          }
          
          // Look for junction table relationships
          const junctionRelation = this.relationships.find((rel: any) => 
            rel.junction_collection === collectionName &&
            (rel.one_collection !== collectionName || rel.many_collection !== collectionName)
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
        // Look for patterns like: user_id -> users, application_id -> applications
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          if (lastPart === 'id') {
            const collectionPart = parts.slice(0, -1).join('_');
            return collectionPart + 's'; // Make it plural
          }
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
   * Generate TypeScript type for a field
   */
  private generateFieldType(field: DirectusField): string {
    const fieldName = field.field;
    const tsType = this.getTypeScriptType(field);
    const isRequired = field.meta?.required ?? false;
    // const isNullable = field.schema?.is_nullable ?? true; // Currently not used

    let type = fieldName;
    
    // Handle optional fields
    if (!isRequired) {
      type += '?';
    }
    
    type += `: ${tsType}`;

    return type;
  }

  /**
   * Get TypeScript type for a Directus field
   */
  private getTypeScriptType(field: DirectusField): string {
    const directusType = field.schema?.data_type || field.type;
    const special = field.meta?.special || [];
    const options = field.meta?.options || {};

    // Handle file fields
    if (this.isFileField(field)) {
      return this.generateFileType(field);
    }

    // Handle radio button fields
    if (this.isRadioButtonField(field)) {
      return this.generateRadioButtonType(field);
    }

    // Handle dropdown_multiple fields
    if (this.isDropdownMultipleField(field)) {
      return this.generateDropdownMultipleType(field);
    }

    // Handle checkbox_tree fields
    if (this.isCheckboxTreeField(field)) {
      return this.generateCheckboxTreeType(field);
    }

    // Handle date/time fields
    if (this.isDateTimeField(field)) {
      return this.generateDateTimeType(field);
    }

    // Handle autocomplete fields
    if (this.isAutocompleteField(field)) {
      return this.generateAutocompleteType(field);
    }

    // Handle tag fields
    if (this.isTagField(field)) {
      return this.generateTagType(field);
    }

    // Handle repeater fields
    if (this.isRepeaterField(field)) {
      return this.generateRepeaterType(field);
    }

    // Handle relation fields
    if (this.isRelationField(field)) {
      const relatedCollection = this.getRelatedCollectionName(field);
      if (relatedCollection) {
        // Check if this is a system collection and use appropriate type name
        const isSystemCollection = relatedCollection.startsWith('directus_');
        const baseCollectionName = isSystemCollection 
          ? relatedCollection.replace('directus_', '') 
          : relatedCollection;
        const collectionName = this.toSingular(this.toPascalCase(baseCollectionName));
        const relatedTypeName = isSystemCollection 
          ? `DrsDirectus${collectionName}` 
          : `Drs${collectionName}`;
        
        // M2O relations are single objects
        if (special.includes('m2o')) {
          return relatedTypeName;
        }
        
        // O2M relations are arrays
        if (special.includes('o2m')) {
          return `${relatedTypeName}[]`;
        }
        
        // M2A relations are arrays
        if (special.includes('m2a')) {
          return `${relatedTypeName}[]`;
        }
        
        // M2M relations are arrays (many-to-many)
        if (special.includes('m2m') || this.isManyToManyJunctionField(field)) {
          return `${relatedTypeName}[]`;
        }
      }
    }

    // Handle enum/choice fields with predefined values
    if (options.choices && Array.isArray(options.choices) && options.choices.length > 0) {
      const choices = options.choices.map((choice: any) => {
        let value;
        if (typeof choice === 'string') {
          value = choice;
        } else if (choice && typeof choice === 'object' && choice.value) {
          value = choice.value;
        } else {
          value = choice;
        }
        
        // Convert value based on field data type
        if (directusType === 'integer' || directusType === 'bigint') {
          const numValue = parseInt(value, 10);
          return isNaN(numValue) ? `"${value}"` : numValue;
        } else if (directusType === 'decimal' || directusType === 'float' || directusType === 'real') {
          const numValue = parseFloat(value);
          return isNaN(numValue) ? `"${value}"` : numValue;
        } else if (directusType === 'boolean') {
          return value === 'true' || value === true;
        } else {
          // Default to string
          return `"${value}"`;
        }
      }).join(' | ');
      
      return choices;
    }

    // Handle dropdown/select fields with options
    if (options.options && Array.isArray(options.options) && options.options.length > 0) {
      const choices = options.options.map((option: any) => {
        let value;
        if (typeof option === 'string') {
          value = option;
        } else if (option && typeof option === 'object' && option.value) {
          value = option.value;
        } else if (option && typeof option === 'object' && option.text) {
          value = option.text;
        } else {
          value = option;
        }
        
        // Convert value based on field data type
        if (directusType === 'integer' || directusType === 'bigint') {
          const numValue = parseInt(value, 10);
          return isNaN(numValue) ? `"${value}"` : numValue;
        } else if (directusType === 'decimal' || directusType === 'float' || directusType === 'real') {
          const numValue = parseFloat(value);
          return isNaN(numValue) ? `"${value}"` : numValue;
        } else if (directusType === 'boolean') {
          return value === 'true' || value === true;
        } else {
          // Default to string
          return `"${value}"`;
        }
      }).join(' | ');
      
      return choices;
    }

    // Handle special field types first
    if (special.includes('uuid')) {
      return 'string';
    }
    
    if (special.includes('date-created') || special.includes('date-updated')) {
      return 'string';
    }

    if (special.includes('user-created') || special.includes('user-updated')) {
      return 'string';
    }

    if (special.includes('sort')) {
      return 'number';
    }

    // Handle regular field types
    switch (directusType) {
      case 'uuid':
        return 'string';
      
      case 'varchar':
      case 'char':
      case 'text':
      case 'longtext':
      case 'character varying':
        return 'string';
      
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'number';
      
      case 'decimal':
      case 'float':
      case 'double':
        return 'number';
      
      case 'boolean':
        return 'boolean';
      
      case 'date':
        return 'string';
      
      case 'datetime':
      case 'timestamp':
        return 'string';
      
      case 'time':
        return 'string';
      
      case 'json':
        return 'any';
      
      case 'geometry':
        return 'any';
      
      case 'binary':
        return 'string';
      
      default:
        // Check for custom field mappings
        if (this.config.customFieldMappings?.[directusType]) {
          return this.config.customFieldMappings[directusType];
        }
        
        // Default to any for unknown types
        return 'any';
    }
  }

  /**
   * Generate complete type file content
   */
  generateTypeFile(types: GeneratedSchema[]): string {
    const typeDefinitions = types
      .map(type => type.type)
      .join('\n\n');

    return typeDefinitions;
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert plural word to singular
   */
  private toSingular(word: string): string {
    // Common plural to singular conversions
    // const pluralToSingular: Record<string, string> = {
    //   'Applications': 'Application',
    //   'Banks': 'Bank',
    //   'Clerks': 'Clerk',
    //   'Languages': 'Language',
    //   'Globals': 'Global',
    //   'AuditAccountabilityLogs': 'AuditAccountabilityLog',
    //   'AuditActivityLogs': 'AuditActivityLog',
    //   'AuditSessions': 'AuditSession',
    //   'GlobalsTranslations': 'GlobalsTranslation'
    // };

    // if (pluralToSingular[word]) {
    //   return pluralToSingular[word];
    // }

    // Generic rules for common plural patterns
    if (word.endsWith('ies')) {
      return word.slice(0, -3) + 'y';
    }
    if (word.endsWith('ses') || word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('zes')) {
      return word.slice(0, -2);
    }
    if (word.endsWith('s') && word.length > 1) {
      return word.slice(0, -1);
    }

    return word;
  }

  /**
   * Generate union types for collections
   */
  generateUnionTypes(collections: string[]): string {
    const unionType = collections
      .map(collection => this.toPascalCase(collection) + 'Type')
      .join(' | ');

    return `export type DirectusCollection = ${unionType};`;
  }

  /**
   * Generate index types for easy access
   */
  generateIndexTypes(collections: string[]): string {
    const indexType = collections
      .map(collection => `  ${collection}: ${this.toPascalCase(collection)}Type;`)
      .join('\n');

    return `export interface DirectusCollections {
${indexType}
}`;
  }
}
