import pb from '@/lib/pocketbase/client'
import type { ProdutoRecord } from '@/types/database'

export const produtosService = {
  async getAll(params?: { filter?: string; sort?: string }) {
    return pb.collection('produtos').getFullList<ProdutoRecord>({
      sort: params?.sort || 'nome',
      filter: params?.filter || '',
      expand: 'tipo,linha',
    })
  },

  async getById(id: string) {
    return pb.collection('produtos').getOne<ProdutoRecord>(id, {
      expand: 'tipo,linha',
    })
  },

  async create(data: FormData | Partial<ProdutoRecord>) {
    return pb.collection('produtos').create<ProdutoRecord>(data, {
      expand: 'tipo,linha',
    })
  },

  async update(id: string, data: FormData | Partial<ProdutoRecord>) {
    return pb.collection('produtos').update<ProdutoRecord>(id, data, {
      expand: 'tipo,linha',
    })
  },

  async delete(id: string) {
    return pb.collection('produtos').delete(id)
  },

  getImageUrl(record: ProdutoRecord, filename?: string) {
    if (!filename && !record.foto) return null
    return pb.files.getURL(record, filename || record.foto)
  },
}
