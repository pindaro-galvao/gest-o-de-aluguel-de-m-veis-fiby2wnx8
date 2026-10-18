import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { orcamentosService } from '@/services/orcamentos'
import { clientesService } from '@/services/clientes'
import { produtosService } from '@/services/produtos'
import { enderecosService } from '@/services/enderecos'
import { vendasService } from '@/services/vendas'
import {
  disponibilidadeService,
  calcularDiasPeriodo,
  formatDataISO,
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
  FormaPagamento,
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
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShoppingCart,
  Send,
  HelpCircle,
  Pencil,
} from 'lucide-react'
import { GerenciadorEnderecos } from '@/components/GerenciadorEnderecos'

interface OrcamentosPageProps {
  isAdminView?: boolean
}

export default function OrcamentosList({ isAdminView = false }: OrcamentosPageProps) {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([])
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')

  // Modal Novo Orçamento / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingOrcamentoId, setEditingOrcamentoId] = useState<string | null>(null)

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

  // Modal de Recusa
  const [isRecusaModalOpen, setIsRecusaModalOpen] = useState(false)
  const [isRecusing, setIsRecusing] = useState(false)

  // Modal de Revalidação / Reenvio de Expirado
  const [isReenviarModalOpen, setIsReenviarModalOpen] = useState(false)
  const [novaValidadeReenvio, setNovaValidadeReenvio] = useState('')
  const [isReenviando, setIsReenviando] = useState(false)

  // Modal de Conversão em Venda
  const [isConverterModalOpen, setIsConverterModalOpen] = useState(false)
  const [formaPagamentoConversao, setFormaPagamentoConversao] =
    useState<FormaPagamento>('debito_em_conta')
  const [observacoesConversao, setObservacoesConversao] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [validandoConversao, setValidandoConversao] = useState(false)
  const [conflitosConversao, setConflitosConversao] = useState<string[]>([])

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
        // Se já houver um enderecoId válido para este cliente (ex: carregado na edição), mantém;
        // senão pré-seleciona o principal por padrão ou o primeiro disponível
        setEnderecoId((prev) => {
          if (prev && ends.some((e) => e.id === prev)) {
            return prev
          }
          const princ = ends.find((e) => e.principal) || ends[0]
          return princ?.id || ''
        })
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

  // Obtém o registro de cliente vinculado ao usuário atual (caso perfil CLIENTE)
  const meuClienteRecord = useMemo(() => {
    if (role !== 'CLIENTE' || !user) return null
    return clientes.find((c) => c.usuario === user.id || c.email === user.email) || null
  }, [role, user, clientes])

  /**
   * Verifica se o usuário atual pode editar o orçamento especificado:
   * 1. Status 'aprovado' e 'convertido' NUNCA são editáveis por ninguém
   * 2. ADMIN pode editar qualquer orçamento
   * 3. VENDEDOR pode editar somente orçamentos dele (vendedor = user.id)
   * 4. CLIENTE pode editar somente orçamentos DELE (orc.cliente = meuClienteRecord.id ou expand.cliente.usuario = user.id)
   *    nos status editáveis (rascunho, enviado, recusado, expirado)
   */
  const podeEditarOrcamento = (orc: OrcamentoRecord): boolean => {
    if (orc.status === 'aprovado' || orc.status === 'convertido') return false
    if (role === 'ADMIN') return true
    if (role === 'VENDEDOR') {
      return orc.vendedor === user?.id
    }
    if (role === 'CLIENTE') {
      const isMeuOrcamento =
        (meuClienteRecord && orc.cliente === meuClienteRecord.id) ||
        orc.expand?.cliente?.usuario === user?.id ||
        orc.expand?.cliente?.email === user?.email
      return !!isMeuOrcamento
    }
    return false
  }

  const openCreateModal = () => {
    setEditingOrcamentoId(null)

    // Se for CLIENTE, fixa obrigatoriamente no seu próprio registro de cliente
    if (role === 'CLIENTE') {
      const meuId = meuClienteRecord?.id || ''
      setClienteId(meuId)
    } else {
      const initialCliente = clientes[0]?.id || ''
      setClienteId(initialCliente)
    }

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

  const openEditModal = async (orc: OrcamentoRecord) => {
    if (!podeEditarOrcamento(orc)) {
      toast({
        variant: 'destructive',
        title: 'Edição não permitida',
        description:
          'Você não tem permissão para alterar este orçamento ou ele já foi aprovado/convertido.',
      })
      return
    }

    setEditingOrcamentoId(orc.id)
    // Se for CLIENTE, clienteId é obrigatoriamente ele mesmo
    if (role === 'CLIENTE') {
      setClienteId(meuClienteRecord?.id || orc.cliente)
    } else {
      setClienteId(orc.cliente)
    }
    setEnderecoId(orc.endereco || '')

    const dIni = orc.data_inicio ? formatDataISO(orc.data_inicio) : ''
    const dFim = orc.data_fim ? formatDataISO(orc.data_fim) : ''
    const dVal = orc.validade ? formatDataISO(orc.validade) : ''

    setDataInicio(dIni)
    setDataFim(dFim)
    setValidade(dVal)
    setObservacoes(orc.observacoes || '')
    setFormErrors({})

    try {
      const itensRes = await orcamentosService.getItensForOrcamento(orc.id)
      if (itensRes.length > 0) {
        setItens(
          itensRes.map((it) => ({
            produtoId: it.produto,
            quantidade: it.quantidade || 1,
          })),
        )
      } else if (produtos.length > 0) {
        setItens([{ produtoId: produtos[0].id, quantidade: 1 }])
      } else {
        setItens([])
      }
    } catch (e) {
      console.error('Erro ao buscar itens para edição:', e)
      setItens([])
    }

    // Fecha o modal de detalhe se estiver aberto ao disparar a edição
    setIsDetalheOpen(false)
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
            undefined,
            editingOrcamentoId || undefined,
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
      if (editingOrcamentoId) {
        // MODO EDIÇÃO: mantém o status atual do orçamento
        await orcamentosService.update(
          editingOrcamentoId,
          {
            cliente: role === 'CLIENTE' && meuClienteRecord ? meuClienteRecord.id : clienteId,
            endereco: enderecoId || undefined,
            valor_total: totalCalculado,
            validade: new Date(validade).toISOString(),
            data_inicio: dataInicio
              ? new Date(`${dataInicio}T00:00:00.000Z`).toISOString()
              : undefined,
            data_fim: dataFim ? new Date(`${dataFim}T00:00:00.000Z`).toISOString() : undefined,
            observacoes: observacoes.trim().toUpperCase(),
          },
          itens.map((it) => ({
            produto: it.produtoId,
            quantidade: it.quantidade,
          })),
        )

        toast({
          title: 'Orçamento atualizado com sucesso!',
          description: 'As alterações na cotação e nos móveis foram salvas mantendo o status.',
        })
      } else {
        // MODO CRIAÇÃO
        const targetClienteId =
          role === 'CLIENTE' && meuClienteRecord ? meuClienteRecord.id : clienteId
        await orcamentosService.create(
          {
            cliente: targetClienteId,
            endereco: enderecoId || undefined,
            valor_total: totalCalculado,
            validade: new Date(validade).toISOString(),
            data_inicio: dataInicio
              ? new Date(`${dataInicio}T00:00:00.000Z`).toISOString()
              : undefined,
            data_fim: dataFim ? new Date(`${dataFim}T00:00:00.000Z`).toISOString() : undefined,
            status: 'enviado',
            observacoes: observacoes.trim().toUpperCase(),
            // Se for CLIENTE, não passa vendedor (fica vazio para posterior atribuição)
            vendedor: role === 'CLIENTE' ? undefined : undefined,
          },
          itens.map((it) => ({
            produto: it.produtoId,
            quantidade: it.quantidade,
          })),
        )

        toast({
          title: 'Orçamento gerado com sucesso!',
          description:
            role === 'CLIENTE'
              ? 'Seu orçamento foi registrado com sucesso e está em análise.'
              : 'Cotação enviada ao cliente com vendedor registrado automaticamente.',
        })
      }

      setIsModalOpen(false)
      setEditingOrcamentoId(null)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: editingOrcamentoId ? 'Erro ao alterar orçamento' : 'Erro ao criar orçamento',
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

  /**
   * Helper para determinar o status efetivo na visualização:
   * Se no banco está 'enviado', mas a data de validade já passou,
   * exibe e trata como 'expirado' no frontend de forma derivada.
   */
  const getStatusEfetivo = (orc: OrcamentoRecord): StatusOrcamento => {
    if (orc.status === 'enviado' && orc.validade) {
      const hoje = formatDataISO(new Date())
      const val = formatDataISO(orc.validade)
      if (val < hoje) {
        return 'expirado'
      }
    }
    return orc.status
  }

  // Aprovação pelo CLIENTE
  const handleAprovarOrcamento = async (orcId: string) => {
    const orc = orcamentos.find((o) => o.id === orcId) || selectedOrcamento
    if (orc && getStatusEfetivo(orc) === 'expirado') {
      toast({
        variant: 'destructive',
        title: 'Orçamento Expirado',
        description: 'Este orçamento passou da data de validade e não pode ser aprovado.',
      })
      return
    }

    setIsApproving(true)
    try {
      const agora = new Date().toISOString()
      await orcamentosService.updateStatus(orcId, 'aprovado', { data_aprovacao: agora })
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

  // Recusa pelo CLIENTE ou VENDEDOR/ADMIN
  const handleRecusarOrcamento = async () => {
    if (!selectedOrcamento) return
    setIsRecusing(true)
    try {
      const agora = new Date().toISOString()
      await orcamentosService.updateStatus(selectedOrcamento.id, 'recusado', {
        data_recusa: agora,
      })
      toast({
        title: 'Orçamento Recusado',
        description:
          role === 'CLIENTE'
            ? 'Você recusou a proposta. Entre em contato com seu vendedor para uma nova cotação.'
            : 'O orçamento foi marcado como RECUSADO com sucesso.',
      })
      setIsRecusaModalOpen(false)
      setIsDetalheOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao recusar orçamento',
        description: err instanceof Error ? err.message : 'Não foi possível registrar a recusa.',
      })
    } finally {
      setIsRecusing(false)
    }
  }

  // Abertura do modal de reenvio de orçamento expirado (Vendedor / Admin)
  const handleAbrirReenviar = (orc: OrcamentoRecord) => {
    const daqui15Dias = new Date()
    daqui15Dias.setDate(daqui15Dias.getDate() + 15)
    setNovaValidadeReenvio(daqui15Dias.toISOString().split('T')[0])
    setSelectedOrcamento(orc)
    setIsReenviarModalOpen(true)
  }

  // Execução do reenvio com nova validade
  const handleConfirmarReenviar = async () => {
    if (!selectedOrcamento || !novaValidadeReenvio) return

    // Validação de data: nova validade deve ser futura
    const hojeStr = formatDataISO(new Date())
    if (novaValidadeReenvio <= hojeStr) {
      toast({
        variant: 'destructive',
        title: 'Data de Validade Inválida',
        description: 'A nova data de validade deve ser posterior à data de hoje.',
      })
      return
    }

    setIsReenviando(true)
    try {
      const isoValidade = new Date(`${novaValidadeReenvio}T23:59:59.000Z`).toISOString()
      await orcamentosService.revalidarEReenviar(selectedOrcamento.id, isoValidade)
      toast({
        title: 'Orçamento Reenviado com Sucesso!',
        description: `Status atualizado para ENVIADO com nova validade até ${new Date(
          isoValidade,
        ).toLocaleDateString('pt-BR')}.`,
      })
      setIsReenviarModalOpen(false)
      if (isDetalheOpen) {
        setIsDetalheOpen(false)
      }
      loadData()
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar orçamento',
        description: 'Não foi possível atualizar a validade.',
      })
    } finally {
      setIsReenviando(false)
    }
  }

  // Abertura do modal de conversão em venda (Vendedor / Admin)
  const handleAbrirConversao = async (orc: OrcamentoRecord) => {
    setSelectedOrcamento(orc)
    setFormaPagamentoConversao('debito_em_conta')
    setObservacoesConversao(
      orc.observacoes
        ? `ORIGEM ORÇAMENTO #${orc.id.slice(0, 7).toUpperCase()} — ${orc.observacoes}`
        : `ORIGEM ORÇAMENTO #${orc.id.slice(0, 7).toUpperCase()}`,
    )
    setConflitosConversao([])
    setIsConverterModalOpen(true)

    // Carrega itens e revalida disponibilidade de imediato
    setValidandoConversao(true)
    try {
      const itensRes = await orcamentosService.getItensForOrcamento(orc.id)
      setDetalheItens(itensRes)

      const dIni = orc.data_inicio ? formatDataISO(orc.data_inicio) : formatDataISO(new Date())
      const dFim = orc.data_fim
        ? formatDataISO(orc.data_fim)
        : (() => {
            const d = new Date()
            d.setDate(d.getDate() + 7)
            return formatDataISO(d)
          })()

      const conflitos: string[] = []
      for (const item of itensRes) {
        const prod = item.expand?.produto
        const nomeProd = prod?.nome || 'Móvel'
        const codProd = prod?.codigo ? `[${prod.codigo}] ` : ''

        try {
          const res = await disponibilidadeService.verificarDisponibilidadeProduto(
            item.produto,
            dIni,
            dFim,
            item.quantidade,
          )
          if (!res.temDisponibilidade) {
            conflitos.push(
              `${codProd}${nomeProd}: solicitadas ${item.quantidade} un., mas apenas ${res.disponivelMinimo} de ${res.quantidadeEstoque} livre(s) no período de ${new Date(
                dIni + 'T00:00:00',
              ).toLocaleDateString('pt-BR')} a ${new Date(dFim + 'T00:00:00').toLocaleDateString(
                'pt-BR',
              )}.`,
            )
          }
        } catch {
          // Em caso de falha de checagem, registra alerta
        }
      }
      setConflitosConversao(conflitos)
    } catch (e) {
      console.error(e)
    } finally {
      setValidandoConversao(false)
    }
  }

  // Execução da conversão do orçamento aprovado em Venda(s)
  const handleConfirmarConversao = async () => {
    if (!selectedOrcamento) return

    // Proteção contra conversão duplicada
    if (selectedOrcamento.status === 'convertido') {
      toast({
        variant: 'destructive',
        title: 'Orçamento já convertido',
        description: 'Este orçamento já foi convertido em venda anteriormente.',
      })
      return
    }

    if (conflitosConversao.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Conversão bloqueada: estoque indisponível',
        description:
          'Não é possível converter em venda pois um ou mais móveis não possuem saldo disponível no período.',
      })
      return
    }

    setIsConverting(true)
    try {
      // Re-validação final estrita de disponibilidade
      const itensRes =
        detalheItens.length > 0
          ? detalheItens
          : await orcamentosService.getItensForOrcamento(selectedOrcamento.id)

      if (itensRes.length === 0) {
        throw new Error('O orçamento não possui móveis cadastrados para locação.')
      }

      const dIni = selectedOrcamento.data_inicio
        ? formatDataISO(selectedOrcamento.data_inicio)
        : formatDataISO(new Date())
      const dFim = selectedOrcamento.data_fim
        ? formatDataISO(selectedOrcamento.data_fim)
        : (() => {
            const d = new Date()
            d.setDate(d.getDate() + 7)
            return formatDataISO(d)
          })()

      const diasPeriodoLocacao = Math.max(1, calcularDiasPeriodo(dIni, dFim))

      for (const item of itensRes) {
        const res = await disponibilidadeService.verificarDisponibilidadeProduto(
          item.produto,
          dIni,
          dFim,
          item.quantidade,
        )
        if (!res.temDisponibilidade) {
          const prodNome = item.expand?.produto?.nome || 'Móvel'
          throw new Error(
            `Estoque insuficiente para "${prodNome}": solicitadas ${item.quantidade} un., apenas ${res.disponivelMinimo} livres. Conversão abortada.`,
          )
        }
      }

      // Criação da(s) venda(s) para cada item do orçamento
      let primeiraVendaId: string | null = null

      for (const item of itensRes) {
        const prod = item.expand?.produto
        const diaria = prod?.valor_locacao_diaria ?? prod?.valor_locacao_mensal ?? 0
        const subtotalItem = diaria * item.quantidade * diasPeriodoLocacao

        const novaVenda = await vendasService.create({
          cliente: selectedOrcamento.cliente,
          endereco: selectedOrcamento.endereco || undefined,
          produto: item.produto,
          quantidade: item.quantidade,
          data_inicio: new Date(`${dIni}T00:00:00.000Z`).toISOString(),
          data_fim: new Date(`${dFim}T00:00:00.000Z`).toISOString(),
          valor_total: subtotalItem > 0 ? subtotalItem : selectedOrcamento.valor_total,
          forma_pagamento: formaPagamentoConversao,
          status: 'ativa',
          observacoes: observacoesConversao.trim().toUpperCase(),
          orcamento_origem: selectedOrcamento.id,
          vendedor: selectedOrcamento.vendedor || user?.id,
        })

        if (!primeiraVendaId) {
          primeiraVendaId = novaVenda.id
        }
      }

      // Marca o orçamento como CONVERTIDO
      await orcamentosService.updateStatus(selectedOrcamento.id, 'convertido')

      toast({
        title: 'Orçamento Convertido em Venda!',
        description: `${itensRes.length} contrato(s) de locação gerado(s) com sucesso a partir desta proposta.`,
      })

      setIsConverterModalOpen(false)
      setIsDetalheOpen(false)
      loadData()

      // Redireciona para a lista de vendas (ou visão do admin/vendedor)
      const targetUrl = role === 'ADMIN' ? '/admin/vendas' : '/vendas'
      navigate(targetUrl)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Falha na conversão em venda',
        description: err instanceof Error ? err.message : 'Não foi possível criar a locação.',
      })
    } finally {
      setIsConverting(false)
    }
  }

  const filteredOrcamentos = orcamentos.filter((o) => {
    const statusEfetivo = getStatusEfetivo(o)
    if (statusFilter !== 'TODOS' && statusEfetivo !== statusFilter) {
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

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>{role === 'CLIENTE' ? 'Solicitar Novo Orçamento' : 'Novo Orçamento'}</span>
        </Button>
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
              <SelectItem value="convertido">Convertido em Venda</SelectItem>
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
                      {o.expand?.vendedor?.name || o.expand?.vendedor?.email || (
                        <span className="text-zinc-400 italic">Sem vendedor (Cliente)</span>
                      )}
                    </td>
                  )}{' '}
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                    {new Date(o.validade).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#A67C52]">
                    {formatCurrency(o.valor_total)}
                  </td>
                  <td className="px-4 py-3.5">
                    {(() => {
                      const st = getStatusEfetivo(o)
                      if (st === 'aprovado') {
                        return (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border-emerald-300"
                          >
                            Aprovado
                          </Badge>
                        )
                      }
                      if (st === 'convertido') {
                        return (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border-blue-300 flex items-center gap-1 w-fit"
                          >
                            <ShoppingCart className="h-2.5 w-2.5" />
                            <span>Convertido</span>
                          </Badge>
                        )
                      }
                      if (st === 'recusado') {
                        return (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase bg-red-50 text-red-700 border-red-300"
                          >
                            Recusado
                          </Badge>
                        )
                      }
                      if (st === 'expirado') {
                        return (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border-rose-300 flex items-center gap-1 w-fit"
                            title="Proposta fora do prazo de validade"
                          >
                            <Clock className="h-2.5 w-2.5" />
                            <span>Expirado</span>
                          </Badge>
                        )
                      }
                      if (st === 'enviado') {
                        return (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border-amber-300"
                          >
                            Enviado
                          </Badge>
                        )
                      }
                      return (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold uppercase bg-zinc-100 text-zinc-700 border-zinc-200"
                        >
                          {st}
                        </Badge>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Botão de Editar direto na tabela se for Vendedor/Admin e status editável */}
                      {podeEditarOrcamento(o) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(o)}
                          className="h-8 gap-1 text-xs border-[#A67C52] text-[#A67C52] hover:bg-[#FAF7F3]"
                          title="Editar Orçamento"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                      )}

                      {/* Botão de Reenviar direto na tabela se o status for expirado */}
                      {getStatusEfetivo(o) === 'expirado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAbrirReenviar(o)}
                          className="h-8 gap-1 text-xs border-[#A67C52] text-[#A67C52] hover:bg-[#FAF7F3]"
                          title="Revalidar e Reenviar proposta"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span className="hidden sm:inline">Reenviar</span>
                        </Button>
                      )}

                      {/* Botão Converter em Venda direto na tabela se for Vendedor/Admin e status for aprovado */}
                      {role !== 'CLIENTE' && o.status === 'aprovado' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAbrirConversao(o)}
                          className="h-8 gap-1 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold"
                          title="Converter Orçamento Aprovado em Venda"
                        >
                          <ShoppingCart className="h-3 w-3" />
                          <span className="hidden sm:inline">Converter</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerDetalhes(o)}
                        className="h-8 gap-1 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                      >
                        <Eye className="h-3.5 w-3.5 text-[#A67C52]" />
                        <span>
                          {role === 'CLIENTE' && getStatusEfetivo(o) === 'enviado'
                            ? 'Analisar'
                            : 'Detalhes'}
                        </span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar Novo Orçamento / Editar Orçamento */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) setEditingOrcamentoId(null)
        }}
      >
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingOrcamentoId
                ? 'Alterar Orçamento de Móveis'
                : 'Gerar Novo Orçamento de Móveis'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              {editingOrcamentoId
                ? 'Atualize os dados do cliente, datas ou itens da proposta comercial. O status atual será preservado.'
                : 'Selecione o cliente, o período desejado e adicione os móveis TIDELLI para cálculo diário.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="orcCliente" className="text-xs font-semibold text-[#2B2B2B]">
                Cliente *
              </Label>
              {role === 'CLIENTE' ? (
                <div className="p-2.5 rounded-lg border border-[#E5E0DA] bg-[#F3EFEA] text-xs">
                  <div className="font-bold text-[#2B2B2B]">
                    {meuClienteRecord?.nome || user?.name || 'Meu Cadastro'}
                  </div>
                  <div className="text-[11px] text-[#6B6B6B]">
                    {meuClienteRecord?.email || user?.email}
                  </div>
                  <div className="text-[10px] text-[#A67C52] font-semibold mt-1">
                    Orçamento emitido exclusivamente para sua conta de cliente
                  </div>
                </div>
              ) : (
                <>
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
                </>
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
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingOrcamentoId(null)
                }}
                className="border-[#E5E0DA]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !todosItensDisponiveis}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white disabled:opacity-50"
              >
                {isSaving
                  ? editingOrcamentoId
                    ? 'Salvando...'
                    : 'Gerando...'
                  : editingOrcamentoId
                    ? 'Salvar Alterações'
                    : 'Enviar Orçamento'}
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
                      (role === 'CLIENTE'
                        ? 'Em análise pela equipe'
                        : 'Não atribuído (Criado pelo cliente)')}
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

              {/* Se o orçamento estiver RECUSADO, exibir aviso explicativo */}
              {selectedOrcamento.status === 'recusado' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Proposta Recusada</span>
                  </div>
                  <p>
                    {role === 'CLIENTE'
                      ? 'Proposta recusada — entre em contato com seu vendedor para uma nova proposta.'
                      : 'Este orçamento foi marcado como recusado pelo cliente ou registrado pela equipe comercial.'}
                  </p>
                  {selectedOrcamento.data_recusa && (
                    <p className="text-[10px] text-red-600 font-medium">
                      Data da recusa:{' '}
                      {new Date(selectedOrcamento.data_recusa).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              {/* Se o orçamento estiver EXPIRADO (banco ou derivado da validade) */}
              {getStatusEfetivo(selectedOrcamento) === 'expirado' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-rose-600" />
                    <span>Validade Expirada</span>
                  </div>
                  <p>
                    {role === 'CLIENTE'
                      ? 'O prazo desta proposta expirou. Você pode revalidar a data e reenviar o orçamento.'
                      : 'A data limite desta cotação já passou. Você pode revalidar a data e reenviar a proposta ao cliente.'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAbrirReenviar(selectedOrcamento)}
                    className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-1.5 text-xs font-semibold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Revalidar e Reenviar Orçamento</span>
                  </Button>
                </div>
              )}

              {/* Se o orçamento estiver CONVERTIDO */}
              {selectedOrcamento.status === 'convertido' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4 text-blue-700" />
                    <span>Orçamento Convertido em Venda</span>
                  </div>
                  <p>
                    Este orçamento já foi convertido em contrato de locação ativo no sistema. Os
                    móveis estão reservados e faturados.
                  </p>
                </div>
              )}

              {/* Ações para o CLIENTE (quando o status efetivo for ENVIADO) */}
              {role === 'CLIENTE' && getStatusEfetivo(selectedOrcamento) === 'enviado' && (
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <Button
                    onClick={() => handleAprovarOrcamento(selectedOrcamento.id)}
                    disabled={isApproving}
                    className="w-full sm:flex-1 bg-[#4A7C59] hover:bg-[#3D6B4C] text-white font-semibold text-sm gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      {isApproving ? 'Registrando aprovação...' : 'Aprovar Orçamento Agora'}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRecusaModalOpen(true)}
                    className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50 gap-1.5 text-xs font-semibold"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Recusar</span>
                  </Button>
                </div>
              )}

              {/* Ações no rodapé do Detalhe */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#F1ECE6]">
                <div className="flex items-center gap-2">
                  {/* Botão de Editar no modal de detalhes (ADMIN, VENDEDOR dele, ou CLIENTE dele nos status editáveis) */}
                  {podeEditarOrcamento(selectedOrcamento) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openEditModal(selectedOrcamento)}
                      className="border-[#A67C52] text-[#A67C52] hover:bg-[#FAF7F3] text-xs gap-1 font-semibold"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Editar Orçamento</span>
                    </Button>
                  )}

                  {/* Botão de Converter em Venda para status APROVADO (Apenas Vendedor/Admin) */}
                  {role !== 'CLIENTE' && selectedOrcamento.status === 'aprovado' && (
                    <Button
                      onClick={() => handleAbrirConversao(selectedOrcamento)}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs gap-1.5 shadow-xs"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>Converter em Venda</span>
                    </Button>
                  )}
                </div>

                {/* Vendedor/Admin também podem marcar como RECUSADO manualmente */}
                {role !== 'CLIENTE' &&
                  selectedOrcamento.status === 'enviado' &&
                  getStatusEfetivo(selectedOrcamento) !== 'expirado' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsRecusaModalOpen(true)}
                      className="border-red-300 text-red-700 hover:bg-red-50 text-xs gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Marcar como Recusado</span>
                    </Button>
                  )}
              </div>
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

      {/* Modal de Confirmação de Recusa do Orçamento (Cliente ou Vendedor/Admin) */}
      <Dialog open={isRecusaModalOpen} onOpenChange={setIsRecusaModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Confirmar Recusa da Proposta</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              {role === 'CLIENTE'
                ? 'Ao recusar este orçamento, ele não poderá mais ser aprovado por você. Deseja realmente recusar esta proposta comercial?'
                : 'Tem certeza de que deseja marcar este orçamento como RECUSADO? O cliente não poderá mais aprová-lo pelo painel.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-[#6B6B6B] bg-[#FAF7F3] p-3 rounded-lg border border-[#E5E0DA]">
            <p>
              <strong>Cliente:</strong> {selectedOrcamento?.expand?.cliente?.nome || '-'}
            </p>
            <p className="mt-1">
              <strong>Valor da Proposta:</strong>{' '}
              {selectedOrcamento ? formatCurrency(selectedOrcamento.valor_total) : '-'}
            </p>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isRecusing}
              onClick={() => setIsRecusaModalOpen(false)}
              className="border-[#E5E0DA]"
            >
              Voltar
            </Button>
            <Button
              type="button"
              disabled={isRecusing}
              onClick={handleRecusarOrcamento}
              className="bg-red-700 hover:bg-red-800 text-white font-semibold text-xs gap-1.5"
            >
              <XCircle className="h-4 w-4" />
              <span>{isRecusing ? 'Registrando recusa...' : 'Sim, Recusar Orçamento'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Revalidar e Reenviar Orçamento Expirado (Vendedor / Admin) */}
      <Dialog open={isReenviarModalOpen} onOpenChange={setIsReenviarModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#2B2B2B] flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[#A67C52]" />
              <span>Revalidar e Reenviar Orçamento</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Defina a nova data de validade para reativar esta proposta comercial e enviá-la
              novamente ao cliente. O status voltará a ser <strong>ENVIADO</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="text-xs text-[#6B6B6B] bg-[#FAF7F3] p-3 rounded-lg border border-[#E5E0DA] space-y-1">
              <div>
                <strong>Cliente:</strong> {selectedOrcamento?.expand?.cliente?.nome}
              </div>
              <div>
                <strong>Validade anterior:</strong>{' '}
                {selectedOrcamento?.validade
                  ? new Date(selectedOrcamento.validade).toLocaleDateString('pt-BR')
                  : '-'}
              </div>
              <div>
                <strong>Valor total:</strong>{' '}
                {selectedOrcamento ? formatCurrency(selectedOrcamento.valor_total) : '-'}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novaValidadeInput" className="text-xs font-semibold text-[#2B2B2B]">
                Nova Data de Validade *
              </Label>
              <Input
                id="novaValidadeInput"
                type="date"
                value={novaValidadeReenvio}
                onChange={(e) => setNovaValidadeReenvio(e.target.value)}
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isReenviando}
              onClick={() => setIsReenviarModalOpen(false)}
              className="border-[#E5E0DA]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isReenviando || !novaValidadeReenvio}
              onClick={handleConfirmarReenviar}
              className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-1.5 font-semibold text-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isReenviando ? 'Reenviando...' : 'Reativar e Reenviar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Conversão em Venda (Vendedor / Admin) */}
      <Dialog open={isConverterModalOpen} onOpenChange={setIsConverterModalOpen}>
        <DialogContent className="max-w-xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#2B2B2B] flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-700" />
              <span>Converter Orçamento Aprovado em Venda</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Cria automaticamente a locação comercial a partir desta proposta aprovada, vinculando
              o mesmo cliente, endereço e móveis TIDELLI.
            </DialogDescription>
          </DialogHeader>

          {selectedOrcamento && (
            <div className="space-y-4 py-2">
              {/* Resumo do Orçamento de Origem */}
              <div className="rounded-lg bg-[#FAF7F3] border border-[#E5E0DA] p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Cliente:</span>
                  <span className="font-semibold text-[#2B2B2B]">
                    {selectedOrcamento.expand?.cliente?.nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Endereço de Entrega:</span>
                  <span className="font-semibold text-[#2B2B2B] text-right max-w-[280px]">
                    {selectedOrcamento.expand?.endereco
                      ? enderecosService.formatCurto(selectedOrcamento.expand.endereco)
                      : selectedOrcamento.expand?.cliente?.endereco || 'Principal'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B6B6B]">Período da Locação:</span>
                  <span className="font-semibold text-[#2B2B2B]">
                    {selectedOrcamento.data_inicio && selectedOrcamento.data_fim
                      ? `${new Date(selectedOrcamento.data_inicio).toLocaleDateString('pt-BR')} até ${new Date(selectedOrcamento.data_fim).toLocaleDateString('pt-BR')} (${calcularDiasPeriodo(selectedOrcamento.data_inicio, selectedOrcamento.data_fim)} diárias)`
                      : 'Período padrão'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#E5E0DA] pt-1">
                  <span className="text-[#6B6B6B] font-semibold">Valor Total da Proposta:</span>
                  <span className="font-extrabold text-[#A67C52] text-sm">
                    {formatCurrency(selectedOrcamento.valor_total)}
                  </span>
                </div>
              </div>

              {/* Status de Revalidação de Disponibilidade Central */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#2B2B2B] uppercase">
                  Revalidação de Disponibilidade no Acervo
                </Label>
                {validandoConversao ? (
                  <div className="p-3 bg-[#FAF7F3] rounded-lg border border-[#E5E0DA] text-xs text-[#6B6B6B] flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
                    <span>Consultando motor central de disponibilidade para o período...</span>
                  </div>
                ) : conflitosConversao.length > 0 ? (
                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg text-xs text-red-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Saldo Insuficiente no Período (Conversão Bloqueada):</span>
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      {conflitosConversao.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                    <p className="text-[11px] font-medium text-red-700 pt-1">
                      Não é permitido criar a locação sem saldo disponível. Ajuste as datas ou
                      libere estoque antes de converter.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Todos os móveis deste orçamento possuem saldo disponível e estão liberados
                      para locação no período!
                    </span>
                  </div>
                )}
              </div>

              {/* Itens que virarão contratos de venda */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-[#6B6B6B] uppercase">
                  Móveis que Serão Contratados ({detalheItens.length})
                </Label>
                <div className="divide-y divide-[#F1ECE6] border border-[#E5E0DA] rounded-lg max-h-40 overflow-y-auto">
                  {detalheItens.map((it) => (
                    <div
                      key={it.id}
                      className="p-2 text-xs flex justify-between items-center bg-white"
                    >
                      <div>
                        <span className="font-medium text-[#2B2B2B]">
                          {it.expand?.produto?.codigo ? `[${it.expand.produto.codigo}] ` : ''}
                          {it.expand?.produto?.nome || 'Móvel'}
                        </span>
                        <div className="text-[11px] text-[#6B6B6B]">
                          Quantidade: <strong>{it.quantidade} un.</strong>
                        </div>
                      </div>
                      <span className="font-bold text-[#A67C52]">
                        {formatCurrency(
                          (it.expand?.produto?.valor_locacao_diaria ??
                            it.expand?.produto?.valor_locacao_mensal ??
                            0) *
                            it.quantidade *
                            Math.max(
                              1,
                              calcularDiasPeriodo(
                                selectedOrcamento.data_inicio || '',
                                selectedOrcamento.data_fim || '',
                              ),
                            ),
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campos complementares da Venda */}
              <div className="space-y-3 pt-1 border-t border-[#F1ECE6]">
                <div className="space-y-1.5">
                  <Label htmlFor="formaPgtoConv" className="text-xs font-semibold text-[#2B2B2B]">
                    Forma de Pagamento da Locação *
                  </Label>
                  <Select
                    value={formaPagamentoConversao}
                    onValueChange={(val) => setFormaPagamentoConversao(val as FormaPagamento)}
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
                  <Label htmlFor="obsConv" className="text-xs font-semibold text-[#2B2B2B]">
                    Observações do Contrato de Locação
                  </Label>
                  <Textarea
                    id="obsConv"
                    rows={2}
                    value={observacoesConversao}
                    onChange={(e) => setObservacoesConversao(e.target.value.toUpperCase())}
                    className="bg-[#FBF9F6] border-[#E5E0DA]"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isConverting}
              onClick={() => setIsConverterModalOpen(false)}
              className="border-[#E5E0DA]"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isConverting || validandoConversao || conflitosConversao.length > 0}
              onClick={handleConfirmarConversao}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs gap-1.5 disabled:opacity-50"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>{isConverting ? 'Convertendo...' : 'Confirmar e Criar Venda'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
