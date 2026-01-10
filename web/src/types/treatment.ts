import { PrepListItem } from './prep_list';


export interface TreatmentSchedule {
    id: number;
    patient: {
        id: number;
        name: string;
        birth_date?: string;
        rescued_date?: string;
        color?: string;
        sex?: number;
        sex_display?: string;
        created_at?: string;
        updated_at?: string;
    };
    patient_name: string;
    medicine: {
        id: number;
        name: string;
        stock_status?: number;
        stock_status_display?: string;
        created_at?: string;
        updated_at?: string;
    } | null;
    medicine_name: string;
    start_time: string;
    frequency: number | null;
    doses: number | null;
    interval: 1 | 2 | null;
    interval_display?: string;
    dosage: string | null;
    unit: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    instances_count?: number;
    pending_count?: number;
    completed_count?: number;
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