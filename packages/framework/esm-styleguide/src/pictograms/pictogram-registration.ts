import { addSvg } from '../svg-utils.js';
import appointments from './svgs/appointments.svg';
import assessment1 from './svgs/assessment-1.svg';
import assessment2 from './svgs/assessment-2.svg';
import facility from './svgs/facility.svg';
import stockManagement from './svgs/inventory.svg';
import paymentsDesk from './svgs/payments-desk.svg';
import registration from './svgs/registration.svg';
import serviceQueues from './svgs/service-queues.svg';
import transfer from './svgs/transfer.svg';
import { type PictogramId } from './pictograms.js';

export function setupPictograms() {
  addPictogramSvg('egen-pict-appointments', appointments);
  addPictogramSvg('egen-pict-assessment-1', assessment1);
  addPictogramSvg('egen-pict-assessment-2', assessment2);
  addPictogramSvg('egen-pict-facility', facility);
  addPictogramSvg('egen-pict-payments-desk', paymentsDesk);
  addPictogramSvg('egen-pict-registration', registration);
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
