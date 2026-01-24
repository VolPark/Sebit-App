export type ReportType = 'worker' | 'client';

export interface TimesheetEntity {
    id: number;
    name: string;
}

export interface WorkLog {
    id: number;
    date: string; // ISO date string YYYY-MM-DD
    project: string;
    description: string;
    hours: number;

    // Optional fields for grouping/display
    clientName?: string;
    workerName?: string;
    workerRole?: string;
}
