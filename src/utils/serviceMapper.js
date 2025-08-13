import serviceConfig from '../config/serviceConfig.js';

export default class ServiceMapper {
  static getServiceMap() {
    return serviceConfig.serviceMap;
  }

  static getModelForService(serviceId) {
    const serviceMap = this.getServiceMap();
    return serviceMap[serviceId];
  }

  static isValidService(serviceId) {
    return !!this.getModelForService(serviceId);
  }
}
