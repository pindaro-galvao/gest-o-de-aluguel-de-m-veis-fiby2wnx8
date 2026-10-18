import pb from '@/lib/pocketbase/client'
import type { OrcamentoRecord, OrcamentoItemRecord } from '@/types/database'

export const orcamentosService = {
  async getAll(params?: { filter?: string; sort?: string }) {
    return pb.collection('orcamentos').getFullList<OrcamentoRecord>({
      sort: params?.sort || '-created',
      filter: params?.filter || '',
      expand: 'cliente,vendedor,endereco',
    })
  },

  async getById(id: string) {
    const orcamento = await pb.collection('orcamentos').getOne<OrcamentoRecord>(id, {
      expand: 'cliente,vendedor,endereco',
    })
    // Buscar itens
    const itens = await pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
      filter: `orcamento = "${id}"`,
      expand:
        'produto,produto.tipo,produto.linha,produto.atr01,produto.atr02,produto.atr03,produto.atr04,produto.atr05,produto.atr06,produto.atr07,produto.atr08,produto.atr09',
    })
    return { orcamento, itens }
  },

  async create(
    data: {
      cliente: string
      valor_total: number
      validade: string
      status: string
      observacoes?: string
      data_inicio?: string
      data_fim?: string
      endereco?: string
    },
    itens: Array<{ produto: string; quantidade: number }>,
  ) {
    const payload = {
      ...data,
      observacoes: data.observacoes ? data.observacoes.trim().toUpperCase() : '',
    }
    const orcamento = await pb.collection('orcamentos').create<OrcamentoRecord>(payload, {
      expand: 'cliente,vendedor,endereco',
    })
    for (const item of itens) {
      await pb.collection('orcamento_itens').create<OrcamentoItemRecord>({
        orcamento: orcamento.id,
        produto: item.produto,
        quantidade: item.quantidade,
      })
    }
    return orcamento
  },

  async update(
    id: string,
    data: {
      cliente: string
      valor_total: number
      validade: string
      observacoes?: string
      data_inicio?: string
      data_fim?: string
      endereco?: string
    },
    itens: Array<{ produto: string; quantidade: number }>,
  ) {
    const payload = {
      ...data,
      observacoes: data.observacoes ? data.observacoes.trim().toUpperCase() : '',
    }
    const orcamento = await pb.collection('orcamentos').update<OrcamentoRecord>(id, payload, {
      expand: 'cliente,vendedor,endereco',
    })

    // Sincronizar itens: remove existentes e recria
    const itensAntigos = await pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
      filter: `orcamento = "${id}"`,
    })
    for (const itemAntigo of itensAntigos) {
      await pb.collection('orcamento_itens').delete(itemAntigo.id)
    }

    for (const item of itens) {
      await pb.collection('orcamento_itens').create<OrcamentoItemRecord>({
        orcamento: id,
        produto: item.produto,
        quantidade: item.quantidade,
      })
    }

    return orcamento
  },

  async updateStatus(
    id: string,
    status: string,
    extraFields?: { data_aprovacao?: string; data_recusa?: string; validade?: string },
  ) {
    const payload: Record<string, unknown> = { status }
    if (extraFields?.data_aprovacao !== undefined) {
      payload.data_aprovacao = extraFields.data_aprovacao
    }
    if (extraFields?.data_recusa !== undefined) {
      payload.data_recusa = extraFields.data_recusa
    }
    if (extraFields?.validade !== undefined) {
      payload.validade = extraFields.validade
    }
    return pb.collection('orcamentos').update<OrcamentoRecord>(id, payload, {
      expand: 'cliente,vendedor,endereco',
    })
  },

  async revalidarEReenviar(id: string, novaValidade: string) {
    return pb.collection('orcamentos').update<OrcamentoRecord>(
      id,
      {
        status: 'enviado',
        validade: novaValidade,
      },
      {
        expand: 'cliente,vendedor,endereco',
      },
    )
  },

  async getItensForOrcamento(orcamentoId: string) {
    return pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
      filter: `orcamento = "${orcamentoId}"`,
      expand:
        'produto,produto.tipo,produto.linha,produto.atr01,produto.atr02,produto.atr03,produto.atr04,produto.atr05,produto.atr06,produto.atr07,produto.atr08,produto.atr09',
    })
  },

  async delete(id: string) {
    return pb.collection('orcamentos').delete(id)
  },
}
