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
      clientes: {
        Row: {
          atualizado_em: string | null
          como_conhecemos: string | null
          criado_em: string | null
          email: string | null
          empresa: string | null
          id: string
          indicado_por: string | null
          instagram_url: string | null
          linkedin_url: string | null
          nome: string
          notas: string | null
          status: string | null
          tags: string[] | null
          temperatura: string | null
          temperatura_atualizada_em: string | null
          ultimo_contato_em: string | null
          usuario_id: string
          whatsapp: string | null
        }
        Insert: {
          atualizado_em?: string | null
          como_conhecemos?: string | null
          criado_em?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          indicado_por?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          nome: string
          notas?: string | null
          status?: string | null
          tags?: string[] | null
          temperatura?: string | null
          temperatura_atualizada_em?: string | null
          ultimo_contato_em?: string | null
          usuario_id: string
          whatsapp?: string | null
        }
        Update: {
          atualizado_em?: string | null
          como_conhecemos?: string | null
          criado_em?: string | null
          email?: string | null
          empresa?: string | null
          id?: string
          indicado_por?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          nome?: string
          notas?: string | null
          status?: string | null
          tags?: string[] | null
          temperatura?: string | null
          temperatura_atualizada_em?: string | null
          ultimo_contato_em?: string | null
          usuario_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_indicado_por_fkey"
            columns: ["indicado_por"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
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
      deals: {
        Row: {
          atualizado_em: string | null
          cliente_id: string
          criado_em: string | null
          data_previsao_fechamento: string | null
          etapa: string | null
          id: string
          motivo_perda: string | null
          probabilidade: number | null
          score_saude: number | null
          titulo: string
          usuario_id: string
          valor: number | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente_id: string
          criado_em?: string | null
          data_previsao_fechamento?: string | null
          etapa?: string | null
          id?: string
          motivo_perda?: string | null
          probabilidade?: number | null
          score_saude?: number | null
          titulo: string
          usuario_id: string
          valor?: number | null
        }
        Update: {
          atualizado_em?: string | null
          cliente_id?: string
          criado_em?: string | null
          data_previsao_fechamento?: string | null
          etapa?: string | null
          id?: string
          motivo_perda?: string | null
          probabilidade?: number | null
          score_saude?: number | null
          titulo?: string
          usuario_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
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
      interacoes: {
        Row: {
          canal: string
          cliente_id: string
          conteudo: string | null
          criado_em: string | null
          direcao: string | null
          duracao_minutos: number | null
          id: string
          metadata: Json | null
          proxima_acao_sugerida: string | null
          resultado: string | null
          resumo_ia: string | null
          titulo: string | null
          usuario_id: string
        }
        Insert: {
          canal: string
          cliente_id: string
          conteudo?: string | null
          criado_em?: string | null
          direcao?: string | null
          duracao_minutos?: number | null
          id?: string
          metadata?: Json | null
          proxima_acao_sugerida?: string | null
          resultado?: string | null
          resumo_ia?: string | null
          titulo?: string | null
          usuario_id: string
        }
        Update: {
          canal?: string
          cliente_id?: string
          conteudo?: string | null
          criado_em?: string | null
          direcao?: string | null
          duracao_minutos?: number | null
          id?: string
          metadata?: Json | null
          proxima_acao_sugerida?: string | null
          resultado?: string | null
          resumo_ia?: string | null
          titulo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          descricao: string | null
          id: string
          nicho: string | null
          nome: string
          objecoes_comuns: string | null
          perfil_decisor: string | null
          processamento_info: string | null
          referencia_preco: string | null
          usuario_id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nicho?: string | null
          nome: string
          objecoes_comuns?: string | null
          perfil_decisor?: string | null
          processamento_info?: string | null
          referencia_preco?: string | null
          usuario_id: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nicho?: string | null
          nome?: string
          objecoes_comuns?: string | null
          perfil_decisor?: string | null
          processamento_info?: string | null
          referencia_preco?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          case_real: string | null
          criado_em: string | null
          descricao: string | null
          entregaveis_detalhados: string | null
          formato_duracao: string | null
          garantia: string | null
          id: string
          nicho: string | null
          nome: string
          nome_metodologia: string | null
          objecao_principal: string | null
          preco_ancora: number | null
          preco_meta: number | null
          preco_minimo: number | null
          resultado_entregue: string | null
          usuario_id: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          case_real?: string | null
          criado_em?: string | null
          descricao?: string | null
          entregaveis_detalhados?: string | null
          formato_duracao?: string | null
          garantia?: string | null
          id?: string
          nicho?: string | null
          nome: string
          nome_metodologia?: string | null
          objecao_principal?: string | null
          preco_ancora?: number | null
          preco_meta?: number | null
          preco_minimo?: number | null
          resultado_entregue?: string | null
          usuario_id: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          case_real?: string | null
          criado_em?: string | null
          descricao?: string | null
          entregaveis_detalhados?: string | null
          formato_duracao?: string | null
          garantia?: string | null
          id?: string
          nicho?: string | null
          nome?: string
          nome_metodologia?: string | null
          objecao_principal?: string | null
          preco_ancora?: number | null
          preco_meta?: number | null
          preco_minimo?: number | null
          resultado_entregue?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_venda: {
        Row: {
          atualizado_em: string | null
          cliente_id: string | null
          contexto: string | null
          criado_em: string | null
          dados_formulario: Json | null
          email_gerado_em: string | null
          email_json: Json | null
          follow_up_gerado_em: string | null
          follow_up_json: Json | null
          geracao_status: string | null
          id: string
          mensagens_confirmacao_geradas_em: string | null
          mensagens_confirmacao_json: Json | null
          nicho: string | null
          notas_pos_reuniao: string | null
          objecoes_geradas_em: string | null
          objecoes_json: Json | null
          preco: number | null
          produto: string | null
          proposta_gerada_em: string | null
          proposta_json: Json | null
          resultado: string | null
          roteiro_aprovado: boolean | null
          roteiro_aprovado_em: string | null
          roteiro_gerado_em: string | null
          roteiro_json: Json | null
          secoes_estado: Json | null
          tokens_proposta: number | null
          tokens_roteiro: number | null
          usuario_id: string
          whatsapp_gerado_em: string | null
          whatsapp_json: Json | null
        }
        Insert: {
          atualizado_em?: string | null
          cliente_id?: string | null
          contexto?: string | null
          criado_em?: string | null
          dados_formulario?: Json | null
          email_gerado_em?: string | null
          email_json?: Json | null
          follow_up_gerado_em?: string | null
          follow_up_json?: Json | null
          geracao_status?: string | null
          id?: string
          mensagens_confirmacao_geradas_em?: string | null
          mensagens_confirmacao_json?: Json | null
          nicho?: string | null
          notas_pos_reuniao?: string | null
          objecoes_geradas_em?: string | null
          objecoes_json?: Json | null
          preco?: number | null
          produto?: string | null
          proposta_gerada_em?: string | null
          proposta_json?: Json | null
          resultado?: string | null
          roteiro_aprovado?: boolean | null
          roteiro_aprovado_em?: string | null
          roteiro_gerado_em?: string | null
          roteiro_json?: Json | null
          secoes_estado?: Json | null
          tokens_proposta?: number | null
          tokens_roteiro?: number | null
          usuario_id: string
          whatsapp_gerado_em?: string | null
          whatsapp_json?: Json | null
        }
        Update: {
          atualizado_em?: string | null
          cliente_id?: string | null
          contexto?: string | null
          criado_em?: string | null
          dados_formulario?: Json | null
          email_gerado_em?: string | null
          email_json?: Json | null
          follow_up_gerado_em?: string | null
          follow_up_json?: Json | null
          geracao_status?: string | null
          id?: string
          mensagens_confirmacao_geradas_em?: string | null
          mensagens_confirmacao_json?: Json | null
          nicho?: string | null
          notas_pos_reuniao?: string | null
          objecoes_geradas_em?: string | null
          objecoes_json?: Json | null
          preco?: number | null
          produto?: string | null
          proposta_gerada_em?: string | null
          proposta_json?: Json | null
          resultado?: string | null
          roteiro_aprovado?: boolean | null
          roteiro_aprovado_em?: string | null
          roteiro_gerado_em?: string | null
          roteiro_json?: Json | null
          secoes_estado?: Json | null
          tokens_proposta?: number | null
          tokens_roteiro?: number | null
          usuario_id?: string
          whatsapp_gerado_em?: string | null
          whatsapp_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_venda_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_venda_usuario_id_fkey"
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
          regeneracoes_restantes: number | null
          scripts_restantes: number | null
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
          regeneracoes_restantes?: number | null
          scripts_restantes?: number | null
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
          regeneracoes_restantes?: number | null
          scripts_restantes?: number | null
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
      get_dashboard_kpis: { Args: never; Returns: Json }
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
