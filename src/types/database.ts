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

export interface AtributoRecord extends RecordModel {
  codigo_atr: string
  descricao_atr: string
  ativo?: boolean
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
  valor_locacao_diaria: number
  valor_locacao_mensal?: number
  foto?: string
  atr01?: string // relation -> atributos
  atr02?: string
  atr03?: string
  atr04?: string
  atr05?: string
  atr06?: string
  atr07?: string
  atr08?: string
  atr09?: string
  expand?: {
    tipo?: CategoriaRecord
    linha?: LinhaRecord
    atr01?: AtributoRecord
    atr02?: AtributoRecord
    atr03?: AtributoRecord
    atr04?: AtributoRecord
    atr05?: AtributoRecord
    atr06?: AtributoRecord
    atr07?: AtributoRecord
    atr08?: AtributoRecord
    atr09?: AtributoRecord
  }
}

export interface EnderecoRecord extends RecordModel {
  cliente: string // relation -> clientes
  identificacao?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep?: string
  principal?: boolean
  ativo?: boolean
  expand?: {
    cliente?: ClienteRecord
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
    enderecos_via_cliente?: EnderecoRecord[]
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
  endereco?: string // relation -> enderecos
  orcamento_origem?: string // relation -> orcamentos
  expand?: {
    cliente?: ClienteRecord
    produto?: ProdutoRecord
    vendedor?: UserRecord
    endereco?: EnderecoRecord
    orcamento_origem?: OrcamentoRecord
  }
}

export type StatusOrcamento =
  | 'rascunho'
  | 'enviado'
  | 'aprovado'
  | 'recusado'
  | 'expirado'
  | 'convertido'

export interface OrcamentoRecord extends RecordModel {
  cliente: string // relation -> clientes
  valor_total: number
  validade: string
  status: StatusOrcamento
  observacoes?: string
  vendedor: string // relation -> users
  data_aprovacao?: string
  data_recusa?: string
  data_inicio?: string
  data_fim?: string
  endereco?: string // relation -> enderecos
  expand?: {
    cliente?: ClienteRecord
    vendedor?: UserRecord
    endereco?: EnderecoRecord
    orcamento_itens_via_orcamento?: OrcamentoItemRecord[]
  }
}

export interface OrcamentoItemRecord extends RecordModel {
  orcamento: string // relation -> orcamentos
  produto: string // relation -> produtos
  quantidade: number
  expand?: {
    produto?: ProdutoRecord
    orcamento?: OrcamentoRecord
  }
}
