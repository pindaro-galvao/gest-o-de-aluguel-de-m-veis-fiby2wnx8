import React, { useEffect, useState } from 'react'
import { clientesService } from '@/services/clientes'
import { vendasService } from '@/services/vendas'
import { orcamentosService } from '@/services/orcamentos'
import { enderecosService } from '@/services/enderecos'
import { useAuth } from '@/contexts/AuthContext'
import type { ClienteRecord, VendaRecord, OrcamentoRecord, EnderecoRecord } from '@/types/database'
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
  Star,
} from 'lucide-react'
import { GerenciadorEnderecos } from '@/components/GerenciadorEnderecos'

export default function ClientesList() {
  const { user, role } = useAuth()
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Mapa de endereços principais por cliente para exibição na listagem
  const [enderecosPrincipais, setEnderecosPrincipais] = useState<
    Record<string, EnderecoRecord | null>
  >({})

  // Modal Novo Cliente
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  // Campos do endereço inicial obrigatório/padrão
  const [endIdentificacao, setEndIdentificacao] = useState('PRINCIPAL')
  const [endLogradouro, setEndLogradouro] = useState('')
  const [endNumero, setEndNumero] = useState('')
  const [endComplemento, setEndComplemento] = useState('')
  const [endBairro, setEndBairro] = useState('')
  const [endCidade, setEndCidade] = useState('SÃO PAULO')
  const [endUf, setEndUf] = useState('SP')
  const [endCep, setEndCep] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Modal Detalhes do Cliente
  const [selectedCliente, setSelectedCliente] = useState<ClienteRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [clienteEnderecos, setClienteEnderecos] = useState<EnderecoRecord[]>([])
  const [clienteVendas, setClienteVendas] = useState<VendaRecord[]>([])
  const [clienteOrcamentos, setClienteOrcamentos] = useState<OrcamentoRecord[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const loadClientes = async () => {
    try {
      setLoading(true)
      const list = await clientesService.getAll({ search: searchTerm })
      setClientes(list)

      // Carregar os endereços principais de cada cliente para exibição na tabela
      const mapPrinc: Record<string, EnderecoRecord | null> = {}
      await Promise.all(
        list.map(async (c) => {
          try {
            const ends = await enderecosService.getByClienteId(c.id)
            const princ = ends.find((e) => e.principal) || ends[0] || null
            mapPrinc[c.id] = princ
          } catch {
            mapPrinc[c.id] = null
          }
        }),
      )
      setEnderecosPrincipais(mapPrinc)
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
    setEndIdentificacao('PRINCIPAL')
    setEndLogradouro('')
    setEndNumero('')
    setEndComplemento('')
    setEndBairro('')
    setEndCidade('SÃO PAULO')
    setEndUf('SP')
    setEndCep('')
    setFormErrors({})
    setIsCreateOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'Nome do cliente é obrigatório.'
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'E-mail válido é obrigatório.'

    // Se preencheu algum dado de endereço, valida os campos obrigatórios
    if (endLogradouro || endNumero || endBairro || endCidade) {
      if (!endLogradouro.trim()) errs.endLogradouro = 'Logradouro é obrigatório.'
      if (!endNumero.trim()) errs.endNumero = 'Número é obrigatório.'
      if (!endBairro.trim()) errs.endBairro = 'Bairro é obrigatório.'
      if (!endCidade.trim()) errs.endCidade = 'Cidade é obrigatória.'
      if (!endUf.trim()) errs.endUf = 'UF é obrigatória.'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const resumoEndereco = endLogradouro
        ? `${endLogradouro.trim().toUpperCase()}, ${endNumero.trim().toUpperCase()} - ${endBairro.trim().toUpperCase()}, ${endCidade.trim().toUpperCase()}/${endUf.trim().toUpperCase()}`
        : ''

      const newCliente = await clientesService.create({
        nome: nome.trim().toUpperCase(),
        email: email.trim(),
        telefone: telefone.trim().toUpperCase(),
        endereco: resumoEndereco,
      })

      // Se preencheu endereço, criar registro na coleção enderecos como principal
      if (endLogradouro.trim()) {
        await enderecosService.create({
          cliente: newCliente.id,
          identificacao: endIdentificacao.trim().toUpperCase() || 'PRINCIPAL',
          logradouro: endLogradouro.trim().toUpperCase(),
          numero: endNumero.trim().toUpperCase(),
          complemento: endComplemento.trim().toUpperCase(),
          bairro: endBairro.trim().toUpperCase(),
          cidade: endCidade.trim().toUpperCase(),
          uf: endUf.trim().toUpperCase(),
          cep: endCep.trim().toUpperCase(),
          principal: true,
          ativo: true,
        })
      }

      toast({
        title: 'Cliente cadastrado com sucesso!',
        description: `${nome} foi adicionado à base com seu endereço cadastrado.`,
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

  const reloadClienteEnderecos = async (cId: string) => {
    try {
      const ends = await enderecosService.getByClienteId(cId)
      setClienteEnderecos(ends)
      // Atualizar também o resumo no mapa de clientes
      const princ = ends.find((e) => e.principal) || ends[0] || null
      setEnderecosPrincipais((prev) => ({ ...prev, [cId]: princ }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenDetail = async (c: ClienteRecord) => {
    setSelectedCliente(c)
    setIsDetailOpen(true)
    setLoadingDetails(true)

    try {
      const [ends, todasVendas, todosOrcamentos] = await Promise.all([
        enderecosService.getByClienteId(c.id),
        vendasService.getAll(),
        orcamentosService.getAll(),
      ])

      setClienteEnderecos(ends)

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
                    {enderecosPrincipais[c.id] ? (
                      <div
                        className="flex items-center gap-1.5"
                        title={enderecosService.formatResumo(enderecosPrincipais[c.id])}
                      >
                        <MapPin className="h-3 w-3 text-[#A67C52] shrink-0" />
                        <span className="truncate">
                          {enderecosService.formatCurto(enderecosPrincipais[c.id])}
                        </span>
                      </div>
                    ) : c.endereco ? (
                      <span className="truncate">{c.endereco}</span>
                    ) : (
                      <span className="text-zinc-400 italic">Sem endereço</span>
                    )}
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

      {/* Modal Criar Cliente com Endereço Principal Estruturado */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">Novo Cliente</DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Cadastre o cliente e seu endereço principal para locações e orçamentos. Textos em
              MAIÚSCULO.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#A67C52]">
                Dados Básicos do Cliente
              </h4>

              <div className="space-y-1">
                <Label htmlFor="cliNome" className="text-xs font-semibold text-[#2B2B2B]">
                  Nome Completo / Razão Social *
                </Label>
                <Input
                  id="cliNome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value.toUpperCase())
                    if (formErrors.nome) setFormErrors((p) => ({ ...p, nome: '' }))
                  }}
                  placeholder="EX: MARIANA SILVA OU STUDIO DESIGN"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.nome && <p className="text-xs text-red-600">{formErrors.nome}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cliEmail" className="text-xs font-semibold text-[#2B2B2B]">
                    E-mail Principal *
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

                <div className="space-y-1">
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
              </div>
            </div>

            {/* Seção Endereço Inicial */}
            <div className="space-y-3 pt-3 border-t border-[#F1ECE6]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#A67C52] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Endereço Principal de Instalação / Entrega</span>
                </h4>
                <Badge className="bg-[#FAF7F3] text-[#A67C52] border border-[#E5E0DA] text-[10px]">
                  Principal
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="endIdent" className="text-xs font-semibold text-[#2B2B2B]">
                    Identificação do Endereço
                  </Label>
                  <Input
                    id="endIdent"
                    value={endIdentificacao}
                    onChange={(e) => setEndIdentificacao(e.target.value.toUpperCase())}
                    placeholder="EX: RESIDÊNCIA, SEDE..."
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endCep" className="text-xs font-semibold text-[#2B2B2B]">
                    CEP
                  </Label>
                  <Input
                    id="endCep"
                    value={endCep}
                    onChange={(e) => setEndCep(e.target.value.toUpperCase())}
                    placeholder="01310-200"
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-1">
                  <Label htmlFor="endLogr" className="text-xs font-semibold text-[#2B2B2B]">
                    Logradouro *
                  </Label>
                  <Input
                    id="endLogr"
                    value={endLogradouro}
                    onChange={(e) => {
                      setEndLogradouro(e.target.value.toUpperCase())
                      if (formErrors.endLogradouro)
                        setFormErrors((p) => ({ ...p, endLogradouro: '' }))
                    }}
                    placeholder="AV. PAULISTA"
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                  {formErrors.endLogradouro && (
                    <p className="text-xs text-red-600">{formErrors.endLogradouro}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endNum" className="text-xs font-semibold text-[#2B2B2B]">
                    Número *
                  </Label>
                  <Input
                    id="endNum"
                    value={endNumero}
                    onChange={(e) => {
                      setEndNumero(e.target.value.toUpperCase())
                      if (formErrors.endNumero) setFormErrors((p) => ({ ...p, endNumero: '' }))
                    }}
                    placeholder="1500"
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                  {formErrors.endNumero && (
                    <p className="text-xs text-red-600">{formErrors.endNumero}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="endComp" className="text-xs font-semibold text-[#2B2B2B]">
                    Complemento
                  </Label>
                  <Input
                    id="endComp"
                    value={endComplemento}
                    onChange={(e) => setEndComplemento(e.target.value.toUpperCase())}
                    placeholder="APTO 82..."
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endBairro" className="text-xs font-semibold text-[#2B2B2B]">
                    Bairro *
                  </Label>
                  <Input
                    id="endBairro"
                    value={endBairro}
                    onChange={(e) => {
                      setEndBairro(e.target.value.toUpperCase())
                      if (formErrors.endBairro) setFormErrors((p) => ({ ...p, endBairro: '' }))
                    }}
                    placeholder="BELA VISTA"
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                  {formErrors.endBairro && (
                    <p className="text-xs text-red-600">{formErrors.endBairro}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="endCidade" className="text-xs font-semibold text-[#2B2B2B]">
                    Cidade *
                  </Label>
                  <Input
                    id="endCidade"
                    value={endCidade}
                    onChange={(e) => {
                      setEndCidade(e.target.value.toUpperCase())
                      if (formErrors.endCidade) setFormErrors((p) => ({ ...p, endCidade: '' }))
                    }}
                    placeholder="SÃO PAULO"
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                  {formErrors.endCidade && (
                    <p className="text-xs text-red-600">{formErrors.endCidade}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endUf" className="text-xs font-semibold text-[#2B2B2B]">
                    UF *
                  </Label>
                  <Input
                    id="endUf"
                    maxLength={2}
                    value={endUf}
                    onChange={(e) => {
                      setEndUf(e.target.value.toUpperCase())
                      if (formErrors.endUf) setFormErrors((p) => ({ ...p, endUf: '' }))
                    }}
                    placeholder="SP"
                    className="bg-[#FBF9F6] border-[#E5E0DA] text-center"
                  />
                  {formErrors.endUf && <p className="text-xs text-red-600">{formErrors.endUf}</p>}
                </div>
              </div>
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
                {isSaving ? 'Salvando...' : 'Cadastrar Cliente & Endereço'}
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
                </div>
              </div>

              {/* Gestão Completa de Múltiplos Endereços do Cliente */}
              <div className="rounded-xl border border-[#E5E0DA] bg-white p-4">
                <GerenciadorEnderecos
                  clienteId={selectedCliente.id}
                  clienteNome={selectedCliente.nome}
                  enderecos={clienteEnderecos}
                  onEnderecosChange={() => reloadClienteEnderecos(selectedCliente.id)}
                  readOnly={role === 'CLIENTE'}
                />
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
                            {v.expand?.produto?.codigo && (
                              <span className="font-mono text-[11px] font-bold text-[#A67C52] mr-1.5">
                                [{v.expand.produto.codigo}]
                              </span>
                            )}
                            <span>{v.expand?.produto?.nome || 'Móvel TIDELLI'}</span>
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
