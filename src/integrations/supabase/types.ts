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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          criado_em: string | null
          id: string
        }
        Insert: {
          criado_em?: string | null
          id: string
        }
        Update: {
          criado_em?: string | null
          id?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          id: string
          produto_id: string | null
          sale_id: string | null
          status: string | null
          tipo: string | null
          usuario_id: string
          valor: number | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          produto_id?: string | null
          sale_id?: string | null
          status?: string | null
          tipo?: string | null
          usuario_id: string
          valor?: number | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          produto_id?: string | null
          sale_id?: string | null
          status?: string | null
          tipo?: string | null
          usuario_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string | null
          chave: string
          descricao: string | null
          valor: string
        }
        Insert: {
          atualizado_em?: string | null
          chave: string
          descricao?: string | null
          valor: string
        }
        Update: {
          atualizado_em?: string | null
          chave?: string
          descricao?: string | null
          valor?: string
        }
        Relationships: []
      }
      geracoes: {
        Row: {
          contexto_geracao: string | null
          criado_em: string | null
          custo_usd: number | null
          erro_mensagem: string | null
          id: string
          modalidade: string
          nicho: string | null
          nome_cliente: string | null
          produto: string | null
          resolvido: boolean | null
          resultado_json: Json | null
          tokens_entrada: number | null
          tokens_saida: number | null
          tokens_total: number | null
          usuario_id: string
        }
        Insert: {
          contexto_geracao?: string | null
          criado_em?: string | null
          custo_usd?: number | null
          erro_mensagem?: string | null
          id?: string
          modalidade: string
          nicho?: string | null
          nome_cliente?: string | null
          produto?: string | null
          resolvido?: boolean | null
          resultado_json?: Json | null
          tokens_entrada?: number | null
          tokens_saida?: number | null
          tokens_total?: number | null
          usuario_id: string
        }
        Update: {
          contexto_geracao?: string | null
          criado_em?: string | null
          custo_usd?: number | null
          erro_mensagem?: string | null
          id?: string
          modalidade?: string
          nicho?: string | null
          nome_cliente?: string | null
          produto?: string | null
          resolvido?: boolean | null
          resultado_json?: Json | null
          tokens_entrada?: number | null
          tokens_saida?: number | null
          tokens_total?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geracoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      system_prompts: {
        Row: {
          ativo: boolean | null
          conteudo: string
          criado_em: string | null
          id: string
          modalidade: string
          versao: number
        }
        Insert: {
          ativo?: boolean | null
          conteudo: string
          criado_em?: string | null
          id?: string
          modalidade: string
          versao?: number
        }
        Update: {
          ativo?: boolean | null
          conteudo?: string
          criado_em?: string | null
          id?: string
          modalidade?: string
          versao?: number
        }
        Relationships: []
      }
      usuario_dna: {
        Row: {
          atualizado_em: string | null
          bloco_injetado: string | null
          contexto: string | null
          criado_em: string | null
          id: string
          nicho_principal: string | null
          peso_secundario: number | null
          ticket_medio: string | null
          tom_primario: string | null
          tom_secundario: string | null
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string | null
          bloco_injetado?: string | null
          contexto?: string | null
          criado_em?: string | null
          id?: string
          nicho_principal?: string | null
          peso_secundario?: number | null
          ticket_medio?: string | null
          tom_primario?: string | null
          tom_secundario?: string | null
          usuario_id: string
        }
        Update: {
          atualizado_em?: string | null
          bloco_injetado?: string | null
          contexto?: string | null
          criado_em?: string | null
          id?: string
          nicho_principal?: string | null
          peso_secundario?: number | null
          ticket_medio?: string | null
          tom_primario?: string | null
          tom_secundario?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_dna_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          acesso_svp_expira: string | null
          ativo: boolean | null
          cancelamento_solicitado: boolean | null
          consultas_mes: number | null
          consultas_total: number | null
          criado_em: string | null
          custo_total_usd: number | null
          email: string
          id: string
          motivo_bloqueio: string | null
          nome: string
          pagamento_atrasado: boolean | null
          plano: string | null
          primeiro_acesso: boolean | null
          tipo_acesso: string | null
          tokens_total: number | null
          ultimo_acesso: string | null
        }
        Insert: {
          acesso_svp_expira?: string | null
          ativo?: boolean | null
          cancelamento_solicitado?: boolean | null
          consultas_mes?: number | null
          consultas_total?: number | null
          criado_em?: string | null
          custo_total_usd?: number | null
          email: string
          id: string
          motivo_bloqueio?: string | null
          nome?: string
          pagamento_atrasado?: boolean | null
          plano?: string | null
          primeiro_acesso?: boolean | null
          tipo_acesso?: string | null
          tokens_total?: number | null
          ultimo_acesso?: string | null
        }
        Update: {
          acesso_svp_expira?: string | null
          ativo?: boolean | null
          cancelamento_solicitado?: boolean | null
          consultas_mes?: number | null
          consultas_total?: number | null
          criado_em?: string | null
          custo_total_usd?: number | null
          email?: string
          id?: string
          motivo_bloqueio?: string | null
          nome?: string
          pagamento_atrasado?: boolean | null
          plano?: string | null
          primeiro_acesso?: boolean | null
          tipo_acesso?: string | null
          tokens_total?: number | null
          ultimo_acesso?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          criado_em: string | null
          email_cliente: string | null
          erro_mensagem: string | null
          evento: string | null
          id: string
          payload_raw: Json | null
          produto_id: string | null
          sale_id: string | null
          status_processamento: string | null
        }
        Insert: {
          criado_em?: string | null
          email_cliente?: string | null
          erro_mensagem?: string | null
          evento?: string | null
          id?: string
          payload_raw?: Json | null
          produto_id?: string | null
          sale_id?: string | null
          status_processamento?: string | null
        }
        Update: {
          criado_em?: string | null
          email_cliente?: string | null
          erro_mensagem?: string | null
          evento?: string | null
          id?: string
          payload_raw?: Json | null
          produto_id?: string | null
          sale_id?: string | null
          status_processamento?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
