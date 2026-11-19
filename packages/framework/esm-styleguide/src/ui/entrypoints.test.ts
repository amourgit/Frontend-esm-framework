import { describe, expect, it } from 'vitest';
import * as internal from '../internal';
import * as publicApi from '../public';

// Le point d'entrée principal du package (`internal`) et l'API publique documentée (`public`) doivent tous deux exposer
// les composants de base : un oubli dans l'un des deux rend l'import impossible pour les consommateurs.
const COMPONENTS = [
  'Button',
  'IconButton',
  'Link',
  'Badge',
  'Tile',
  'Layer',
  'Dialog',
  'DropdownMenu',
  'Tabs',
  'Table',
  'Alert',
  'Checkbox',
  'RadioGroup',
  'SearchInput',
  'TextInput',
  'PasswordInput',
  'Switch',
  'Skeleton',
  'Accordion',
  'MenuList',
  'StructuredList',
  'ModalHeader',
  'AppHeader',
  'NotificationBanner',
  'InlineLoading',
  'Spinner',
] as const;

describe('points d’entrée du styleguide', () => {
  it.each(COMPONENTS)('exporte %s depuis `internal` et `public`', (name) => {
    expect(internal).toHaveProperty(name);
    expect(publicApi).toHaveProperty(name);
  });
});
