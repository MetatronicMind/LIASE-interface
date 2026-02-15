import { Study } from '../types/study';
import { WorkflowStage } from '../types/workflow';

// Standardized Decisions
export const DECISIONS = {
    CONFIRM: "Confirm",           // Generic confirm (maps to track-specific action)
    REJECT: "Reject",             // Return to source (breadcrumb)
    MOVE_TO_ICSR: "Move to ICSR",
    MOVE_TO_AOI: "Move to AOI",
    MOVE_TO_NO_CASE: "Move to No Case"
};

// ================================================================
// ASSESSMENT-LEVEL DECISIONS
// Called when a user is reviewing a study on their Assessment desk.
// ================================================================
export function processAssessment(
    study: Study,
    decision: string
): Partial<Study> {

    // Common updates: Release the lock
    const updates: Partial<Study> = {
        assignedTo: null,
        allocatedAt: null,
        batchId: null
    };

    const currentTrack = study.workflowTrack;

    // --- LOGIC FOR REJECTIONS (Return to Sender) ---
    if (decision === DECISIONS.REJECT) {
        // If we have a breadcrumb, go there. Otherwise, default to the track's home queue.
        const returnStage = study.lastQueueStage || getDefaultQueue(currentTrack);

        return {
            ...updates,
            workflowStage: returnStage,
            status: "Under Triage Review",
            subStatus: "rejected"
        };
    }

    // --- TRACK SPECIFIC LOGIC ---

    // ==========================================
    // 1. ICSR ASSESSMENT
    // ==========================================
    // From ICSR Assessment:
    //   Confirm  -> Data Entry
    //   Reject   -> ICSR Triage (handled above)
    //   -> AOI   -> AOI Assessment   (cross-lane, direct to desk)
    //   -> No Case -> No Case Assessment (cross-lane, direct to desk)
    // ==========================================
    if (currentTrack === 'ICSR') {
        switch (decision) {
            case DECISIONS.CONFIRM: // "Approve" -> Data Entry
                return {
                    ...updates,
                    workflowStage: WorkflowStage.DATA_ENTRY,
                    status: "Data Entry",
                    subStatus: "processing",
                    icsrClassification: "Probable ICSR"
                };

            case DECISIONS.MOVE_TO_AOI: // Re-classify -> AOI Assessment (direct)
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_AOI,
                    workflowTrack: 'AOI',
                    icsrClassification: "Probable AOI",
                    status: "Under Assessment",
                    subStatus: "reclassified",
                    // Breadcrumb: remember it came from ICSR Triage
                    lastQueueStage: study.lastQueueStage || WorkflowStage.TRIAGE_ICSR
                };

            case DECISIONS.MOVE_TO_NO_CASE: // Re-classify -> No Case Assessment (direct)
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_NO_CASE,
                    workflowTrack: 'NO_CASE',
                    icsrClassification: "No Case",
                    status: "Under Assessment",
                    subStatus: "reclassified",
                    lastQueueStage: study.lastQueueStage || WorkflowStage.TRIAGE_ICSR
                };
        }
    }

    // ==========================================
    // 2. AOI ASSESSMENT
    // ==========================================
    // Cases arrive here from: ICSR Triage, AOI QC, or No Case QC
    // From AOI Assessment:
    //   Confirm (AOI) -> Reports
    //   Reject        -> Breadcrumb (AOI QC / ICSR Triage / No Case QC)
    //   -> ICSR       -> ICSR Triage (escalate to safety lane)
    //   -> No Case    -> No Case QC  (No Case Allocation)
    // ==========================================
    else if (currentTrack === 'AOI') {
        switch (decision) {
            case DECISIONS.CONFIRM: // "Confirm AOI" -> Reports
                return {
                    ...updates,
                    workflowStage: WorkflowStage.REPORTING,
                    status: "Reporting",
                    subStatus: "archived",
                    icsrClassification: "Probable AOI"
                };

            case DECISIONS.MOVE_TO_ICSR: // Escalate to ICSR Triage
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_ICSR,
                    workflowTrack: 'ICSR',
                    status: "Under Triage Review",
                    subStatus: "triage",
                    icsrClassification: "Probable ICSR"
                };

            case DECISIONS.MOVE_TO_NO_CASE: // -> No Case Allocation (QC)
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_QUEUE_NO_CASE,
                    workflowTrack: 'NO_CASE',
                    status: "Under Triage Review",
                    subStatus: "triage",
                    icsrClassification: "No Case"
                };
        }
    }

    // ==========================================
    // 3. NO CASE ASSESSMENT
    // ==========================================
    // From No Case Assessment:
    //   Confirm (No Case) -> Completed
    //   Reject             -> Breadcrumb (No Case QC)
    //   -> ICSR            -> ICSR Triage
    //   -> AOI             -> ICSR Triage (safety net)
    // ==========================================
    else if (currentTrack === 'NO_CASE') {
        switch (decision) {
            case DECISIONS.CONFIRM: // "Confirm No Case" -> Completed
                return {
                    ...updates,
                    workflowStage: WorkflowStage.COMPLETED,
                    status: "Completed",
                    subStatus: "archived",
                    icsrClassification: "No Case"
                };

            case DECISIONS.MOVE_TO_ICSR: // Escalate to ICSR Triage
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_ICSR,
                    workflowTrack: 'ICSR',
                    status: "Under Triage Review",
                    subStatus: "triage",
                    icsrClassification: "Probable ICSR"
                };

            case DECISIONS.MOVE_TO_AOI: // Safety net: AOI from No Case -> ICSR Triage
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_ICSR,
                    workflowTrack: 'ICSR',
                    status: "Under Triage Review",
                    subStatus: "triage",
                    icsrClassification: "Probable AOI"
                };
        }
    }

    // Default fallback
    console.warn(`Unhandled decision: "${decision}" for track: "${currentTrack}"`);
    return updates;
}

