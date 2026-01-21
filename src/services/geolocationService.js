const axios = require('axios');

class GeolocationService {
  constructor() {
    // Using ip-api.com free service (no API key required, 1000 requests/month)
    // For production, consider using a paid service like MaxMind or IPGeolocation
    this.baseURL = 'http://ip-api.com/json';
    this.cache = new Map(); // Simple in-memory cache to avoid duplicate requests
  }

  /**
   * Get country information from IP address
   * @param {string} ipAddress - The IP address to lookup
   * @returns {Promise<Object>} Country information
   */
  async getCountryFromIP(ipAddress) {
    try {
      // Handle localhost/private IPs
      if (this.isLocalOrPrivateIP(ipAddress)) {
        return {
          country: 'Local',
          countryCode: 'LOCAL',
          region: 'Local',
          city: 'Local',
          timezone: null,
          isp: null
        };
      }

      // Check cache first
      if (this.cache.has(ipAddress)) {
        return this.cache.get(ipAddress);
      }

      // Make API request
      const response = await axios.get(`${this.baseURL}/${ipAddress}`, {
        params: {
          fields: 'status,country,countryCode,region,city,timezone,isp'
        },
        timeout: 5000 // 5 second timeout
      });

      if (response.data.status === 'success') {
        const locationData = {
          country: response.data.country || 'Unknown',
          countryCode: response.data.countryCode || 'UN',
          region: response.data.region || 'Unknown',
          city: response.data.city || 'Unknown',
          timezone: response.data.timezone || null,
          isp: response.data.isp || null
        };

        // Cache the result for 1 hour
        this.cache.set(ipAddress, locationData);
        setTimeout(() => {
          this.cache.delete(ipAddress);
        }, 60 * 60 * 1000); // 1 hour

        return locationData;
      } else {
        console.warn(`Geolocation lookup failed for IP ${ipAddress}: ${response.data.message}`);
        return this.getDefaultLocationData();
      }

    } catch (error) {
      console.error('Geolocation service error:', error.message);
      return this.getDefaultLocationData();
    }
  }

  /**
   * Check if IP is localhost or private
   * @param {string} ip - IP address to check
   * @returns {boolean} True if local or private IP
   */
  isLocalOrPrivateIP(ip) {
    if (!ip) return true;
    
    // IPv6 localhost
    if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;
    
    // IPv4 localhost and private ranges
    const privateRanges = [
      /^127\./, // 127.0.0.0/8 (localhost)
      /^10\./, // 10.0.0.0/8 (private)
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 (private)
      /^192\.168\./, // 192.168.0.0/16 (private)
      /^169\.254\./, // 169.254.0.0/16 (link-local)
      /^fc00:/, // IPv6 private
      /^fe80:/ // IPv6 link-local
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Get default location data when lookup fails
   * @returns {Object} Default location data
   */
  getDefaultLocationData() {
    return {
      country: 'Unknown',
      countryCode: 'UN',
      region: 'Unknown',
      city: 'Unknown',
      timezone: null,
      isp: null
    };
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = new GeolocationService();