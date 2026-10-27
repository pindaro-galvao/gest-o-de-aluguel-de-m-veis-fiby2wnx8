import pb from '@/lib/pocketbase/client'
import type { VendaRecord } from '@/types/database'

const VENDA_EXPAND =
  'cliente,produto,produto.tipo,produto.linha,produto.atr01,produto.atr02,produto.atr03,produto.atr04,produto.atr05,produto.atr06,produto.atr07,produto.atr08,produto.atr09,vendedor,endereco,orcamento_origem'

export const vendasService = {
  async getAll(params?: { filter?: string; sort?: string }) {
    return pb.collection('vendas').getFullList<VendaRecord>({
      sort: params?.sort || '-created',
      filter: params?.filter || '',
      expand: VENDA_EXPAND,
    })
  },

  async getById(id: string) {
    return pb.collection('vendas').getOne<VendaRecord>(id, {
      expand: VENDA_EXPAND,
    })
  },

  async create(data: {
    cliente: string
    produto: string
    quantidade: number
    data_inicio: string
    data_fim: string
    valor_total: number
    forma_pagamento: string
    status: string
    observacoes?: string
    endereco?: string
    orcamento_origem?: string
    vendedor?: string
  }) {
    const payload = {
      ...data,
      observacoes: data.observacoes ? data.observacoes.trim().toUpperCase() : '',
    }
    return pb.collection('vendas').create<VendaRecord>(payload, {
      expand: VENDA_EXPAND,
    })
  },

  async update(id: string, data: Partial<VendaRecord>) {
    const payload: Partial<VendaRecord> = { ...data }
    if (typeof payload.observacoes === 'string') {
      payload.observacoes = payload.observacoes.trim().toUpperCase()
    }
    return pb.collection('vendas').update<VendaRecord>(id, payload, {
      expand: VENDA_EXPAND,
    })
  },

  async delete(id: string) {
    return pb.collection('vendas').delete(id)
  },

  async cancelar(id: string) {
    return pb
      .collection('vendas')
      .update<VendaRecord>(id, { status: 'cancelada' }, { expand: VENDA_EXPAND })
  },
}
