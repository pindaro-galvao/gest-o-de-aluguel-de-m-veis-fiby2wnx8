import pb from '@/lib/pocketbase/client'
import type { ProdutoRecord } from '@/types/database'

const PRODUTO_EXPAND = 'tipo,linha,atr01,atr02,atr03,atr04,atr05,atr06,atr07,atr08,atr09'

function normalizarProdutoData(
  data: FormData | Partial<ProdutoRecord>,
): FormData | Partial<ProdutoRecord> {
  if (data instanceof FormData) {
    const textFields = ['nome', 'codigo', 'dimensoes', 'descricao', 'tipo_old', 'linha_old']
    for (const f of textFields) {
      const val = data.get(f)
      if (typeof val === 'string' && val.trim() !== '') {
        data.set(f, val.trim().toUpperCase())
      }
    }
    return data
  }

  const normalized: Partial<ProdutoRecord> = { ...data }
  if (typeof normalized.nome === 'string') normalized.nome = normalized.nome.trim().toUpperCase()
  if (typeof normalized.codigo === 'string')
    normalized.codigo = normalized.codigo.trim().toUpperCase()
  if (typeof normalized.dimensoes === 'string')
    normalized.dimensoes = normalized.dimensoes.trim().toUpperCase()
  if (typeof normalized.descricao === 'string')
    normalized.descricao = normalized.descricao.trim().toUpperCase()
  if (typeof normalized.tipo_old === 'string')
    normalized.tipo_old = normalized.tipo_old.trim().toUpperCase()
  if (typeof normalized.linha_old === 'string')
    normalized.linha_old = normalized.linha_old.trim().toUpperCase()
  return normalized
}

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
    const payload = normalizarProdutoData(data)
    return pb.collection('produtos').create<ProdutoRecord>(payload, {
      expand: PRODUTO_EXPAND,
    })
  },

  async update(id: string, data: FormData | Partial<ProdutoRecord>) {
    const payload = normalizarProdutoData(data)
    return pb.collection('produtos').update<ProdutoRecord>(id, payload, {
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
