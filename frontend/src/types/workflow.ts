export type ClassificationTrack = 'ICSR' | 'AOI' | 'NO_CASE';

export enum WorkflowStage {
    // 1. Ingestion / Queues
    TRIAGE_ICSR = 'TRIAGE_ICSR',               // ICSR Triage
    TRIAGE_QUEUE_AOI = 'TRIAGE_QUEUE_AOI',      // AOI QC
    TRIAGE_QUEUE_NO_CASE = 'TRIAGE_QUEUE_NO_CASE', // No Case QC

    // 2. Active Assessment (Allocated)
    ASSESSMENT_ICSR = 'ASSESSMENT_ICSR',
    ASSESSMENT_AOI = 'ASSESSMENT_AOI',
    ASSESSMENT_NO_CASE = 'ASSESSMENT_NO_CASE',

    // 3. Processing
    DATA_ENTRY = 'DATA_ENTRY',
    MEDICAL_REVIEW = 'MEDICAL_REVIEW',

    // 4. No Case Secondary QC & Manual Triage
    NO_CASE_SECONDARY_QC = 'no_case_secondary_qc',
    NO_CASE_TRIAGE = 'no_case_triage',

    // 5. Finalization
    REPORTING = 'REPORTING',
    COMPLETED = 'COMPLETED'
}

export interface WorkflowConfig {
    batchSizeIcsr: number;
    batchSizeAoi: number;
    batchSizeNoCase: number;
    samplingRateAoi: number;    // 0-100
    samplingRateNoCase: number; // 0-100
    noCaseSecondaryQcPercentage?: number; // 0-100
}
