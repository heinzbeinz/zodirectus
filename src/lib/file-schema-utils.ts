/**
 * Utilities for generating file schema fields
 */
export class FileSchemaUtils {
  /**
   * Generate file schema fields for Zod
   */
  static generateFileSchemaFields(fileFields: any[]): string {
    const fields: string[] = [];

    for (const field of fileFields) {
      const fieldName = field.field;
      const dataType = field.schema?.data_type || field.type;
      const isNullable = field.schema?.is_nullable;
      const isOptional =
        !field.schema?.is_nullable && !field.schema?.is_primary_key;

      let zodType = '';

      switch (dataType) {
        case 'uuid':
          zodType = 'z.string().uuid()';
          break;
        case 'varchar':
        case 'text':
        case 'string':
        case 'character varying':
          zodType = 'z.string()';
          break;
        case 'integer':
        case 'int':
        case 'int4':
          zodType = 'z.number().int()';
          break;
        case 'bigint':
        case 'int8':
          zodType = 'z.number().int()';
          break;
        case 'decimal':
        case 'numeric':
        case 'float':
        case 'real':
          zodType = 'z.number()';
          break;
        case 'boolean':
        case 'bool':
          zodType = 'z.boolean()';
          break;
        case 'date':
          zodType = 'z.string().date()';
          break;
        case 'datetime':
        case 'timestamp':
        case 'timestamptz':
          zodType = 'z.string().datetime()';
          break;
        case 'time':
          zodType = 'z.string().time()';
          break;
        case 'json':
        case 'jsonb':
          zodType = 'z.any()';
          break;
        default:
          zodType = 'z.any()';
      }

      // Apply nullable and optional modifiers
      if (isNullable) {
        zodType += '.nullable()';
      }
      if (isOptional) {
        zodType += '.optional()';
      }

      fields.push(`    ${fieldName}: ${zodType}`);
    }

    return fields.join(',\n');
  }

  /**
   * Generate file interface fields for TypeScript
   */
  static generateFileInterfaceFields(fileFields: any[]): string {
    const fields: string[] = [];

    for (const field of fileFields) {
      const fieldName = field.field;
      const dataType = field.schema?.data_type || field.type;
      const isOptional =
        !field.schema?.is_nullable && !field.schema?.is_primary_key;

      let tsType = '';

      switch (dataType) {
        case 'uuid':
        case 'varchar':
        case 'text':
        case 'string':
        case 'character varying':
        case 'date':
        case 'datetime':
        case 'timestamp':
        case 'timestamptz':
        case 'time':
          tsType = 'string';
          break;
        case 'integer':
        case 'int':
        case 'int4':
        case 'bigint':
        case 'int8':
        case 'decimal':
        case 'numeric':
        case 'float':
        case 'real':
          tsType = 'number';
          break;
        case 'boolean':
        case 'bool':
          tsType = 'boolean';
          break;
        case 'json':
        case 'jsonb':
          tsType = 'any';
          break;
        default:
          tsType = 'any';
      }

      const fieldDef = isOptional
        ? `${fieldName}?: ${tsType}`
        : `${fieldName}: ${tsType}`;
      fields.push(`  ${fieldDef}`);
    }

    return fields.join(';\n');
  }

  /**
   * Generate image file interface fields for TypeScript
   */
  static generateImageFileInterfaceFields(fileFields: any[]): string {
    // Image files have the same structure as regular files
    return this.generateFileInterfaceFields(fileFields);
  }
}
