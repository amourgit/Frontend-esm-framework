import type { StorybookConfig } from 'storybook-react-rsbuild';
import { mergeRsbuildConfig } from '@rsbuild/core';
import { pluginSass } from '@rsbuild/plugin-sass';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const frameworkRoot = path.resolve(__dirname, '../../../framework');
const mocksRoot = path.resolve(__dirname, '../mocks');

const config: StorybookConfig = {
  stories: [path.resolve(frameworkRoot, 'esm-styleguide/src/**/*.stories.@(ts|tsx)')],
  addons: ['@storybook/addon-links'],
  framework: 'storybook-react-rsbuild',
  core: {
    disableTelemetry: true,
  },
  rsbuildFinal: (config) => {
    return mergeRsbuildConfig(config, {
      output: {
        assetPrefix: process.env.STORYBOOK_BASE_PATH || '/',
      },
      plugins: [
        pluginSass({
          sassLoaderOptions: {
            api: 'modern-compiler',
            implementation: require.resolve('sass-embedded'),
            sassOptions: { quietDeps: true },
          },
        }),
      ],
      resolve: {
        alias: {
          // Replace framework peer dependency imports with Storybook-compatible mocks.
          // These mocks provide plain-function implementations (no vi.fn() / jest.fn())
          // that return sensible defaults.
          '@egen/esm-react-utils': path.resolve(mocksRoot, 'esm-react-utils.ts'),
          '@egen/esm-translations': path.resolve(mocksRoot, 'esm-translations.ts'),
          '@egen/esm-config': path.resolve(mocksRoot, 'esm-config.ts'),
          '@egen/esm-api': path.resolve(mocksRoot, 'esm-api.ts'),
          '@egen/esm-state': path.resolve(mocksRoot, 'esm-state.ts'),
          '@egen/esm-extensions': path.resolve(mocksRoot, 'esm-extensions.ts'),
          '@egen/esm-data-api': path.resolve(mocksRoot, 'esm-data-api.ts'),
          '@egen/esm-globals': path.resolve(mocksRoot, 'esm-globals.ts'),
          '@egen/esm-navigation': path.resolve(mocksRoot, 'esm-navigation.ts'),
          '@egen/esm-error-handling': path.resolve(mocksRoot, 'esm-error-handling.ts'),

          // Barrel re-export mock so that `import { X } from '@egen/esm-framework'`
          // resolves through our mocks instead of pulling in the real framework.
          '@egen/esm-framework': path.resolve(mocksRoot, 'esm-framework.ts'),

          // Direct source-path aliases that bypass package.json exports
          // restrictions. Needed because mocks and preview setup import
          // specific source files from framework packages.
          '@egen/esm-translations/src/translations': path.resolve(
            frameworkRoot,
            'esm-translations/src/translations.ts',
          ),
          '@egen/esm-styleguide/src/icons/icon-registration': path.resolve(
            frameworkRoot,
            'esm-styleguide/src/icons/icon-registration.ts',
          ),
          '@egen/esm-styleguide/src/pictograms/pictogram-registration': path.resolve(
            frameworkRoot,
            'esm-styleguide/src/pictograms/pictogram-registration.ts',
          ),
          '@egen/esm-styleguide/src/empty-card/empty-card-registration': path.resolve(
            frameworkRoot,
            'esm-styleguide/src/empty-card/empty-card-registration.ts',
          ),
          '@egen/esm-styleguide/src/config-schema': path.resolve(frameworkRoot, 'esm-styleguide/src/config-schema.ts'),
          '@egen/esm-styleguide/src/svg-utils': path.resolve(frameworkRoot, 'esm-styleguide/src/svg-utils.ts'),
        },
      },
      tools: {
        rspack: (rspackConfig) => {
          // SVG files should be loaded as raw strings (matching the styleguide's
          // rspack.config.cjs), so that icon-registration.ts can parse and inject
          // them into the SVG sprite container.
          rspackConfig.module ??= {};
          rspackConfig.module.rules ??= [];
          rspackConfig.module.rules.push({
            test: /\.svg$/,
            use: [require.resolve('svgo-loader')],
            type: 'asset/source',
          });

          // Ensure @egen/esm-framework alias is applied at the rspack level.
          // The rsbuild-level resolve.alias may not override workspace package
          // resolution for this barrel package.
          rspackConfig.resolve ??= {};
          rspackConfig.resolve.alias ??= {};
          if (typeof rspackConfig.resolve.alias === 'object' && !Array.isArray(rspackConfig.resolve.alias)) {
            rspackConfig.resolve.alias['@egen/esm-framework$'] = path.resolve(mocksRoot, 'esm-framework.ts');
          }

          return rspackConfig;
        },
      },
    });
  },
};

export default config;
