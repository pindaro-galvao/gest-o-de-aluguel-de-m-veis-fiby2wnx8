import React, { useEffect, useState } from 'react'
import { clientesService } from '@/services/clientes'
import { vendasService } from '@/services/vendas'
import { orcamentosService } from '@/services/orcamentos'
import { useAuth } from '@/contexts/AuthContext'
import type { ClienteRecord, VendaRecord, OrcamentoRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import {
  Users,
  Search,
  Plus,
  Eye,
  Mail,
  Phone,
  MapPin,
  FileText,
  BadgeDollarSign,
  Receipt,
} from 'lucide-react'

export default function ClientesList() {
  const { user, role } = useAuth()
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Novo Cliente
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Modal Detalhes do Cliente
  const [selectedCliente, setSelectedCliente] = useState<ClienteRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [clienteVendas, setClienteVendas] = useState<VendaRecord[]>([])
  const [clienteOrcamentos, setClienteOrcamentos] = useState<OrcamentoRecord[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const loadClientes = async () => {
    try {
      setLoading(true)
      const list = await clientesService.getAll({ search: searchTerm })
      setClientes(list)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clientes',
        description: 'Não foi possível buscar a lista de clientes.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClientes()
  }, [searchTerm])

  const openCreateModal = () => {
    setNome('')
    setEmail('')
    setTelefone('')
    setEndereco('')
    setFormErrors({})
    setIsCreateOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'Nome do cliente é obrigatório.'
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'E-mail válido é obrigatório.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      await clientesService.create({
        nome: nome.trim(),
        email: email.trim(),
        telefone: telefone.trim(),
        endereco: endereco.trim(),
      })

      toast({
        title: 'Cliente cadastrado!',
        description: `${nome} foi adicionado à base com sucesso.`,
      })

      setIsCreateOpen(false)
      loadClientes()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar cliente',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDetail = async (c: ClienteRecord) => {
    setSelectedCliente(c)
    setIsDetailOpen(true)
    setLoadingDetails(true)

    try {
      // Buscar vendas do cliente
      // Regra de especificação: o VENDEDOR vê apenas as vendas/orçamentos de sua própria autoria daquele cliente; o ADMIN vê tudo.
      const todasVendas = await vendasService.getAll()
      const todosOrcamentos = await orcamentosService.getAll()

      let vendasDoCliente = todasVendas.filter((v) => v.cliente === c.id)
      let orcamentosDoCliente = todosOrcamentos.filter((o) => o.cliente === c.id)

      if (role === 'VENDEDOR') {
        vendasDoCliente = vendasDoCliente.filter((v) => v.vendedor === user?.id)
        orcamentosDoCliente = orcamentosDoCliente.filter((o) => o.vendedor === user?.id)
      }

      setClienteVendas(vendasDoCliente)
      setClienteOrcamentos(orcamentosDoCliente)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar detalhes',
        description: 'Não foi possível carregar o histórico do cliente.',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <Users className="h-4 w-4" />
            <span>Base Corporativa</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Gestão de Clientes</h2>
          <p className="text-sm text-[#6B6B6B]">
            {role === 'ADMIN'
              ? 'Todos os clientes cadastrados e seus respectivos contratos globais.'
              : 'Acesso completo à carteira de clientes para prospecção e acompanhamento.'}
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhum cliente cadastrado ou encontrado na busca.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Cliente</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Endereço</th>
                <th className="px-4 py-3">Cadastrado em</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF7F3] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-[#2B2B2B]">{c.nome}</div>
                    <div className="text-xs text-[#6B6B6B] flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 text-[#A67C52]" />
                      <span>{c.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                    {c.telefone ? (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-[#4A7C59]" />
                        <span>{c.telefone}</span>
                      </div>
                    ) : (
                      <span className="text-[#A0A0A0]">Não informado</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B] max-w-xs truncate">
                    {c.endereco || '-'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                    {c.created ? new Date(c.created).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(c)}
                      className="h-8 gap-1.5 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#A67C52]" />
                      <span>Ver Histórico</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar Cliente */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">Novo Cliente</DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Cadastre os dados de contato do cliente para emissão de locações e orçamentos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cliNome" className="text-xs font-semibold text-[#2B2B2B]">
                Nome Completo / Razão Social
              </Label>
              <Input
                id="cliNome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (formErrors.nome) setFormErrors((p) => ({ ...p, nome: '' }))
                }}
                placeholder="Ex: Mariana Silva ou Studio Design"
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.nome && <p className="text-xs text-red-600">{formErrors.nome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliEmail" className="text-xs font-semibold text-[#2B2B2B]">
                E-mail Principal
              </Label>
              <Input
                id="cliEmail"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formErrors.email) setFormErrors((p) => ({ ...p, email: '' }))
                }}
                placeholder="mariana@cliente.com.br"
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliTel" className="text-xs font-semibold text-[#2B2B2B]">
                Telefone / WhatsApp
              </Label>
              <Input
                id="cliTel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cliEnd" className="text-xs font-semibold text-[#2B2B2B]">
                Endereço de Entrega / Cobrança
              </Label>
              <Input
                id="cliEnd"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Av. Paulista, 1500, Apto 82 - Bela Vista, São Paulo/SP"
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-[#E5E0DA]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white"
              >
                {isSaving ? 'Salvando...' : 'Cadastrar Cliente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Cliente (com Regra de Visibilidade do Vendedor) */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              Ficha do Cliente: {selectedCliente?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              {role === 'VENDEDOR'
                ? 'Exibindo dados cadastrais e as interações realizadas por você para este cliente.'
                : 'Visão consolidada de todas as vendas e orçamentos deste cliente na empresa.'}
            </DialogDescription>
          </DialogHeader>

          {selectedCliente && (
            <div className="space-y-6 pt-2">
              {/* Card de Dados Cadastrais */}
              <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#6B6B6B] block">E-mail:</span>
                    <span className="font-semibold text-[#2B2B2B]">{selectedCliente.email}</span>
                  </div>
                  <div>
                    <span className="text-[#6B6B6B] block">Telefone:</span>
                    <span className="font-semibold text-[#2B2B2B]">
                      {selectedCliente.telefone || 'Não informado'}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[#6B6B6B] block">Endereço:</span>
                    <span className="font-semibold text-[#2B2B2B]">
                      {selectedCliente.endereco || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contratos / Locações Ativas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2B2B2B] uppercase flex items-center gap-1.5">
                    <BadgeDollarSign className="h-4 w-4 text-[#A67C52]" />
                    <span>Contratos de Locação ({clienteVendas.length})</span>
                  </h4>
                  {role === 'VENDEDOR' && (
                    <span className="text-[10px] text-[#6B6B6B]">Suas vendas</span>
                  )}
                </div>

                {loadingDetails ? (
                  <div className="py-6 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
                  </div>
                ) : clienteVendas.length === 0 ? (
                  <p className="text-xs text-[#6B6B6B] italic py-2">
                    Nenhum contrato de locação registrado {role === 'VENDEDOR' && 'por você'} para
                    este cliente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clienteVendas.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-lg border border-[#E5E0DA] bg-white p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#2B2B2B]">
                            {v.expand?.produto?.nome || 'Móvel TIDELLI'}
                            {(v.expand?.produto?.expand?.linha?.nome ||
                              v.expand?.produto?.linha) && (
                              <span className="font-normal text-[#A67C52] ml-1">
                                · Linha{' '}
                                {v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha}
                              </span>
                            )}{' '}
                            ({v.quantidade} un.)
                          </div>
                          <div className="text-[11px] text-[#6B6B6B]">
                            {new Date(v.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                            {new Date(v.data_fim).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#A67C52]">
                            {formatCurrency(v.valor_total)}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase ${
                              v.status === 'ativa'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {v.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Orçamentos do Cliente */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#2B2B2B] uppercase flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-[#A67C52]" />
                    <span>Orçamentos & Cotações ({clienteOrcamentos.length})</span>
                  </h4>
                  {role === 'VENDEDOR' && (
                    <span className="text-[10px] text-[#6B6B6B]">Seus orçamentos</span>
                  )}
                </div>

                {loadingDetails ? (
                  <div className="py-6 flex justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
                  </div>
                ) : clienteOrcamentos.length === 0 ? (
                  <p className="text-xs text-[#6B6B6B] italic py-2">
                    Nenhum orçamento emitido {role === 'VENDEDOR' && 'por você'} para este cliente.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clienteOrcamentos.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-lg border border-[#E5E0DA] bg-white p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-[#2B2B2B]">
                            Validade: {new Date(o.validade).toLocaleDateString('pt-BR')}
                          </div>
                          {o.observacoes && (
                            <div className="text-[11px] text-[#6B6B6B] line-clamp-1">
                              {o.observacoes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[#2B2B2B]">
                            {formatCurrency(o.valor_total)}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[9px] uppercase ${
                              o.status === 'aprovado'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : o.status === 'enviado'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {o.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
