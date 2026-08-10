/** @module @category API */
import { egenFetch, restBaseUrl } from '@egen/esm-api';
import type { UploadedFile } from './types';

/** Base URL for the attachment REST API endpoint. */
export const attachmentUrl = `${restBaseUrl}/attachment`;

/**
 * Fetches a single attachment by its UUID.
 *
 * @param attachmentUuid The UUID of the attachment to fetch.
 * @param abortController An AbortController to allow cancellation of the request.
 */
export function getAttachmentByUuid(attachmentUuid: string, abortController: AbortController) {
  return egenFetch(`${attachmentUrl}/${attachmentUuid}`, {
    signal: abortController.signal,
  });
}

/**
 * Fetches all attachments for a specific entity.
 *
 * @param entityUuid The UUID of the entity whose attachments should be fetched.
 * @param includeOrphan Whether to include attachments not associated with any interaction.
 * @param abortController An AbortController to allow cancellation of the request.
 */
export function getAttachments(entityUuid: string, includeOrphan: boolean, abortController: AbortController) {
  return egenFetch(`${attachmentUrl}?entity=${entityUuid}&includeOrphan=${includeOrphan}`, {
    signal: abortController.signal,
  });
}

/**
 * Creates a new attachment for an entity by uploading a file.
 * The file can be provided either as a File object or as base64-encoded content.
 *
 * @param entityUuid The UUID of the entity to associate the attachment with.
 * @param fileToUpload An object containing the file data and metadata to upload.
 */
export async function createAttachment(entityUuid: string, fileToUpload: UploadedFile) {
  const formData = new FormData();

  formData.append('fileCaption', fileToUpload.fileDescription);
  formData.append('entity', entityUuid);

  if (fileToUpload.file) {
    formData.append('file', fileToUpload.file, fileToUpload.fileName);
  } else {
    formData.append('file', new File([''], fileToUpload.fileName), fileToUpload.fileName);
    formData.append('base64Content', fileToUpload.base64Content);
  }

  return egenFetch(`${attachmentUrl}`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Permanently deletes an attachment. This action cannot be undone.
 *
 * @param attachmentUuid The UUID of the attachment to delete.
 * @param abortController An AbortController to allow cancellation of the request.
 */
export function deleteAttachmentPermanently(attachmentUuid: string, abortController: AbortController) {
  return egenFetch(`${attachmentUrl}/${attachmentUuid}`, {
    method: 'DELETE',
    signal: abortController.signal,
  });
}
