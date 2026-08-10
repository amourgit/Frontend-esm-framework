import { addSvg } from '../svg-utils';
import appointments from './svgs/appointments.svg';
import assessment1 from './svgs/assessment-1.svg';
import assessment2 from './svgs/assessment-2.svg';
import bloodBank from './svgs/blood-bank.svg';
import cardiology from './svgs/cardiology.svg';
import ctScan from './svgs/ct-scan.svg';
import dentistry from './svgs/dentistry.svg';
import emergencyDepartment from './svgs/emergency-department.svg';
import facility from './svgs/facility.svg';
import geriatrics from './svgs/geriatrics.svg';
import gynaecology from './svgs/gynaecology.svg';
import inPatient from './svgs/in-patient.svg';
import stockManagement from './svgs/inventory.svg';
import labs from './svgs/labs.svg';
import labs2 from './svgs/labs-2.svg';
import obstetrics from './svgs/obstetrics.svg';
import patientSearch from './svgs/patient-search.svg';
import patients from './svgs/patients.svg';
import paymentsDesk from './svgs/payments-desk.svg';
import pharmacy from './svgs/pharmacy-1.svg';
import pharmacy2 from './svgs/pharmacy-2.svg';
import patientRegistration from './svgs/registration.svg';
import serviceQueues from './svgs/service-queues.svg';
import transfer from './svgs/transfer.svg';
import triage from './svgs/triage.svg';
import xray from './svgs/x-ray.svg';
import { type PictogramId } from './pictograms';

export function setupPictograms() {
  addPictogramSvg('egen-pict-appointments', appointments);
  addPictogramSvg('egen-pict-assessment-1', assessment1);
  addPictogramSvg('egen-pict-assessment-2', assessment2);
  addPictogramSvg('egen-pict-blood-bank', bloodBank);
  addPictogramSvg('egen-pict-cardiology', cardiology);
  addPictogramSvg('egen-pict-ct-scan', ctScan);
  addPictogramSvg('egen-pict-dentistry', dentistry);
  addPictogramSvg('egen-pict-emergency-department', emergencyDepartment);
  addPictogramSvg('egen-pict-facility', facility);
  addPictogramSvg('egen-pict-geriatrics', geriatrics);
  addPictogramSvg('egen-pict-gynaecology', gynaecology);
  addPictogramSvg('egen-pict-in-patient', inPatient);
  addPictogramSvg('egen-pict-laboratory', labs);
  addPictogramSvg('egen-pict-labs-2', labs2);
  addPictogramSvg('egen-pict-obstetrics', obstetrics);
  addPictogramSvg('egen-pict-patient-search', patientSearch);
  addPictogramSvg('egen-pict-patients', patients);
  addPictogramSvg('egen-pict-payments-desk', paymentsDesk);
  addPictogramSvg('egen-pict-pharmacy', pharmacy);
  addPictogramSvg('egen-pict-pharmacy-2', pharmacy2);
  addPictogramSvg('egen-pict-registration', patientRegistration);
  addPictogramSvg('egen-pict-service-queues', serviceQueues);
  addPictogramSvg('egen-pict-stock-management', stockManagement);
  addPictogramSvg('egen-pict-transfer', transfer);
  addPictogramSvg('egen-pict-triage', triage);
  addPictogramSvg('egen-pict-x-ray', xray);
}

/**
 * A type-safe wrapper around addSvg
 * @param pictogramId
 * @param svgString
 */
function addPictogramSvg(pictogramId: PictogramId, svgString: string) {
  addSvg(pictogramId, svgString);
}
