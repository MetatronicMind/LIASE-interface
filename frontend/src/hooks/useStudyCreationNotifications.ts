import { useEffect, useState } from 'react';
import { useNotifications } from '../components/NotificationManager';

interface JobProgress {
  jobId: string;
  status: string;
  progress: number;
  message: string;
  details?: any;
}

export const useStudyCreationNotifications = () => {
  const { addNotification, updateNotification, removeNotification } = useNotifications();
  const [activeJobs, setActiveJobs] = useState<Set<string>>(new Set());

  const startJobTracking = (jobId: string, jobTitle: string = 'Study Creation') => {
    // Add job to active tracking
    setActiveJobs(prev => new Set([...prev, jobId]));
    
    // Create initial notification
    const notificationId = addNotification({
      type: 'info',
      title: jobTitle,
      message: 'Initializing study creation process...',
      progress: 0,
      persistent: true
    });

    // Start polling for job progress
    pollJobProgress(jobId, notificationId);
    
    return notificationId;
  };

  const pollJobProgress = async (jobId: string, notificationId: string) => {
    const poll = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`http://localhost:8000/api/studies/jobs/${jobId}/status`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (response.ok) {
          const jobData = await response.json();
          
          // Update notification with progress
          updateNotification(notificationId, {
            type: jobData.status === 'failed' ? 'error' : 
                  jobData.status === 'completed' ? 'success' : 'info',
            message: getJobStatusMessage(jobData),
            progress: jobData.progress || 0,
            persistent: jobData.isActive
          });

          // If job is complete, remove from active tracking and schedule notification removal
          if (!jobData.isActive) {
            setActiveJobs(prev => {
              const newSet = new Set(prev);
              newSet.delete(jobId);
              return newSet;
            });

            // For successful completion, auto-remove after 3 seconds
            if (jobData.status === 'completed') {
              setTimeout(() => {
                removeNotification(notificationId);
              }, 3000);
            }
            
            return; // Stop polling
          }

          // Continue polling if job is still active
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Error polling job progress:', error);
        updateNotification(notificationId, {
          type: 'error',
          message: 'Failed to track job progress',
          persistent: false
        });
        
        setActiveJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
      }
    };

    // Start polling
    poll();
  };

  const getJobStatusMessage = (jobData: any): string => {
    switch (jobData.status) {
      case 'processing':
        return `Processing studies... ${jobData.processed || 0} of ${jobData.total || 0} completed`;
      case 'completed':
        return `Successfully created ${jobData.created || 0} studies${jobData.skipped ? ` (${jobData.skipped} skipped)` : ''}`;
      case 'failed':
        return `Job failed: ${jobData.error || 'Unknown error occurred'}`;
      default:
        return 'Preparing to process studies...';
    }
  };

  // Cleanup function to clear active jobs on unmount
  useEffect(() => {
    return () => {
      setActiveJobs(new Set());
    };
  }, []);

  return {
    startJobTracking,
    activeJobs: Array.from(activeJobs)
  };
};