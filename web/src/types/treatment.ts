export interface TreatmentSchedule {
    id: number;
    patient: number;                    // ID reference
    patient_name: string;               // Missing - used in render
    medicine: number;                   // ID reference  
    medicine_name: string;              // Missing - used in render
    start_date: string;                 // Changed from Date to string (API returns string)
    end_date: string | null;            // Changed from Date, added null
    frequency: number;
    interval: 1 | 2;
    dosage: string;                     // Changed from number to string
    unit: string;
    notes?: string;                     // Optional field
    created_at?: string;                // API timestamps
    updated_at?: string;
}

export interface TreatmentInstance {
    id: number;
    treatment_schedule: TreatmentSchedule;
    scheduled_time: string;             // Missing - used in formatDateTime
    status: 1 | 2 | 3;                 // Missing - used in status logic
    status_display: string;             // Missing - used in Tag component
    patient_name: string;               // Missing - used in render
    medicine_name: string;              // Missing - used in render
    created_at?: string;
    updated_at?: string;
}
