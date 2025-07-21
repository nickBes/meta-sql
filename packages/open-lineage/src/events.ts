/**
 * OpenLineage Event Types
 *
 * Complete OpenLineage specification types for all event types.
 * Based on the official OpenLineage specification.
 *
 * @see https://openlineage.io/docs/spec/object-model
 * @see https://github.com/OpenLineage/OpenLineage/blob/main/spec/OpenLineage.json
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base event structure for all OpenLineage events
 */
export interface BaseEvent {
  /** The time the event occurred at */
  eventTime: string;
  /** URI identifying the producer of this metadata */
  producer: string;
  /** The JSON Pointer URL to the corresponding version of the schema definition */
  schemaURL: string;
}

/**
 * Base facet interface following OpenLineage spec
 */
export interface BaseFacet {
  /** Producer URI identifying the system that emitted this facet */
  _producer: string;
  /** Schema URL for this facet */
  _schemaURL: string;
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Job facets interface
 */
export interface JobFacet extends BaseFacet {
  /** Whether this facet represents a deleted entity */
  _deleted?: boolean;
}

/**
 * Run facets interface
 */
export interface RunFacet extends BaseFacet {
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Dataset facets interface
 */
export interface DatasetFacet extends BaseFacet {
  /** Whether this facet represents a deleted entity */
  _deleted?: boolean;
}

/**
 * Input dataset facets interface
 */
export interface InputDatasetFacet extends BaseFacet {
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Output dataset facets interface
 */
export interface OutputDatasetFacet extends BaseFacet {
  /** Additional properties for extensibility */
  [key: string]: unknown;
}

/**
 * Job definition
 */
export interface Job {
  /** The namespace containing that job */
  namespace: string;
  /** The unique name for that job within that namespace */
  name: string;
  /** The job facets */
  facets?: Record<string, JobFacet>;
}

/**
 * Run definition
 */
export interface Run {
  /** The globally unique ID of the run associated to the job (UUID format recommended) */
  runId: string;
  /** The run facets */
  facets?: Record<string, RunFacet>;
}

/**
 * Base Dataset definition
 */
export interface Dataset {
  /** The namespace containing that dataset */
  namespace: string;
  /** The unique name for that dataset within that namespace */
  name: string;
  /** The facets for this dataset */
  facets?: Record<string, DatasetFacet>;
}

/**
 * Input dataset for job/run events
 */
export interface InputDataset extends Dataset {
  /** The input facets for this dataset */
  inputFacets?: Record<string, InputDatasetFacet>;
}

/**
 * Output dataset for job/run events
 */
export interface OutputDataset extends Dataset {
  /** The output facets for this dataset */
  outputFacets?: Record<string, OutputDatasetFacet>;
}

/**
 * Static dataset for dataset events (design-time metadata)
 */
export interface StaticDataset extends Dataset {
  /** Static datasets inherit all properties from Dataset */
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event types for OpenLineage run events
 */
export type EventType =
  | "START"
  | "RUNNING"
  | "COMPLETE"
  | "ABORT"
  | "FAIL"
  | "OTHER";

/**
 * Run Event for job execution lifecycle
 *
 * Represents the lifecycle of a job execution with run context.
 * This is the primary event type for tracking actual job runs in DataHub.
 */
export interface RunEvent extends BaseEvent {
  /** The type of event indicating the run state transition */
  eventType: EventType;
  /** The run associated with this event (required) */
  run: Run;
  /** The job this event is about (required) */
  job: Job;
  /** The set of input datasets */
  inputs?: InputDataset[];
  /** The set of output datasets */
  outputs?: OutputDataset[];
}

/**
 * Job Event for static metadata
 *
 * Provides a way to describe a job's static properties such as source code
 * location, declared inputs and outputs, and documentation. Emitted at design-time
 * and NOT associated with a Run.
 */
export interface JobEvent extends BaseEvent {
  /** The job this event is about (required) */
  job: Job;
  /** The set of input datasets */
  inputs?: InputDataset[];
  /** The set of output datasets */
  outputs?: OutputDataset[];
}

/**
 * Dataset Event for static dataset metadata
 *
 * Allows metadata to be attached to a dataset outside the context of a job or job run.
 * Used for static schema extraction, documentation generation, or governance.
 * Emitted at design-time and NOT associated with a Run or Job.
 */
export interface DatasetEvent extends BaseEvent {
  /** The dataset this event is about (required) */
  dataset: StaticDataset;
}
