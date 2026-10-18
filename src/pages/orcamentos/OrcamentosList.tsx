import React, { useEffect, useState, useMemo } from 'react'
import { orcamentosService } from '@/services/orcamentos'
import { clientesService } from '@/services/clientes'
import { produtosService } from '@/services/produtos'
import { enderecosService } from '@/services/enderecos'
import {
  disponibilidadeService,
  calcularDiasPeriodo,
  type DisponibilidadeResultado,
} from '@/services/disponibilidade'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type {
  OrcamentoRecord,
  ClienteRecord,
  ProdutoRecord,
  OrcamentoItemRecord,
  StatusOrcamento,
  EnderecoRecord,
} from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import {
  Receipt,
  Plus,
  Search,
  CheckCircle,
  Eye,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react'
import { GerenciadorEnderecos } from '@/components/GerenciadorEnderecos'

interface OrcamentosPageProps {
  isAdminView?: boolean
}

export default function OrcamentosList({ isAdminView = false }: OrcamentosPageProps) {
  const { user, role } = useAuth()
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([])
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')

  // Modal Novo Orçamento
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form de Novo Orçamento
  const [clienteId, setClienteId] = useState('')
  const [clienteEnderecos, setClienteEnderecos] = useState<EnderecoRecord[]>([])
  const [enderecoId, setEnderecoId] = useState('')
  const [loadingEnderecos, setLoadingEnderecos] = useState(false)
  const [isModalEnderecoOpen, setIsModalEnderecoOpen] = useState(false)

  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [validade, setValidade] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<Array<{ produtoId: string; quantidade: number }>>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [itensDisp, setItensDisp] = useState<Record<string, DisponibilidadeResultado | null>>({})
  const [isCheckingDisp, setIsCheckingDisp] = useState(false)

  // Modal Ver Detalhe / Itens
  const [selectedOrcamento, setSelectedOrcamento] = useState<OrcamentoRecord | null>(null)
  const [detalheItens, setDetalheItens] = useState<OrcamentoItemRecord[]>([])
  const [isDetalheOpen, setIsDetalheOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [o, c, p] = await Promise.all([
        orcamentosService.getAll(),
        clientesService.getAll(),
        produtosService.getAll(),
      ])
      setOrcamentos(o)
      setClientes(c)
      setProdutos(p)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar orçamentos',
        description: 'Não foi possível carregar a lista de cotações.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [role])

  // Real-time synchronization
  useRealtime<OrcamentoRecord>('orcamentos', () => {
    orcamentosService.getAll().then(setOrcamentos).catch(console.error)
  })

  // Carrega e atualiza a lista de endereços toda vez que o cliente selecionado mudar
  useEffect(() => {
    if (!clienteId) {
      setClienteEnderecos([])
      setEnderecoId('')
      return
    }

    let isMounted = true
    setLoadingEnderecos(true)

    enderecosService
      .getByClienteId(clienteId, true)
      .then((ends) => {
        if (!isMounted) return
        setClienteEnderecos(ends)
        // Pré-seleciona o endereço principal por padrão, ou o primeiro disponível
        const princ = ends.find((e) => e.principal) || ends[0]
        setEnderecoId(princ?.id || '')
        setLoadingEnderecos(false)
      })
      .catch((e) => {
        console.error(e)
        if (isMounted) setLoadingEnderecos(false)
      })

    return () => {
      isMounted = false
    }
  }, [clienteId])

  const openCreateModal = () => {
    const initialCliente = clientes[0]?.id || ''
    setClienteId(initialCliente)

    const hoje = new Date()
    const daqui30Dias = new Date()
    daqui30Dias.setDate(daqui30Dias.getDate() + 30)
    const daqui7Dias = new Date()
    daqui7Dias.setDate(daqui7Dias.getDate() + 7)

    setDataInicio(hoje.toISOString().split('T')[0])
    setDataFim(daqui7Dias.toISOString().split('T')[0])
    setValidade(daqui30Dias.toISOString().split('T')[0])
    setObservacoes('')

    if (produtos.length > 0) {
      setItens([{ produtoId: produtos[0].id, quantidade: 1 }])
    } else {
      setItens([])
    }
    setFormErrors({})
    setIsModalOpen(true)
  }

  const addItem = () => {
    if (produtos.length > 0) {
      setItens((prev) => [...prev, { produtoId: produtos[0].id, quantidade: 1 }])
    }
  }

  const removeItem = (idx: number) => {
    setItens((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, field: 'produtoId' | 'quantidade', val: string | number) => {
    setItens((prev) => {
      const copy = [...prev]
      if (field === 'produtoId') copy[idx].produtoId = String(val)
      if (field === 'quantidade') copy[idx].quantidade = Math.max(1, Number(val))
      return copy
    })
  }

  const diasPeriodo = useMemo(() => {
    if (!dataInicio || !dataFim) return 1
    return Math.max(1, calcularDiasPeriodo(dataInicio, dataFim))
  }, [dataInicio, dataFim])

  const totalCalculado = useMemo(() => {
    return itens.reduce((acc, curr) => {
      const p = produtos.find((prod) => prod.id === curr.produtoId)
      const diaria = p?.valor_locacao_diaria ?? p?.valor_locacao_mensal ?? 0
      return acc + diaria * curr.quantidade * diasPeriodo
    }, 0)
  }, [itens, produtos, diasPeriodo])

  // Verificação de disponibilidade dos itens no período informado
  useEffect(() => {
    if (!isModalOpen || !dataInicio || !dataFim || itens.length === 0) {
      setItensDisp({})
      return
    }

    if (new Date(dataFim) < new Date(dataInicio)) {
      setItensDisp({})
      return
    }

    let isMounted = true
    setIsCheckingDisp(true)

    const timer = setTimeout(async () => {
      const resultados: Record<string, DisponibilidadeResultado | null> = {}
      for (const item of itens) {
        if (!item.produtoId) continue
        try {
          const res = await disponibilidadeService.verificarDisponibilidadeProduto(
            item.produtoId,
            dataInicio,
            dataFim,
            item.quantidade,
          )
          resultados[item.produtoId] = res
        } catch {
          resultados[item.produtoId] = null
        }
      }
      if (isMounted) {
        setItensDisp(resultados)
        setIsCheckingDisp(false)
      }
    }, 250)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isModalOpen, dataInicio, dataFim, itens])

  const todosItensDisponiveis = useMemo(() => {
    if (!dataInicio || !dataFim) return true
    for (const item of itens) {
      const info = itensDisp[item.produtoId]
      if (info && !info.temDisponibilidade) return false
    }
    return true
  }, [itens, itensDisp, dataInicio, dataFim])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clienteId) errs.clienteId = 'Selecione um cliente.'
    if (!enderecoId) {
      errs.enderecoId = 'Selecione um endereço para entrega/instalação deste orçamento.'
    }
    if (!validade) errs.validade = 'Validade é obrigatória.'
    if (dataInicio && dataFim && new Date(dataFim) < new Date(dataInicio)) {
      errs.dataFim = 'A data de término deve ser igual ou posterior à data de início.'
    }
    if (itens.length === 0) errs.itens = 'Adicione ao menos um móvel no orçamento.'
    if (!todosItensDisponiveis) {
      errs.itens = 'Alguns produtos não possuem disponibilidade suficiente no período selecionado.'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      await orcamentosService.create(
        {
          cliente: clienteId,
          endereco: enderecoId || undefined,
          valor_total: totalCalculado,
          validade: new Date(validade).toISOString(),
          data_inicio: dataInicio ? `${dataInicio} 00:00:00.000Z` : undefined,
          data_fim: dataFim ? `${dataFim} 00:00:00.000Z` : undefined,
          status: 'enviado',
          observacoes: observacoes.trim().toUpperCase(),
        },
        itens.map((it) => ({
          produto: it.produtoId,
          quantidade: it.quantidade,
        })),
      )

      toast({
        title: 'Orçamento gerado com sucesso!',
        description: 'Cotação enviada ao cliente com vendedor registrado automaticamente.',
      })

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao criar orçamento',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerDetalhes = async (orc: OrcamentoRecord) => {
    setSelectedOrcamento(orc)
    try {
      const itensRes = await orcamentosService.getItensForOrcamento(orc.id)
      setDetalheItens(itensRes)
      setIsDetalheOpen(true)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os itens do orçamento.',
      })
    }
  }

  // Aprovação pelo CLIENTE
  const handleAprovarOrcamento = async (orcId: string) => {
    setIsApproving(true)
    try {
      const agora = new Date().toISOString()
      await orcamentosService.updateStatus(orcId, 'aprovado', agora)
      toast({
        title: 'Orçamento Aprovado com Sucesso!',
        description: 'Sua aprovação foi registrada no sistema. Nossa equipe entrará em contato.',
      })
      setIsDetalheOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro na aprovação',
        description: 'Não foi possível aprovar este orçamento.',
      })
    } finally {
      setIsApproving(false)
    }
  }

  const filteredOrcamentos = orcamentos.filter((o) => {
    if (statusFilter !== 'TODOS' && o.status !== statusFilter) {
      return false
    }
    const term = searchTerm.toLowerCase()
    const clienteNome = o.expand?.cliente?.nome?.toLowerCase() || ''
    const vendedorNome = o.expand?.vendedor?.name?.toLowerCase() || ''

    return clienteNome.includes(term) || vendedorNome.includes(term)
  })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <Receipt className="h-4 w-4" />
            <span>
              {role === 'CLIENTE'
                ? 'Meus Orçamentos Recebidos'
                : role === 'ADMIN'
                  ? 'Gestão Geral de Orçamentos'
                  : 'Meus Orçamentos Emitidos'}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">
            {role === 'CLIENTE' ? 'Orçamentos de Móveis' : 'Cotações & Propostas Comerciais'}
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            {role === 'CLIENTE'
              ? 'Consulte as propostas de locação e aprove diretamente pelo painel.'
              : 'Gere novas cotações com cálculo em tempo real e envio instantâneo.'}
          </p>
        </div>

        {role !== 'CLIENTE' && (
          <Button
            onClick={openCreateModal}
            className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Orçamento</span>
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por cliente ou vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white border-[#E5E0DA]">
              <SelectValue placeholder="Filtrar Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Status</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="recusado">Recusado</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Orçamentos */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : filteredOrcamentos.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhum orçamento encontrado.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Cliente</th>
                <th className="px-4 py-3">Endereço do Orçamento</th>
                {role !== 'CLIENTE' && <th className="px-4 py-3">Vendedor</th>}
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {filteredOrcamentos.map((o) => (
                <tr key={o.id} className="hover:bg-[#FAF7F3] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-[#2B2B2B]">
                      {o.expand?.cliente?.nome || 'Cliente'}
                    </div>
                    <div className="text-xs text-[#6B6B6B]">{o.expand?.cliente?.email}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs">
                    {o.expand?.endereco ? (
                      <div
                        className="flex items-center gap-1.5"
                        title={enderecosService.formatResumo(o.expand.endereco)}
                      >
                        <MapPin className="h-3.5 w-3.5 text-[#A67C52] shrink-0" />
                        <span className="font-medium text-[#2B2B2B] truncate max-w-[220px]">
                          {enderecosService.formatCurto(o.expand.endereco)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic">Não vinculado</span>
                    )}
                  </td>
                  {role !== 'CLIENTE' && (
                    <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                      {o.expand?.vendedor?.name || o.expand?.vendedor?.email || '-'}
                    </td>
                  )}
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                    {new Date(o.validade).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#A67C52]">
                    {formatCurrency(o.valor_total)}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        o.status === 'aprovado'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : o.status === 'enviado'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {o.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerDetalhes(o)}
                      className="h-8 gap-1 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#A67C52]" />
                      <span>{role === 'CLIENTE' ? 'Ver & Aprovar' : 'Detalhes'}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar Novo Orçamento */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              Gerar Novo Orçamento de Móveis
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Selecione o cliente, o período desejado e adicione os móveis TIDELLI para cálculo
              diário.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="orcCliente" className="text-xs font-semibold text-[#2B2B2B]">
                Cliente *
              </Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                  <SelectValue placeholder="Selecione o Cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.clienteId && (
                <p className="text-xs text-red-600">{formErrors.clienteId}</p>
              )}
            </div>

            {/* Seleção do Endereço do Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="orcEndereco"
                  className="text-xs font-semibold text-[#2B2B2B] flex items-center gap-1.5"
                >
                  <MapPin className="h-3.5 w-3.5 text-[#A67C52]" />
                  <span>Endereço de Entrega / Instalação do Orçamento *</span>
                </Label>
                {clienteId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalEnderecoOpen(true)}
                    className="h-6 text-[11px] text-[#A67C52] hover:bg-[#FAF7F3] p-1 gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Cadastrar Novo Endereço</span>
                  </Button>
                )}
              </div>

              {loadingEnderecos ? (
                <div className="p-2 text-xs text-[#6B6B6B] flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
                  <span>Carregando endereços do cliente...</span>
                </div>
              ) : clienteEnderecos.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                  <span>Este cliente ainda não tem nenhum endereço cadastrado.</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsModalEnderecoOpen(true)}
                    className="h-7 text-xs bg-amber-700 hover:bg-amber-800 text-white"
                  >
                    Cadastrar Endereço Agora
                  </Button>
                </div>
              ) : (
                <Select value={enderecoId} onValueChange={setEnderecoId}>
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue placeholder="Selecione o Endereço de Instalação" />
                  </SelectTrigger>
                  <SelectContent>
                    {clienteEnderecos.map((end) => (
                      <SelectItem key={end.id} value={end.id}>
                        {end.principal ? '★ ' : ''}
                        {end.identificacao ? `[${end.identificacao}] ` : ''}
                        {end.logradouro}, {end.numero} — {end.bairro}, {end.cidade}/{end.uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {formErrors.enderecoId && (
                <p className="text-xs text-red-600">{formErrors.enderecoId}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dataInicioOrc" className="text-xs font-semibold text-[#2B2B2B]">
                  Início da Locação
                </Label>
                <Input
                  id="dataInicioOrc"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataFimOrc" className="text-xs font-semibold text-[#2B2B2B]">
                  Término da Locação
                </Label>
                <Input
                  id="dataFimOrc"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.dataFim && <p className="text-xs text-red-600">{formErrors.dataFim}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orcValidade" className="text-xs font-semibold text-[#2B2B2B]">
                  Validade da Proposta
                </Label>
                <Input
                  id="orcValidade"
                  type="date"
                  value={validade}
                  onChange={(e) => setValidade(e.target.value)}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>
            </div>

            {/* Aviso geral de verificação de disponibilidade no período */}
            {dataInicio && dataFim && (
              <div className="rounded-lg p-2.5 border text-xs bg-[#FAF7F3] border-[#E5E0DA]">
                {isCheckingDisp ? (
                  <div className="flex items-center gap-2 text-[#6B6B6B]">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
                    <span>
                      Verificando saldo e disponibilidade no período ({diasPeriodo} dia(s))...
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B6B6B]">
                      Período de locação: <strong>{diasPeriodo} dia(s)</strong>
                    </span>
                    {!todosItensDisponiveis ? (
                      <span className="font-semibold text-red-600">
                        Atenção: móveis selecionados excedem o estoque no período!
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-700">
                        Todos os móveis disponíveis no período
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Lista de Itens do Orçamento */}
            <div className="space-y-2 pt-2 border-t border-[#F1ECE6]">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-[#2B2B2B] uppercase">
                  Móveis Inclusos na Cotação
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addItem}
                  className="h-7 text-xs border-[#E5E0DA] gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar Móvel
                </Button>
              </div>

              {formErrors.itens && <p className="text-xs text-red-600">{formErrors.itens}</p>}

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {itens.map((item, idx) => {
                  const prod = produtos.find((p) => p.id === item.produtoId)
                  const diaria = prod?.valor_locacao_diaria ?? prod?.valor_locacao_mensal ?? 0
                  const subtotal = diaria * item.quantidade * diasPeriodo
                  const disp = itensDisp[item.produtoId]

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-[#E5E0DA] bg-[#FAF7F3] p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select
                            value={item.produtoId}
                            onValueChange={(val) => updateItem(idx, 'produtoId', val)}
                          >
                            <SelectTrigger className="bg-white border-[#E5E0DA] h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.codigo ? `${p.codigo} — ` : ''}
                                  {p.nome}
                                  {p.expand?.linha?.nome
                                    ? ` (Linha ${p.expand.linha.nome})`
                                    : p.linha
                                      ? ` (Linha ${p.linha})`
                                      : ''}{' '}
                                  (
                                  {formatCurrency(
                                    p.valor_locacao_diaria ?? p.valor_locacao_mensal ?? 0,
                                  )}
                                  /dia)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-20">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantidade}
                            onChange={(e) => updateItem(idx, 'quantidade', e.target.value)}
                            className="bg-white border-[#E5E0DA] h-9 text-xs text-center"
                          />
                        </div>

                        <div className="w-28 text-right font-bold text-xs text-[#A67C52]">
                          <div>{formatCurrency(subtotal)}</div>
                          <div className="text-[10px] text-[#6B6B6B] font-normal">
                            {formatCurrency(diaria)}/dia
                          </div>
                        </div>

                        {itens.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(idx)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Aviso de saldo deste item no período */}
                      {disp && (
                        <div
                          className={`text-[11px] px-2 py-1 rounded flex items-center justify-between ${
                            disp.temDisponibilidade
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-red-50 text-red-800 font-semibold'
                          }`}
                        >
                          <span>{disp.mensagem}</span>
                          <span className="text-[10px] opacity-75">
                            {disp.disponivelMinimo} de {disp.quantidadeEstoque} livres
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl bg-[#F7F5F2] border border-[#E5E0DA] p-3 flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-[#6B6B6B] block">
                  Total Estimado da Locação ({diasPeriodo} dia(s)):
                </span>
                <span className="text-[11px] text-[#8C8C8C]">
                  Cálculo: soma de (diária individual × dias × quantidade)
                </span>
              </div>
              <span className="text-xl font-extrabold text-[#A67C52]">
                {formatCurrency(totalCalculado)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orcObs" className="text-xs font-semibold text-[#2B2B2B]">
                Observações e Condições Comerciais
              </Label>
              <Textarea
                id="obsOrc"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value.toUpperCase())}
                placeholder="DETALHES DE ENTREGA, CONDIÇÕES ESPECIAIS NEGOCIADAS..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />{' '}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-[#E5E0DA]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !todosItensDisponiveis}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white disabled:opacity-50"
              >
                {isSaving ? 'Gerando...' : 'Enviar Orçamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhe do Orçamento / Aprovação pelo Cliente */}
      <Dialog open={isDetalheOpen} onOpenChange={setIsDetalheOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B] flex items-center justify-between">
              <span>Detalhes do Orçamento</span>
              {selectedOrcamento && (
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold uppercase ${
                    selectedOrcamento.status === 'aprovado'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-amber-50 text-amber-700 border-amber-300'
                  }`}
                >
                  {selectedOrcamento.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Cotação de móveis TIDELLI para o cliente{' '}
              <strong>{selectedOrcamento?.expand?.cliente?.nome}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedOrcamento && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#FAF7F3] p-3 rounded-lg border border-[#E5E0DA]">
                <div>
                  <span className="text-[#6B6B6B] block">Vendedor:</span>
                  <span className="font-semibold text-[#2B2B2B]">
                    {selectedOrcamento.expand?.vendedor?.name ||
                      selectedOrcamento.expand?.vendedor?.email ||
                      'Não identificado'}
                  </span>
                </div>
                <div>
                  <span className="text-[#6B6B6B] block">Válido até:</span>
                  <span className="font-semibold text-[#2B2B2B]">
                    {new Date(selectedOrcamento.validade).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {selectedOrcamento.data_aprovacao && (
                  <div className="col-span-2 pt-1 border-t border-[#E5E0DA]">
                    <span className="text-[#6B6B6B] block">Aprovado em:</span>
                    <span className="font-semibold text-[#4A7C59]">
                      {new Date(selectedOrcamento.data_aprovacao).toLocaleString('pt-BR')}
                    </span>
                  </div>
                )}
                {/* Endereço vinculado ao orçamento */}
                <div className="col-span-2 pt-1 border-t border-[#E5E0DA]">
                  <span className="text-[#6B6B6B] block flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[#A67C52]" />
                    <span>Endereço de Instalação Vinculado:</span>
                  </span>
                  <span className="font-semibold text-[#2B2B2B] block mt-0.5">
                    {selectedOrcamento.expand?.endereco
                      ? enderecosService.formatResumo(selectedOrcamento.expand.endereco)
                      : selectedOrcamento.expand?.cliente?.endereco || 'Não vinculado'}
                  </span>
                </div>
              </div>

              {/* Itens listados */}
              <div>
                <h4 className="text-xs font-bold text-[#6B6B6B] uppercase mb-2">
                  Itens Contemplados
                </h4>
                <div className="divide-y divide-[#F1ECE6] border border-[#E5E0DA] rounded-lg overflow-hidden">
                  {detalheItens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 text-xs bg-white"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.expand?.produto?.codigo && (
                            <span className="font-mono text-xs font-bold text-[#A67C52] bg-[#FAF7F3] px-1.5 py-0.5 rounded border border-[#E5E0DA]">
                              {item.expand.produto.codigo}
                            </span>
                          )}
                          <span className="font-semibold text-[#2B2B2B]">
                            {item.expand?.produto?.nome || 'Móvel TIDELLI'}
                          </span>
                        </div>
                        {(item.expand?.produto?.expand?.linha?.nome ||
                          item.expand?.produto?.linha) && (
                          <div className="text-[11px] text-[#A67C52] font-semibold mt-0.5">
                            Linha{' '}
                            {item.expand?.produto?.expand?.linha?.nome ||
                              item.expand?.produto?.linha}
                          </div>
                        )}
                        <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                          Qtd: {item.quantidade} •{' '}
                          {formatCurrency(
                            item.expand?.produto?.valor_locacao_diaria ??
                              item.expand?.produto?.valor_locacao_mensal ??
                              0,
                          )}
                          /dia cada
                        </div>
                      </div>
                      <div className="font-bold text-[#A67C52]">
                        {formatCurrency(
                          (item.expand?.produto?.valor_locacao_diaria ??
                            item.expand?.produto?.valor_locacao_mensal ??
                            0) * item.quantidade,
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valor total */}
              <div className="flex justify-between items-center rounded-xl bg-[#FAF7F3] p-3 border border-[#E5E0DA]">
                <span className="text-xs font-semibold text-[#6B6B6B]">Total Estimado:</span>
                <span className="text-lg font-extrabold text-[#A67C52]">
                  {formatCurrency(selectedOrcamento.valor_total)}
                </span>
              </div>

              {selectedOrcamento.observacoes && (
                <p className="text-xs text-[#6B6B6B] bg-white p-2.5 rounded border border-[#E5E0DA]">
                  <strong>Observações:</strong> {selectedOrcamento.observacoes}
                </p>
              )}

              {/* Botão de aprovação caso o usuário seja CLIENTE */}
              {role === 'CLIENTE' && selectedOrcamento.status === 'enviado' && (
                <div className="pt-2">
                  <Button
                    onClick={() => handleAprovarOrcamento(selectedOrcamento.id)}
                    disabled={isApproving}
                    className="w-full bg-[#4A7C59] hover:bg-[#3D6B4C] text-white font-semibold text-sm gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {isApproving ? 'Registrando aprovação...' : 'Aprovar Orçamento Agora'}
                    </span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Rápido de Gestão de Endereços do Cliente selecionado */}
      <Dialog open={isModalEnderecoOpen} onOpenChange={setIsModalEnderecoOpen}>
        <DialogContent className="max-w-xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              Gerenciar Endereços do Cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Cadastre ou selecione um endereço para este cliente.
            </DialogDescription>
          </DialogHeader>

          {clienteId ? (
            <GerenciadorEnderecos
              clienteId={clienteId}
              clienteNome={clientes.find((c) => c.id === clienteId)?.nome || 'Cliente'}
              enderecos={clienteEnderecos}
              onEnderecosChange={() => {
                enderecosService.getByClienteId(clienteId, true).then((ends) => {
                  setClienteEnderecos(ends)
                  const princ = ends.find((e) => e.principal) || ends[0]
                  if (princ && !enderecoId) {
                    setEnderecoId(princ.id)
                  }
                })
              }}
              readOnly={false}
            />
          ) : (
            <p className="text-xs text-[#6B6B6B]">Selecione um cliente primeiro.</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              onClick={() => setIsModalEnderecoOpen(false)}
              className="bg-[#A67C52] hover:bg-[#8C643F] text-white"
            >
              Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
