import React, { useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { vendasService } from '@/services/vendas'
import { orcamentosService } from '@/services/orcamentos'
import { produtosService } from '@/services/produtos'
import { clientesService } from '@/services/clientes'
import { linhasService } from '@/services/linhas'
import type {
  VendaRecord,
  OrcamentoRecord,
  OrcamentoItemRecord,
  ClienteRecord,
  ProdutoRecord,
  LinhaRecord,
} from '@/types/database'
import { useNavigate } from 'react-router-dom'
import {
  disponibilidadeService,
  formatDataISO,
  type RelatorioTaxaOcupacaoResultado,
} from '@/services/disponibilidade'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Download,
  Calendar,
  Filter,
  BadgeDollarSign,
  Receipt,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Sparkles,
  BarChart3,
  CalendarDays,
  Armchair,
} from 'lucide-react'

export default function AdminRelatorios() {
  const navigate = useNavigate()
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([])
  const [orcamentoItens, setOrcamentoItens] = useState<OrcamentoItemRecord[]>([])
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [linhas, setLinhas] = useState<LinhaRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [periodoFilter, setPeriodoFilter] = useState('TODOS') // 'TODOS' | '30' | '90' | '180' | '365'
  const [linhaFilter, setLinhaFilter] = useState('TODAS') // 'TODAS' | linha.id ou nome

  // Estados específicos para a seção "Taxa de Ocupação do Estoque"
  const [ocupacaoDataInicio, setOcupacaoDataInicio] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [ocupacaoDataFim, setOcupacaoDataFim] = useState<string>(() => {
    const d = new Date()
    const ultDia = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ultDia.getDate()).padStart(2, '0')}`
  })
  const [ocupacaoPreset, setOcupacaoPreset] = useState<
    'mes_atual' | 'proximo_mes' | 'prox_30' | 'trimestre' | 'personalizado'
  >('mes_atual')
  const [ocupacaoRelatorio, setOcupacaoRelatorio] = useState<RelatorioTaxaOcupacaoResultado | null>(
    null,
  )
  const [loadingOcupacao, setLoadingOcupacao] = useState(false)
  const [ordenacaoOcupacao, setOrdenacaoOcupacao] = useState<
    'taxa_desc' | 'taxa_asc' | 'nome' | 'valor_desc'
  >('taxa_desc')

  useEffect(() => {
    const load = async () => {
      try {
        const [v, o, c, p, l] = await Promise.all([
          vendasService.getAll(),
          orcamentosService.getAll(),
          clientesService.getAll(),
          produtosService.getAll(),
          linhasService.getAll(),
        ])
        setVendas(v)
        setOrcamentos(o)
        setClientes(c)
        setProdutos(p)
        setLinhas(l)

        // Carregar itens de orçamentos para cruzar com a linha dos produtos
        try {
          const itens = await pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
            expand: 'produto,produto.linha',
          })
          setOrcamentoItens(itens)
        } catch (itensErr) {
          console.error('Erro ao buscar orcamento_itens:', itensErr)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Carrega / recalcula a taxa de ocupação quando as datas ou o filtro de linha mudam
  useEffect(() => {
    if (!ocupacaoDataInicio || !ocupacaoDataFim) return
    let cancel = false
    const calcular = async () => {
      try {
        setLoadingOcupacao(true)
        const res = await disponibilidadeService.calcularTaxaOcupacaoEstoquePeriodo(
          ocupacaoDataInicio,
          ocupacaoDataFim,
          linhaFilter,
        )
        if (cancel) return
        setOcupacaoRelatorio(res)
      } catch (err) {
        console.error('Erro ao calcular taxa de ocupação:', err)
      } finally {
        if (!cancel) setLoadingOcupacao(false)
      }
    }
    calcular()
    return () => {
      cancel = true
    }
  }, [ocupacaoDataInicio, ocupacaoDataFim, linhaFilter])

  // Presets rápidos para a Taxa de Ocupação
  const aplicarPresetOcupacao = (preset: 'mes_atual' | 'proximo_mes' | 'prox_30' | 'trimestre') => {
    setOcupacaoPreset(preset)
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth() // 0 a 11

    if (preset === 'mes_atual') {
      const ini = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      const ult = new Date(ano, mes + 1, 0).getDate()
      const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ult).padStart(2, '0')}`
      setOcupacaoDataInicio(ini)
      setOcupacaoDataFim(fim)
    } else if (preset === 'proximo_mes') {
      const proxDate = new Date(ano, mes + 1, 1)
      const pAno = proxDate.getFullYear()
      const pMes = proxDate.getMonth() + 1
      const pUlt = new Date(pAno, pMes, 0).getDate()
      const ini = `${pAno}-${String(pMes).padStart(2, '0')}-01`
      const fim = `${pAno}-${String(pMes).padStart(2, '0')}-${String(pUlt).padStart(2, '0')}`
      setOcupacaoDataInicio(ini)
      setOcupacaoDataFim(fim)
    } else if (preset === 'prox_30') {
      const ini = formatDataISO(hoje)
      const dataFimObj = new Date(hoje)
      dataFimObj.setDate(dataFimObj.getDate() + 29)
      const fim = formatDataISO(dataFimObj)
      setOcupacaoDataInicio(ini)
      setOcupacaoDataFim(fim)
    } else if (preset === 'trimestre') {
      const ini = formatDataISO(hoje)
      const dataFimObj = new Date(hoje)
      dataFimObj.setDate(dataFimObj.getDate() + 89)
      const fim = formatDataISO(dataFimObj)
      setOcupacaoDataInicio(ini)
      setOcupacaoDataFim(fim)
    }
  }

  // Lista de produtos com ordenação dinâmica
  const produtosOcupacaoOrdenados = useMemo(() => {
    if (!ocupacaoRelatorio) return []
    const list = [...ocupacaoRelatorio.produtos]
    if (ordenacaoOcupacao === 'taxa_desc') {
      list.sort((a, b) => b.taxaOcupacaoPercent - a.taxaOcupacaoPercent)
    } else if (ordenacaoOcupacao === 'taxa_asc') {
      list.sort((a, b) => a.taxaOcupacaoPercent - b.taxaOcupacaoPercent)
    } else if (ordenacaoOcupacao === 'nome') {
      list.sort((a, b) => a.produto.nome.localeCompare(b.produto.nome))
    } else if (ordenacaoOcupacao === 'valor_desc') {
      list.sort((a, b) => b.valorEstimadoComprometido - a.valorEstimadoComprometido)
    }
    return list
  }, [ocupacaoRelatorio, ordenacaoOcupacao])

  // Mapeamento de quais orçamentos possuem itens de cada linha
  const orcamentosLinhasMap = useMemo(() => {
    const map = new Map<string, Set<string>>() // orcamentoId -> Set of linha ids or names
    orcamentoItens.forEach((item) => {
      const prod = item.expand?.produto
      const linhaId = prod?.linha
      const linhaNome = prod?.expand?.linha?.nome
      if (item.orcamento) {
        if (!map.has(item.orcamento)) {
          map.set(item.orcamento, new Set())
        }
        if (linhaId) map.get(item.orcamento)!.add(linhaId)
        if (linhaNome) map.get(item.orcamento)!.add(linhaNome)
      }
    })
    return map
  }, [orcamentoItens])

  // Filtragem de Vendas combinando Período e Linha
  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      // Filtro de Linha
      if (linhaFilter !== 'TODAS') {
        const prod = v.expand?.produto
        const prodLinhaId = prod?.linha
        const prodLinhaNome = prod?.expand?.linha?.nome
        if (prodLinhaId !== linhaFilter && prodLinhaNome !== linhaFilter) {
          return false
        }
      }

      // Filtro de Período
      if (periodoFilter !== 'TODOS') {
        const dias = parseInt(periodoFilter, 10)
        const limite = new Date()
        limite.setDate(limite.getDate() - dias)
        const createdDate = new Date(v.created || v.data_inicio)
        if (createdDate < limite) {
          return false
        }
      }

      return true
    })
  }, [vendas, linhaFilter, periodoFilter])

  // Filtragem de Orçamentos combinando Período e Linha
  const filteredOrcamentos = useMemo(() => {
    return orcamentos.filter((o) => {
      // Filtro de Linha
      if (linhaFilter !== 'TODAS') {
        const linhasDoOrcamento = orcamentosLinhasMap.get(o.id)
        if (!linhasDoOrcamento || !linhasDoOrcamento.has(linhaFilter)) {
          return false
        }
      }

      // Filtro de Período
      if (periodoFilter !== 'TODOS') {
        const dias = parseInt(periodoFilter, 10)
        const limite = new Date()
        limite.setDate(limite.getDate() - dias)
        const createdDate = new Date(o.created)
        if (createdDate < limite) {
          return false
        }
      }

      return true
    })
  }, [orcamentos, orcamentosLinhasMap, linhaFilter, periodoFilter])

  // Cálculos consolidados
  const faturamentoTotal = useMemo(() => {
    return filteredVendas.reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
  }, [filteredVendas])

  const faturamentoAtivo = useMemo(() => {
    return filteredVendas
      .filter((v) => v.status === 'ativa')
      .reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
  }, [filteredVendas])

  const totalOrcado = useMemo(() => {
    return filteredOrcamentos.reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
  }, [filteredOrcamentos])

  const taxaAprovacao = useMemo(() => {
    if (filteredOrcamentos.length === 0) return 0
    const aprovados = filteredOrcamentos.filter((o) => o.status === 'aprovado').length
    return Math.round((aprovados / filteredOrcamentos.length) * 100)
  }, [filteredOrcamentos])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Relatórios Gerais Consolidados</h2>
          <p className="text-sm text-[#6B6B6B]">
            Desempenho financeiro, taxa de conversão de orçamentos e visão analítica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por Linha TIDELLI */}
          <div className="w-48">
            <Select value={linhaFilter} onValueChange={setLinhaFilter}>
              <SelectTrigger className="bg-white border-[#E5E0DA]">
                <SelectValue placeholder="Filtrar por Linha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as linhas</SelectItem>
                {linhas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    Linha {l.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Período */}
          <div className="w-44">
            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="bg-white border-[#E5E0DA]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todo o Histórico</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-[#E5E0DA] gap-1.5 text-xs font-semibold bg-white"
          >
            <Download className="h-4 w-4 text-[#A67C52]" />
            <span>Exportar / Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">Faturamento Geral</span>
          <div className="mt-3 text-2xl font-extrabold text-[#2B2B2B]">
            {formatCurrency(faturamentoTotal)}
          </div>
          <span className="text-xs text-[#6B6B6B] mt-1 block">
            {filteredVendas.length} contrato(s){' '}
            {linhaFilter !== 'TODAS'
              ? `(Linha ${linhas.find((l) => l.id === linhaFilter)?.nome || linhaFilter})`
              : 'no período'}
          </span>
        </div>

        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">Contratos Vigentes</span>
          <div className="mt-3 text-2xl font-extrabold text-[#4A7C59]">
            {formatCurrency(faturamentoAtivo)}
          </div>
          <span className="text-xs text-[#4A7C59] mt-1 block font-medium">
            {filteredVendas.filter((v) => v.status === 'ativa').length} locações ativas
          </span>
        </div>

        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">Total Orçado</span>
          <div className="mt-3 text-2xl font-extrabold text-[#2B2B2B]">
            {formatCurrency(totalOrcado)}
          </div>
          <span className="text-xs text-[#6B6B6B] mt-1 block">
            {filteredOrcamentos.length} cotação(ões){' '}
            {linhaFilter !== 'TODAS'
              ? `(Linha ${linhas.find((l) => l.id === linhaFilter)?.nome || linhaFilter})`
              : 'emitidas'}
          </span>
        </div>

        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">Taxa de Conversão</span>
          <div className="mt-3 text-2xl font-extrabold text-[#A67C52]">{taxaAprovacao}%</div>
          <span className="text-xs text-[#A67C52] mt-1 block font-medium">
            Orçamentos aprovados
          </span>
        </div>
      </div>

      {/* Seção 1: Análise de Contratos de Locação */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1ECE6] pb-3">
          <div className="flex items-center gap-2">
            <BadgeDollarSign className="h-5 w-5 text-[#A67C52]" />
            <h3 className="font-bold text-base text-[#2B2B2B]">Contratos de Locação Realizados</h3>
          </div>
          <Badge className="bg-[#FAF7F3] text-[#2B2B2B] border border-[#E5E0DA]">
            {filteredVendas.length} registros
          </Badge>
        </div>

        {filteredVendas.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] py-4">Nenhum contrato encontrado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#2B2B2B]">
              <thead className="bg-[#FAF7F3] text-xs font-bold uppercase text-[#6B6B6B]">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-md">Cliente</th>
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Móvel</th>
                  <th className="px-3 py-2.5">Qtd</th>
                  <th className="px-3 py-2.5">Período</th>
                  <th className="px-3 py-2.5">Pagamento</th>
                  <th className="px-3 py-2.5">Valor Total</th>
                  <th className="px-3 py-2.5 rounded-r-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE6]">
                {filteredVendas.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAF7F3]">
                    <td className="px-3 py-2.5 font-medium">{v.expand?.cliente?.nome || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-xs font-bold text-[#A67C52] bg-[#FAF7F3] px-1.5 py-0.5 rounded border border-[#E5E0DA]">
                        {v.expand?.produto?.codigo || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{v.expand?.produto?.nome || '-'}</div>
                      {(v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha) && (
                        <div className="text-[11px] text-[#A67C52] font-medium">
                          Linha {v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{v.quantidade}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B6B6B]">
                      {new Date(v.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                      {new Date(v.data_fim).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2.5 text-xs capitalize">
                      {v.forma_pagamento.replace(/_/g, ' ')}
                    </td>
                    <td className="px-3 py-2.5 font-bold">{formatCurrency(v.valor_total)}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase ${
                          v.status === 'ativa'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {v.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seção NOVA: Taxa de Ocupação do Estoque por Período */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F1ECE6] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#A67C52]" />
              <h3 className="font-bold text-lg text-[#2B2B2B]">
                Taxa de Ocupação do Estoque por Período
              </h3>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1">
              Visão analítica de capacidade física e faturamento comprometido dia a dia (locações
              ativas + orçamentos aprovados).
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/admin/calendario')}
            className="bg-[#A67C52] hover:bg-[#8C643F] text-white text-xs gap-1.5 self-start md:self-auto"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Ver Calendário Completo</span>
          </Button>
        </div>

        {/* Filtros do Relatório de Ocupação */}
        <div className="rounded-xl bg-[#FAF7F3] border border-[#E5E0DA] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-[#A67C52]" />
              Período de Análise
            </span>

            {/* Presets Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={ocupacaoPreset === 'mes_atual' ? 'default' : 'outline'}
                onClick={() => aplicarPresetOcupacao('mes_atual')}
                className={`h-7 px-2.5 text-[11px] font-semibold ${
                  ocupacaoPreset === 'mes_atual'
                    ? 'bg-[#A67C52] text-white'
                    : 'bg-white border-[#E5E0DA] text-[#2B2B2B]'
                }`}
              >
                Mês Atual
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ocupacaoPreset === 'proximo_mes' ? 'default' : 'outline'}
                onClick={() => aplicarPresetOcupacao('proximo_mes')}
                className={`h-7 px-2.5 text-[11px] font-semibold ${
                  ocupacaoPreset === 'proximo_mes'
                    ? 'bg-[#A67C52] text-white'
                    : 'bg-white border-[#E5E0DA] text-[#2B2B2B]'
                }`}
              >
                Próximo Mês
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ocupacaoPreset === 'prox_30' ? 'default' : 'outline'}
                onClick={() => aplicarPresetOcupacao('prox_30')}
                className={`h-7 px-2.5 text-[11px] font-semibold ${
                  ocupacaoPreset === 'prox_30'
                    ? 'bg-[#A67C52] text-white'
                    : 'bg-white border-[#E5E0DA] text-[#2B2B2B]'
                }`}
              >
                Próximos 30 dias
              </Button>
              <Button
                type="button"
                size="sm"
                variant={ocupacaoPreset === 'trimestre' ? 'default' : 'outline'}
                onClick={() => aplicarPresetOcupacao('trimestre')}
                className={`h-7 px-2.5 text-[11px] font-semibold ${
                  ocupacaoPreset === 'trimestre'
                    ? 'bg-[#A67C52] text-white'
                    : 'bg-white border-[#E5E0DA] text-[#2B2B2B]'
                }`}
              >
                Próximo Trimestre
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B6B6B]">Data de Início</label>
              <Input
                type="date"
                value={ocupacaoDataInicio}
                onChange={(e) => {
                  setOcupacaoDataInicio(e.target.value)
                  setOcupacaoPreset('personalizado')
                }}
                className="bg-white border-[#E5E0DA] h-8 text-xs text-[#2B2B2B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B6B6B]">Data de Término</label>
              <Input
                type="date"
                value={ocupacaoDataFim}
                onChange={(e) => {
                  setOcupacaoDataFim(e.target.value)
                  setOcupacaoPreset('personalizado')
                }}
                className="bg-white border-[#E5E0DA] h-8 text-xs text-[#2B2B2B]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#6B6B6B]">
                Linha (respeita o filtro geral)
              </label>
              <div className="h-8 flex items-center px-3 rounded-md bg-white border border-[#E5E0DA] text-xs text-[#2B2B2B] font-medium">
                {linhaFilter === 'TODAS'
                  ? 'Todas as Linhas TIDELLI'
                  : `Linha ${linhas.find((l) => l.id === linhaFilter)?.nome || linhaFilter}`}
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Resumo da Taxa de Ocupação */}
        {loadingOcupacao ? (
          <div className="py-8 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
          </div>
        ) : ocupacaoRelatorio && ocupacaoRelatorio.diasPeriodo > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Taxa Média Geral */}
              <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Ocupação Média Geral
                  </span>
                  <div className="mt-2 text-2xl font-extrabold text-[#2B2B2B]">
                    {ocupacaoRelatorio.taxaMediaGeral}%
                  </div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-[#E5E0DA] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        ocupacaoRelatorio.taxaMediaGeral > 80
                          ? 'bg-red-500'
                          : ocupacaoRelatorio.taxaMediaGeral >= 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, ocupacaoRelatorio.taxaMediaGeral)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#6B6B6B] mt-1 block">
                    No período de {ocupacaoRelatorio.diasPeriodo} dias
                  </span>
                </div>
              </div>

              {/* Card 2: Produto Mais Ocupado */}
              <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Produto Mais Ocupado
                  </span>
                  <div className="mt-2">
                    {ocupacaoRelatorio.produtoMaisOcupado ? (
                      <div>
                        <div
                          className="font-extrabold text-base text-[#2B2B2B] truncate"
                          title={ocupacaoRelatorio.produtoMaisOcupado.produto.nome}
                        >
                          {ocupacaoRelatorio.produtoMaisOcupado.produto.nome}
                        </div>
                        <span className="text-xs font-bold text-[#A67C52] mt-0.5 block">
                          {ocupacaoRelatorio.produtoMaisOcupado.taxaOcupacaoPercent}% ocupado
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-[#6B6B6B]">
                        Nenhum item ocupado
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-[#6B6B6B] mt-2 block">
                  Maior demanda física no período
                </span>
              </div>

              {/* Card 3: Unidades-Dia Comprometidas */}
              <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Unidades-Dia Comprometidas
                  </span>
                  <div className="mt-2 text-2xl font-extrabold text-[#2B2B2B]">
                    {ocupacaoRelatorio.totalUnidadesDiaComprometidas}{' '}
                    <span className="text-sm font-normal text-[#6B6B6B]">
                      / {ocupacaoRelatorio.totalUnidadesDiaDisponiveis} un-dia
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-[#6B6B6B] mt-2 block">
                  Soma diária de itens em locações/orçamentos
                </span>
              </div>

              {/* Card 4: Valor Estimado Comprometido */}
              <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Faturamento Comprometido
                  </span>
                  <div className="mt-2 text-2xl font-extrabold text-[#4A7C59]">
                    {formatCurrency(ocupacaoRelatorio.valorTotalEstimadoComprometido)}
                  </div>
                </div>
                <span className="text-[10px] text-[#4A7C59] mt-2 block font-medium">
                  {ocupacaoRelatorio.diasPeriodo} dias × diárias ocupadas
                </span>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#2B2B2B]">
                    Detalhamento por Móvel ({produtosOcupacaoOrdenados.length} itens)
                  </h4>
                  <Badge className="bg-[#FAF7F3] text-[#2B2B2B] border border-[#E5E0DA] text-[10px]">
                    {ocupacaoRelatorio.diasPeriodo} dias avaliados
                  </Badge>
                </div>

                {/* Ordenação */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B6B6B]">Ordenar por:</span>
                  <Select
                    value={ordenacaoOcupacao}
                    onValueChange={(val) => setOrdenacaoOcupacao(val as typeof ordenacaoOcupacao)}
                  >
                    <SelectTrigger className="bg-white border-[#E5E0DA] h-8 text-xs w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taxa_desc">Maior Ocupação %</SelectItem>
                      <SelectItem value="taxa_asc">Menor Ocupação %</SelectItem>
                      <SelectItem value="valor_desc">Maior Valor R$</SelectItem>
                      <SelectItem value="nome">Nome do Móvel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {produtosOcupacaoOrdenados.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E5E0DA] p-8 text-center text-xs text-[#6B6B6B]">
                  Nenhum móvel encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E5E0DA]">
                  <table className="w-full text-left text-xs text-[#2B2B2B]">
                    <thead className="bg-[#FAF7F3] font-bold uppercase text-[#6B6B6B] border-b border-[#E5E0DA]">
                      <tr>
                        <th className="px-3 py-3">Código</th>
                        <th className="px-3 py-3">Móvel</th>
                        <th className="px-3 py-3">Linha</th>
                        <th className="px-3 py-3 text-center">Estoque</th>
                        <th className="px-3 py-3 text-center">Unidades-Dia</th>
                        <th className="px-3 py-3 min-w-[180px]">Taxa de Ocupação %</th>
                        <th className="px-3 py-3 text-right">Diária</th>
                        <th className="px-3 py-3 text-right">Faturamento Est.</th>
                        <th className="px-3 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1ECE6]">
                      {produtosOcupacaoOrdenados.map((item) => {
                        const {
                          produto,
                          taxaOcupacaoPercent,
                          unidadesDiaComprometidas,
                          unidadesDiaDisponiveis,
                          valorLocacaoDiaria,
                          valorEstimadoComprometido,
                        } = item
                        const linhaNome = produto.expand?.linha?.nome || produto.linha

                        // Cores da barra de progresso: <50% verde, 50-80% âmbar, >80% vermelho
                        let corBarra = 'bg-emerald-500'
                        let corTexto = 'text-emerald-700'
                        let badgeBg = 'bg-emerald-50 border-emerald-200'
                        if (taxaOcupacaoPercent > 80) {
                          corBarra = 'bg-red-500'
                          corTexto = 'text-red-700'
                          badgeBg = 'bg-red-50 border-red-200'
                        } else if (taxaOcupacaoPercent >= 50) {
                          corBarra = 'bg-amber-500'
                          corTexto = 'text-amber-700'
                          badgeBg = 'bg-amber-50 border-amber-200'
                        }

                        return (
                          <tr key={produto.id} className="hover:bg-[#FAF7F3] transition-colors">
                            <td className="px-3 py-3 font-mono font-bold text-[#A67C52]">
                              {produto.codigo || '—'}
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-[#2B2B2B]">{produto.nome}</div>
                              {produto.dimensoes && (
                                <div className="text-[10px] text-[#8C8C8C]">
                                  {produto.dimensoes}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {linhaNome ? (
                                <span className="inline-block text-[11px] font-medium text-[#A67C52] bg-[#FAF7F3] px-2 py-0.5 rounded border border-[#E5E0DA]">
                                  Linha {linhaNome}
                                </span>
                              ) : (
                                <span className="text-[#8C8C8C]">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center font-bold">
                              {produto.quantidade_estoque} un.
                            </td>
                            <td className="px-3 py-3 text-center text-xs">
                              <span className="font-bold text-[#2B2B2B]">
                                {unidadesDiaComprometidas}
                              </span>
                              <span className="text-[#8C8C8C]"> / {unidadesDiaDisponiveis}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-extrabold px-1.5 py-0 border ${badgeBg} ${corTexto}`}
                                  >
                                    {taxaOcupacaoPercent}%
                                  </Badge>
                                  <span className="text-[10px] text-[#8C8C8C]">
                                    {unidadesDiaComprometidas > 0
                                      ? `${unidadesDiaComprometidas} un-dia ocup.`
                                      : '100% livre'}
                                  </span>
                                </div>
                                <div className="w-full bg-[#E5E0DA] h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${corBarra}`}
                                    style={{ width: `${Math.min(100, taxaOcupacaoPercent)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right text-xs">
                              {formatCurrency(valorLocacaoDiaria)}/d
                            </td>
                            <td className="px-3 py-3 text-right font-bold text-xs text-[#2B2B2B]">
                              {formatCurrency(valorEstimadoComprometido)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Redireciona para o calendário com o produto selecionado e ano/mês do início
                                  const [anoP, mesP] = ocupacaoDataInicio.split('-')
                                  navigate(
                                    `/admin/calendario?produto=${produto.id}&ano=${anoP}&mes=${parseInt(mesP, 10)}`,
                                  )
                                }}
                                className="h-7 px-2 text-[10px] font-semibold border-[#E5E0DA] hover:bg-white gap-1 text-[#A67C52]"
                                title="Ver calendário de ocupação deste móvel"
                              >
                                <CalendarDays className="h-3 w-3" />
                                <span>Calendário</span>
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E5E0DA] p-12 text-center text-xs text-[#6B6B6B]">
            Selecione um intervalo de datas válido para calcular a taxa de ocupação.
          </div>
        )}
      </div>

      {/* Seção 2: Análise de Orçamentos */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1ECE6] pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#A67C52]" />
            <h3 className="font-bold text-base text-[#2B2B2B]">Histórico Geral de Orçamentos</h3>
          </div>
          <Badge className="bg-[#FAF7F3] text-[#2B2B2B] border border-[#E5E0DA]">
            {filteredOrcamentos.length} orçamentos
          </Badge>
        </div>

        {filteredOrcamentos.length === 0 ? (
          <p className="text-sm text-[#6B6B6B] py-4">Nenhum orçamento encontrado no período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#2B2B2B]">
              <thead className="bg-[#FAF7F3] text-xs font-bold uppercase text-[#6B6B6B]">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-md">Cliente</th>
                  <th className="px-3 py-2.5">Vendedor Responsável</th>
                  <th className="px-3 py-2.5">Validade</th>
                  <th className="px-3 py-2.5">Valor Estimado</th>
                  <th className="px-3 py-2.5">Data Decisão</th>
                  <th className="px-3 py-2.5 rounded-r-md">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE6]">
                {filteredOrcamentos.map((o) => (
                  <tr key={o.id} className="hover:bg-[#FAF7F3]">
                    <td className="px-3 py-2.5 font-medium">{o.expand?.cliente?.nome || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B6B6B]">
                      {o.expand?.vendedor?.name || o.expand?.vendedor?.email || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[#6B6B6B]">
                      {new Date(o.validade).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2.5 font-bold">{formatCurrency(o.valor_total)}</td>
                    <td className="px-3 py-2.5 text-xs text-[#6B6B6B]">
                      {o.data_aprovacao
                        ? new Date(o.data_aprovacao).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-3 py-2.5">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
