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
      aluno_followups: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          descricao: string
          id: string
          updated_at: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aluno_followups_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          codigo: string
          created_at: string
          curso: string
          data_matricula: string | null
          dataMatricula: string
          dataPagamentoMatricula: string | null
          dataStatus: string | null
          desconto: number
          descontoTipo: string
          diaLimiteDesconto: number
          diaVencimento: number
          foto_url: string | null
          horario: string
          id: string
          import_raw: Json | null
          import_row: number | null
          matriculaPaga: string | null
          nome: string
          numero: string
          observacoes: string | null
          primeiraCobranca: string
          qtdMensalidades: number
          responsavel: string
          rua: string
          status: string
          telefone: string
          telefoneResponsavel: string
          turma: string
          valor_matricula: number | null
          valorMensal: number | null
        }
        Insert: {
          bairro?: string
          cep?: string
          cidade?: string
          codigo?: string
          created_at?: string
          curso?: string
          data_matricula?: string | null
          dataMatricula?: string
          dataPagamentoMatricula?: string | null
          dataStatus?: string | null
          desconto?: number
          descontoTipo?: string
          diaLimiteDesconto?: number
          diaVencimento?: number
          foto_url?: string | null
          horario?: string
          id?: string
          import_raw?: Json | null
          import_row?: number | null
          matriculaPaga?: string | null
          nome: string
          numero?: string
          observacoes?: string | null
          primeiraCobranca?: string
          qtdMensalidades?: number
          responsavel?: string
          rua?: string
          status?: string
          telefone?: string
          telefoneResponsavel?: string
          turma?: string
          valor_matricula?: number | null
          valorMensal?: number | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          codigo?: string
          created_at?: string
          curso?: string
          data_matricula?: string | null
          dataMatricula?: string
          dataPagamentoMatricula?: string | null
          dataStatus?: string | null
          desconto?: number
          descontoTipo?: string
          diaLimiteDesconto?: number
          diaVencimento?: number
          foto_url?: string | null
          horario?: string
          id?: string
          import_raw?: Json | null
          import_row?: number | null
          matriculaPaga?: string | null
          nome?: string
          numero?: string
          observacoes?: string | null
          primeiraCobranca?: string
          qtdMensalidades?: number
          responsavel?: string
          rua?: string
          status?: string
          telefone?: string
          telefoneResponsavel?: string
          turma?: string
          valor_matricula?: number | null
          valorMensal?: number | null
        }
        Relationships: []
      }
      cursos: {
        Row: {
          ativo: boolean
          carga_horaria: number | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          valor_matricula_padrao: number | null
          valor_mensal_padrao: number | null
        }
        Insert: {
          ativo?: boolean
          carga_horaria?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          valor_matricula_padrao?: number | null
          valor_mensal_padrao?: number | null
        }
        Update: {
          ativo?: boolean
          carga_horaria?: number | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          valor_matricula_padrao?: number | null
          valor_mensal_padrao?: number | null
        }
        Relationships: []
      }
      faturamento_mensal: {
        Row: {
          mes: string
          unidade: string
          valor: number
        }
        Insert: {
          mes: string
          unidade?: string
          valor: number
        }
        Update: {
          mes?: string
          unidade?: string
          valor?: number
        }
        Relationships: []
      }
      financeiro_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          grupo_id: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          grupo_id?: string | null
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          grupo_id?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_categorias_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "financeiro_grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_grupos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      financeiro_registros: {
        Row: {
          categoria: string
          created_at: string
          data: string | null
          descricao: string
          id: string
          observacoes: string | null
          quantidade: number | null
          tipo: string
          valor: number | null
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string | null
          descricao: string
          id?: string
          observacoes?: string | null
          quantidade?: number | null
          tipo: string
          valor?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string | null
          descricao?: string
          id?: string
          observacoes?: string | null
          quantidade?: number | null
          tipo?: string
          valor?: number | null
        }
        Relationships: []
      }
      horarios: {
        Row: {
          ativo: boolean
          descricao: string
          dias_semana: number[]
          hora_fim: string | null
          hora_inicio: string | null
          id: string
        }
        Insert: {
          ativo?: boolean
          descricao: string
          dias_semana?: number[]
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
        }
        Update: {
          ativo?: boolean
          descricao?: string
          dias_semana?: number[]
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria: string
          created_at: string
          data_lancamento: string | null
          descricao: string | null
          grupo: string
          id: string
          mes: string
          origem: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria: string
          created_at?: string
          data_lancamento?: string | null
          descricao?: string | null
          grupo?: string
          id?: string
          mes: string
          origem?: string
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data_lancamento?: string | null
          descricao?: string | null
          grupo?: string
          id?: string
          mes?: string
          origem?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      lead_interacoes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          lead_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          aluno_id: string | null
          consultor_responsavel: string | null
          created_at: string
          curso_interesse: string
          data_fechamento: string | null
          data_pos_venda: string | null
          data_proximo_contato: string | null
          data_ultimo_contato: string | null
          etapa: string
          id: string
          idade_aluno: number | null
          motivo_perda: string | null
          nome_aluno: string | null
          nome_responsavel: string
          observacoes: string
          origem: string
          pos_venda_realizado: boolean
          telefone: string
          turno_interesse: string
          valor_mensalidade_negociado: number | null
        }
        Insert: {
          aluno_id?: string | null
          consultor_responsavel?: string | null
          created_at?: string
          curso_interesse?: string
          data_fechamento?: string | null
          data_pos_venda?: string | null
          data_proximo_contato?: string | null
          data_ultimo_contato?: string | null
          etapa?: string
          id?: string
          idade_aluno?: number | null
          motivo_perda?: string | null
          nome_aluno?: string | null
          nome_responsavel: string
          observacoes?: string
          origem?: string
          pos_venda_realizado?: boolean
          telefone: string
          turno_interesse?: string
          valor_mensalidade_negociado?: number | null
        }
        Update: {
          aluno_id?: string | null
          consultor_responsavel?: string | null
          created_at?: string
          curso_interesse?: string
          data_fechamento?: string | null
          data_pos_venda?: string | null
          data_proximo_contato?: string | null
          data_ultimo_contato?: string | null
          etapa?: string
          id?: string
          idade_aluno?: number | null
          motivo_perda?: string | null
          nome_aluno?: string | null
          nome_responsavel?: string
          observacoes?: string
          origem?: string
          pos_venda_realizado?: boolean
          telefone?: string
          turno_interesse?: string
          valor_mensalidade_negociado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      matriculas_curso: {
        Row: {
          aluno_id: string
          created_at: string
          curso_id: string | null
          data_conclusao: string | null
          horario_id: string | null
          id: string
          motivo_cancelamento: string | null
          ordem: number
          status: string
          turma_id: string | null
          valor_mensal: number | null
        }
        Insert: {
          aluno_id: string
          created_at?: string
          curso_id?: string | null
          data_conclusao?: string | null
          horario_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          ordem: number
          status?: string
          turma_id?: string | null
          valor_mensal?: number | null
        }
        Update: {
          aluno_id?: string
          created_at?: string
          curso_id?: string | null
          data_conclusao?: string | null
          horario_id?: string | null
          id?: string
          motivo_cancelamento?: string | null
          ordem?: number
          status?: string
          turma_id?: string | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matriculas_curso_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_curso_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_curso_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matriculas_curso_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          codigo: string
          created_at: string
          curso_id: string
          data_inicio: string | null
          data_previsao_termino: string | null
          disponivel_matricula: boolean
          horario_id: string | null
          id: string
          observacoes: string | null
          status: string
        }
        Insert: {
          codigo: string
          created_at?: string
          curso_id: string
          data_inicio?: string | null
          data_previsao_termino?: string | null
          disponivel_matricula?: boolean
          horario_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          curso_id?: string
          data_inicio?: string | null
          data_previsao_termino?: string | null
          disponivel_matricula?: boolean
          horario_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "turmas_curso_id_fkey"
            columns: ["curso_id"]
            isOneToOne: false
            referencedRelation: "cursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turmas_horario_id_fkey"
            columns: ["horario_id"]
            isOneToOne: false
            referencedRelation: "horarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      crm_chave_telefone: { Args: { numero: string }; Returns: string }
      crm_consultores: {
        Args: never
        Returns: {
          id: string
          nome: string
        }[]
      }
      crm_registrar_contato: {
        Args: {
          p_descricao: string
          p_lead_id: string
          p_proximo?: string
          p_tipo: string
        }
        Returns: undefined
      }
      crm_telefone: { Args: { numero: string }; Returns: string }
      financeiro_mesclar_categorias: {
        Args: { destino_id: string; origem_id: string }
        Returns: number
      }
      financeiro_nome_chave: { Args: { n: string }; Returns: string }
      has_owner_access: { Args: never; Returns: boolean }
      pedagogico_salvar_aluno: {
        Args: { p_aluno: Json; p_matriculas: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner"
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
      app_role: ["owner"],
    },
  },
} as const
