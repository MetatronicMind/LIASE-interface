import { Study } from '../types/study';
import { WorkflowStage, ClassificationTrack, WorkflowConfig } from '../types/workflow';
import { STUDY_BUCKETS } from '../config/classification-rules';

export function allocateBatch(
    allStudies: Study[],
    track: ClassificationTrack,
    userId: string,
    config: WorkflowConfig
): Study[] {

    let targetLabels: string[] = [];
    let batchSize = 0;
    let targetStage = WorkflowStage.ASSESSMENT_ICSR; // Default

    // 1. Configure based on the User's Track
    if (track === 'ICSR') {
        targetLabels = STUDY_BUCKETS.ICSR_TRACK;
        batchSize = config.batchSizeIcsr;
        targetStage = WorkflowStage.ASSESSMENT_ICSR;
    } else if (track === 'AOI') {
        targetLabels = STUDY_BUCKETS.AOI_TRACK;
        batchSize = config.batchSizeAoi;
        targetStage = WorkflowStage.ASSESSMENT_AOI;
    } else {
        targetLabels = STUDY_BUCKETS.NO_CASE_TRACK;
        batchSize = config.batchSizeNoCase;
        targetStage = WorkflowStage.ASSESSMENT_NO_CASE;
    }

    // 2. Filter Logic
    // We look for unassigned studies that match the target classification.
    // They could be in ANY waiting stage (ICSR Triage, AOI QC, etc.)
    // as long as the classification matches the user's track.
    const available = allStudies.filter(s =>
        targetLabels.includes(s.icsrClassification) &&
        !s.assignedTo &&
        isWaitingStage(s.workflowStage)
    );

    // Apply Sampling Logic for AOI/No Case if needed
    // (This simplified version just takes the top N)
    const batch = available.slice(0, batchSize);

    // 3. Lock & Stamp Logic
    // In a real application, you would send these IDs to the backend to update
    return batch.map(s => ({
        ...s,
        assignedTo: userId,
        workflowStage: targetStage, // Move to Desk (Assessment)
        status: "Under Assessment",
        allocatedAt: new Date().toISOString(),

        // CRITICAL: Save the breadcrumb!
        // We remember exactly where this case came from (e.g., AOI_QC vs ICSR_TRIAGE)
        lastQueueStage: s.workflowStage
    }));
}

/**
 * Helper to identify "Waiting Room" stages.
 * A study is available for allocation if it's sitting in one of these stages.
 */
function isWaitingStage(stage: WorkflowStage | undefined): boolean {
    if (!stage) return false;
    return [
        WorkflowStage.TRIAGE_ICSR,
        WorkflowStage.TRIAGE_QUEUE_AOI,
        WorkflowStage.TRIAGE_QUEUE_NO_CASE
    ].includes(stage);
}
