import pb from '@/lib/pocketbase/client'
import type { ProdutoRecord } from '@/types/database'

const PRODUTO_EXPAND = 'tipo,linha,atr01,atr02,atr03,atr04,atr05,atr06,atr07,atr08,atr09'

export const produtosService = {
  async getAll(params?: { filter?: string; sort?: string }) {
    return pb.collection('produtos').getFullList<ProdutoRecord>({
      sort: params?.sort || 'nome',
      filter: params?.filter || '',
      expand: PRODUTO_EXPAND,
    })
  },

  async getById(id: string) {
    return pb.collection('produtos').getOne<ProdutoRecord>(id, {
      expand: PRODUTO_EXPAND,
    })
  },

  async create(data: FormData | Partial<ProdutoRecord>) {
    return pb.collection('produtos').create<ProdutoRecord>(data, {
      expand: PRODUTO_EXPAND,
    })
  },

  async update(id: string, data: FormData | Partial<ProdutoRecord>) {
    return pb.collection('produtos').update<ProdutoRecord>(id, data, {
      expand: PRODUTO_EXPAND,
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
