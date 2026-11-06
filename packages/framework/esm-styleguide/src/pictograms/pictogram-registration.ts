import { addSvg } from '../svg-utils.js';
import home from './svgs/home.svg';
import stockManagement from './svgs/inventory.svg';
import paymentsDesk from './svgs/payments-desk.svg';
import serviceQueues from './svgs/service-queues.svg';
import transfer from './svgs/transfer.svg';
import { type PictogramId } from './pictograms.js';

export function setupPictograms() {
  addPictogramSvg('egen-pict-home', home);
  addPictogramSvg('egen-pict-payments-desk', paymentsDesk);
  addPictogramSvg('egen-pict-service-queues', serviceQueues);
  addPictogramSvg('egen-pict-stock-management', stockManagement);
  addPictogramSvg('egen-pict-transfer', transfer);
}

/**
 * A type-safe wrapper around addSvg
 * @param pictogramId
 * @param svgString
 */
function addPictogramSvg(pictogramId: PictogramId, svgString: string) {
  addSvg(pictogramId, svgString);
}
