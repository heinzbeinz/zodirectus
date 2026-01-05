// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { z } from 'zod'; // Used in generated code strings
import { DirectusCollectionWithFields, DirectusField, ZodirectusConfig, GeneratedSchema } from '../types';
import { StringUtils } from '../lib';

/**
 * Zod Schema Generator for Directus collections
 */
export class ZodGenerator {
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
   * Generate Zod schema for a collection
   */
  generateSchema(collection: DirectusCollectionWithFields, isCircularDependency: boolean = false): string {
    const collectionName = this.toPascalCase(collection.collection);
    const singularName = this.toSingular(collectionName);
    const schemaName = `Drx${singularName}Schema`;
    
    const filteredFields = collection.fields
      .filter(field => !this.isUiOnlyField(field)); // Include all fields except UI fields
    
    // Check if ID field exists, if not add it
    const hasIdField = filteredFields.some(field => field.field === 'id');
    const fields = filteredFields.map(field => this.generateFieldSchema(field));
    
    if (!hasIdField) {
      fields.unshift('id: z.string().uuid().optional()');
    }
    
    const fieldsString = fields.join(',\n    ');

    if (isCircularDependency) {
      // For circular dependencies, generate lazy schemas
      const debugInfo = this.generateRelationshipDebugInfo(collection);
      const baseSchema = `export const ${schemaName}: z.ZodType<any> = z.lazy(() => z.object({
    ${fieldsString}
}));`;

      // Generate Create schema as a separate lazy schema
      const createSchemaName = schemaName.replace('Schema', 'CreateSchema');
      const fieldsToOmit = this.getFieldsToOmitForCreate(filteredFields, hasIdField);
      const omitFieldsString = fieldsToOmit.map(field => `    ${field}: true`).join(',\n');
      const createSchema = `export const ${createSchemaName}: z.ZodType<any> = z.lazy(() => (${schemaName} as z.ZodObject<any>).omit({
${omitFieldsString}
}));`;

      // Generate Update schema as a separate lazy schema
      const updateSchemaName = schemaName.replace('Schema', 'UpdateSchema');
      const updateSchema = `export const ${updateSchemaName}: z.ZodType<any> = z.lazy(() => (${schemaName} as z.ZodObject<any>).partial().required({
    id: true
}));`;

      // Generate Get schema as a separate lazy schema
      const getSchemaName = schemaName.replace('Schema', 'GetSchema');
      const getSchema = `export const ${getSchemaName}: z.ZodType<any> = z.lazy(() => ${schemaName});`;

      return `${debugInfo}${baseSchema}\n\n${createSchema}\n\n${updateSchema}\n\n${getSchema}`;
    } else {
      // For non-circular dependencies, generate normal schemas
      const debugInfo = this.generateRelationshipDebugInfo(collection);
      const baseSchema = `export const ${schemaName} = z.object({
    ${fieldsString}
});`;

      // Generate Create schema using .omit() - only omit fields that actually exist
      const createSchemaName = schemaName.replace('Schema', 'CreateSchema');
      const fieldsToOmit = this.getFieldsToOmitForCreate(filteredFields, hasIdField);
      const omitFieldsString = fieldsToOmit.map(field => `    ${field}: true`).join(',\n');
      const createSchema = `export const ${createSchemaName} = ${schemaName}.omit({
${omitFieldsString}
});`;

      // Generate Update schema using .partial().required()
      const updateSchemaName = schemaName.replace('Schema', 'UpdateSchema');
      const updateSchema = `export const ${updateSchemaName} = ${schemaName}.partial().required({
    id: true
});`;

      // Generate Get schema (same as base for now)
      const getSchemaName = schemaName.replace('Schema', 'GetSchema');
      const getSchema = `export const ${getSchemaName} = ${schemaName};`;

      return `${debugInfo}${baseSchema}\n\n${createSchema}\n\n${updateSchema}\n\n${getSchema}`;
    }
  }

