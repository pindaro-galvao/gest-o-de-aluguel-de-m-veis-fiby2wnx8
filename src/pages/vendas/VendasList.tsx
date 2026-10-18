import React, { useEffect, useState, useMemo } from 'react'
import { vendasService } from '@/services/vendas'
import { clientesService } from '@/services/clientes'
import { produtosService } from '@/services/produtos'
import { usuariosService } from '@/services/usuarios'
import {
  disponibilidadeService,
  calcularDiasPeriodo,
  type DisponibilidadeResultado,
} from '@/services/disponibilidade'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type {
  VendaRecord,
  ClienteRecord,
  ProdutoRecord,
  UserRecord,
  FormaPagamento,
  StatusVenda,
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
  BadgeDollarSign,
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Building,
  CheckCircle,
  FileCheck,
  FileText,
  Printer,
} from 'lucide-react'
import { ContratoModal } from '@/components/ContratoModal'

interface VendasPageProps {
  isAdminView?: boolean
}

export default function VendasList({ isAdminView = false }: VendasPageProps) {
  const { user, role } = useAuth()
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [vendedores, setVendedores] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [vendedorFilter, setVendedorFilter] = useState('TODOS')

  // Modal Visualizar / Imprimir Contrato
  const [selectedVendaContrato, setSelectedVendaContrato] = useState<VendaRecord | null>(null)
  const [isContratoOpen, setIsContratoOpen] = useState(false)

  // Modal Nova Venda
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Campos do Form de Venda
  const [clienteId, setClienteId] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('debito_em_conta')
  const [status, setStatus] = useState<StatusVenda>('ativa')
  const [observacoes, setObservacoes] = useState('')
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Estado da verificação em tempo real de disponibilidade
  const [disponibilidadeInfo, setDisponibilidadeInfo] = useState<DisponibilidadeResultado | null>(
    null,
  )
  const [isCheckingDisp, setIsCheckingDisp] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [v, c, p] = await Promise.all([
        vendasService.getAll(),
        clientesService.getAll(),
        produtosService.getAll(),
      ])
      setVendas(v)
      setClientes(c)
      setProdutos(p)

      if (role === 'ADMIN') {
        const u = await usuariosService.getAll({ role: 'TODOS' })
        setVendedores(u.filter((usr) => usr.role === 'ADMIN' || usr.role === 'VENDEDOR'))
      }
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar vendas',
        description: 'Não foi possível buscar a lista de locações.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [role])

  // Real-time synchronization
  useRealtime<VendaRecord>('vendas', () => {
    vendasService.getAll().then(setVendas).catch(console.error)
  })

  // Cálculo automático do valor total: diária do produto × número de dias do período × quantidade
  const selectedProduto = useMemo(() => {
    return produtos.find((p) => p.id === produtoId)
  }, [produtos, produtoId])

  const diasLocacao = useMemo(() => {
    if (!dataInicio || !dataFim) return 0
    return calcularDiasPeriodo(dataInicio, dataFim)
  }, [dataInicio, dataFim])

  const valorDiarioUnitario = useMemo(() => {
    if (!selectedProduto) return 0
    return selectedProduto.valor_locacao_diaria ?? selectedProduto.valor_locacao_mensal ?? 0
  }, [selectedProduto])

  const valorTotalCalculado = useMemo(() => {
    if (!selectedProduto || diasLocacao <= 0) return 0
    return valorDiarioUnitario * diasLocacao * quantidade
  }, [selectedProduto, valorDiarioUnitario, diasLocacao, quantidade])

  // Verificação de disponibilidade em tempo real quando produto, período ou quantidade mudarem
  useEffect(() => {
    if (!isModalOpen || !produtoId || !dataInicio || !dataFim) {
      setDisponibilidadeInfo(null)
      return
    }

    if (new Date(dataFim) < new Date(dataInicio)) {
      setDisponibilidadeInfo(null)
      return
    }

    let isMounted = true
    setIsCheckingDisp(true)

    const timer = setTimeout(() => {
      disponibilidadeService
        .verificarDisponibilidadeProduto(produtoId, dataInicio, dataFim, quantidade)
        .then((res) => {
          if (isMounted) {
            setDisponibilidadeInfo(res)
            setIsCheckingDisp(false)
          }
        })
        .catch((e) => {
          console.error(e)
          if (isMounted) setIsCheckingDisp(false)
        })
    }, 200)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [isModalOpen, produtoId, dataInicio, dataFim, quantidade])

  const openCreateModal = () => {
    setClienteId(clientes[0]?.id || '')
    setProdutoId(produtos[0]?.id || '')
    setQuantidade(1)

    const hoje = new Date()
    const daqui30Dias = new Date()
    daqui30Dias.setDate(daqui30Dias.getDate() + 30)

    setDataInicio(hoje.toISOString().split('T')[0])
    setDataFim(daqui30Dias.toISOString().split('T')[0])
    setFormaPagamento('debito_em_conta')
    setStatus('ativa')
    setObservacoes('')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clienteId) errs.clienteId = 'Selecione um cliente.'
    if (!produtoId) errs.produtoId = 'Selecione um produto.'
    if (quantidade < 1) errs.quantidade = 'Quantidade mínima é 1.'
    if (!dataInicio) errs.dataInicio = 'Data de início é obrigatória.'
    if (!dataFim) errs.dataFim = 'Data de término é obrigatória.'
    if (dataInicio && dataFim && new Date(dataFim) < new Date(dataInicio)) {
      errs.dataFim = 'A data de término deve ser igual ou posterior à data de início.'
    }
    if (disponibilidadeInfo && !disponibilidadeInfo.temDisponibilidade) {
      errs.quantidade = `Indisponível no período! Restam apenas ${disponibilidadeInfo.disponivelMinimo} unidade(s) livre(s).`
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      // Re-valida disponibilidade no momento do salvamento para segurança
      const checagemFinal = await disponibilidadeService.verificarDisponibilidadeProduto(
        produtoId,
        dataInicio,
        dataFim,
        quantidade,
      )
      if (!checagemFinal.temDisponibilidade) {
        toast({
          variant: 'destructive',
          title: 'Estoque insuficiente no período',
          description: checagemFinal.mensagem,
        })
        setFormErrors((prev) => ({
          ...prev,
          quantidade: checagemFinal.mensagem,
        }))
        setIsSaving(false)
        return
      }

      await vendasService.create({
        cliente: clienteId,
        produto: produtoId,
        quantidade,
        data_inicio: `${dataInicio} 00:00:00.000Z`,
        data_fim: `${dataFim} 00:00:00.000Z`,
        forma_pagamento: formaPagamento,
        valor_total: valorTotalCalculado,
        status,
        observacoes: observacoes.trim(),
      })
      toast({
        title: 'Locação cadastrada!',
        description: 'Contrato de aluguel criado e associado ao seu usuário vendedor com sucesso.',
      })

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar locação',
        description: err instanceof Error ? err.message : 'Verifique os dados enviados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Filtragem
  const filteredVendas = vendas.filter((v) => {
    // Se for Admin e escolheu filtro de vendedor
    if (role === 'ADMIN' && vendedorFilter !== 'TODOS' && v.vendedor !== vendedorFilter) {
      return false
    }

    if (statusFilter !== 'TODOS' && v.status !== statusFilter) {
      return false
    }

    const term = searchTerm.toLowerCase()
    const clienteNome = v.expand?.cliente?.nome?.toLowerCase() || ''
    const produtoCodigo = v.expand?.produto?.codigo?.toLowerCase() || ''
    const produtoNome = v.expand?.produto?.nome?.toLowerCase() || ''
    const produtoLinha =
      (v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha)?.toLowerCase() || ''
    const vendedorNome = v.expand?.vendedor?.name?.toLowerCase() || ''

    return (
      clienteNome.includes(term) ||
      produtoCodigo.includes(term) ||
      produtoNome.includes(term) ||
      produtoLinha.includes(term) ||
      vendedorNome.includes(term)
    )
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
            <BadgeDollarSign className="h-4 w-4" />
            <span>{role === 'ADMIN' ? 'Gestão Corporativa de Contratos' : 'Minhas Vendas'}</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">
            {role === 'ADMIN' ? 'Todas as Vendas & Locações' : 'Minhas Locações Cadastradas'}
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            {role === 'ADMIN'
              ? 'Visualize todos os contratos da empresa com filtro por vendedor.'
              : 'Gerencie os contratos de locação vinculados ao seu atendimento.'}
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Venda / Locação</span>
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por cliente ou móvel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-white border-[#E5E0DA]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Status</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="encerrada">Encerrada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {role === 'ADMIN' && (
          <div className="w-full sm:w-56">
            <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
              <SelectTrigger className="bg-white border-[#E5E0DA]">
                <SelectValue placeholder="Filtrar Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Vendedores</SelectItem>
                {vendedores.map((vnd) => (
                  <SelectItem key={vnd.id} value={vnd.id}>
                    {vnd.name || vnd.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Lista de Vendas */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : filteredVendas.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhuma locação encontrada para os filtros selecionados.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Cliente</th>
                <th className="px-4 py-3">Móvel TIDELLI</th>
                <th className="px-4 py-3">Qtd</th>
                <th className="px-4 py-3">Vigência</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Valor Total</th>
                {role === 'ADMIN' && <th className="px-4 py-3">Vendedor</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Contrato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {filteredVendas.map((v) => (
                <tr key={v.id} className="hover:bg-[#FAF7F3] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-[#2B2B2B]">
                      {v.expand?.cliente?.nome || 'Cliente'}
                    </div>
                    <div className="text-xs text-[#6B6B6B]">{v.expand?.cliente?.email}</div>
                  </td>
                  <td className="px-4 py-3.5 font-medium">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {v.expand?.produto?.codigo && (
                        <span className="font-mono text-xs font-bold text-[#A67C52] bg-[#FAF7F3] px-1.5 py-0.5 rounded border border-[#E5E0DA]">
                          {v.expand.produto.codigo}
                        </span>
                      )}
                      <span>{v.expand?.produto?.nome || 'Móvel'}</span>
                    </div>
                    {(v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha) && (
                      <div className="text-[11px] text-[#A67C52] font-semibold mt-0.5">
                        Linha {v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">{v.quantidade} un.</td>
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                    <div>
                      {new Date(v.data_inicio).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(v.data_fim).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-[10px] text-[#A67C52] font-semibold">
                      {calcularDiasPeriodo(v.data_inicio, v.data_fim)} diárias
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs capitalize">
                    {v.forma_pagamento.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#A67C52]">
                    <div>{formatCurrency(v.valor_total)}</div>
                    {v.expand?.produto && (
                      <div className="text-[10px] text-[#6B6B6B] font-normal">
                        {formatCurrency(
                          v.expand.produto.valor_locacao_diaria ??
                            v.expand.produto.valor_locacao_mensal ??
                            0,
                        )}
                        /dia
                      </div>
                    )}
                  </td>
                  {role === 'ADMIN' && (
                    <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                      {v.expand?.vendedor?.name || v.expand?.vendedor?.email || '-'}
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        v.status === 'ativa'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : v.status === 'encerrada'
                            ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                            : 'bg-red-50 text-red-700 border-red-300'
                      }`}
                    >
                      {v.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {/* Botão Gerar Contrato visível quando aprovado/ativo (status ativa ou encerrada) */}
                    {v.status === 'ativa' || v.status === 'encerrada' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVendaContrato(v)
                          setIsContratoOpen(true)
                        }}
                        className="h-8 gap-1.5 text-xs border-[#E5E0DA] text-[#A67C52] hover:bg-[#FAF7F3] hover:text-[#8C643F] shadow-2xs font-semibold"
                        title="Visualizar e Imprimir Contrato em PDF"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Imprimir Contrato</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-[#A0A0A0] italic">Cancelado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nova Venda */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              Novo Contrato de Locação
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              O vendedor responsável é registrado de forma automática no servidor como{' '}
              <strong className="text-[#A67C52]">{user?.name || user?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="vendaCliente" className="text-xs font-semibold text-[#2B2B2B]">
                Cliente
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

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="vendaProduto" className="text-xs font-semibold text-[#2B2B2B]">
                  Móvel TIDELLI
                </Label>
                <Select value={produtoId} onValueChange={setProdutoId}>
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue placeholder="Selecione o Produto" />
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
                        — {formatCurrency(p.valor_locacao_diaria ?? p.valor_locacao_mensal ?? 0)}
                        /dia
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.produtoId && (
                  <p className="text-xs text-red-600">{formErrors.produtoId}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vendaQtd" className="text-xs font-semibold text-[#2B2B2B]">
                  Quantidade
                </Label>
                <Input
                  id="vendaQtd"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dataIni" className="text-xs font-semibold text-[#2B2B2B]">
                  Data de Início
                </Label>
                <Input
                  id="dataIni"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.dataInicio && (
                  <p className="text-xs text-red-600">{formErrors.dataInicio}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataFim" className="text-xs font-semibold text-[#2B2B2B]">
                  Data de Término
                </Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.dataFim && <p className="text-xs text-red-600">{formErrors.dataFim}</p>}
              </div>
            </div>

            {/* Aviso de Disponibilidade do Período em Tempo Real */}
            {dataInicio && dataFim && (
              <div className="rounded-xl p-3 border text-xs transition-all duration-200">
                {isCheckingDisp ? (
                  <div className="flex items-center gap-2 text-[#6B6B6B]">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
                    <span>Verificando disponibilidade das datas no acervo...</span>
                  </div>
                ) : disponibilidadeInfo ? (
                  <div
                    className={`flex items-start gap-2.5 ${
                      disponibilidadeInfo.temDisponibilidade
                        ? 'text-emerald-800 bg-emerald-50/80 border-emerald-200'
                        : 'text-red-800 bg-red-50/80 border-red-200'
                    }`}
                  >
                    <CheckCircle
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        disponibilidadeInfo.temDisponibilidade ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold">
                        {disponibilidadeInfo.temDisponibilidade
                          ? 'Período Disponível'
                          : 'Estoque Insuficiente no Período'}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug">
                        {disponibilidadeInfo.mensagem}
                      </p>
                      <p className="text-[10px] opacity-80 mt-1">
                        Estoque total do móvel: {disponibilidadeInfo.quantidadeEstoque} un. | Máximo
                        comprometido no período: {disponibilidadeInfo.maxComprometidoNoPeriodo} un.
                        | Disponível: {disponibilidadeInfo.disponivelMinimo} un.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="formaPgto" className="text-xs font-semibold text-[#2B2B2B]">
                  Forma de Pagamento
                </Label>
                <Select
                  value={formaPagamento}
                  onValueChange={(val) => setFormaPagamento(val as FormaPagamento)}
                >
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debito_em_conta">Débito em Conta</SelectItem>
                    <SelectItem value="credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto Bancário</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="statusVenda" className="text-xs font-semibold text-[#2B2B2B]">
                  Status do Contrato
                </Label>
                <Select value={status} onValueChange={(val) => setStatus(val as StatusVenda)}>
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumo do Cálculo Automático (Diária × Dias × Quantidade) */}
            <div className="rounded-xl bg-[#FAF7F3] border border-[#E5E0DA] p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6B6B6B] block">
                  Valor Total Calculado ({diasLocacao} dia(s) × {quantidade} un.)
                </span>
                <span className="text-lg font-extrabold text-[#A67C52]">
                  {formatCurrency(valorTotalCalculado)}
                </span>
              </div>
              <div className="text-right text-xs text-[#6B6B6B]">
                {selectedProduto && <div>{formatCurrency(valorDiarioUnitario)}/dia cada</div>}
                <div className="text-[11px] text-[#8C8C8C]">
                  {diasLocacao > 0 ? `${diasLocacao} diárias contratadas` : 'Defina o período'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="obsVenda" className="text-xs font-semibold text-[#2B2B2B]">
                Observações do Contrato
              </Label>
              <Textarea
                id="obsVenda"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes de entrega, cláusulas de renovação etc."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>

            <DialogFooter className="pt-4">
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
                disabled={
                  isSaving ||
                  (disponibilidadeInfo !== null && !disponibilidadeInfo.temDisponibilidade)
                }
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Gravando...' : 'Salvar e Gerar Contrato'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Impressão de Contrato */}
      <ContratoModal
        venda={selectedVendaContrato}
        open={isContratoOpen}
        onOpenChange={setIsContratoOpen}
      />
    </div>
  )
}
