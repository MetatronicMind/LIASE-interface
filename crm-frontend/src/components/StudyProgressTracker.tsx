"use client";
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getApiBaseUrl } from '../config/api';

interface StudyCreationJob {
  id: string;
  type: string;
  status: string;
  progress: number;
  totalSteps: number;
  currentStep: number;
  message: string;
  metadata: any;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
  results: any;
}

interface StudyProgressTrackerProps {
  jobId: string | null;
  onComplete?: (results: any) => void;
}

export default function StudyProgressTracker({ jobId, onComplete }: StudyProgressTrackerProps) {
  const [job, setJob] = useState<StudyCreationJob | null>(null);
  const [error, setError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let failureCount = 0;
    const maxFailures = 3; // Reduced from 5 to stop faster for invalid jobs
    let currentDelay = 2000; // Start with 2 second delay
    let isValidJob = true; // Track if this is a valid job worth polling

    const pollJobStatus = async () => {
      if (!isValidJob) return; // Stop if job is determined invalid

      try {
        const token = localStorage.getItem('auth_token');
        const url = `${getApiBaseUrl()}/drugs/jobs/${jobId}`;
        
        // Create timeout controller for fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId); // Clear timeout on successful response

        if (response.ok) {
          const jobData = await response.json();
          setJob(jobData);
          setError(''); // Clear any previous errors
          setIsRetrying(false); // Clear retry state
          failureCount = 0; // Reset failure count on success
          currentDelay = 2000; // Reset delay to normal

          // If job is completed or failed, stop polling and cleanup
          if (jobData.status === 'completed' || jobData.status === 'failed') {
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            
            if (onComplete && jobData.status === 'completed') {
              onComplete({
                message: jobData.message,
                results: jobData.results
              });
            } else if (jobData.status === 'failed') {
              setError(jobData.error || 'Job failed to complete');
            }
            
            // Clear job from localStorage since it's finished
            const persistedJobId = localStorage.getItem('activeJobId');
            if (persistedJobId === jobId) {
              localStorage.removeItem('activeJobId');
              localStorage.removeItem('showProgressTracker');
            }
            
            return; // Stop polling
          }

          // Schedule next poll
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          pollInterval = setTimeout(pollJobStatus, currentDelay);
        } else {
          failureCount++;
          
          // Handle different error types
          if (response.status === 404) {
            // Job not found - likely old/expired job, stop polling immediately
            setError('Job not found. This may be an old job that has expired.');
            isValidJob = false;
            
            // Clear the stale job from localStorage
            const persistedJobId = localStorage.getItem('activeJobId');
            if (persistedJobId === jobId) {
              localStorage.removeItem('activeJobId');
              localStorage.removeItem('showProgressTracker');
            }
            
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            return;
          } else if (response.status === 429) {
            // Rate limit exceeded - back off significantly
            setError('Server is busy. Slowing down requests...');
            setIsRetrying(true);
            
            // Get retry-after header if available
            const retryAfter = response.headers.get('Retry-After');
            const backoffDelay = retryAfter ? parseInt(retryAfter) * 1000 : Math.max(currentDelay * 3, 30000); // At least 30 seconds
            
            currentDelay = Math.min(backoffDelay, 120000); // Max 2 minutes
            
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            pollInterval = setTimeout(pollJobStatus, currentDelay);
            return; // Don't increment failure count for rate limits
          } else if (response.status === 503) {
            // Service unavailable - server overloaded
            setError('Server is temporarily overloaded. Retrying with longer delays...');
            setIsRetrying(true);
            
            // Aggressive backoff for server overload
            currentDelay = Math.min(currentDelay * 4, 180000); // Up to 3 minutes
            
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            pollInterval = setTimeout(pollJobStatus, currentDelay);
            return; // Don't increment failure count for server overload
          } else if (response.status === 500) {
            setError('Server error occurred during processing. The job may still be running, please check back later.');
          } else {
            setError(`Failed to fetch job status (${response.status}). Please try refreshing the page.`);
          }

          // Stop polling after too many failures
          if (failureCount >= maxFailures) {
            setError('Too many failed attempts. This may be an invalid or expired job.');
            isValidJob = false;
            
            // Clear potentially stale job from localStorage
            const persistedJobId = localStorage.getItem('activeJobId');
            if (persistedJobId === jobId) {
              localStorage.removeItem('activeJobId');
              localStorage.removeItem('showProgressTracker');
            }
            
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            return;
          }

          // Exponential backoff: increase delay after failures
          currentDelay = Math.min(currentDelay * 1.5, 10000); // Max 10 seconds
          setIsRetrying(true);
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          pollInterval = setTimeout(pollJobStatus, currentDelay);
        }
      } catch (err: any) {
        failureCount++;
        
        if (err.name === 'AbortError') {
          setError('Request timeout - server may be overloaded. Retrying with longer intervals...');
        } else {
          setError('Network error - unable to check job status. Please check your connection and try again.');
        }

        // Stop polling after too many failures
        if (failureCount >= maxFailures) {
          setError('Too many failed attempts. This may be an invalid or expired job.');
          isValidJob = false;
          
          // Clear potentially stale job from localStorage
          const persistedJobId = localStorage.getItem('activeJobId');
          if (persistedJobId === jobId) {
            localStorage.removeItem('activeJobId');
            localStorage.removeItem('showProgressTracker');
          }
          
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          return;
        }

        // Exponential backoff on network errors
        currentDelay = Math.min(currentDelay * 2, 15000); // Max 15 seconds for network errors
        setIsRetrying(true);
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        pollInterval = setTimeout(pollJobStatus, currentDelay);
      }
    };

    // Start polling
    pollJobStatus();

    // Cleanup function
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [jobId, onComplete]);

  if (!jobId) {
    return null;
  }

  // Show loading state when no job data yet (even if there are retriable errors)
  if (!job) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <div className="text-blue-800">
            {isRetrying ? 'Connecting to server...' : 'Loading job status...'}
          </div>
        </div>
        {error && isRetrying && (
          <div className="text-yellow-700 text-xs mt-2">
            Having trouble connecting, retrying...
          </div>
        )}
      </div>
    );
  }

  // Only show error state for permanent errors when we can't continue
  if (error && !isRetrying) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-600 font-medium">Error</div>
        </div>
        <div className="text-red-700 text-sm mt-1">{error}</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'started': 
      case 'running': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Extract values from metadata for display
  const studiesFound = job.metadata?.studiesFound || 0;
  // backend doesn't update studiesCreated in real-time metadata, only currentStudy
  const rawStudiesCreated = job.results?.studiesCreated || job.metadata?.studiesCreated || 0;
  const currentStudy = job.metadata?.currentStudy || 0;
  const totalStudies = job.metadata?.totalStudies || studiesFound || 0;
  const phase = job.metadata?.phase || 'starting';

  // Calculate simplified progress based on user request
  // Use currentStudy as completed count during processing
  const effectiveCompleted = (job.status === 'completed') 
    ? rawStudiesCreated 
    : Math.max(rawStudiesCreated, currentStudy);

  let displayProgress = 0;
  let progressText = '';
  
  if (job.status === 'completed') {
    displayProgress = 100;
    progressText = `Completed: Found ${studiesFound}, processed ${effectiveCompleted}`;
  } else if (phase === 'searching' || phase === 'pubmed_search' || (phase === 'starting' && totalStudies === 0)) {
     // Search phase
     displayProgress = 5; 
     progressText = 'Searching for studies...';
  } else if (totalStudies > 0) {
    // Processing phase
    displayProgress = Math.round((effectiveCompleted / totalStudies) * 100);
    progressText = `Processed: ${effectiveCompleted} / ${totalStudies} studies`;
  } else if (phase === 'pubmed_completed') {
    displayProgress = 10;
    progressText = `Found ${studiesFound} studies. Preparing to process...`;
  } else if (phase === 'ai_inference_guaranteed' || phase === 'ai_inference') {
    // Fallback if totalStudies is 0 but we are in inference phase
    displayProgress = 15;
    progressText = 'Starting AI Analysis...';
  } else {
    displayProgress = 0;
    progressText = `Initializing... (${phase})`;
  }

  return (
    <div className={`border rounded-lg p-6 ${getStatusColor(job.status)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-lg">Scraping Progress</h3>
        
      </div>
      
      {/* Simple Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-6 mb-3 overflow-hidden shadow-inner">
        <div 
          className={`h-6 rounded-full transition-all duration-500 ease-out flex items-center justify-center text-xs text-white font-medium ${
            phase === 'searching' ? 'animate-pulse bg-blue-400' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.max(displayProgress, 5)}%` }}
        >
        </div>
      </div>
      
      {/* Simplified Status Text */}
      <div className="flex justify-between items-center text-sm font-medium text-gray-700">
        <div className="flex items-center">
          {(job.status === 'started' || job.status === 'running') && (
             <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
          )}
          <span>{progressText}</span>
        </div>
        {totalStudies > 0 && <span>{displayProgress}%</span>}
      </div>

      {job.status === 'failed' && (
        <div className="mt-3 p-3 bg-red-100 rounded text-sm text-red-700 font-medium">
          Error: {job.error || 'Unknown error'}
        </div>
      )}
    </div>
  );
}