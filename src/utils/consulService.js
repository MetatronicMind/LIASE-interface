/* eslint-disable no-unused-vars */
import axios from 'axios';

const service = {
  ID: 'my-migration-service',
  Name: 'migration-service',
  Tags: ['migration', 'urlprefix-/api/v1/migration/application'],
  Address: 'localhost',
  Port: process.env.PORT || 8000,
  Check: {
    HTTP: `http://${process.env.ADDRESS || '127.0.0.1'}:${process.env.PORT || 8000}/health`,
    Interval: process.env.CHECK_INTERVAL || '5s',
    Timeout: process.env.CHECK_TIMEOUT || '1s',
  },
};

class ConsulService {
  constructor() {
    this.baseUrl = process.env.CONSUL_BASE_URL || 'http://127.0.0.1:8500/v1/agent/service/register';
  }

  async registerService() {
    try {
      const response = await axios.put(this.baseUrl, service);
      console.log('Service registered successfully with Consul', response);
    } catch (error) {
      console.error('Error registering service with Consul:', error);
    }
  }
}

export default ConsulService;
