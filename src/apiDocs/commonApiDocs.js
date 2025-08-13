const commonApiPath = {
  paths: {
    '/genders': {
      get: {
        summary: 'Get genders',
        description: 'Get genders',
        tags: ['Common API for Labour Services'],
        operationId: 'genders',
        responses: {
          200: {
            description: 'Get genders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                    },
                    message: {
                      type: 'string',
                      example: 'Get genders',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    '/states': {
      get: {
        summary: 'Get states',
        description: 'Retrieve a list of states',
        tags: ['Common API for Labour Services'],
        operationId: 'getStates',
        responses: {
          200: {
            description: 'States List for DTE Services',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          state_name_english: {
                            type: 'string',
                            example: 'MADHYA PRADESH',
                          },
                          slc: {
                            type: 'integer',
                            example: 23,
                          },
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'States List',
                    },
                  },
                  required: ['status', 'data', 'message'],
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    '/states/{id}/districts': {
      get: {
        summary: 'Get districts of a State',
        description:
          'Retrieve list of districts for a specific state using state ID',
        tags: ['Common API for Labour Services'],
        operationId: 'getDistrictsByState',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'ID of the state',
          },
        ],
        responses: {
          200: {
            description: 'District List of a State',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string',
                      },
                      example: {
                        322: 'BOKARO',
                        323: 'CHATRA',
                        324: 'DEOGHAR',
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'District List of a State',
                    },
                  },
                  required: ['status', 'data', 'message'],
                },
              },
            },
          },
          404: {
            description: 'District not found',
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    '/{serviceId}/application-validator/{objId}': {
      get: {
        summary: 'Validate an application',
        description: 'Validate an application by ID for Polytechics',
        tags: ['Common API for Labour Services'],
        operationId: 'applicationValidator',
        parameters: [
          {
            name: 'serviceId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: ['DUPOAMS_AEI', 'DUPGRRPT_AEI', 'DUPSEMWSMRKSHET_AEI'],
            },
            description: 'Service ID for validation',
          },
          {
            name: 'objId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'MongoDB Object ID of the document to validate',
          },
        ],
        responses: {
          200: {
            description: 'Document validation successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    message: {
                      type: 'string',
                      example: 'Document validation successful',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Validation failed or invalid object ID',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'Document validation failed',
                    },
                    errors: {
                      type: 'object',
                      example: {
                        'form_data.village': {
                          name: 'ValidatorError',
                          message: 'Village must be at least 5 characters long',
                          properties: {
                            message:
                              'Village must be at least 5 characters long',
                            type: 'minlength',
                            minlength: 5,
                            path: 'form_data.village',
                            value: 'jj',
                          },
                          kind: 'minlength',
                          path: 'form_data.village',
                          value: 'jj',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Document not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'No document found with that ID',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    '/{serviceId}/payment-initiate/{id}': {
      post: {
        summary: 'Initiate payment for an application',
        description:
          'Initiate payment for a specific application by service ID and application ID',
        tags: ['Common API for Labour Services'],
        operationId: 'paymentInitiateById',
        parameters: [
          {
            name: 'platform',
            in: 'header',
            required: false,
            schema: {
              type: 'string',
              enum: ['web', 'mobile'],
              default: 'web',
            },
            description: 'Client platform (optional, defaults to "web")',
          },
          {
            name: 'serviceId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: [
                'DUPOM_AEI',
                'DUPGR_AEI',
                'DUPSM_AEI',
                'ORGDIPCER_AEI',
                'ORGMIGCER_AEI',
              ],
            },
            description: 'Service ID for payment initiation',
          },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Application ID',
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  no_printing_page: {
                    type: 'integer',
                    description: 'Number of printing pages (optional)',
                  },
                  no_scanning_page: {
                    type: 'integer',
                    description: 'Number of scanning pages (optional)',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment initiated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        response_type: {
                          type: 'string',
                          enum: ['PAYMENT_REQUEST', 'PAYMENT_RESPONSE'],
                        },
                        doc_id: {
                          type: 'string',
                        },
                        appl_ref_no: {
                          type: 'string',
                        },
                        grass_payment_params: {
                          type: 'object',
                          properties: {
                            DEPT_CODE: { type: 'string' },
                            OFFICE_CODE: { type: 'string' },
                            PERIOD: { type: 'string' },
                            DEPARTMENT_ID: { type: 'string' },
                            MOBILE_NO: { type: 'string' },
                            PARTY_NAME: { type: 'string' },
                            PIN_NO: { type: 'string' },
                            ADDRESS1: { type: 'string' },
                            ADDRESS2: { type: 'string' },
                            NON_TREASURY_PAYMENT_TYPE: { type: 'string' },
                            TOTAL_NON_TREASURY_AMOUNT: { type: 'string' },
                          },
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      example:
                        'Payment was initiated successfully for application',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'number',
                      example: 400,
                    },
                    error: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                        name: { type: 'string', example: 'AxiosError' },
                        stack: { type: 'string' },
                        config: {
                          type: 'object',
                          properties: {
                            headers: { type: 'object' },
                            method: { type: 'string' },
                            url: { type: 'string' },
                            data: { type: 'string' },
                          },
                        },
                        code: { type: 'string', example: 'ERR_BAD_REQUEST' },
                        status: { type: 'number', example: 400 },
                      },
                    },
                    message: { type: 'string' },
                    stack: { type: 'string' },
                  },
                },
              },
            },
          },

          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'number',
                      example: 401,
                    },
                    error: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Request failed with status code 401',
                        },
                        name: { type: 'string', example: 'AxiosError' },
                        stack: { type: 'string' },
                        config: {
                          type: 'object',
                          properties: {
                            headers: { type: 'object' },
                            method: { type: 'string' },
                            url: { type: 'string' },
                            data: { type: 'string' },
                          },
                        },
                        code: { type: 'string', example: 'ERR_BAD_REQUEST' },
                        status: { type: 'number', example: 401 },
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Request failed with status code 401',
                    },
                    stack: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    error: {
                      type: 'object',
                      properties: {
                        statusCode: {
                          type: 'number',
                          example: 404,
                        },
                        status: {
                          type: 'string',
                          example: 'fail',
                        },
                        isOperational: {
                          type: 'boolean',
                          example: true,
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      enum: [
                        'No service found with that ID',
                        'No application found with that ID',
                        "Couldn't update payment details in the application",
                      ],
                    },
                    stack: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },

          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    error: {
                      type: 'object',
                      properties: {
                        statusCode: {
                          type: 'number',
                          example: 500,
                        },
                        status: {
                          type: 'string',
                          example: 'fail',
                        },
                        isOperational: {
                          type: 'boolean',
                          example: true,
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      enum: [
                        'Payment initiation failed',
                        'Something went wrong in application',
                      ],
                    },
                    stack: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/{serviceId}/final-submission/{id}': {
      get: {
        summary: 'Final submission after payment',
        description:
          'Complete the final submission process for an application after payment verification',
        tags: ['Common API for Labour Services'],
        operationId: 'finalSubmissionById',
        parameters: [
          {
            name: 'serviceId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              enum: [
                'DUPOAMS_AEI',
                'DUPGRRPT_AEI',
                'DUPSEMWSMRKSHET_AEI',
                'ORGDIPCER_AEI',
                'ORGMIGCER_AEI',
              ],
            },
            description: 'Service ID for final submission',
          },
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Application ID',
          },
        ],
        responses: {
          200: {
            description: 'Final submission successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        response_type: {
                          type: 'string',
                          example: 'PAYMENT_RESPONSE',
                        },
                        grn: {
                          type: 'string',
                          example: 'GRN1234567890',
                        },
                        appl_ref_no: {
                          type: 'string',
                          example: 'RTPS-DUPOAMS-AEI/2024/4212965888',
                        },
                        payment_status: {
                          type: 'string',
                          enum: ['Y', 'N', 'P', 'A', ' '],
                          example: 'Y',
                        },
                        message: {
                          type: 'string',
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Application was submitted successfully',
                    },
                  },
                },
                examples: {
                  PaymentSuccessful: {
                    summary: 'Payment successful, application submitted',
                    value: {
                      status: 'success',
                      data: {
                        response_type: 'PAYMENT_RESPONSE',
                        grn: 'GRN1234567890',
                        appl_ref_no: 'RTPS-DUPOAMS-AEI/2024/4212965888',
                        payment_status: 'Y',
                        message: 'Application was submitted successfully',
                      },
                      message: 'Application was submitted successfully',
                    },
                  },
                  PaymentFailed: {
                    summary: 'Payment failed',
                    value: {
                      status: 'success',
                      data: {
                        response_type: 'PAYMENT_RESPONSE',
                        grn: 'GRN0987654321',
                        appl_ref_no: 'RTPS-DUPOAMS-AEI/2024/4212965888',
                        payment_status: 'FAILED',
                        message:
                          'The payment has failed. Please try again or contact support if the issue persists.',
                      },
                      message:
                        'Application submission failed due to payment failure',
                    },
                  },
                  PaymentPending: {
                    summary: 'Payment pending',
                    value: {
                      status: 'success',
                      data: {
                        response_type: 'PAYMENT_RESPONSE',
                        grn: 'GRN1122334455',
                        appl_ref_no: 'RTPS-DUPOAMS-AEI/2024/4212965888',
                        payment_status: 'PENDING',
                        message:
                          'Your payment is currently being processed. Please check back later for confirmation.',
                      },
                      message:
                        'Application submission pending due to payment processing',
                    },
                  },
                  PaymentAborted: {
                    summary: 'Payment aborted',
                    value: {
                      status: 'success',
                      data: {
                        response_type: 'PAYMENT_RESPONSE',
                        grn: 'GRN5566778899',
                        appl_ref_no: 'RTPS-DUPOAMS-AEI/2024/4212965888',
                        payment_status: 'ABORTED',
                        message:
                          'The payment process was aborted. Please initiate a new payment transaction.',
                      },
                      message:
                        'Application submission aborted due to payment cancellation',
                    },
                  },
                  PaymentUnknown: {
                    summary: 'Unknown payment status',
                    value: {
                      status: 'success',
                      data: {
                        response_type: 'PAYMENT_RESPONSE',
                        grn: 'GRN6677889900',
                        appl_ref_no: 'RTPS-DUPOAMS-AEI/2024/4212965888',
                        payment_status: 'UNKNOWN',
                        message:
                          'Payment status information is missing. Please check your payment status in the dashboard.',
                      },
                      message:
                        'Application submission status unknown due to payment status. Please contact support.',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'number',
                      example: 400,
                    },
                    error: {
                      type: 'object',
                      properties: {
                        message: { type: 'string' },
                        name: { type: 'string', example: 'AxiosError' },
                        stack: { type: 'string' },
                        config: {
                          type: 'object',
                          properties: {
                            headers: { type: 'object' },
                            method: { type: 'string' },
                            url: { type: 'string' },
                            data: { type: 'string' },
                          },
                        },
                        code: { type: 'string', example: 'ERR_BAD_REQUEST' },
                        status: { type: 'number', example: 400 },
                      },
                    },
                    message: { type: 'string' },
                    stack: { type: 'string' },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'number',
                      example: 401,
                    },
                    error: {
                      type: 'object',
                      properties: {
                        message: {
                          type: 'string',
                          example: 'Request failed with status code 401',
                        },
                        name: { type: 'string', example: 'AxiosError' },
                        stack: { type: 'string' },
                        config: {
                          type: 'object',
                          properties: {
                            headers: { type: 'object' },
                            method: { type: 'string' },
                            url: { type: 'string' },
                            data: { type: 'string' },
                          },
                        },
                        code: { type: 'string', example: 'ERR_BAD_REQUEST' },
                        status: { type: 'number', example: 401 },
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Request failed with status code 401',
                    },
                    stack: { type: 'string' },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    error: {
                      type: 'object',
                      properties: {
                        statusCode: {
                          type: 'number',
                          example: 404,
                        },
                        status: {
                          type: 'string',
                          example: 'fail',
                        },
                        isOperational: {
                          type: 'boolean',
                          example: true,
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      enum: [
                        'No service found with that ID',
                        'No application found with that ID',
                        'Application not in payment stage',
                        'No user found. Please contact department.',
                        'Something went wrong while submitting application',
                        'Invalid payment response - missing GRN',
                      ],
                    },
                    stack: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    error: {
                      type: 'object',
                      properties: {
                        statusCode: {
                          type: 'number',
                          example: 500,
                        },
                        status: {
                          type: 'string',
                          example: 'fail',
                        },
                        isOperational: {
                          type: 'boolean',
                          example: true,
                        },
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Payment validation failed',
                    },
                    stack: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/applications/acknowledgement': {
      get: {
        summary: 'Generate acknowledgement PDF',
        description:
          'Generate acknowledgement PDF for an application using document ID or application reference number',
        tags: ['Common API for Labour Services'],
        operationId: 'generateAcknowledgement',
        parameters: [
          {
            name: 'id',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Document ID or Application Reference Number',
          },
        ],
        responses: {
          200: {
            description: 'Acknowledgement generated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    message: {
                      type: 'string',
                      example:
                        'Acknowledgement has been generated successfully',
                    },
                    data: {
                      type: 'object',
                      properties: {
                        base64Pdf: {
                          type: 'string',
                          description: 'Base64 encoded PDF content',
                          example:
                            'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PC9UaXRsZSAoQWNrbm93bGVkZ2VtZW50KQovQ3JlYXRvciAoTW96aWxsYS81LjAgXChYMTE7IExpbnV4IHg4Nl82NFwpIEFw',
                        },
                      },
                    },
                  },
                  required: ['status', 'message', 'data'],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'Invalid document ID',
                    },
                  },
                },
              },
            },
          },
          404: {
            description: 'Not Found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'No document found with that ID',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example:
                        'PDF data missing in acknowledgement service response',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/enclosure': {
      get: {
        summary: 'Retrieve enclosure file by path',
        description: 'Returns the base64 encoded content of an enclosure file using its file path',
        tags: ['Common API for Labour Services'],
        operationId: 'retrieveEnclosureByPath',
        parameters: [
          {
            name: 'file_path',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Path to the enclosure file',
            example: 'storage/docs/2025/2/27/DUPGRRPT_AEI/RTPS-DUPGRRPT_AEI-2025-1103090610-1740644100439.jpeg',
          },
          {
            name: 'Authorization',
            in: 'header',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Bearer token for authentication',
          },
        ],
        responses: {
          200: {
            description: 'Enclosure file retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'string',
                      description: 'Base64 encoded file content',
                      example: 'iVBORw0KGgoAAAANSUhEUgAABDMAAANeCAYAAAAP+kWxAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAP+lSURBVHhe7N0NQFRV3j/wL1qOizpmib2IjwVqIVqIbWC1gG6gbvhSEK2YrBiuuLpisZKarpqu+WCs0sIqKyv715WKpHxhH0VKcTYDdhNnS2BFIIkhjaHMocix8P7PnbkDAw7Dq+bo9/M8E/eec+65554Z9577m3PvOB2rPCk5Aeh9iwo9e/QQS0REREREREREP56Gy5dx8QcjJLHs4/oAevboac5Q9JADGX16',
                    },
                  },
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'The request is invalid. Please verify the "file_path" parameter.',
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'Authentication token is missing or invalid',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'Failed to retrieve enclosure',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/registration-classes': {
      get: {
        summary: 'Get registration classes for Labour services',
        description: 'Get registration classes for Labour services',
        tags: ['Common API for Labour Services'],
        operationId: 'registrationClasses',
        responses: {
          200: {
            description: 'Registration Classes List',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string',
                      },
                      example: {
                        'Class-1(A)': 'Class-I(A)',
                        'Class-1(B)': 'Class-I(B)',
                        'Class-1(C)': 'Class-I(C)',
                        'Class-II': 'Class-II',
                        'Class-III': 'Class-III',
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Registration Classes List',
                    },
                  },
                  required: ['status', 'data', 'message'],
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    '/departments': {
      get: {
        summary: 'Get departments for Labour services',
        description: 'Get departments for Labour services',
        tags: ['Common API for Labour Services'],
        operationId: 'departments',
        responses: {
          200: {
            description: 'Departments List',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string',
                      },
                      example: {
                        'PHED': 'Public Health Engineering',
                        'PWDB': 'Public Works Department (Building)',
                        'PWDNH': 'Public Works Department (NH)',
                        'WRD': 'Water Resources',
                        'DOHUA': 'Guwahati Municipal Corporation',
                        'PWDELC': 'Public Works Department (Electrical)',
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Departments List',
                    },
                  },
                  required: ['status', 'data', 'message'],
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
    '/office-locations': {
      post: {
        summary: 'Get office locations by department code and registration class',
        description: 'Get office locations by department code and registration class',
        tags: ['Common API for Labour Services'],
        operationId: 'getOfficeLocations',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  department_code: {
                    type: 'string',
                    description: 'Department code',
                    example: 'PHED',
                  },
                  registration_class: {
                    type: 'string',
                    description: 'Registration class',
                    example: 'Class-1(C)',
                  },
                },
                required: ['department_code', 'registration_class'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Office locations retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'success',
                    },
                    data: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string',
                      },
                      example: {
                        '6486afe045adaddd0d6b622e': 'Lower Assam Zone',
                        '6486afe045adaddd0d6b622b': 'North Assam Zone',
                      },
                    },
                    message: {
                      type: 'string',
                      example: 'Office locations retrieved successfully',
                    },
                  },
                  required: ['status', 'data', 'message'],
                },
              },
            },
          },
          400: {
            description: 'Bad Request - Invalid input parameters',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'fail',
                    },
                    message: {
                      type: 'string',
                      example: 'Invalid department code or registration class',
                    },
                  },
                },
              },
            },
          },
          500: {
            description: 'Internal Server Error',
          },
        },
      },
    },
  },

};

export default commonApiPath;
