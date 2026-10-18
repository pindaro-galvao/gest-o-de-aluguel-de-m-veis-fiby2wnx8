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
    const payload = {
      ...data,
      name: data.name ? data.name.trim().toUpperCase() : '',
    }
    const user = await pb.collection('users').create<UserRecord>(payload)
    // Disparar e-mail de verificação
    try {
      await pb.collection('users').requestVerification(data.email)
    } catch (err) {
      console.warn('Não foi possível disparar e-mail de verificação:', err)
    }
    return user
  },

  async update(id: string, data: Partial<UserRecord>) {
    const payload: Partial<UserRecord> = { ...data }
    if (typeof payload.name === 'string') {
      payload.name = payload.name.trim().toUpperCase()
    }
    return pb.collection('users').update<UserRecord>(id, payload)
  },

  async delete(id: string) {
    return pb.collection('users').delete(id)
  },
}
