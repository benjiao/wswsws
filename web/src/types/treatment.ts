import { PrepListItem } from './prep_list';


export interface TreatmentSchedule {
    id: number;
    patient: number;
    patient_name: string;
    medicine: number;
    medicine_name: string;
    start_date: string;
    end_date: string | null;
    frequency: number;
    interval: 1 | 2;
    dosage: string;
    unit: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface TreatmentInstance {
    id: number;
    treatment_schedule: TreatmentSchedule;
    scheduled_time: string;
    status: 1 | 2 | 3;
    status_display: string;
    patient_name: string;
    medicine_name: string;
    created_at?: string;
    updated_at?: string;
}

export interface TreatmentSession {
    id: number;
    session_type: 1 | 2 | 3 | 4;
    session_type_display: string;
    session_date: String
    instances: TreatmentInstance[];
    prep_list: PrepListItem[];
    created_at?: string;
    updated_at?: string;
    instances_count?: number;
    pending_count?: number;
    completed_count?: number;
}