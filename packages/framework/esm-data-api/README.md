# @egen/esm-data-api

A generic, domain-agnostic data API module for the Egen framework.

## Overview

`esm-data-api` provides a universal set of types, utilities, and API helpers
for interacting with backend data in a modular frontend application.

It is completely **domain-agnostic**: it does not assume any specific business
domain (healthcare, education, finance, logistics, etc.). All concepts are
expressed in neutral, reusable terms:

| Generic Concept | Description |
|----------------|-------------|
| `Entity` | Any actor in the system (user, customer, employee, student…) |
| `Session` | A time-bounded grouping of interactions for an entity |
| `Interaction` | A discrete event or transaction involving an entity |
| `Classification` | A tag, label, or category attached to an entity or interaction |
| `DataPoint` | A single recorded value, observation, or form answer |
| `Task` | A work item, assignment, or action request |
| `CatalogItem` | A product, service, or configurable asset |
| `Location` | A physical or logical place |

## Usage

```ts
import {
  fetchCurrentEntity,
  getSessionsForEntity,
  getSessionTypes,
  getLocations,
} from '@egen/esm-framework';
```

## Architecture

This module is part of the Egen micro-frontend framework. It provides:

- **Types** (`src/types/`) — TypeScript interfaces for all generic resources
- **Attachments** (`src/attachments.ts`) — File attachment CRUD API
- **Current Entity** (`src/current-entity.ts`) — Fetch/cache the active entity
- **Session Utils** (`src/session-utils.ts`) — Session state store and CRUD API
- **Session Type** (`src/session-type.ts`) — Fetch available session types
- **Location** (`src/location.ts`) — Fetch and transform locations
- **Events** (`src/events/`) — Custom event bus (fire/subscribe)

## Customization

To adapt this module for your domain, configure:

1. **REST base URL** via `@egen/esm-api` configuration
2. **Session types** — define your domain's session categories in your backend
3. **Entity identifiers** — configure identifier types relevant to your domain
4. **Attributes** — extend entities with domain-specific custom attributes
