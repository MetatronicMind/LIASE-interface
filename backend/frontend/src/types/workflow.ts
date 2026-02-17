export type ClassificationTrack = 'ICSR' | 'AOI' | 'NO_CASE';

export enum WorkflowStage {
    // 1. Ingestion / Queues
    TRIAGE_QUEUE_ICSR = 'TRIAGE_QUEUE_ICSR',
    TRIAGE_QUEUE_AOI = 'TRIAGE_QUEUE_AOI',
    TRIAGE_QUEUE_NO_CASE = 'TRIAGE_QUEUE_NO_CASE',

    // 2. Active Assessment (Allocated)
    ASSESSMENT_ICSR = 'ASSESSMENT_ICSR',
    ASSESSMENT_AOI = 'ASSESSMENT_AOI',
    ASSESSMENT_NO_CASE = 'ASSESSMENT_NO_CASE',

    // 3. Processing
    DATA_ENTRY = 'DATA_ENTRY',
    MEDICAL_REVIEW = 'MEDICAL_REVIEW',

    // 4. Finalization
    REPORTING = 'REPORTING',
    COMPLETED = 'COMPLETED'
}

export interface WorkflowConfig {
    batchSizeIcsr: number;
    batchSizeAoi: number;
    batchSizeNoCase: number;
    samplingRateAoi: number;    // 0-100
    samplingRateNoCase: number; // 0-100
}
