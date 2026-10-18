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
    return pb.collection('categorias').create<CategoriaRecord>(data)
  },

  async update(id: string, data: Partial<CategoriaRecord>) {
    return pb.collection('categorias').update<CategoriaRecord>(id, data)
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
