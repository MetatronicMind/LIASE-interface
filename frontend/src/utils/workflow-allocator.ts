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

    // Configure based on Track
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

    // Filter available studies
    // Condition: 
    // - icsrClassification matches one of the target labels
    // - status is "Under Triage Review" (waiting)
    // - not currently assigned to anyone
    const available = allStudies.filter(s => 
        targetLabels.includes(s.icsrClassification) &&
        !s.assignedTo &&
        (s.status === "Under Triage Review" || s.workflowStage === getQueueStage(track))
    );

    // Apply Sampling Logic for AOI/No Case if needed
    // (This simplified version just takes the top N)
    const batch = available.slice(0, batchSize);

    // Return modified studies (immutable)
    // In a real application, you would send these IDs to the backend to update
    return batch.map(s => ({
        ...s,
        assignedTo: userId,
        workflowStage: targetStage,
        status: "Under Assessment",
        allocatedAt: new Date().toISOString()
    }));
}

function getQueueStage(track: ClassificationTrack): WorkflowStage {
    if (track === 'ICSR') return WorkflowStage.TRIAGE_QUEUE_ICSR;
    if (track === 'AOI') return WorkflowStage.TRIAGE_QUEUE_AOI;
    return WorkflowStage.TRIAGE_QUEUE_NO_CASE;
}
