export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      arc_executions: {
        Row: {
          active_day: number;
          completed_at: string | null;
          current_mission_id: string | null;
          current_step_index: number;
          mission_status: string;
          plan_id: string;
          revision: number;
          started_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active_day?: number;
          completed_at?: string | null;
          current_mission_id?: string | null;
          current_step_index?: number;
          mission_status?: string;
          plan_id: string;
          revision?: number;
          started_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active_day?: number;
          completed_at?: string | null;
          current_mission_id?: string | null;
          current_step_index?: number;
          mission_status?: string;
          plan_id?: string;
          revision?: number;
          started_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'arc_executions_current_mission_owner_fk';
            columns: ['current_mission_id', 'plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plan_missions';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
          {
            foreignKeyName: 'arc_executions_plan_owner_fk';
            columns: ['plan_id', 'user_id'];
            isOneToOne: true;
            referencedRelation: 'plans';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      day_progress: {
        Row: {
          plan_day_id: string;
          plan_id: string;
          sealed_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          plan_day_id: string;
          plan_id: string;
          sealed_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          plan_day_id?: string;
          plan_id?: string;
          sealed_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'day_progress_day_owner_fk';
            columns: ['plan_day_id', 'plan_id', 'user_id'];
            isOneToOne: true;
            referencedRelation: 'plan_days';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
        ];
      };
      mission_command_receipts: {
        Row: {
          awarded_xp: number;
          client_occurred_at: string;
          command: string;
          command_result: string;
          execution_revision: number;
          expected_revision: number;
          idempotency_key: string;
          plan_id: string;
          received_at: string;
          target_scheduled_key: string | null;
          total_xp: number;
          user_id: string;
        };
        Insert: {
          awarded_xp: number;
          client_occurred_at: string;
          command: string;
          command_result: string;
          execution_revision: number;
          expected_revision: number;
          idempotency_key: string;
          plan_id: string;
          received_at?: string;
          target_scheduled_key?: string | null;
          total_xp: number;
          user_id: string;
        };
        Update: {
          awarded_xp?: number;
          client_occurred_at?: string;
          command?: string;
          command_result?: string;
          execution_revision?: number;
          expected_revision?: number;
          idempotency_key?: string;
          plan_id?: string;
          received_at?: string;
          target_scheduled_key?: string | null;
          total_xp?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mission_command_receipts_plan_owner_fk';
            columns: ['plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      mission_events: {
        Row: {
          client_occurred_at: string | null;
          event_type: string;
          id: string;
          idempotency_key: string;
          metadata: Json;
          plan_id: string;
          plan_mission_id: string;
          received_at: string;
          user_id: string;
        };
        Insert: {
          client_occurred_at?: string | null;
          event_type: string;
          id?: string;
          idempotency_key: string;
          metadata?: Json;
          plan_id: string;
          plan_mission_id: string;
          received_at?: string;
          user_id: string;
        };
        Update: {
          client_occurred_at?: string | null;
          event_type?: string;
          id?: string;
          idempotency_key?: string;
          metadata?: Json;
          plan_id?: string;
          plan_mission_id?: string;
          received_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mission_events_mission_owner_fk';
            columns: ['plan_mission_id', 'plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plan_missions';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
        ];
      };
      mission_progress: {
        Row: {
          completed_at: string | null;
          current_step: number;
          plan_id: string;
          plan_mission_id: string;
          revision: number;
          skipped_at: string | null;
          started_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          current_step?: number;
          plan_id: string;
          plan_mission_id: string;
          revision?: number;
          skipped_at?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          current_step?: number;
          plan_id?: string;
          plan_mission_id?: string;
          revision?: number;
          skipped_at?: string | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mission_progress_mission_owner_fk';
            columns: ['plan_mission_id', 'plan_id', 'user_id'];
            isOneToOne: true;
            referencedRelation: 'plan_missions';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
        ];
      };
      onboarding_drafts: {
        Row: {
          client_updated_at: string | null;
          created_at: string;
          payload: Json;
          revision: number;
          schema_version: number;
          section: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_updated_at?: string | null;
          created_at?: string;
          payload: Json;
          revision?: number;
          schema_version: number;
          section: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          client_updated_at?: string | null;
          created_at?: string;
          payload?: Json;
          revision?: number;
          schema_version?: number;
          section?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      onboarding_submissions: {
        Row: {
          activation_key: string;
          answers: Json;
          assessment: Json;
          guardian_consent_recorded_at: string | null;
          guardian_consent_version: string | null;
          id: string;
          schema_version: number;
          submitted_at: string;
          terms_accepted_at: string;
          terms_version: string;
          user_id: string;
        };
        Insert: {
          activation_key?: string;
          answers: Json;
          assessment: Json;
          guardian_consent_recorded_at?: string | null;
          guardian_consent_version?: string | null;
          id?: string;
          schema_version: number;
          submitted_at?: string;
          terms_accepted_at: string;
          terms_version: string;
          user_id: string;
        };
        Update: {
          activation_key?: string;
          answers?: Json;
          assessment?: Json;
          guardian_consent_recorded_at?: string | null;
          guardian_consent_version?: string | null;
          id?: string;
          schema_version?: number;
          submitted_at?: string;
          terms_accepted_at?: string;
          terms_version?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      plan_days: {
        Row: {
          created_at: string;
          day_number: number;
          id: string;
          kind: string;
          plan_id: string;
          scheduled_for: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          day_number: number;
          id?: string;
          kind: string;
          plan_id: string;
          scheduled_for: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          day_number?: number;
          id?: string;
          kind?: string;
          plan_id?: string;
          scheduled_for?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_days_plan_owner_fk';
            columns: ['plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      plan_missions: {
        Row: {
          category: string;
          created_at: string;
          duration_minutes: number;
          id: string;
          intensity: string;
          minimum_age: number;
          ordinal: number;
          plan_day_id: string;
          plan_id: string;
          scheduled_key: string;
          source: string;
          steps: Json;
          template_id: string;
          title: string;
          user_id: string;
          xp_reward: number;
        };
        Insert: {
          category: string;
          created_at?: string;
          duration_minutes: number;
          id?: string;
          intensity: string;
          minimum_age: number;
          ordinal: number;
          plan_day_id: string;
          plan_id: string;
          scheduled_key: string;
          source: string;
          steps: Json;
          template_id: string;
          title: string;
          user_id: string;
          xp_reward: number;
        };
        Update: {
          category?: string;
          created_at?: string;
          duration_minutes?: number;
          id?: string;
          intensity?: string;
          minimum_age?: number;
          ordinal?: number;
          plan_day_id?: string;
          plan_id?: string;
          scheduled_key?: string;
          source?: string;
          steps?: Json;
          template_id?: string;
          title?: string;
          user_id?: string;
          xp_reward?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_missions_day_owner_fk';
            columns: ['plan_day_id', 'plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'plan_days';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
        ];
      };
      plans: {
        Row: {
          activated_at: string;
          base_track: string;
          completed_at: string | null;
          created_at: string;
          duration_days: number;
          generator_version: number;
          id: string;
          onboarding_submission_id: string;
          plan_key: string;
          seed_version: string | null;
          status: string;
          time_zone: string;
          time_zone_anchored_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activated_at?: string;
          base_track: string;
          completed_at?: string | null;
          created_at?: string;
          duration_days: number;
          generator_version: number;
          id?: string;
          onboarding_submission_id: string;
          plan_key: string;
          seed_version?: string | null;
          status?: string;
          time_zone?: string;
          time_zone_anchored_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activated_at?: string;
          base_track?: string;
          completed_at?: string | null;
          created_at?: string;
          duration_days?: number;
          generator_version?: number;
          id?: string;
          onboarding_submission_id?: string;
          plan_key?: string;
          seed_version?: string | null;
          status?: string;
          time_zone?: string;
          time_zone_anchored_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_submission_owner_fk';
            columns: ['onboarding_submission_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'onboarding_submissions';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      profiles_private: {
        Row: {
          birth_date: string | null;
          created_at: string;
          full_name: string | null;
          height_cm: number | null;
          id: string;
          onboarding_status: string;
          onboarding_version: number | null;
          phone_e164: string | null;
          preferred_units: string;
          relationship_status: string | null;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          birth_date?: string | null;
          created_at?: string;
          full_name?: string | null;
          height_cm?: number | null;
          id: string;
          onboarding_status?: string;
          onboarding_version?: number | null;
          phone_e164?: string | null;
          preferred_units?: string;
          relationship_status?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          birth_date?: string | null;
          created_at?: string;
          full_name?: string | null;
          height_cm?: number | null;
          id?: string;
          onboarding_status?: string;
          onboarding_version?: number | null;
          phone_e164?: string | null;
          preferred_units?: string;
          relationship_status?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      profiles_public: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          current_streak: number;
          id: string;
          total_xp: number;
          updated_at: string;
          username: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          current_streak?: number;
          id: string;
          total_xp?: number;
          updated_at?: string;
          username: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          current_streak?: number;
          id?: string;
          total_xp?: number;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      xp_ledger: {
        Row: {
          created_at: string;
          delta: number;
          id: number;
          mission_event_id: string;
          plan_id: string;
          reason: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          delta: number;
          id?: never;
          mission_event_id: string;
          plan_id: string;
          reason: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          delta?: number;
          id?: never;
          mission_event_id?: string;
          plan_id?: string;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'xp_ledger_event_owner_fk';
            columns: ['mission_event_id', 'plan_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'mission_events';
            referencedColumns: ['id', 'plan_id', 'user_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      activate_generated_protocol: {
        Args: {
          p_activation_key: string;
          p_answers: Json;
          p_assessment: Json;
          p_plan: Json;
          p_schema_version: number;
          p_terms_accepted_at: string;
          p_terms_version: string;
          p_user_id: string;
          p_username: string;
        };
        Returns: {
          activated_plan_id: string;
          activated_plan_key: string;
          execution_revision: number;
        }[];
      };
      activate_protocol: {
        Args: {
          p_activation_key: string;
          p_answers: Json;
          p_assessment: Json;
          p_guardian_consent_recorded_at?: string;
          p_guardian_consent_version?: string;
          p_schema_version: number;
          p_terms_accepted_at: string;
          p_terms_version: string;
          p_username: string;
        };
        Returns: {
          activated_plan_id: string;
          activated_plan_key: string;
          execution_revision: number;
        }[];
      };
      apply_revenuecat_entitlement_event: {
        Args: {
          p_entitlement_id: string;
          p_environment: string;
          p_event_at: string;
          p_event_id: string;
          p_event_type: string;
          p_expires_at: string;
          p_product_id: string;
          p_status: string;
          p_user_id: string;
          p_will_renew: boolean;
        };
        Returns: boolean;
      };
      execute_mission_command: {
        Args: {
          p_client_occurred_at: string;
          p_command: string;
          p_expected_revision: number;
          p_idempotency_key: string;
          p_target_id: string;
        };
        Returns: {
          awarded_xp: number;
          command_result: string;
          execution_revision: number;
          total_xp: number;
        }[];
      };
      save_onboarding_draft: {
        Args: {
          p_client_updated_at?: string;
          p_expected_revision?: number;
          p_payload: Json;
          p_schema_version: number;
          p_section: string;
        };
        Returns: {
          client_updated_at: string | null;
          created_at: string;
          payload: Json;
          revision: number;
          schema_version: number;
          section: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'onboarding_drafts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_plan_time_zone: {
        Args: { p_plan_id: string; p_time_zone: string; p_user_id: string };
        Returns: undefined;
      };
      sync_execution_calendar: {
        Args: never;
        Returns: {
          active_day: number;
          calendar_changed: boolean;
          execution_revision: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
