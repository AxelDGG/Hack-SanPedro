export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      animals: {
        Row: {
          apodo: string | null
          colonia_id: number | null
          condiciones: Database["public"]["Enums"]["condicion_animal"][]
          created_at: string
          especie: Database["public"]["Enums"]["especie_animal"]
          estado: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url: string | null
          id: string
          lat: number
          lng: number
          rasgos: string | null
          reportado_por: string | null
          rescatista_id: string | null
          total_avistamientos: number
          ubicacion_ultima: unknown
          updated_at: string
          urgencia: number
          visto_ultima_vez: string
        }
        Insert: {
          apodo?: string | null
          colonia_id?: number | null
          condiciones?: Database["public"]["Enums"]["condicion_animal"][]
          created_at?: string
          especie: Database["public"]["Enums"]["especie_animal"]
          estado?: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url?: string | null
          id?: string
          lat: number
          lng: number
          rasgos?: string | null
          reportado_por?: string | null
          rescatista_id?: string | null
          total_avistamientos?: number
          ubicacion_ultima?: unknown
          updated_at?: string
          urgencia?: number
          visto_ultima_vez?: string
        }
        Update: {
          apodo?: string | null
          colonia_id?: number | null
          condiciones?: Database["public"]["Enums"]["condicion_animal"][]
          created_at?: string
          especie?: Database["public"]["Enums"]["especie_animal"]
          estado?: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url?: string | null
          id?: string
          lat?: number
          lng?: number
          rasgos?: string | null
          reportado_por?: string | null
          rescatista_id?: string | null
          total_avistamientos?: number
          ubicacion_ultima?: unknown
          updated_at?: string
          urgencia?: number
          visto_ultima_vez?: string
        }
        Relationships: [
          {
            foreignKeyName: "animals_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "colonias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "v_ranking_colonias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_reportado_por_fkey"
            columns: ["reportado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animals_rescatista_id_fkey"
            columns: ["rescatista_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          codigo: string
          descripcion: string
          icono: string
          metrica: string
          nombre: string
          orden: number
          umbral: number
        }
        Insert: {
          codigo: string
          descripcion: string
          icono: string
          metrica: string
          nombre: string
          orden?: number
          umbral: number
        }
        Update: {
          codigo?: string
          descripcion?: string
          icono?: string
          metrica?: string
          nombre?: string
          orden?: number
          umbral?: number
        }
        Relationships: []
      }
      colonias: {
        Row: {
          centro: unknown
          id: number
          lat: number
          lng: number
          nombre: string
        }
        Insert: {
          centro?: unknown
          id?: never
          lat: number
          lng: number
          nombre: string
        }
        Update: {
          centro?: unknown
          id?: never
          lat?: number
          lng?: number
          nombre?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          animal_id: string | null
          created_at: string
          id: number
          motivo: string
          puntos: number
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          id?: never
          motivo: string
          puntos: number
          user_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          id?: never
          motivo?: string
          puntos?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          colonia_id: number | null
          created_at: string
          id: string
          nombre: string
          puntos: number
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          colonia_id?: number | null
          created_at?: string
          id: string
          nombre: string
          puntos?: number
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          colonia_id?: number | null
          created_at?: string
          id?: string
          nombre?: string
          puntos?: number
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "colonias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "v_ranking_colonias"
            referencedColumns: ["id"]
          },
        ]
      }
      sightings: {
        Row: {
          analisis_ia: Json | null
          animal_id: string
          created_at: string
          es_confirmacion: boolean
          foto_url: string | null
          id: string
          lat: number
          lng: number
          notas: string | null
          ubicacion: unknown
          user_id: string | null
        }
        Insert: {
          analisis_ia?: Json | null
          animal_id: string
          created_at?: string
          es_confirmacion?: boolean
          foto_url?: string | null
          id?: string
          lat: number
          lng: number
          notas?: string | null
          ubicacion?: unknown
          user_id?: string | null
        }
        Update: {
          analisis_ia?: Json | null
          animal_id?: string
          created_at?: string
          es_confirmacion?: boolean
          foto_url?: string | null
          id?: string
          lat?: number
          lng?: number
          notas?: string | null
          ubicacion?: unknown
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sightings_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sightings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      status_updates: {
        Row: {
          animal_id: string
          created_at: string
          estado_anterior: Database["public"]["Enums"]["estado_animal"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_animal"]
          id: string
          nota: string | null
          user_id: string | null
        }
        Insert: {
          animal_id: string
          created_at?: string
          estado_anterior?: Database["public"]["Enums"]["estado_animal"] | null
          estado_nuevo: Database["public"]["Enums"]["estado_animal"]
          id?: string
          nota?: string | null
          user_id?: string | null
        }
        Update: {
          animal_id?: string
          created_at?: string
          estado_anterior?: Database["public"]["Enums"]["estado_animal"] | null
          estado_nuevo?: Database["public"]["Enums"]["estado_animal"]
          id?: string
          nota?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "status_updates_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_codigo: string
          otorgada_at: string
          user_id: string
        }
        Insert: {
          badge_codigo: string
          otorgada_at?: string
          user_id: string
        }
        Update: {
          badge_codigo?: string
          otorgada_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_codigo_fkey"
            columns: ["badge_codigo"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_ranking_colonias: {
        Row: {
          animales_en_calle: number | null
          id: number | null
          nombre: string | null
          puntos: number | null
          vecinos: number | null
        }
        Relationships: []
      }
      v_stats_mensuales: {
        Row: {
          adopciones: number | null
          esterilizaciones: number | null
          mes: string | null
          reportes: number | null
          rescates: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_badges: { Args: { p_user: string }; Returns: Json }
      change_animal_status: {
        Args: {
          p_animal_id: string
          p_estado: Database["public"]["Enums"]["estado_animal"]
          p_nota?: string
        }
        Returns: Json
      }
      colonia_mas_cercana: {
        Args: { p_lat: number; p_lng: number }
        Returns: number
      }
      find_duplicate_candidates: {
        Args: {
          p_dias?: number
          p_especie: Database["public"]["Enums"]["especie_animal"]
          p_lat: number
          p_lng: number
          p_radio_m?: number
        }
        Returns: {
          apodo: string
          condiciones: Database["public"]["Enums"]["condicion_animal"][]
          distancia_m: number
          especie: Database["public"]["Enums"]["especie_animal"]
          estado: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url: string
          fotos: string[]
          id: string
          rasgos: string
          total_avistamientos: number
          urgencia: number
          visto_ultima_vez: string
        }[]
      }
      mi_rol: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      nearby_cases: {
        Args: {
          p_estados?: Database["public"]["Enums"]["estado_animal"][]
          p_lat: number
          p_lng: number
          p_radio_km?: number
        }
        Returns: {
          apodo: string
          colonia: string
          condiciones: Database["public"]["Enums"]["condicion_animal"][]
          distancia_m: number
          especie: Database["public"]["Enums"]["especie_animal"]
          estado: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url: string
          id: string
          lat: number
          lng: number
          rasgos: string
          rescatista_id: string
          total_avistamientos: number
          urgencia: number
          visto_ultima_vez: string
        }[]
      }
      premiar_caso_resuelto: { Args: { p_animal_id: string }; Returns: number }
      report_sighting: {
        Args: {
          p_analisis_ia?: Json
          p_animal_id?: string
          p_condiciones?: Database["public"]["Enums"]["condicion_animal"][]
          p_especie: Database["public"]["Enums"]["especie_animal"]
          p_foto_url?: string
          p_lat: number
          p_lng: number
          p_notas?: string
          p_rasgos?: string
          p_urgencia?: number
        }
        Returns: Json
      }
      take_case: { Args: { p_animal_id: string }; Returns: Json }
    }
    Enums: {
      condicion_animal: "sano" | "flaco" | "herido" | "cachorro"
      especie_animal: "perro" | "gato" | "otro"
      estado_animal:
        | "avistado"
        | "en_atencion"
        | "rescatado"
        | "esterilizado"
        | "adoptado"
      rol_usuario: "vecino" | "rescatista" | "municipio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      condicion_animal: ["sano", "flaco", "herido", "cachorro"],
      especie_animal: ["perro", "gato", "otro"],
      estado_animal: [
        "avistado",
        "en_atencion",
        "rescatado",
        "esterilizado",
        "adoptado",
      ],
      rol_usuario: ["vecino", "rescatista", "municipio"],
    },
  },
} as const
