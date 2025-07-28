/**
 * OpenLineage Schema Dataset Facet Types
 *
 * The schema dataset facet contains the schema of a particular dataset.
 * Besides a name, it provides an optional type and description of each field.
 * Nested fields are supported as well.
 *
 * @see https://openlineage.io/docs/spec/facets/dataset-facets/schema
 * @see https://openlineage.io/spec/facets/1-1-1/SchemaDatasetFacet.json
 */

import { type DatasetFacet } from "../events.js";

/**
 * Schema field definition with support for nested fields
 */
export interface SchemaField {
  /** The name of the field */
  name: string;
  /** The type of the field (e.g., VARCHAR, INT, etc.) */
  type?: string;
  /** The description of the field */
  description?: string;
  /** Nested struct fields for complex types */
  fields?: SchemaField[];
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Schema Dataset Facet containing the schema of a dataset
 */
export interface SchemaDatasetFacet extends DatasetFacet {
  /** The fields of the data source */
  fields: SchemaField[];
  /** Additional properties for extensibility */
  [key: string]: unknown;
}
