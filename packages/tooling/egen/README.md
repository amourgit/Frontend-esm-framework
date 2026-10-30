# egen

The one stop CLI for using the Egen 3.0 Frontend app.

## Prerequisites

You need Node.js (>= 20.11.0) with NPM. We recommend using version 22 (LTS) or later.

## Installation

You can run the tool without installation using `npx`, which is part of NPM. Just make sure to fulfill the prerequisites.

Alternatively, install the application globally using `npm i -g @egen-civitas/egen`. Then you can run the tool without `npx`, e.g., instead of `npx @egen-civitas/egen ...` you run `egen ...`.

## Available Commands

The following commands are available. For an up-to-date help on your installation run `npx @egen-civitas/egen --help`.

The `--help` flag can also be applied to any command below, resulting in detailed information about the available options.

### `start`

> For developers.

Starts the app shell configured for the SPA reference application. Includes a default import map working against a working snapshot on the CDN.

Example:

```sh
# run the command
npx @egen-civitas/egen
```

### `develop`

> For developers and implementers.

Performs a debug build of the app shell and runs it against a given Egen backend. Can be proxied to any network and used with any import map configuration.

Example:

```sh
# run the command
npx @egen-civitas/egen develop
```

### `build`

> For implementers.

Builds the app shell with a given configuration. Provides the assets necessary for the app shell in a distribution.

Example:

```sh
# run the command
npx @egen-civitas/egen build
```

### `assemble`

> For implementers.

Assembles an import map incl. assets to provide the frontend module assets for a distribution.

Example:

```sh
# run the command
npx @egen-civitas/egen assemble
```

## Client branding (favicon, PWA icon)

`egen` and the app shell are generic and ship no brand identity, only neutral placeholders. A client project supplies its own favicon and installable-app icon by pointing `EGEN_BRAND_DIR` to a folder containing `favicon.ico` and/or `icon-512.png`:

```sh
# .env.development (or .env.production, or the process environment)
EGEN_BRAND_DIR=branding/shell
```

A relative path is resolved from the root of the consuming monorepo. `develop` serves that folder ahead of the app shell's own assets, and `build` copies it over them. Missing files fall back to the neutral ones, and an invalid path is ignored with a warning.
