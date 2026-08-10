import { defineConfigSchema } from '@egen-civitas/esm-config';
import { registerModal } from '@egen-civitas/esm-extensions';
import { getSyncLifecycle } from '@egen-civitas/esm-react-utils';
import { setupBranding } from './brand';
import { esmStyleGuideSchema } from './config-schema';
import { setupEmptyCard } from './empty-card/empty-card-registration';
import { setupIcons } from './icons/icon-registration';
import { setupLogo } from './logo';
import { setupPictograms } from './pictograms/pictogram-registration';
import { flushSvgs } from './svg-utils';
import Workspace2ClosePromptModal from './workspaces2/workspace2-close-prompt.modal';

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
