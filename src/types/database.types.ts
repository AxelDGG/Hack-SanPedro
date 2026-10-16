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
      accesos_contacto: {
        Row: {
          animal_id: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          id?: never
          user_id: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accesos_contacto_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accesos_contacto_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      animal_contactos: {
        Row: {
          animal_id: string
          created_at: string
          nombre: string
          telefono: string
        }
        Insert: {
          animal_id: string
          created_at?: string
          nombre: string
          telefono: string
        }
        Update: {
          animal_id?: string
          created_at?: string
          nombre?: string
          telefono?: string
        }
        Relationships: [
          {
            foreignKeyName: "animal_contactos_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: true
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
        ]
      }
      animals: {
        Row: {
          apodo: string | null
          collar: boolean | null
          colonia_id: number | null
          color: string | null
          condiciones: Database["public"]["Enums"]["condicion_animal"][]
          created_at: string
          especie: Database["public"]["Enums"]["especie_animal"]
          estado: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url: string | null
          fusionado_en: string | null
          id: string
          lat: number
          lng: number
          origen: Database["public"]["Enums"]["origen_reporte"]
          perdido_desde: string | null
          rasgos: string | null
          raza: string | null
          registro_folio: string | null
          reportado_por: string | null
          rescatista_id: string | null
          sexo: Database["public"]["Enums"]["sexo_animal"] | null
          tamano: Database["public"]["Enums"]["tamano_animal"] | null
          tipo: Database["public"]["Enums"]["tipo_reporte"]
          total_avistamientos: number
          ubicacion_ultima: unknown
          updated_at: string
          urgencia: number
          visto_ultima_vez: string
        }
        Insert: {
          apodo?: string | null
          collar?: boolean | null
          colonia_id?: number | null
          color?: string | null
          condiciones?: Database["public"]["Enums"]["condicion_animal"][]
          created_at?: string
          especie: Database["public"]["Enums"]["especie_animal"]
          estado?: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url?: string | null
          fusionado_en?: string | null
          id?: string
          lat: number
          lng: number
          origen?: Database["public"]["Enums"]["origen_reporte"]
          perdido_desde?: string | null
          rasgos?: string | null
          raza?: string | null
          registro_folio?: string | null
          reportado_por?: string | null
          rescatista_id?: string | null
          sexo?: Database["public"]["Enums"]["sexo_animal"] | null
          tamano?: Database["public"]["Enums"]["tamano_animal"] | null
          tipo?: Database["public"]["Enums"]["tipo_reporte"]
          total_avistamientos?: number
          ubicacion_ultima?: unknown
          updated_at?: string
          urgencia?: number
          visto_ultima_vez?: string
        }
        Update: {
          apodo?: string | null
          collar?: boolean | null
          colonia_id?: number | null
          color?: string | null
          condiciones?: Database["public"]["Enums"]["condicion_animal"][]
          created_at?: string
          especie?: Database["public"]["Enums"]["especie_animal"]
          estado?: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url?: string | null
          fusionado_en?: string | null
          id?: string
          lat?: number
          lng?: number
          origen?: Database["public"]["Enums"]["origen_reporte"]
          perdido_desde?: string | null
          rasgos?: string | null
          raza?: string | null
          registro_folio?: string | null
          reportado_por?: string | null
          rescatista_id?: string | null
          sexo?: Database["public"]["Enums"]["sexo_animal"] | null
          tamano?: Database["public"]["Enums"]["tamano_animal"] | null
          tipo?: Database["public"]["Enums"]["tipo_reporte"]
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
            foreignKeyName: "animals_fusionado_en_fkey"
            columns: ["fusionado_en"]
            isOneToOne: false
            referencedRelation: "animals"
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
          centro_aproximado: boolean
          clave: string | null
          codigo_postal: string | null
          distrito: string | null
          id: number
          lat: number
          lng: number
          nombre: string
        }
        Insert: {
          centro?: unknown
          centro_aproximado?: boolean
          clave?: string | null
          codigo_postal?: string | null
          distrito?: string | null
          id?: never
          lat: number
          lng: number
          nombre: string
        }
        Update: {
          centro?: unknown
          centro_aproximado?: boolean
          clave?: string | null
          codigo_postal?: string | null
          distrito?: string | null
          id?: never
          lat?: number
          lng?: number
          nombre?: string
        }
        Relationships: []
      }
      limites_uso: {
        Row: {
          clave: string
          conteo: number
          ventana: string
        }
        Insert: {
          clave: string
          conteo?: number
          ventana: string
        }
        Update: {
          clave?: string
          conteo?: number
          ventana?: string
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          animal_id: string | null
          created_at: string
          cuerpo: string
          email_enviado_at: string | null
          id: number
          leida: boolean
          push_enviado_at: string | null
          tipo: string
          titulo: string
          url: string
          user_id: string
        }
        Insert: {
          animal_id?: string | null
          created_at?: string
          cuerpo: string
          email_enviado_at?: string | null
          id?: never
          leida?: boolean
          push_enviado_at?: string | null
          tipo: string
          titulo: string
          url: string
          user_id: string
        }
        Update: {
          animal_id?: string | null
          created_at?: string
          cuerpo?: string
          email_enviado_at?: string | null
          id?: never
          leida?: boolean
          push_enviado_at?: string | null
          tipo?: string
          titulo?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_animal_id_fkey"
            columns: ["animal_id"]
            isOneToOne: false
            referencedRelation: "animals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles_privados: {
        Row: {
          alertas_email: boolean
          alertas_push: boolean
          email_alertas: string | null
          telefono: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alertas_email?: boolean
          alertas_push?: boolean
          email_alertas?: string | null
          telefono?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alertas_email?: boolean
          alertas_push?: boolean
          email_alertas?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfiles_privados_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      push_suscripciones: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_suscripciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          foto_hash: number | null
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
          foto_hash?: number | null
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
          foto_hash?: number | null
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
      suscripciones_colonia: {
        Row: {
          colonia_id: number
          created_at: string
          user_id: string
        }
        Insert: {
          colonia_id: number
          created_at?: string
          user_id: string
        }
        Update: {
          colonia_id?: number
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_colonia_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "colonias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_colonia_colonia_id_fkey"
            columns: ["colonia_id"]
            isOneToOne: false
            referencedRelation: "v_ranking_colonias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_colonia_user_id_fkey"
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
      consumir_cuota: {
        Args: { p_clave: string; p_limite: number; p_ventana_seg?: number }
        Returns: boolean
      }
      distancia_hash: { Args: { a: number; b: number }; Returns: number }
      find_duplicate_candidates: {
        Args: {
          p_color?: string
          p_especie: Database["public"]["Enums"]["especie_animal"]
          p_excluir?: string
          p_foto_hash?: number
          p_lat: number
          p_lng: number
          p_raza?: string
          p_tamano?: Database["public"]["Enums"]["tamano_animal"]
          p_tipo?: Database["public"]["Enums"]["tipo_reporte"]
        }
        Returns: {
          apodo: string
          color: string
          distancia_m: number
          especie: Database["public"]["Enums"]["especie_animal"]
          estado: Database["public"]["Enums"]["estado_animal"]
          foto_portada_url: string
          fotos: string[]
          id: string
          misma_foto: boolean
          motivos: string[]
          puntaje: number
          rasgos: string
          raza: string
          tamano: Database["public"]["Enums"]["tamano_animal"]
          tipo: Database["public"]["Enums"]["tipo_reporte"]
          total_avistamientos: number
          visto_ultima_vez: string
        }[]
      }
      fotos_subidas_recientes: { Args: never; Returns: number }
      fusionar_animales: {
        Args: { p_destino: string; p_origen: string }
        Returns: Json
      }
      marcar_reunido: {
        Args: { p_animal_id: string; p_nota?: string }
        Returns: Json
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
          tipo: Database["public"]["Enums"]["tipo_reporte"]
          total_avistamientos: number
          urgencia: number
          visto_ultima_vez: string
        }[]
      }
      notificar_reporte: {
        Args: { p_animal_id: string; p_foto_hash?: number }
        Returns: number
      }
      premiar_caso_resuelto: { Args: { p_animal_id: string }; Returns: number }
      reasignar_colonias: { Args: never; Returns: number }
      report_sighting: {
        Args: {
          p_analisis_ia?: Json
          p_animal_id?: string
          p_apodo?: string
          p_collar?: boolean
          p_color?: string
          p_condiciones?: Database["public"]["Enums"]["condicion_animal"][]
          p_contacto_nombre?: string
          p_contacto_telefono?: string
          p_especie: Database["public"]["Enums"]["especie_animal"]
          p_foto_hash?: number
          p_foto_url?: string
          p_lat: number
          p_lng: number
          p_notas?: string
          p_origen?: Database["public"]["Enums"]["origen_reporte"]
          p_perdido_desde?: string
          p_rasgos?: string
          p_raza?: string
          p_registro_folio?: string
          p_sexo?: Database["public"]["Enums"]["sexo_animal"]
          p_tamano?: Database["public"]["Enums"]["tamano_animal"]
          p_tipo?: Database["public"]["Enums"]["tipo_reporte"]
          p_urgencia?: number
        }
        Returns: Json
      }
      take_case: { Args: { p_animal_id: string }; Returns: Json }
      tokens_color: { Args: { p: string }; Returns: string[] }
      ver_contacto: {
        Args: { p_animal_id: string }
        Returns: {
          nombre: string
          telefono: string
        }[]
      }
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
        | "reunido"
      origen_reporte: "app" | "whatsapp" | "facebook" | "instagram" | "otro"
      rol_usuario: "vecino" | "rescatista" | "municipio"
      sexo_animal: "macho" | "hembra"
      tamano_animal: "chico" | "mediano" | "grande"
      tipo_reporte: "perdido" | "encontrado" | "callejero"
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
        "reunido",
      ],
      origen_reporte: ["app", "whatsapp", "facebook", "instagram", "otro"],
      rol_usuario: ["vecino", "rescatista", "municipio"],
      sexo_animal: ["macho", "hembra"],
      tamano_animal: ["chico", "mediano", "grande"],
      tipo_reporte: ["perdido", "encontrado", "callejero"],
    },
  },
} as const
