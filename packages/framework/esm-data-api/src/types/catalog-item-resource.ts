import { type Concept, type EgenResource } from '@egen/esm-api';

/**
 * Represents a generic catalog item — a product, service, or configurable asset
 * (replaces domain-specific "Drug").
 */
export interface CatalogItem extends EgenResource {
  uuid: string;
  strength?: string;
  concept: Concept;
  unitForm: EgenResource;
  display: string;
}
