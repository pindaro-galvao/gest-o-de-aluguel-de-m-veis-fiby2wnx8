import pb from '@/lib/pocketbase/client'
import type { CategoriaRecord } from '@/types/database'

export const categoriasService = {
  async getAll(params?: { filter?: string; sort?: string; apenasAtivos?: boolean }) {
    let filter = params?.filter || ''
    if (params?.apenasAtivos) {
      filter = filter ? `(${filter}) && ativo = true` : 'ativo = true'
    }
    return pb.collection('categorias').getFullList<CategoriaRecord>({
      sort: params?.sort || 'ordem,nome',
      filter,
    })
  },

  async getById(id: string) {
    return pb.collection('categorias').getOne<CategoriaRecord>(id)
  },

  async create(data: { nome: string; descricao?: string; ordem?: number; ativo?: boolean }) {
    const payload = {
      ...data,
      nome: data.nome.trim().toUpperCase(),
      descricao: data.descricao ? data.descricao.trim().toUpperCase() : '',
    }
    return pb.collection('categorias').create<CategoriaRecord>(payload)
  },

  async update(id: string, data: Partial<CategoriaRecord>) {
    const payload: Partial<CategoriaRecord> = { ...data }
    if (typeof payload.nome === 'string') payload.nome = payload.nome.trim().toUpperCase()
    if (typeof payload.descricao === 'string') payload.descricao = payload.descricao.trim().toUpperCase()
    return pb.collection('categorias').update<CategoriaRecord>(id, payload)
  },

  async delete(id: string) {
    return pb.collection('categorias').delete(id)
  },

  async countProdutosVinculados(categoriaId: string): Promise<number> {
    try {
      const res = await pb.collection('produtos').getList(1, 1, {
        filter: `tipo = "${categoriaId}"`,
      })
      return res.totalItems
    } catch {
      return 0
    }
  },
}
