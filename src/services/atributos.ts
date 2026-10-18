import pb from '@/lib/pocketbase/client'
import type { AtributoRecord } from '@/types/database'

export const atributosService = {
  async getAll(params?: { filter?: string; sort?: string; apenasAtivos?: boolean }) {
    let filter = params?.filter || ''
    if (params?.apenasAtivos) {
      filter = filter ? `(${filter}) && ativo = true` : 'ativo = true'
    }
    return pb.collection('atributos').getFullList<AtributoRecord>({
      sort: params?.sort || 'codigo_atr',
      filter,
    })
  },

  async getById(id: string) {
    return pb.collection('atributos').getOne<AtributoRecord>(id)
  },

  async getByCodigo(codigo: string) {
    try {
      return await pb
        .collection('atributos')
        .getFirstListItem<AtributoRecord>(`codigo_atr = "${codigo}"`)
    } catch {
      return null
    }
  },

  async create(data: { codigo_atr: string; descricao_atr: string; ativo?: boolean }) {
    const payload = {
      ...data,
      codigo_atr: data.codigo_atr.trim().toUpperCase(),
      descricao_atr: data.descricao_atr.trim().toUpperCase(),
    }
    return pb.collection('atributos').create<AtributoRecord>(payload)
  },

  async update(id: string, data: Partial<AtributoRecord>) {
    const payload: Partial<AtributoRecord> = { ...data }
    if (typeof payload.codigo_atr === 'string') payload.codigo_atr = payload.codigo_atr.trim().toUpperCase()
    if (typeof payload.descricao_atr === 'string') payload.descricao_atr = payload.descricao_atr.trim().toUpperCase()
    return pb.collection('atributos').update<AtributoRecord>(id, payload)
  },

  async delete(id: string) {
    return pb.collection('atributos').delete(id)
  },

  async countProdutosVinculados(atributoId: string): Promise<number> {
    try {
      const orFilters = [
        `atr01 = "${atributoId}"`,
        `atr02 = "${atributoId}"`,
        `atr03 = "${atributoId}"`,
        `atr04 = "${atributoId}"`,
        `atr05 = "${atributoId}"`,
        `atr06 = "${atributoId}"`,
        `atr07 = "${atributoId}"`,
        `atr08 = "${atributoId}"`,
        `atr09 = "${atributoId}"`,
      ].join(' || ')

      const res = await pb.collection('produtos').getList(1, 1, {
        filter: orFilters,
      })
      return res.totalItems
    } catch {
      return 0
    }
  },
}
