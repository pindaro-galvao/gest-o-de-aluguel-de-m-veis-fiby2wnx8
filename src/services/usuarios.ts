import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/database'

export const usuariosService = {
  async getAll(params?: { role?: string }) {
    let filter = ''
    if (params?.role && params.role !== 'TODOS') {
      filter = `role = "${params.role}"`
    }
    return pb.collection('users').getFullList<UserRecord>({
      sort: 'name',
      filter,
    })
  },

  async getById(id: string) {
    return pb.collection('users').getOne<UserRecord>(id)
  },

  async create(data: {
    email: string
    password: string
    passwordConfirm: string
    name: string
    role: string
  }) {
    const user = await pb.collection('users').create<UserRecord>(data)
    // Disparar e-mail de verificação
    try {
      await pb.collection('users').requestVerification(data.email)
    } catch (err) {
      console.warn('Não foi possível disparar e-mail de verificação:', err)
    }
    return user
  },

  async update(id: string, data: Partial<UserRecord>) {
    return pb.collection('users').update<UserRecord>(id, data)
  },

  async delete(id: string) {
    return pb.collection('users').delete(id)
  },
}
