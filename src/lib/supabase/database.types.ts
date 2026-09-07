type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type ReadonlyTable<Row> = {
  Row: Row;
  Insert: never;
  Update: never;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      projects: ReadonlyTable<{
        id: string;
        user_id: string;
        source_kind: 'device' | 'url';
        status: 'uploading' | 'queued' | 'processing' | 'ready' | 'failed_retryable' | 'failed_terminal' | 'deleting';
        display_name: string | null;
        source_object_path: string | null;
        source_original_filename: string | null;
        source_mime_type: string | null;
        source_size_bytes: number | null;
        source_duration_ms: number | null;
        failure_code: string | null;
        active_reference_analysis_id: string | null;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      sections: ReadonlyTable<{
        id: string;
        project_id: string;
        reference_analysis_id: string;
        user_id: string;
        position: number;
        start_ms: number;
        end_ms: number;
        segmentation_confidence: 'high' | 'medium' | 'low';
        created_at: string;
      }>;
      section_progress: ReadonlyTable<{
        section_id: string;
        project_id: string;
        user_id: string;
        best_attempt_id: string | null;
        best_score: number | null;
        valid_attempt_count: number;
        completed_at: string | null;
        completion_mode: 'threshold' | 'manual' | null;
        created_at: string;
        updated_at: string;
      }>;
      attempts: ReadonlyTable<{
        id: string;
        user_id: string;
        project_id: string;
        section_id: string;
        status: 'uploading' | 'queued' | 'processing' | 'succeeded' | 'low_confidence' | 'failed_retryable' | 'failed_terminal' | 'deleting';
        object_path: string | null;
        mime_type: string | null;
        size_bytes: number | null;
        duration_ms: number | null;
        practice_mirrored: boolean;
        camera_facing: 'front' | 'back';
        attempt_number: number;
        failure_code: string | null;
        submitted_at: string | null;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      attempt_results: ReadonlyTable<{
        attempt_id: string;
        user_id: string;
        project_id: string;
        section_id: string;
        reference_analysis_id: string;
        scoring_version: string;
        result_state: 'valid' | 'low_confidence';
        overall_score: number | null;
        movement_score: number | null;
        timing_score: number | null;
        confidence: number;
        is_personal_best: boolean;
        meets_completion_threshold: boolean;
        low_confidence_reason: string | null;
        created_at: string;
        updated_at: string;
      }>;
      feedback_items: ReadonlyTable<{
        id: string;
        attempt_id: string;
        user_id: string;
        rank: number;
        message: string;
        metric_key: string;
        phase_start_ms: number | null;
        phase_end_ms: number | null;
        confidence: number;
        rule_version: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