// ================================================================
// QUEUE-LEVEL CLASSIFICATION
// Called when a study is classified at a Triage Queue or QC Queue.
// This routes the study to the correct Assessment desk (or queue).
// ================================================================
export function processQueueClassification(
    study: Study,
    classification: string
): Partial<Study> {

    const currentStage = study.workflowStage;

    // Common: release any lock (in case it was preview-locked)
    const updates: Partial<Study> = {
        assignedTo: null,
        allocatedAt: null,
        batchId: null
    };

    // ==========================================
    // FROM ICSR TRIAGE (TRIAGE_ICSR)
    // ==========================================
    // -> ICSR    : ICSR Assessment
    // -> AOI     : AOI Assessment
    // -> No Case : No Case Assessment
    // ==========================================
    if (currentStage === WorkflowStage.TRIAGE_ICSR) {
        switch (classification) {
            case DECISIONS.MOVE_TO_ICSR:
            case "ICSR":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_ICSR,
                    workflowTrack: 'ICSR',
                    icsrClassification: "Probable ICSR",
                    status: "Under Assessment",
                    lastQueueStage: WorkflowStage.TRIAGE_ICSR
                };
            case DECISIONS.MOVE_TO_AOI:
            case "AOI":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_AOI,
                    workflowTrack: 'AOI',
                    icsrClassification: "Probable AOI",
                    status: "Under Assessment",
                    lastQueueStage: WorkflowStage.TRIAGE_ICSR
                };
            case DECISIONS.MOVE_TO_NO_CASE:
            case "No Case":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_NO_CASE,
                    workflowTrack: 'NO_CASE',
                    icsrClassification: "No Case",
                    status: "Under Assessment",
                    lastQueueStage: WorkflowStage.TRIAGE_ICSR
                };
        }
    }

    // ==========================================
    // FROM AOI QC (TRIAGE_QUEUE_AOI)
    // ==========================================
    // -> ICSR    : ICSR Triage (escalate)
    // -> AOI     : AOI Assessment
    // -> No Case : No Case Assessment
    // ==========================================
    else if (currentStage === WorkflowStage.TRIAGE_QUEUE_AOI) {
        switch (classification) {
            case DECISIONS.MOVE_TO_ICSR:
            case "ICSR":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_ICSR,
                    workflowTrack: 'ICSR',
                    icsrClassification: "Probable ICSR",
                    status: "Under Triage Review"
                };
            case DECISIONS.MOVE_TO_AOI:
            case "AOI":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_AOI,
                    workflowTrack: 'AOI',
                    icsrClassification: "Probable AOI",
                    status: "Under Assessment",
                    lastQueueStage: WorkflowStage.TRIAGE_QUEUE_AOI
                };
            case DECISIONS.MOVE_TO_NO_CASE:
            case "No Case":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_NO_CASE,
                    workflowTrack: 'NO_CASE',
                    icsrClassification: "No Case",
                    status: "Under Assessment",
                    lastQueueStage: WorkflowStage.TRIAGE_QUEUE_AOI
                };
        }
    }

    // ==========================================
    // FROM NO CASE QC (TRIAGE_QUEUE_NO_CASE)
    // ==========================================
    // -> ICSR    : ICSR Triage (escalate)
    // -> AOI     : ICSR Triage (safety net)
    // -> No Case : No Case Assessment
    // ==========================================
    else if (currentStage === WorkflowStage.TRIAGE_QUEUE_NO_CASE) {
        switch (classification) {
            case DECISIONS.MOVE_TO_ICSR:
            case "ICSR":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_ICSR,
                    workflowTrack: 'ICSR',
                    icsrClassification: "Probable ICSR",
                    status: "Under Triage Review"
                };
            case DECISIONS.MOVE_TO_AOI:
            case "AOI":
                // Safety net: AOI from No Case QC -> ICSR Triage
                return {
                    ...updates,
                    workflowStage: WorkflowStage.TRIAGE_ICSR,
                    workflowTrack: 'ICSR',
                    icsrClassification: "Probable AOI",
                    status: "Under Triage Review"
                };
            case DECISIONS.MOVE_TO_NO_CASE:
            case "No Case":
                return {
                    ...updates,
                    workflowStage: WorkflowStage.ASSESSMENT_NO_CASE,
                    workflowTrack: 'NO_CASE',
                    icsrClassification: "No Case",
                    status: "Under Assessment",
                    lastQueueStage: WorkflowStage.TRIAGE_QUEUE_NO_CASE
                };
        }
    }

    console.warn(`Unhandled queue classification: "${classification}" at stage: "${currentStage}"`);
    return updates;
}

/**
 * Returns the default queue stage for a given track.
 * Used as a fallback when no lastQueueStage breadcrumb is present.
 */
function getDefaultQueue(track: string | null | undefined): WorkflowStage {
    if (track === 'ICSR') return WorkflowStage.TRIAGE_ICSR;
    if (track === 'AOI') return WorkflowStage.TRIAGE_QUEUE_AOI;
    return WorkflowStage.TRIAGE_QUEUE_NO_CASE;
}
