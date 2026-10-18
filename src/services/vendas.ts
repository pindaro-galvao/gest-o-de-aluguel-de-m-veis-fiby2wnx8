import pb from '@/lib/pocketbase/client'
import type { VendaRecord } from '@/types/database'

export const vendasService = {
  async getAll(params?: { filter?: string; sort?: string }) {
    return pb.collection('vendas').getFullList<VendaRecord>({
      sort: params?.sort || '-created',
      filter: params?.filter || '',
      expand: 'cliente,produto,produto.tipo,produto.linha,vendedor',
    })
  },

  async getById(id: string) {
    return pb.collection('vendas').getOne<VendaRecord>(id, {
      expand: 'cliente,produto,produto.tipo,produto.linha,vendedor',
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
  }) {
    // Vendedor é gravado automaticamente pelo backend hook, mas podemos passar seguro
    return pb.collection('vendas').create<VendaRecord>(data, {
      expand: 'cliente,produto,produto.tipo,produto.linha,vendedor',
    })
  },

  async update(id: string, data: Partial<VendaRecord>) {
    return pb.collection('vendas').update<VendaRecord>(id, data, {
      expand: 'cliente,produto,produto.tipo,produto.linha,vendedor',
    })
  },

  async delete(id: string) {
    return pb.collection('vendas').delete(id)
  },
}
