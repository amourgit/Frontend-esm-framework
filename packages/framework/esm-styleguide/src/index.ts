import { defineConfigSchema } from '@egen-civitas/esm-config';
import { registerModal } from '@egen-civitas/esm-extensions';
import { getSyncLifecycle } from '@egen-civitas/esm-react-utils';
import { setupBranding } from './brand.js';
import { esmStyleGuideSchema } from './config-schema.js';
import { setupEmptyCard } from './empty-card/empty-card-registration.js';
import { setupIcons } from './icons/icon-registration.js';
import { setupLogo } from './logo/index.js';
import { setupPictograms } from './pictograms/pictogram-registration.js';
import { flushSvgs } from './svg-utils.js';
import Workspace2ClosePromptModal from './workspaces2/workspace2-close-prompt.modal.js';

defineConfigSchema('@egen-civitas/esm-styleguide', esmStyleGuideSchema);
setupBranding();
setupLogo();
setupIcons();
setupPictograms();
setupEmptyCard();
flushSvgs();

registerModal({
  name: 'workspace2-close-prompt',
  moduleName: '@egen-civitas/esm-styleguide',
  load: getSyncLifecycle(Workspace2ClosePromptModal, {
    featureName: 'workspace2-close-prompt',
    moduleName: '@egen-civitas/esm-styleguide',
  }),
});
