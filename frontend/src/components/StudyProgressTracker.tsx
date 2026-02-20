"use client";
import React, { useState, useEffect } from "react";
import { getApiBaseUrl } from "../config/api";

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

// ── Stage definitions ──────────────────────────────────────────────
const STAGES = [
  { key: "search", label: "Literature Search" },
  { key: "ai", label: "AI Analysis" },
  { key: "creation", label: "Study Creation" },
  { key: "complete", label: "Complete" },
];

function resolveStageIndex(phase: string, status: string): number {
  if (status === "completed") return 3;
  if (status === "failed") return -1;
  switch (phase) {
    case "starting":
    case "pubmed_search":
    case "searching":
      return 0;
    case "pubmed_completed":
    case "ai_inference_guaranteed":
    case "ai_inference":
      return 1;
    case "study_creation":
    case "processing_complete":
      return 2;
    default:
      return 0;
  }
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ── Component ──────────────────────────────────────────────────────
export default function StudyProgressTracker({
  jobId,
  onComplete,
}: StudyProgressTrackerProps) {
  const [job, setJob] = useState<StudyCreationJob | null>(null);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [startTs] = useState(Date.now());

  // Elapsed timer
  useEffect(() => {
    if (!jobId) return;
    const timer = setInterval(() => setElapsed(Date.now() - startTs), 1000);
    return () => clearInterval(timer);
  }, [jobId, startTs]);

  // Proactively refresh the auth token to prevent session expiry during long jobs
  useEffect(() => {
    if (!jobId) return;
    const REFRESH_INTERVAL = 3 * 60 * 1000; // every 3 minutes
    const refreshToken = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) localStorage.setItem("auth_token", data.token);
        }
      } catch {
        // Silent fail – polling will still use the current token
      }
    };
    const interval = setInterval(refreshToken, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [jobId]);

  // Polling
  useEffect(() => {
    if (!jobId) return;
    let timeout: NodeJS.Timeout | null = null;
    let alive = true;
    let failures = 0;

    // Timing strategy:
    //  - Per-request abort: 8 s — fail fast so a hung request doesn't block the
    //    retry for long (old value was 15 s; 3 × 15 s + backoff ≈ 1 min of silence).
    //  - Retry interval while healthy: 3 s.
    //  - Retry interval while failing: fixed 4 s — no exponential growth.
    //    The status endpoint is a cheap DB read; rapid retries are fine and mean
    //    the bar stays responsive even during a 3-5 min study-creation run.
    const REQUEST_TIMEOUT_MS = 8000;
    const HEALTHY_INTERVAL_MS = 3000;
    const FAILING_INTERVAL_MS = 4000;

    const poll = async () => {
      if (!alive) return;
      try {
        const token = localStorage.getItem("auth_token");
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
        const res = await fetch(`${getApiBaseUrl()}/drugs/jobs/${jobId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: ctrl.signal,
          cache: "no-store",
        });
        clearTimeout(tid);

        if (res.ok) {
          const data: StudyCreationJob = await res.json();
          setJob(data);
          // Clear any transient error banner on first good response
          if (failures > 0) {
            setError("");
            failures = 0;
          }

          if (data.status === "completed" || data.status === "failed") {
            if (localStorage.getItem("activeJobId") === jobId) {
              localStorage.removeItem("activeJobId");
              localStorage.removeItem("showProgressTracker");
            }
            if (data.status === "completed" && onComplete) {
              onComplete({ message: data.message, results: data.results });
            }
            if (data.status === "failed") {
              setError(data.error || "Job failed");
            }
            return; // terminal state — stop polling
          }
        } else if (res.status === 404) {
          setError("Job not found — it may have expired.");
          if (localStorage.getItem("activeJobId") === jobId) {
            localStorage.removeItem("activeJobId");
            localStorage.removeItem("showProgressTracker");
          }
          return; // job is gone — stop polling
        } else {
          failures++;
          setError(`Connection issue (attempt ${failures}) — retrying…`);
        }
      } catch {
        failures++;
        setError(`Network error (attempt ${failures}) — retrying…`);
      }
      // Always reschedule — never give up while the component is mounted
      if (alive)
        timeout = setTimeout(
          poll,
          failures > 0 ? FAILING_INTERVAL_MS : HEALTHY_INTERVAL_MS,
        );
    };

    poll();
    return () => {
      alive = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [jobId, onComplete]);

  if (!jobId) return null;

  // A "retrying" error is transient — don't show a full error block, show it inline
  const isTransientError = error.includes("retrying");
  const isFatalError = !!error && !isTransientError;

  // ── Loading / Error ───────────────────────────────────────────
  if (!job && !error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-200 border-t-blue-600" />
          <span className="text-gray-600 text-sm">
            Connecting to job server…
          </span>
        </div>
      </div>
    );
  }
  // Fatal (404 / permanent): show full error block only when we have no prior job data
  if (isFatalError && !job) {
    return (
      <div className="bg-white border border-red-200 rounded-xl shadow-sm p-6">
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }
  if (!job) return null;

  // ── Derived state ─────────────────────────────────────────────
  const phase = job.metadata?.phase || "starting";
  const currentStage = resolveStageIndex(phase, job.status);
  const totalStudies =
    job.metadata?.totalStudies || job.metadata?.studiesFound || 0;
  const studiesCreated =
    job.metadata?.studiesCreated || job.results?.studiesCreated || 0;
  const currentStudy = job.metadata?.currentStudy || 0;
  const aiTotal = job.metadata?.aiTotal || totalStudies;
  // Derive aiProcessed from metadata first; fall back to reverse-engineering
  // from job.progress (AI phase maps progress 30-55 → 0-total).
  const aiProcessed =
    job.metadata?.aiProcessed ||
    job.metadata?.aiProgress?.processed ||
    (currentStage === 1 && job.progress > 30 && aiTotal > 0
      ? Math.round(((job.progress - 30) / 25) * aiTotal)
      : 0);
  const icsrCount = job.metadata?.trackCounts?.ICSR || 0;
  const aoiCount = job.metadata?.trackCounts?.AOI || 0;
  const noCaseCount = job.metadata?.trackCounts?.NoCase || 0;
  const duplicatesSkipped =
    job.metadata?.duplicatesSkipped || job.results?.duplicatesSkipped || 0;
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";
  const effectiveCreated = isComplete
    ? job.results?.studiesCreated || studiesCreated
    : Math.max(studiesCreated, currentStudy);

  // Use the server-reported progress directly — it already has granular
  // per-article updates (30-55 % during AI, 55-95 % during study creation).
  // Fall back to stage-based estimate only when the server value is absent.
  let overallProgress = 0;
  if (isComplete) {
    overallProgress = 100;
  } else if (job.progress && job.progress > 0) {
    overallProgress = Math.min(job.progress, 99);
  } else if (currentStage === 0) {
    overallProgress = 8;
  } else if (currentStage === 1) {
    const aiPct = aiTotal > 0 ? aiProcessed / aiTotal : 0;
    overallProgress = 15 + Math.round(aiPct * 40);
  } else if (currentStage === 2) {
    const crPct = totalStudies > 0 ? effectiveCreated / totalStudies : 0;
    overallProgress = 55 + Math.round(crPct * 40);
  }

  // Live status message from the backend (e.g. "AI processing: 5/27 articles")
  const liveMessage = job.message || "";

  function stageDetail(idx: number): string {
    if (isComplete && idx === 3)
      return `${job.results?.studiesCreated ?? effectiveCreated} studies ready`;
    if (idx < currentStage || isComplete) return "Done";
    if (idx > currentStage) return "Waiting";
    switch (idx) {
      case 0:
        return totalStudies > 0
          ? `Found ${totalStudies} articles`
          : "Querying PubMed…";
      case 1:
        return aiTotal > 0
          ? `${aiProcessed} / ${aiTotal} analysed`
          : "Sending to AI…";
      case 2:
        return totalStudies > 0
          ? `${effectiveCreated} / ${totalStudies} created`
          : "Preparing…";
      default:
        return "";
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-base">
          Study Processing Pipeline
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Elapsed: {formatElapsed(elapsed)}</span>
          {!isComplete && !isFailed && (
            <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              Running
            </span>
          )}
          {isComplete && (
            <span className="text-green-600 font-medium">Complete</span>
          )}
          {isFailed && <span className="text-red-600 font-medium">Failed</span>}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Overall progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Overall Progress
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ease-out ${
                isComplete
                  ? "bg-green-500"
                  : isFailed
                    ? "bg-red-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Stage stepper */}
        <div className="grid grid-cols-4 gap-0">
          {STAGES.map((stage, idx) => {
            const isDone = idx < currentStage || isComplete;
            const isActive = idx === currentStage && !isComplete && !isFailed;
            return (
              <div
                key={stage.key}
                className="flex flex-col items-center text-center relative"
              >
                {idx > 0 && (
                  <div
                    className={`absolute top-4 -left-1/2 w-full h-0.5 ${isDone ? "bg-green-400" : "bg-gray-200"}`}
                    style={{ zIndex: 0 }}
                  />
                )}
                <div
                  className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                    isDone
                      ? "bg-green-500 border-green-500 text-white"
                      : isActive
                        ? "bg-blue-500 border-blue-500 text-white animate-pulse"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {isDone ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold leading-tight ${
                    isDone
                      ? "text-green-600"
                      : isActive
                        ? "text-blue-600"
                        : "text-gray-400"
                  }`}
                >
                  {stage.label}
                </span>
                <span className="mt-0.5 text-[11px] text-gray-500 leading-tight min-h-[28px]">
                  {stageDetail(idx)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Live status message */}
        {liveMessage && !isComplete && !isFailed && !isTransientError && (
          <p className="text-xs text-gray-500 italic truncate">{liveMessage}</p>
        )}

        {/* Transient connection / retry banner — keeps the progress UI visible */}
        {isTransientError && !isComplete && !isFailed && (
          <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
            <span className="animate-spin inline-block h-3 w-3 border border-yellow-400 border-t-yellow-700 rounded-full flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live stats cards */}
        {(totalStudies > 0 || isComplete) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <StatCard
              label="Articles Found"
              value={totalStudies}
              color="blue"
            />
            <StatCard
              label="Studies Created"
              value={effectiveCreated}
              color="green"
            />
            <StatCard
              label="Duplicates Skipped"
              value={duplicatesSkipped}
              color="yellow"
            />
            <StatCard
              label="ICSR / AOI / No Case"
              value={`${icsrCount} / ${aoiCount} / ${noCaseCount}`}
              color="purple"
            />
          </div>
        )}

        {isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {job.error || "An unknown error occurred."}
          </div>
        )}

        {/* Fatal tracking error shown inline when we already have partial job data */}
        {isFatalError && !isFailed && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isComplete && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            <p className="font-semibold mb-1">Processing Complete</p>
            <p>
              Found {totalStudies} articles, created{" "}
              {job.results?.studiesCreated ?? effectiveCreated} studies
              {duplicatesSkipped > 0 &&
                `, skipped ${duplicatesSkipped} duplicates`}
              . Studies have been automatically routed to their workflow tracks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${colors[color] || colors.blue}`}
    >
      <div className="text-[11px] uppercase tracking-wide font-medium opacity-60">
        {label}
      </div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
