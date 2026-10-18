import React, { useEffect, useState, useMemo } from 'react'
import { orcamentosService } from '@/services/orcamentos'
import { clientesService } from '@/services/clientes'
import { produtosService } from '@/services/produtos'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import type {
  OrcamentoRecord,
  ClienteRecord,
  ProdutoRecord,
  OrcamentoItemRecord,
  StatusOrcamento,
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
} from 'lucide-react'

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
  const [validade, setValidade] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<Array<{ produtoId: string; quantidade: number }>>([])
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

  const openCreateModal = () => {
    setClienteId(clientes[0]?.id || '')
    const hoje = new Date()
    hoje.setDate(hoje.getDate() + 30)
    setValidade(hoje.toISOString().split('T')[0])
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

  const totalCalculado = useMemo(() => {
    return itens.reduce((acc, curr) => {
      const p = produtos.find((prod) => prod.id === curr.produtoId)
      const preco = p?.valor_locacao_mensal || 0
      return acc + preco * curr.quantidade
    }, 0)
  }, [itens, produtos])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!clienteId) errs.clienteId = 'Selecione um cliente.'
    if (!validade) errs.validade = 'Validade é obrigatória.'
    if (itens.length === 0) errs.itens = 'Adicione ao menos um móvel no orçamento.'
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
          valor_total: totalCalculado,
          validade: new Date(validade).toISOString(),
          status: 'enviado',
          observacoes: observacoes.trim(),
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
                  <td className="px-4 py-3.5 font-semibold text-[#2B2B2B]">
                    {o.expand?.cliente?.nome || 'Cliente'}
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
              Selecione o cliente e adicione os móveis TIDELLI para o cálculo mensal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="orcCliente" className="text-xs font-semibold text-[#2B2B2B]">
                  Cliente
                </Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue placeholder="Selecione o Cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.clienteId && (
                  <p className="text-xs text-red-600">{formErrors.clienteId}</p>
                )}
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

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {itens.map((item, idx) => {
                  const prod = produtos.find((p) => p.id === item.produtoId)
                  const subtotal = (prod?.valor_locacao_mensal || 0) * item.quantidade

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-lg border border-[#E5E0DA] bg-[#FAF7F3] p-2.5"
                    >
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
                                {p.nome}
                                {p.expand?.linha?.nome
                                  ? ` (Linha ${p.expand.linha.nome})`
                                  : p.linha
                                    ? ` (Linha ${p.linha})`
                                    : ''}{' '}
                                ({formatCurrency(p.valor_locacao_mensal)}/mês)
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

                      <div className="w-24 text-right font-bold text-xs text-[#A67C52]">
                        {formatCurrency(subtotal)}
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
                  )
                })}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-xl bg-[#F7F5F2] border border-[#E5E0DA] p-3 flex justify-between items-center">
              <span className="text-xs font-semibold text-[#6B6B6B]">
                Total Estimado de Locação Mensal:
              </span>
              <span className="text-xl font-extrabold text-[#A67C52]">
                {formatCurrency(totalCalculado)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orcObs" className="text-xs font-semibold text-[#2B2B2B]">
                Observações e Condições Comerciais
              </Label>
              <Textarea
                id="orcObs"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Condições de frete, montagem e seguro inclusos..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
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
                disabled={isSaving}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white"
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
                        <div className="font-semibold text-[#2B2B2B]">
                          {item.expand?.produto?.nome || 'Móvel TIDELLI'}
                        </div>
                        {(item.expand?.produto?.expand?.linha?.nome ||
                          item.expand?.produto?.linha) && (
                          <div className="text-[11px] text-[#A67C52] font-semibold">
                            Linha{' '}
                            {item.expand?.produto?.expand?.linha?.nome ||
                              item.expand?.produto?.linha}
                          </div>
                        )}{' '}
                        <div className="text-[11px] text-[#6B6B6B]">
                          Qtd: {item.quantidade} •{' '}
                          {formatCurrency(item.expand?.produto?.valor_locacao_mensal || 0)}/mês cada
                        </div>
                      </div>
                      <div className="font-bold text-[#A67C52]">
                        {formatCurrency(
                          (item.expand?.produto?.valor_locacao_mensal || 0) * item.quantidade,
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
    </div>
  )
}
