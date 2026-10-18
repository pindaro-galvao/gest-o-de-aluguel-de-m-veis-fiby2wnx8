import type { RecordModel } from 'pocketbase'

export type UserRole = 'ADMIN' | 'VENDEDOR' | 'CLIENTE'

export interface UserRecord extends RecordModel {
  email: string
  name: string
  role: UserRole
  avatar?: string
  verified: boolean
}

export interface CategoriaRecord extends RecordModel {
  nome: string
  descricao?: string
  ordem?: number
  ativo: boolean
}

export interface LinhaRecord extends RecordModel {
  nome: string
  descricao?: string
  ordem?: number
  ativo: boolean
}

// Mantido como type para compatibilidade onde string for exibida
export type TipoProduto = string

export interface ProdutoRecord extends RecordModel {
  codigo: string
  nome: string
  linha?: string // relation -> linhas
  tipo: string // relation -> categorias
  dimensoes?: string
  descricao?: string
  quantidade_estoque: number
  valor_locacao_mensal: number
  foto?: string
  expand?: {
    tipo?: CategoriaRecord
    linha?: LinhaRecord
  }
}

export interface ClienteRecord extends RecordModel {
  nome: string
  email: string
  telefone?: string
  endereco?: string
  usuario?: string // relation -> users
  expand?: {
    usuario?: UserRecord
  }
}

export type FormaPagamento = 'debito_em_conta' | 'credito' | 'boleto' | 'pix'
export type StatusVenda = 'ativa' | 'encerrada' | 'cancelada'

export interface VendaRecord extends RecordModel {
  cliente: string // relation -> clientes
  produto: string // relation -> produtos
  quantidade: number
  data_inicio: string
  data_fim: string
  valor_total: number
  forma_pagamento: FormaPagamento
  status: StatusVenda
  observacoes?: string
  vendedor: string // relation -> users
  expand?: {
    cliente?: ClienteRecord
    produto?: ProdutoRecord
    vendedor?: UserRecord
  }
}

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado'

export interface OrcamentoRecord extends RecordModel {
  cliente: string // relation -> clientes
  valor_total: number
  validade: string
  status: StatusOrcamento
  observacoes?: string
  vendedor: string // relation -> users
  data_aprovacao?: string
  expand?: {
    cliente?: ClienteRecord
    vendedor?: UserRecord
    orcamento_itens_via_orcamento?: OrcamentoItemRecord[]
  }
}

export interface OrcamentoItemRecord extends RecordModel {
  orcamento: string // relation -> orcamentos
  produto: string // relation -> produtos
  quantidade: number
  expand?: {
    produto?: ProdutoRecord
  }
}
