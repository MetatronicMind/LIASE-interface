import { Study } from '../types/study';
import { WorkflowStage } from '../types/workflow';

// Standardized Decisions
export const DECISIONS = {
    CONFIRM_ICSR: "Confirm ICSR",
    CONFIRM_AOI: "Confirm AOI",
    CONFIRM_NO_CASE: "Confirm No Case",
    UPGRADE_TO_ICSR: "Upgrade to ICSR",
    DOWNGRADE_TO_AOI: "Downgrade to AOI",
    DOWNGRADE_TO_NO_CASE: "Downgrade to No Case"
};

export function processAssessment(
    study: Study,
    decision: string
): Partial<Study> {

    // Default updates: Clear assignment to release the study
    const updates: Partial<Study> = {
        assignedTo: null,
        allocatedAt: null,
        batchId: null
    };

    switch (decision) {

        // --- ICSR PATH ---
        case DECISIONS.CONFIRM_ICSR:
            // Valid ICSR -> Move to Data Entry
            return {
                ...updates,
                workflowStage: WorkflowStage.DATA_ENTRY,
                status: "Data Entry",
                subStatus: "processing",
                icsrClassification: "Probable ICSR", // Standardize
                workflowTrack: 'ICSR'
            };

        case DECISIONS.DOWNGRADE_TO_AOI:
            // Downgrade -> Move to AOI Queue
            return {
                ...updates,
                workflowStage: WorkflowStage.TRIAGE_QUEUE_AOI,
                status: "Under Triage Review", // Back to pool
                subStatus: "triage",
                icsrClassification: "Probable AOI",
                workflowTrack: 'AOI'
            };

        case DECISIONS.DOWNGRADE_TO_NO_CASE:
            // Downgrade -> Move to No Case Queue
            return {
                ...updates,
                workflowStage: WorkflowStage.TRIAGE_QUEUE_NO_CASE,
                status: "Under Triage Review",
                subStatus: "triage",
                icsrClassification: "No Case",
                workflowTrack: 'NO_CASE'
            };

        // --- AOI PATH ---
        case DECISIONS.CONFIRM_AOI:
            // Valid AOI -> Move to Reporting/Completed
            return {
                ...updates,
                workflowStage: WorkflowStage.REPORTING, // Or Completed based on exact flow
                status: "Reporting",
                subStatus: "archived",
                icsrClassification: "Probable AOI",
                workflowTrack: 'AOI'
            };

        case DECISIONS.UPGRADE_TO_ICSR:
            // Upgrade -> Move to ICSR Queue
            return {
                ...updates,
                workflowStage: WorkflowStage.TRIAGE_QUEUE_ICSR,
                status: "Under Triage Review",
                subStatus: "triage",
                icsrClassification: "Probable ICSR",
                workflowTrack: 'ICSR'
            };

        // --- NO CASE PATH ---
        case DECISIONS.CONFIRM_NO_CASE:
            // Valid No Case -> Completed
            return {
                ...updates,
                workflowStage: WorkflowStage.COMPLETED,
                status: "Completed",
                subStatus: "archived",
                icsrClassification: "No Case",
                workflowTrack: 'NO_CASE'
            };

        // No Case Upgrade Logic (usually to ICSR or AOI)
        // If "Upgrade to ICSR" is used here, it matches the case above.
        // But if there's an "Upgrade to AOI" needed:
        // case DECISIONS.UPGRADE_TO_AOI: ...

        default:
            console.warn(`Unknown decision: ${decision}`);
            return updates;
    }
}
