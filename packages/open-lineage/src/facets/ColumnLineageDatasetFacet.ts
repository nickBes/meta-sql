/**
 * OpenLineage Column Lineage Dataset Facet Types
 *
 * This module contains TypeScript types for the OpenLineage Column Lineage Dataset Facet.
 * It provides fine-grained information on datasets' dependencies, allowing understanding
 * of which input columns are used to produce which output columns and in what way.
 *
 * @see https://openlineage.io/spec/facets/1-2-0/ColumnLineageDatasetFacet.json
 * @see https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
 */

/**
 * Base interface for all OpenLineage dataset facets
 */
export interface DatasetFacet {
  /** Producer URI identifying the system that emitted this facet */
  _producer?: string;
  /** Schema URL for this facet */
  _schemaURL?: string;
  /** Whether this facet represents a deleted entity */
  _deleted?: boolean;
}

/**
 * Transformation type indicating how direct the relationship is between input and output
 */
export type TransformationType =
  /** Output column value was somehow derived from inputField value */
  | "DIRECT"
  /** Output column value is impacted by the value of inputField column, but it's not derived from it */
  | "INDIRECT";

/**
 * Transformation subtype providing more specific information about the transformation
 */
export type TransformationSubtype =
  // Direct subtypes
  /** Output value is taken as is from the input */
  | "IDENTITY"
  /** Output value is transformed source value from input row */
  | "TRANSFORMATION"
  /** Output value is aggregation of source values from multiple input rows */
  | "AGGREGATION"
  // Indirect subtypes
  /** Input used in join condition */
  | "JOIN"
  /** Output is aggregated based on input (e.g. GROUP BY clause) */
  | "GROUP_BY"
  /** Input used as a filtering condition (e.g. WHERE clause) */
  | "FILTER"
  /** Output is sorted based on input field (e.g. ORDER BY clause) */
  | "SORT"
  /** Output is windowed based on input field */
  | "WINDOW"
  /** Input value is used in IF or CASE WHEN statements */
  | "CONDITION";

/**
 * Transformation information describing the nature of relation between input and output columns
 */
export interface Transformation {
  /** The type of the transformation */
  type: TransformationType;
  /** The subtype of the transformation providing more specific information */
  subtype?: TransformationSubtype;
  /** A string representation of the transformation applied */
  description?: string;
  /**
   * Boolean value indicating if the input value was obfuscated during the transformation.
   * Examples: hash for TRANSFORMATION, count for AGGREGATION
   */
  masking?: boolean;
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Represents a single dependency on some field (column)
 */
export interface InputField {
  /** The input dataset namespace */
  namespace: string;
  /** The input dataset name */
  name: string;
  /** The input field name */
  field: string;
  /** Transformations applied to this field */
  transformations?: Transformation[];
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Column level lineage information for a single output field
 */
export interface FieldLineage {
  /** Input fields used to evaluate this output field */
  inputFields: InputField[];
  /**
   * @deprecated Use transformations in InputField instead
   * A string representation of the transformation applied
   */
  transformationDescription?: string;
  /**
   * @deprecated Use transformations in InputField instead
   * IDENTITY|MASKED reflects a clearly defined behavior.
   * IDENTITY: exact same as input; MASKED: no original data available (like a hash of PII for example)
   */
  transformationType?: "IDENTITY" | "MASKED";
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Column level lineage that maps output fields into input fields used to evaluate them
 */
export interface ColumnLineageDatasetFacet extends DatasetFacet {
  /**
   * Column level lineage that maps output fields into input fields used to evaluate them.
   * Key is the output field name, value is the lineage information.
   */
  fields: Record<string, FieldLineage>;
  /**
   * Column level lineage that affects the whole dataset.
   * This includes filtering, sorting, grouping (aggregates), joining, window functions, etc.
   * These are operations that affect all columns but don't map directly to specific output columns.
   */
  dataset?: InputField[];
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Root interface for the column lineage facet as it appears in OpenLineage events
 */
export interface ColumnLineageRoot {
  columnLineage: ColumnLineageDatasetFacet;
}
