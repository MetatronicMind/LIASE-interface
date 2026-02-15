import { WorkflowStage } from './workflow';

export interface Study {
    id: string;
    organizationId: string;
    pmid: string;
    title: string;
    status: string;
    subStatus?: string;

    // Core Classification
    icsrClassification: string; // The AI or Human classification

    // Workflow State
    workflowStage?: WorkflowStage;
    workflowTrack?: string | null;

    // Assignment / Batching
    assignedTo?: string | null; // User ID
    batchId?: string | null;    // UUID for the batch
    allocatedAt?: string | null; // ISO Date

    // Breadcrumb: Stores the Queue/QC stage this study came from before Assessment
    lastQueueStage?: WorkflowStage;

    // Other fields present in JSON
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    reviewedBy?: string | null;
    approvedBy?: string | null;
    approvedAt?: string | null;
    type?: string;
    identifiableHumanSubject?: string;
    textType?: string;
    substanceGroup?: string;
    clientName?: string;
    sponsor?: string;
    userTag?: string | null;
    effectiveClassification?: string;
    classifiedBy?: string | null;
    qaApprovalStatus?: string;
    qaApprovedBy?: string | null;
    qaApprovedAt?: string | null;
    qaRejectedBy?: string | null;
    qaRejectedAt?: string | null;
    qaComments?: string | null;
    r3FormData?: any | null;
    r3FormStatus?: string;
    r3FormCompletedBy?: string | null;
    r3FormCompletedAt?: string | null;
    qcR3Status?: string;
    qcR3ApprovedBy?: string | null;
    qcR3ApprovedAt?: string | null;
    qcR3RejectedBy?: string | null;
    qcR3RejectedAt?: string | null;
    qcR3Comments?: string | null;
    listedness?: string | null;
    seriousness?: string | null;
    fullTextAvailability?: string | null;
    fullTextSource?: string | null;
    aoiAssessedBy?: string | null;
    aoiAssessedAt?: string | null;
    medicalReviewStatus?: string;
    medicalReviewedBy?: string | null;
    medicalReviewedAt?: string | null;
    fieldComments?: any[];
    revokedBy?: string | null;
    revokedAt?: string | null;
    revocationReason?: string | null;
    lockedAt?: string | null;
    isAutoPassed?: boolean;
    _rid?: string;
    _self?: string;
    _etag?: string;
    _attachments?: string;
    _ts?: number;
}
