import pb from '@/lib/pocketbase/client'
import type { LinhaRecord } from '@/types/database'

export const linhasService = {
  async getAll(params?: { filter?: string; sort?: string; apenasAtivos?: boolean }) {
    let filter = params?.filter || ''
    if (params?.apenasAtivos) {
      filter = filter ? `(${filter}) && ativo = true` : 'ativo = true'
    }
    return pb.collection('linhas').getFullList<LinhaRecord>({
      sort: params?.sort || 'ordem,nome',
      filter,
    })
  },

  async getById(id: string) {
    return pb.collection('linhas').getOne<LinhaRecord>(id)
  },

  async create(data: { nome: string; descricao?: string; ordem?: number; ativo?: boolean }) {
    const payload = {
      ...data,
      nome: data.nome.trim().toUpperCase(),
      descricao: data.descricao ? data.descricao.trim().toUpperCase() : '',
    }
    return pb.collection('linhas').create<LinhaRecord>(payload)
  },

  async update(id: string, data: Partial<LinhaRecord>) {
    const payload: Partial<LinhaRecord> = { ...data }
    if (typeof payload.nome === 'string') payload.nome = payload.nome.trim().toUpperCase()
    if (typeof payload.descricao === 'string') payload.descricao = payload.descricao.trim().toUpperCase()
    return pb.collection('linhas').update<LinhaRecord>(id, payload)
  },

  async delete(id: string) {
    return pb.collection('linhas').delete(id)
  },

  async countProdutosVinculados(linhaId: string): Promise<number> {
    try {
      const res = await pb.collection('produtos').getList(1, 1, {
        filter: `linha = "${linhaId}"`,
      })
      return res.totalItems
    } catch {
      return 0
    }
  },
}
