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
    return pb.collection('clientes').create<ClienteRecord>(data)
  },

  async update(id: string, data: Partial<ClienteRecord>) {
    return pb.collection('clientes').update<ClienteRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('clientes').delete(id)
  },
}
