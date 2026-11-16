import React from 'react';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { Button, ModalBody, ModalFooter, ModalHeader } from '../ui/index.js';

interface WorkspaceUnsavedChangesModal {
  onConfirm: () => void;
  onCancel: () => void;
  affectedWorkspaceTitles: string[];
}

/**
 * This modal is used for prompting user to confirm closing currently opened workspace.
 */
const Workspace2ClosePromptModal: React.FC<WorkspaceUnsavedChangesModal> = ({
  onConfirm,
  onCancel,
  affectedWorkspaceTitles,
}) => {
  return (
    <>
      <ModalHeader onClose={onCancel} closeLabel={getCoreTranslation('close', 'Close')} title={getCoreTranslation('closeWorkspaces2PromptTitle')} />
      <ModalBody>
        <p>{getCoreTranslation('closeWorkspaces2PromptBody')}</p>
        <ul className="list-disc pl-6">
          {affectedWorkspaceTitles.map((title) => (
            <li key={title} className="ml-4">{title}</li>
          ))}
        </ul>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          {getCoreTranslation('cancel', 'Cancel')}
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          {getCoreTranslation('discardChanges', 'Discard changes')}
        </Button>
      </ModalFooter>
    </>
  );
};

export default Workspace2ClosePromptModal;
