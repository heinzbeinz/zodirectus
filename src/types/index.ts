/**
 * Directus Collection Field Types
 */
export interface DirectusField {
  field: string;
  type: string;
  schema?: {
    name: string;
    table: string;
    data_type: string;
    default_value?: any;
    is_nullable: boolean;
    is_unique: boolean;
    is_primary_key: boolean;
    has_auto_increment: boolean;
    max_length?: number;
    numeric_precision?: number;
    numeric_scale?: number;
    foreign_key_schema?: string;
    foreign_key_table?: string;
    foreign_key_column?: string;
  };
  meta?: {
    id: number;
    collection: string;
    field: string;
    special?: string[];
    interface?: string;
    options?: Record<string, any>;
    display?: string;
    display_options?: Record<string, any>;
    readonly: boolean;
    hidden: boolean;
    sort?: number;
    width?: string;
    translations?: Array<{
      language: string;
      translation: string;
    }>;
    note?: string;
    conditions?: any[];
    required: boolean;
    group?: number;
    validation?: any;
    validation_message?: string;
  };
}

/**
 * Directus Collection Schema
 */
export interface DirectusCollection {
  collection: string;
  meta?: {
    collection: string;
    icon?: string;
    note?: string;
    display_template?: string;
    hidden: boolean;
    singleton: boolean;
    translations?: Array<{
      language: string;
      translation: string;
    }>;
    archive_field?: string;
    archive_app_filter: boolean;
    archive_value?: string;
    unarchive_value?: string;
    sort_field?: string;
    accountability?: string;
    color?: string;
    item_duplication_fields?: string[];
    sort?: number;
    group?: string;
    collapse?: string;
  };
  schema?: {
    name: string;
  };
}

/**
 * Directus Collection with Fields
 */
export interface DirectusCollectionWithFields extends DirectusCollection {
  fields: DirectusField[];
}

/**
 * Configuration for Zodirectus
 */
export interface ZodirectusConfig {
  directusUrl: string;
  token?: string;
  additionalHeaders?: Record<string, string>;
  email?: string;
  password?: string;
  collections?: string[];
  outputDir?: string;
  generateTypes?: boolean;
  generateSchemas?: boolean;
  schemaFileName?: string;
  typesFileName?: string;
  includeSystemCollections?: boolean;
  customFieldMappings?: Record<string, string>;
}

/**
 * Generated Schema Result
 */
export interface GeneratedSchema {
  collectionName: string;
  schema?: string;
  type?: string;
}

/**
 * Field Type Mapping
 */
export interface FieldTypeMapping {
  directusType: string;
  zodType: string;
  tsType: string;
}
