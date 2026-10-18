import pb from '@/lib/pocketbase/client'
import type { ClienteRecord } from '@/types/database'

export const clientesService = {
  async getAll(params?: { search?: string }) {
    let filter = ''
    if (params?.search) {
      filter = `nome ~ "${params.search}" || email ~ "${params.search}"`
    }
    return pb.collection('clientes').getFullList<ClienteRecord>({
      sort: 'nome',
      filter,
      expand: 'usuario',
    })
  },

  async getById(id: string) {
    return pb.collection('clientes').getOne<ClienteRecord>(id, {
      expand: 'usuario',
    })
  },

  async getByUsuarioId(usuarioId: string) {
    return pb.collection('clientes').getFirstListItem<ClienteRecord>(`usuario = "${usuarioId}"`, {
      expand: 'usuario',
    })
  },

  async create(data: Partial<ClienteRecord>) {
    const payload: Partial<ClienteRecord> = { ...data }
    if (typeof payload.nome === 'string') payload.nome = payload.nome.trim().toUpperCase()
    if (typeof payload.endereco === 'string')
      payload.endereco = payload.endereco.trim().toUpperCase()
    if (typeof payload.telefone === 'string')
      payload.telefone = payload.telefone.trim().toUpperCase()
    if (typeof payload.email === 'string') payload.email = payload.email.trim()
    return pb.collection('clientes').create<ClienteRecord>(payload)
  },

  async update(id: string, data: Partial<ClienteRecord>) {
    const payload: Partial<ClienteRecord> = { ...data }
    if (typeof payload.nome === 'string') payload.nome = payload.nome.trim().toUpperCase()
    if (typeof payload.endereco === 'string')
      payload.endereco = payload.endereco.trim().toUpperCase()
    if (typeof payload.telefone === 'string')
      payload.telefone = payload.telefone.trim().toUpperCase()
    if (typeof payload.email === 'string') payload.email = payload.email.trim()
    return pb.collection('clientes').update<ClienteRecord>(id, payload)
  },

  async delete(id: string) {
    return pb.collection('clientes').delete(id)
  },
}
