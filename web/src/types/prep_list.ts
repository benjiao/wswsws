export interface PrepListItem {
    medicine_id: number;
    medicine_name: string;
    dosage: number;
    unit: string;
    count: number;
    pending_count: number;
    given_count: number;
    skipped_count: number;
}
