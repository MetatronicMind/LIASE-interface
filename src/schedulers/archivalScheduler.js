const cron = require('node-cron');
const archivalService = require('../services/archivalService');
const cosmosService = require('../services/cosmosService');

/**
 * ArchivalScheduler
 * Manages scheduled archival tasks
 */
class ArchivalScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize scheduler
   */
  async initialize() {
    console.log('🕒 Initializing Archival Scheduler...');

    // Schedule daily auto-archival at 2 AM
    this.scheduleAutoArchival();

    console.log('✅ Archival Scheduler initialized');
  }

  /**
   * Schedule automatic archival for all organizations
   * Runs daily at 2:00 AM
   */
  scheduleAutoArchival() {
    // Run at 2:00 AM every day
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('\n🤖 Running scheduled auto-archival...');
      await this.runAutoArchival();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.jobs.set('auto-archival', job);
    console.log('📅 Scheduled auto-archival: Daily at 2:00 AM UTC');
  }

  /**
   * Run auto-archival for all organizations
   */
  async runAutoArchival() {
    if (this.isRunning) {
      console.log('⚠️ Auto-archival already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // Get all organizations with archival enabled
      const organizations = await this.getOrganizationsWithArchivalEnabled();
      
      console.log(`📊 Found ${organizations.length} organizations with archival enabled`);

      for (const org of organizations) {
        try {
          console.log(`\n🏢 Processing organization: ${org.organizationId}`);
          
          // Run auto-archival for this organization
          const result = await archivalService.autoArchiveStudies(
            org.organizationId,
            'system_scheduler'
          );

          if (result.successful && result.successful.length > 0) {
            console.log(`✅ Archived ${result.successful.length} studies for ${org.organizationId}`);
          } else {
            console.log(`ℹ️ No studies archived for ${org.organizationId}`);
          }

          // Small delay between organizations
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`❌ Error archiving for ${org.organizationId}:`, error);
          // Continue with next organization
        }
      }

      console.log('\n✅ Scheduled auto-archival completed\n');

    } catch (error) {
      console.error('❌ Error in scheduled auto-archival:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get organizations with archival enabled
   */
  async getOrganizationsWithArchivalEnabled() {
    try {
      const query = `
        SELECT DISTINCT c.organizationId 
        FROM c 
        WHERE c.type_doc = 'archival_config'
        AND c.isEnabled = true
        AND c.autoArchiveEnabled = true
      `;

      const results = await cosmosService.queryItems('Settings', query, []);
      return results;

    } catch (error) {
      console.error('Error getting organizations with archival enabled:', error);
      return [];
    }
  }

  /**
   * Manually trigger auto-archival
   */
  async triggerManualArchival(organizationId) {
    console.log(`\n🎯 Manual archival trigger for organization: ${organizationId}`);

    try {
      const result = await archivalService.autoArchiveStudies(
        organizationId,
        'manual_trigger'
      );

      console.log(`✅ Manual archival completed for ${organizationId}`);
      console.log(`   Successful: ${result.successful?.length || 0}`);
      console.log(`   Failed: ${result.failed?.length || 0}\n`);

      return result;

    } catch (error) {
      console.error(`❌ Manual archival failed for ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    console.log('🛑 Stopping all archival scheduled jobs...');
    
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`   Stopped: ${name}`);
    }

    this.jobs.clear();
    console.log('✅ All archival jobs stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }
}

module.exports = new ArchivalScheduler();
