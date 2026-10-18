import pb from '@/lib/pocketbase/client'
import type { EnderecoRecord } from '@/types/database'

export interface CreateEnderecoDTO {
  cliente: string
  identificacao?: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  uf: string
  cep?: string
  principal?: boolean
  ativo?: boolean
}

export const enderecosService = {
  async getByClienteId(clienteId: string, apenasAtivos = false) {
    let filter = `cliente = "${clienteId}"`
    if (apenasAtivos) {
      filter += ' && ativo = true'
    }
    return pb.collection('enderecos').getFullList<EnderecoRecord>({
      filter,
      sort: '-principal,-created',
      expand: 'cliente',
    })
  },

  async getById(id: string) {
    return pb.collection('enderecos').getOne<EnderecoRecord>(id, {
      expand: 'cliente',
    })
  },

  async create(data: CreateEnderecoDTO) {
    const payload = {
      cliente: data.cliente,
      identificacao: (data.identificacao || '').trim().toUpperCase(),
      logradouro: data.logradouro.trim().toUpperCase(),
      numero: data.numero.trim().toUpperCase(),
      complemento: (data.complemento || '').trim().toUpperCase(),
      bairro: data.bairro.trim().toUpperCase(),
      cidade: data.cidade.trim().toUpperCase(),
      uf: data.uf.trim().toUpperCase(),
      cep: (data.cep || '').trim().toUpperCase(),
      principal: !!data.principal,
      ativo: data.ativo !== false,
    }
    return pb.collection('enderecos').create<EnderecoRecord>(payload)
  },

  async update(id: string, data: Partial<CreateEnderecoDTO>) {
    const payload: Partial<Record<string, unknown>> = { ...data }
    if (typeof payload.identificacao === 'string') {
      payload.identificacao = payload.identificacao.trim().toUpperCase()
    }
    if (typeof payload.logradouro === 'string') {
      payload.logradouro = payload.logradouro.trim().toUpperCase()
    }
    if (typeof payload.numero === 'string') {
      payload.numero = payload.numero.trim().toUpperCase()
    }
    if (typeof payload.complemento === 'string') {
      payload.complemento = payload.complemento.trim().toUpperCase()
    }
    if (typeof payload.bairro === 'string') {
      payload.bairro = payload.bairro.trim().toUpperCase()
    }
    if (typeof payload.cidade === 'string') {
      payload.cidade = payload.cidade.trim().toUpperCase()
    }
    if (typeof payload.uf === 'string') {
      payload.uf = payload.uf.trim().toUpperCase()
    }
    if (typeof payload.cep === 'string') {
      payload.cep = payload.cep.trim().toUpperCase()
    }
    return pb.collection('enderecos').update<EnderecoRecord>(id, payload)
  },

  async setPrincipal(id: string, clienteId: string) {
    // Ao atualizar principal = true, o hook no backend desmarca os demais do cliente
    return pb.collection('enderecos').update<EnderecoRecord>(id, {
      principal: true,
      ativo: true,
    })
  },

  async toggleAtivo(id: string, ativoAtual: boolean) {
    return pb.collection('enderecos').update<EnderecoRecord>(id, {
      ativo: !ativoAtual,
    })
  },

  async delete(id: string) {
    return pb.collection('enderecos').delete(id)
  },

  /**
   * Formata um resumo legível do endereço para exibição em selects, tabelas e contratos
   */
  formatResumo(e?: EnderecoRecord | null): string {
    if (!e) return 'Endereço não informado'
    const rotulo = e.identificacao ? `[${e.identificacao}] ` : ''
    const comp = e.complemento ? `, ${e.complemento}` : ''
    const cepStr = e.cep ? ` - CEP ${e.cep}` : ''
    return `${rotulo}${e.logradouro}, ${e.numero}${comp} - ${e.bairro}, ${e.cidade}/${e.uf}${cepStr}`
  },

  /**
   * Resumo curto (Identificação + Cidade/UF ou Bairro/Cidade)
   */
  formatCurto(e?: EnderecoRecord | null): string {
    if (!e) return '-'
    const prefix = e.identificacao ? `${e.identificacao}: ` : ''
    return `${prefix}${e.bairro}, ${e.cidade}/${e.uf}`
  },
}
