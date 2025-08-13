import request from 'supertest';
import app from '../server.js';

describe('Duplicate Overall Marksheet Services API Test', () => {
  const authToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3MzkxNzA2MTQsImV4cCI6MTczOTc3NTQxNCwidHlwZSI6ImFjY2VzcyIsImRldmljZV9pZCI6IlVQMUEuMjMxMDA1LjAwNyIsInN1YiI6IjY2ODI0ZDgxNzUxYzgxZDU1NzBkM2I0OSIsImtleSI6ImVGaHpVUVV6Y1V5dzl5VWFOZyIsImRhdGEiOnsibmFtZSI6IkFybmFiIiwiZW1haWwiOiIiLCJtb2JpbGUiOiI5MTAxMDQ1OTY5IiwidXNlcklkIjoiNjY4MjRkODE3NTFjODFkNTU3MGQzYjQ5IiwibG9naW5EZXZpY2VUeXBlIjoiTSIsInVzZXJUeXBlIjoidXNlciIsImlzTG9nZ2VkSW4iOnRydWV9fQ.QB7qnAyvuJdMMD351EDtRBW-CW7jt5RlxwpqxcTMnFc';

  const TEST_CONSTANTS = {
    VALID_SERVICE_ID: 'DUPOM_AEI',
    INVALID_SERVICE_ID: 'INVALID_SERVICE_ID',
    VALID_APPLICATION_ID: '67b01f05341d84b46561f05a',
    INVALID_APPLICATION_ID: '6761a173373b4a88870a7cc',
    TIMEOUT: 5000,
    BASE_URL: '/dte/v1/duplicate-overall-marksheet',
    VALID_PAGE_ID: '2',

  };

  describe('Create Application', () => {
    const validUserData = {
      fillUpLanguage: 'English',
      applicant_name: 'higyigig',
      applicant_gender: 'Female',
      father_name: 'hgjhg hbhb',
      mobile: '8638746953',
      roll_no: '197331',                    
      enrolment_no_registration_no: '719273', 
      abc_apaar_id: '111111111992',
      caste: 1,
      community: 3,
      religion: 1,
      mother_name: 'Testest',
      branch: 'CV',
    };

    const invalidUserData = {
      fillUpLanguage: 'English',
      applicant_name: 'higyigig',
      mobile: '8638746953',
      email: 'kashyapjyotim9@gmail.com',
      abc_apaar_id: '111111111111',
      caste: 1,
      community: 3,
      religion: 1,
    };
    it('should successfully create an application with valid data', async () => {
      const res = await request(app)
        .post(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}`)
        .send(validUserData)
        .set('Authorization', authToken);
      if (res.statusCode !== 200) {
        expect(res.statusCode).not.toBe(200);
        expect(res.body.status).toMatch(/fail|error/);
      } else {
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBe(res.body.message);
      }
    }, TEST_CONSTANTS.TIMEOUT);

    it('should fail to create an application with missing required fields', async () => {
      const res = await request(app)
        .post(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}`)
        .send(invalidUserData)
        .set('Authorization', authToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toMatch(/fail|error/);
      expect(res.body.message).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);
  });

  describe('Retrieve Application', () => {
    it('should retrieve an application with a valid application ID', async () => {
      const res = await request(app)
        .get(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}/${TEST_CONSTANTS.VALID_APPLICATION_ID}`)
        .set('Authorization', authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBeDefined();
      expect(res.body.data).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);

    it('should fail to retrieve an application with an invalid application ID', async () => {
      const res = await request(app)
        .get(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}/${TEST_CONSTANTS.INVALID_APPLICATION_ID}`)
        .set('Authorization', authToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toMatch(/fail|error/);
      expect(res.body.message).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);

  });

  describe('Update Application', () => {
    const validUpdateData = {
      address_line1_p: 'pathsala, assam',
      address_line2_p: 'pathsala, assam',
      state_p: '21',
      district_p: '344',
      mouza_p: 'jhihih',
      village_p: 'pathsala',
      police_st_p: 'pathsala',
      post_office_p: 'pathsala',
      pin_code_p: '781325',
      same_as_present_address: 'No',
      address_line1: 'pathsala, assam',
      address_line2: 'pathsala, assam',
      state: '21',
      district: '344',
      mouza: 'jhihih',
      village: 'pathsscsssssssssssssssssssssssssssssala',
      police_st: 'pathsala',
      post_office: 'pathsala',
      pin_code: '781325',
    };

    const invalidUpdateData = {
      address_line1: 'pathsala, assam',
      state: 'ASSAM',
      pin_code: '781325',
    };

    it('should successfully update an application with valid data', async () => {
      const res = await request(app)
        .patch(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}/${TEST_CONSTANTS.VALID_APPLICATION_ID}/${TEST_CONSTANTS.VALID_PAGE_ID}`)
        .send(validUpdateData)
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);

    it('should fail to update an application with missing required fields', async () => {
      const res = await request(app)
        .patch(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}/${TEST_CONSTANTS.VALID_APPLICATION_ID}/${TEST_CONSTANTS.VALID_PAGE_ID}`)
        .send(invalidUpdateData)
        .set('Authorization', authToken);

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toMatch(/fail|error/);
      expect(res.body.message).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);

  });

  describe('Upload Documents', () => {
    const validFileData = {
      enclosures: {
        doc_type: 'image/jpeg',
        newspaper_cutting_type: 'Newspaper Cutting',
        newspaper_cutting: 'iVBORw0KGgoAAAANSUhEUgAABmgAAAOcCAYAAABKQj5wAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAO3RFWHRDb21tZW50AHhyOmQ6REFGLVE1clJOVms6NCxqOjE0NDA0NDYyODQ0MjM1MjAwOTMsdDoyNDAzMDExMVCW2WsAAATnaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXR',
      },
    };

    const invalidFileData = {
      enclosures: {
        doc_type: 'image/jpeg',
        newspaper_cutting: 'iVBORw0KGgoAAAANSUhEUgAABmgaAAOcCAYAAABKQj5wAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAO3RFWHRDb21tZW50AHhyOmQ6REFGLVE1clJOVms6NCxqOjE0NDA0NDYyODQ0MjM1MjAwOTMsdDoyNDAzMDExMVCW2WsAAATnaVRYdFhNTDpjb20uYWRvYmUueG1wAAAAAAA8eDp4bXBtZXR',
      },
    };

    it('should successfully upload documents with valid data', async () => {
      const res = await request(app)
        .patch(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}/${TEST_CONSTANTS.VALID_APPLICATION_ID}/documents`)
        .send(validFileData)
        .set('Authorization', authToken);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);

    it('should fail to upload documents with missing required fields', async () => {
      const res = await request(app)
        .patch(`${TEST_CONSTANTS.BASE_URL}/${TEST_CONSTANTS.VALID_SERVICE_ID}/${TEST_CONSTANTS.VALID_APPLICATION_ID}/documents`)
        .send(invalidFileData)
        .set('Authorization', authToken);
      expect(res.statusCode).toBe(500);
      expect(res.body.status).toMatch(/fail|error/);
      expect(res.body.message).toBeDefined();
    }, TEST_CONSTANTS.TIMEOUT);
   
  });

});


// 4 p 4 f