  /**
   * Get fields that should be omitted in Create schema
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
   * Generate Zod schema for a file field
   */
  private generateFileSchema(field: DirectusField): string {
    const interface_ = field.meta?.interface || '';
    const special = field.meta?.special || [];
    
    if (interface_ === 'files' || special.includes('files')) {
      // Multiple files - return array of file objects
      return 'z.array(DrxFileSchema)';
    } else if (interface_ === 'file-image') {
      return 'DrxImageFileSchema';
    } else {
      return 'DrxFileSchema';
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
   * Generate Zod schema for a radio button field
   */
  private generateRadioButtonSchema(field: DirectusField): string {
    const options = field.meta?.options || {};
    const choices = options.choices || [];
    
    if (choices.length > 0) {
      // Extract all possible values from the choices
      const values = choices.map((choice: any) => choice.value);
      const uniqueValues = [...new Set(values)]; // Remove duplicates
      const valuesString = uniqueValues.map(v => `"${v}"`).join(', ');
      
      return `z.enum([${valuesString}])`;
    } else {
      // If no choices, allow any string
      return `z.string()`;
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
   * Generate Zod schema for a dropdown_multiple field
   */
  private generateDropdownMultipleSchema(field: DirectusField): string {
    const options = field.meta?.options || {};
    const choices = options.choices || [];
    
    if (choices.length > 0) {
      // Extract all possible values from the choices
      const values = choices.map((choice: any) => choice.value);
      const uniqueValues = [...new Set(values)]; // Remove duplicates
      const valuesString = uniqueValues.map(v => `"${v}"`).join(', ');
      
      return `z.array(z.enum([${valuesString}]))`;
    } else {
      // If no choices, allow any string array
      return `z.array(z.string())`;
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
   * Generate Zod schema for a checkbox_tree field
   */
  private generateCheckboxTreeSchema(field: DirectusField): string {
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
      const valuesString = uniqueValues.map(v => `"${v}"`).join(', ');
      
      return `z.array(z.enum([${valuesString}]))`;
    } else {
      // If no choices, allow any string array
      return `z.array(z.string())`;
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
   * Generate Zod schema for a date/time field
   */
  private generateDateTimeSchema(field: DirectusField): string {
    const directusType = field.schema?.data_type || field.type;
    const interface_ = field.meta?.interface || '';
    const fieldName = field.field.toLowerCase();
    
    // Determine the appropriate Zod type based on field characteristics
    if (directusType === 'date' || interface_ === 'date' || fieldName === 'date') {
      return `z.string().date()`;
    } else if (directusType === 'time' || interface_ === 'time' || fieldName === 'time') {
      return `z.string().time()`;
    } else if (directusType === 'timestamp' || directusType === 'datetime' || interface_ === 'datetime' || fieldName.includes('datetime') || fieldName === 'ts') {
      return `z.string().datetime()`;
    } else {
      // Default to datetime for any date/time related field
      return `z.string().datetime()`;
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
   * Generate Zod schema for an autocomplete field
   */
  private generateAutocompleteSchema(field: DirectusField): string {
    const options = field.meta?.options || {};
    const suggestions = options.suggestions || [];
    
    if (suggestions.length > 0) {
      // If there are predefined suggestions, create an enum for validation
      const suggestionValues = suggestions.map((suggestion: string) => `"${suggestion}"`).join(', ');
      return `z.enum([${suggestionValues}])`;
    } else {
      // If no suggestions, allow any string
      return `z.string()`;
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
   * Generate Zod schema for a tag field
   */
  private generateTagSchema(field: DirectusField): string {
    const options = field.meta?.options || {};
    const presets = options.presets || [];
    
    if (presets.length > 0) {
      // If there are predefined tags, create an enum for validation
      const presetValues = presets.map((preset: string) => `"${preset}"`).join(', ');
      return `z.array(z.enum([${presetValues}]))`;
    } else {
      // If no presets, allow any string array
      return `z.array(z.string())`;
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
   * Generate Zod schema for a repeater field
   */
  private generateRepeaterSchema(field: DirectusField): string {
    const options = field.meta?.options || {};
    const repeaterFields = options.fields || [];
    
    if (repeaterFields.length === 0) {
      return 'z.array(z.any())';
    }
    
    // Generate schema for each sub-field
    const subFieldSchemas = repeaterFields.map((subField: any) => {
      const subFieldName = subField.field;
      const subFieldType = subField.type;
      const subFieldMeta = subField.meta || {};
      
      // Generate Zod type for the sub-field
      let zodType = this.getZodTypeForSubField(subFieldType, subFieldMeta);
      
      // Handle nullable and optional
      if (subFieldMeta.interface === null || subFieldMeta.interface === undefined) {
        // Default behavior for sub-fields
      }
      
      return `${subFieldName}: ${zodType}`;
    });
    
    const subFieldsString = subFieldSchemas.join(',\n    ');
    
    return `z.array(z.object({\n    ${subFieldsString}\n}))`;
  }

  /**
   * Get Zod type for a sub-field in a repeater
   */
  private getZodTypeForSubField(fieldType: string, meta: any): string {
    switch (fieldType) {
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'z.number().int()';
      
      case 'decimal':
      case 'float':
      case 'double':
        return 'z.number()';
      
      case 'boolean':
        return 'z.boolean()';
      
      case 'varchar':
      case 'char':
      case 'text':
      case 'longtext':
      case 'character varying':
        return 'z.string()';
      
      case 'date':
        return 'z.string().date()';
      
      case 'datetime':
      case 'timestamp':
        return 'z.string().datetime()';
      
      case 'time':
        return 'z.string().time()';
      
      case 'uuid':
        return 'z.string().uuid()';
      
      case 'json':
        return 'z.any()';
      
      default:
        return 'z.string()';
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
          
          
          // Look for relationships where this collection is involved
          const m2mRelation = this.relationships.find((rel: any) => 
            rel.collection === collectionName &&
            rel.field === fieldName &&
            rel.related_collection !== collectionName
          );
          
          if (m2mRelation) {
            return m2mRelation.related_collection;
          }
          
          // Look for relationships where this collection is the related collection
          const reverseM2mRelation = this.relationships.find((rel: any) => 
            rel.related_collection === collectionName &&
            rel.collection !== collectionName
          );
          
          if (reverseM2mRelation) {
            return reverseM2mRelation.collection;
          }
          
          // For M2M fields, try to find junction tables that connect this collection to another collection
          // Look for junction tables with pattern: {collectionName}_{relatedCollectionName}
          const junctionRelations = this.relationships.filter((rel: any) => {
            const junctionCollection = rel.collection;
            // Check if this is a junction table that connects to our current collection
            return junctionCollection.includes('_') && 
                   junctionCollection.includes(collectionName) &&
                   rel.related_collection === collectionName;
          });
          
          if (junctionRelations.length > 0) {
            
            // For specific field names, try to find the most relevant junction table
            let targetJunctionRelation = null;
            
            // Try to match field name to junction table pattern
            if (fieldName === 'enables' || fieldName === 'disables') {
              // Look for junction tables that contain "enabler"
              targetJunctionRelation = junctionRelations.find((rel: any) => 
                rel.collection.toLowerCase().includes('enabler')
              );
              
              // If not found, try to find junction tables that don't contain "question"
              if (!targetJunctionRelation) {
                targetJunctionRelation = junctionRelations.find((rel: any) => 
                  !rel.collection.toLowerCase().includes('question')
                );
              }
            }
            
            // If no specific match, use the first junction relation
            if (!targetJunctionRelation && junctionRelations.length > 0) {
              targetJunctionRelation = junctionRelations[0];
            }
            
            if (targetJunctionRelation) {
              const junctionName = targetJunctionRelation.collection;
              const parts = junctionName.split('_');
              
              // Look for pattern like "Answer_Enabler" -> "enablers"
              if (parts.length >= 2) {
                const relatedPart = parts.find((part: string) => 
                  part.toLowerCase() !== (collectionName || '').toLowerCase() && 
                  part.toLowerCase() !== 'id'
                );
                
                if (relatedPart) {
                  // Convert to plural form for the related collection name
                  const relatedCollection = relatedPart.toLowerCase() + 's';
                  
                  // Verify this collection exists in our relationships
                  const relatedExists = this.relationships.some((rel: any) => 
                    rel.collection === relatedCollection || rel.related_collection === relatedCollection
                  );
                  
                  if (relatedExists) {
                    return relatedCollection;
                  }
                }
              }
            }
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
    
    return null;
  }

  /**
   * Generate Zod schema for a field
   */
  private generateFieldSchema(field: DirectusField): string {
    const fieldName = field.field;
    const zodType = this.getZodType(field);
    const isRequired = field.meta?.required ?? false;
    const isNullable = field.schema?.is_nullable ?? true;

    let schema = `${fieldName}: ${zodType}`;

    // Handle nullable fields
    if (isNullable && !isRequired) {
      schema += '.nullable()';
    }

    // Handle optional fields
    if (!isRequired) {
      schema += '.optional()';
    }

    return schema;
  }

  /**
   * Generate debug information about relationships in a collection
   */
  private generateRelationshipDebugInfo(collection: DirectusCollectionWithFields): string {
    const relationFields = collection.fields.filter(field => this.isRelationField(field));
    const junctionTables = this.isJunctionTable(collection);
    
    if (relationFields.length === 0 && !junctionTables) {
      return '';
    }

    let debugInfo = `\n// DEBUG: Relationship information for ${collection.collection}\n`;
    
    if (junctionTables) {
      debugInfo += `// This appears to be a junction table\n`;
    }
    
    relationFields.forEach(field => {
      const relatedCollection = this.getRelatedCollectionName(field);
      const special = field.meta?.special || [];
      const interface_ = field.meta?.interface || '';
      const options = field.meta?.options || {};
      
      debugInfo += `// Field: ${field.field}\n`;
      debugInfo += `//   Special: [${special.join(', ')}]\n`;
      debugInfo += `//   Interface: ${interface_}\n`;
      debugInfo += `//   Related Collection: ${relatedCollection || 'Unknown'}\n`;
      debugInfo += `//   Junction Table: ${options.junction_table || 'None'}\n`;
      debugInfo += `//   Is M2M Junction: ${this.isManyToManyJunctionField(field)}\n`;
    });
    
    debugInfo += `// END DEBUG\n\n`;
    
    return debugInfo;
  }

  /**
   * Get Zod type for a Directus field
   */
  private getZodType(field: DirectusField): string {
    const directusType = field.schema?.data_type || field.type;
    const special = field.meta?.special || [];
    const options = field.meta?.options || {};

    // Handle file fields
    if (this.isFileField(field)) {
      return this.generateFileSchema(field);
    }

    // Handle radio button fields
    if (this.isRadioButtonField(field)) {
      return this.generateRadioButtonSchema(field);
    }

    // Handle dropdown_multiple fields
    if (this.isDropdownMultipleField(field)) {
      return this.generateDropdownMultipleSchema(field);
    }

    // Handle checkbox_tree fields
    if (this.isCheckboxTreeField(field)) {
      return this.generateCheckboxTreeSchema(field);
    }

    // Handle date/time fields
    if (this.isDateTimeField(field)) {
      return this.generateDateTimeSchema(field);
    }

    // Handle autocomplete fields
    if (this.isAutocompleteField(field)) {
      return this.generateAutocompleteSchema(field);
    }

    // Handle tag fields
    if (this.isTagField(field)) {
      return this.generateTagSchema(field);
    }

    // Handle repeater fields
    if (this.isRepeaterField(field)) {
      return this.generateRepeaterSchema(field);
    }

    // Handle relation fields
    if (this.isRelationField(field)) {
      const relatedCollection = this.getRelatedCollectionName(field);
      if (relatedCollection) {
        // Check if this is a system collection and use appropriate schema name
        const isSystemCollection = relatedCollection.startsWith('directus_');
        const baseCollectionName = isSystemCollection 
          ? relatedCollection.replace('directus_', '') 
          : relatedCollection;
        const collectionName = this.toSingular(this.toPascalCase(baseCollectionName));
        const relatedSchemaName = isSystemCollection 
          ? `DrxDirectus${collectionName}Schema` 
          : `Drx${collectionName}Schema`;
        
        // Check if this is a self-reference (same collection)
        const currentCollectionName = field.meta?.collection || '';
        const isSelfReference = currentCollectionName === relatedCollection;
        
        // M2O relations are single objects
        if (special.includes('m2o')) {
          if (isSelfReference) {
            // For self-references, use the correct schema name without double prefix
            const selfSchemaName = isSystemCollection 
              ? `DrxDirectus${this.toSingular(this.toPascalCase(relatedCollection.replace('directus_', '')))}Schema`
              : `Drx${this.toSingular(this.toPascalCase(relatedCollection))}Schema`;
            // Use z.lazy() for self-references to handle circular dependencies
            return `z.lazy(() => ${selfSchemaName})`;
          }
          return relatedSchemaName;
        }
        
        // O2M relations are arrays
        if (special.includes('o2m')) {
          return `z.array(${relatedSchemaName})`;
        }
        
        // M2A relations are arrays
        if (special.includes('m2a')) {
          return `z.array(${relatedSchemaName})`;
        }
        
        // M2M relations are arrays (many-to-many)
        if (special.includes('m2m') || this.isManyToManyJunctionField(field)) {
          return `z.array(${relatedSchemaName})`;
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
          return isNaN(numValue) ? value : numValue;
        } else if (directusType === 'decimal' || directusType === 'float' || directusType === 'real') {
          const numValue = parseFloat(value);
          return isNaN(numValue) ? value : numValue;
        } else if (directusType === 'boolean') {
          return value === 'true' || value === true;
        } else {
          // Default to string
          return `"${value}"`;
        }
      }).join(', ');
      
      return `z.enum([${choices}])`;
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
          return isNaN(numValue) ? value : numValue;
        } else if (directusType === 'decimal' || directusType === 'float' || directusType === 'real') {
          const numValue = parseFloat(value);
          return isNaN(numValue) ? value : numValue;
        } else if (directusType === 'boolean') {
          return value === 'true' || value === true;
        } else {
          // Default to string
          return `"${value}"`;
        }
      }).join(', ');
      
      return `z.enum([${choices}])`;
    }

    // Handle special field types first
    if (special.includes('uuid')) {
      return 'z.string().uuid()';
    }
    
    if (special.includes('date-created') || special.includes('date-updated')) {
      return 'z.string().datetime()';
    }

    if (special.includes('user-created') || special.includes('user-updated')) {
      return 'z.string()';
    }

    if (special.includes('sort')) {
      return 'z.number().int()';
    }

    // Handle regular field types
    switch (directusType) {
      case 'uuid':
        return 'z.string().uuid()';
      
      case 'varchar':
      case 'char':
      case 'text':
      case 'longtext':
      case 'character varying':
        return 'z.string()';
      
      case 'integer':
      case 'bigint':
      case 'smallint':
      case 'tinyint':
        return 'z.number().int()';
      
      case 'decimal':
      case 'float':
      case 'double':
        return 'z.number()';
      
      case 'boolean':
        return 'z.boolean()';
      
      case 'date':
        return 'z.string().date()';
      
      case 'datetime':
      case 'timestamp':
        return 'z.string().datetime()';
      
      case 'time':
        return 'z.string().time()';
      
      case 'json':
        return 'z.any()';
      
      case 'geometry':
        return 'z.any()';
      
      case 'binary':
        return 'z.string()';
      
      default:
        // Check for custom field mappings
        if (this.config.customFieldMappings?.[directusType]) {
          return this.config.customFieldMappings[directusType];
        }
        
        // Default to string for unknown types
        return 'z.string()';
    }
  }

  /**
   * Generate complete schema file content
   */
  generateSchemaFile(schemas: GeneratedSchema[]): string {
    const imports = `import { z } from 'zod';

`;
    
    const schemaDefinitions = schemas
      .map(schema => schema.schema)
      .join('\n\n');

    return imports + schemaDefinitions;
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
    // Use the shared StringUtils method instead of duplicating logic
    return StringUtils.toSingular(word);
  }

  /**
   * Generate TypeScript types from Zod schemas
   */
  generateTypesFromSchemas(schemas: GeneratedSchema[]): string {
    const typeDefinitions = schemas
      .map(schema => {
        const collectionName = this.toPascalCase(schema.collectionName);
        return `export type ${collectionName} = z.infer<typeof ${collectionName}Schema>;`;
      })
      .join('\n');

    return typeDefinitions;
  }
}
