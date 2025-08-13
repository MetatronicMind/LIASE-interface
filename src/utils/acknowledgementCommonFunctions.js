import dateFormat from 'dateformat';
import AppError from './appError.js';
import spServicesModel from '../models/common/spServicesModel.js';
import ServiceMapper from './serviceMapper.js';

async function acknowledgementObject(dbResult) {
  const serviceId = dbResult.service_data.service_id;

  const isService = ServiceMapper.isValidService(serviceId);
  let ackObject;
  if (isService) {
    ackObject = await armsAckObject(dbResult);
  } else {
    ackObject = await defaultAckObject(dbResult);
  }

  return ackObject;
}

async function defaultAckObject(dbResult) {
  return {
    basic_details: {
      template_id: 1,
      appl_ref_no: dbResult.service_data.appl_ref_no,
      appl_status: dbResult.service_data.appl_status,
      service_id: dbResult.service_data.service_id,
      payment_status: dbResult.form_data.pfc_payment_status,
      grn: dbResult.form_data.pfc_payment_response?.GRN,
      submitted_date: dateFormat(
        dbResult.service_data.submission_date,
        'dd-mm-yyyy',
      ),
      timeline: dbResult.service_data.service_timeline,
      ack_type: 'first_payment',
      applicant_name: dbResult.form_data.applicant_basic_info.applicant_name,
      mobile: dbResult.form_data.applicant_basic_info.mobile,
      service_name: dbResult.service_data.service_name,
      department_name: dbResult.service_data.department_name,
    },
    fee_detail: {
      total_amount: 10,
      fee_items: [
        {
          fee_param: 'Convinence Fee',
          fee_value: '10',
        },
      ],
    },
    images: [
      {
        logo: 'SS_LOGO.png',
      },
    ],
  };
}

async function armsAckObject(dbResult) {
  if (
    !dbResult.form_data.pfc_payment_response
    || !dbResult.form_data.pfc_payment_response.AMOUNT
    || dbResult.form_data.pfc_payment_response.AMOUNT === ''
  ) {
    throw new AppError('Payment response or amount is missing');
  }

  const serviceId = dbResult.service_data.service_id;
  const serviceDetails = await spServicesModel.findOne({
    service_id: serviceId,
  });

  if (!serviceDetails) {
    throw new AppError(
      `Service details not found for service ID: ${serviceId}`,
    );
  }

  const ackObject = {
    template_id: '5',
    appl_ref_no: dbResult.service_data.appl_ref_no,
    appl_status: dbResult.service_data.appl_status,
    service_id: dbResult.service_data.service_id,
    payment_status: dbResult.form_data.pfc_payment_status,
    grn: dbResult.form_data.pfc_payment_response.GRN,
    submitted_date: dateFormat(dbResult.service_data.submission_date, 'dd/mm/yyyy'),
    ack_type: 'first_payment',
    applicant_name: dbResult.form_data.applicant_basic_info.applicant_name,
    mobile: dbResult.form_data.applicant_basic_info.mobile,
    service_name: dbResult.service_data.service_name,
    department_name: dbResult.service_data.department_name,
    convinence_fee: dbResult.form_data.convenience_fee,
    // application_fee: "0",
    total_amount: dbResult.form_data.pfc_payment_response.AMOUNT,
    user_type: dbResult.form_data.user_type,
  };

  if (['PFC', 'pfc', 'csc', 'CSC'].includes(dbResult.form_data.user_type)) {
    ackObject.service_fee = dbResult.form_data.service_charge;
    ackObject.printing_fee = dbResult.form_data.printing_charge_per_page * dbResult.form_data.no_printing_page;
    ackObject.scanning_fee = dbResult.form_data.scanning_charge_per_page * dbResult.form_data.no_scanning_page;
  }

  return ackObject;
}

export default acknowledgementObject;
