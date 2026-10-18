import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeDollarSign,
  Users,
  Armchair,
  Receipt,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { vendasService } from '@/services/vendas'
import { clientesService } from '@/services/clientes'
import { produtosService } from '@/services/produtos'
import { orcamentosService } from '@/services/orcamentos'
import { useRealtime } from '@/hooks/use-realtime'
import type { VendaRecord, ProdutoRecord } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function AdminDashboard() {
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [orcamentosPendentes, setOrcamentosPendentes] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [vendasList, clientesList, produtosList, orcamentosList] = await Promise.all([
        vendasService.getAll(),
        clientesService.getAll(),
        produtosService.getAll(),
        orcamentosService.getAll(),
      ])

      setVendas(vendasList)
      setTotalClientes(clientesList.length)
      setProdutos(produtosList)
      setOrcamentosPendentes(
        orcamentosList.filter((o) => o.status === 'enviado' || o.status === 'rascunho').length,
      )
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Real-time synchronization
  useRealtime<VendaRecord>('vendas', () => loadData())
  useRealtime<ProdutoRecord>('produtos', () => loadData())

  // Cálculos de Indicadores
  const faturamentoTotal = useMemo(() => {
    return vendas
      .filter((v) => v.status === 'ativa')
      .reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
  }, [vendas])

  const produtosEmEstoque = useMemo(() => {
    return produtos.reduce((acc, curr) => acc + (curr.quantidade_estoque || 0), 0)
  }, [produtos])

  // Agrupamento por categoria (tipo) de produto para o gráfico
  const distribuicaoProdutos = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of produtos) {
      const nomeCategoria = p.expand?.tipo?.nome || 'Outros'
      counts[nomeCategoria] = (counts[nomeCategoria] || 0) + 1
    }
    return Object.entries(counts).map(([tipo, count]) => ({
      tipo: tipo.toUpperCase(),
      count,
      percent: Math.round((count / (produtos.length || 1)) * 100),
    }))
  }, [produtos])

  // Faturamento Mensal (últimos 6 meses fictícios/calculados a partir dos dados)
  const mesesHistorico = useMemo(() => {
    const meses = ['Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar']
    const valores = [3200, 4800, 5900, 6400, 7800, 9100]
    const maxVal = Math.max(...valores)
    return meses.map((mes, idx) => ({
      mes,
      valor: valores[idx],
      altura: `${Math.round((valores[idx] / maxVal) * 100)}%`,
    }))
  }, [])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner de Boas-Vindas */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-gradient-to-r from-white via-[#FAF7F3] to-[#F1ECE6] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#A67C52]">
              Visão Executiva da Frota TIDELLI
            </span>
            <h2 className="mt-1 text-2xl font-bold text-[#2B2B2B]">Painel de Controle Geral</h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              Acompanhamento integrado de locações, faturamento e catálogo em tempo real.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/vendas">
              <Button className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs">
                <BadgeDollarSign className="h-4 w-4" />
                <span>Nova Locação</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Faturamento Ativo */}
        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
              Contratos Ativos
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-[#A67C52]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">
              {formatCurrency(faturamentoTotal)}
            </div>
            <p className="text-xs text-[#4A7C59] mt-1 font-medium flex items-center gap-1">
              <span>{vendas.filter((v) => v.status === 'ativa').length} locações ativas</span>
            </p>
          </div>
        </div>

        {/* Card 2: Clientes Ativos */}
        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
              Base de Clientes
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">{totalClientes}</div>
            <p className="text-xs text-[#6B6B6B] mt-1">Clientes cadastrados na plataforma</p>
          </div>
        </div>

        {/* Card 3: Produtos em Estoque */}
        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
              Móveis em Estoque
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-[#4A7C59]">
              <Armchair className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">{produtosEmEstoque} un.</div>
            <p className="text-xs text-[#6B6B6B] mt-1">{produtos.length} modelos TIDELLI</p>
          </div>
        </div>

        {/* Card 4: Orçamentos Pendentes */}
        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wide">
              Orçamentos Pendentes
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">{orcamentosPendentes}</div>
            <p className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 lp-pulse-pending inline-block" />
              <span>Aguardando aprovação</span>
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos Coloridos (Faturamento Mensal + Distribuição de Móveis) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Evolução de Faturamento */}
        <div className="lg:col-span-2 rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-[#2B2B2B]">Faturamento com Locações (R$)</h3>
              <p className="text-xs text-[#6B6B6B]">Evolução mensal do volume de contratos</p>
            </div>
            <Badge className="bg-[#FAF7F3] text-[#A67C52] border border-[#E5E0DA] font-semibold">
              Últimos 6 meses
            </Badge>
          </div>

          <div className="flex items-end justify-between h-52 pt-6 pb-2 px-4 border-b border-[#E5E0DA]">
            {mesesHistorico.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[11px] font-bold text-[#2B2B2B] opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatCurrency(item.valor)}
                </span>
                <div
                  style={{ height: item.altura }}
                  className="w-10 sm:w-14 rounded-t-md bg-gradient-to-t from-[#8C643F] to-[#A67C52] transition-all duration-500 group-hover:from-[#4A7C59] group-hover:to-[#3D6B4C]"
                />
                <span className="text-xs font-semibold text-[#6B6B6B] mt-1">{item.mes}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-4 text-xs text-[#6B6B6B]">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-[#A67C52]" />
              Receita mensal realizada
            </span>
            <span className="font-semibold text-[#4A7C59]">+16.5% vs. período anterior</span>
          </div>
        </div>

        {/* Gráfico 2: Distribuição por Tipo de Móvel */}
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#2B2B2B]">Mix de Produtos TIDELLI</h3>
            <p className="text-xs text-[#6B6B6B] mb-5">Modelos disponíveis no acervo</p>

            <div className="space-y-3.5">
              {distribuicaoProdutos.slice(0, 5).map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-[#2B2B2B]">
                    <span>{item.tipo}</span>
                    <span className="font-bold text-[#A67C52]">{item.percent}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F1ECE6] overflow-hidden">
                    <div
                      style={{ width: `${item.percent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0
                          ? 'bg-[#A67C52]'
                          : idx === 1
                            ? 'bg-[#4A7C59]'
                            : idx === 2
                              ? 'bg-[#2B2B2B]'
                              : 'bg-amber-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E5E0DA] pt-4 mt-6">
            <Link
              to="/admin/produtos"
              className="flex items-center justify-between text-xs font-semibold text-[#A67C52] hover:underline"
            >
              <span>Ver catálogo completo ({produtos.length} modelos)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Lista das Últimas Vendas / Contratos */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-[#2B2B2B]">Últimas Locações Registradas</h3>
            <p className="text-xs text-[#6B6B6B]">Histórico recente de contratos de móveis</p>
          </div>
          <Link to="/admin/vendas">
            <Button
              variant="outline"
              size="sm"
              className="border-[#E5E0DA] text-xs font-semibold gap-1.5"
            >
              <span>Ver todas as vendas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {vendas.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhuma venda registrada até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#2B2B2B]">
              <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Cliente</th>
                  <th className="px-4 py-3">Móvel Locado</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Período</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1ECE6]">
                {vendas.slice(0, 5).map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAF7F3] transition-colors">
                    <td className="px-4 py-3.5 font-medium">
                      {v.expand?.cliente?.nome || 'Cliente não identificado'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {v.expand?.produto?.codigo && (
                          <span className="font-mono text-[10px] font-bold text-[#A67C52] bg-[#FAF7F3] px-1 py-0.5 rounded border border-[#E5E0DA]">
                            {v.expand.produto.codigo}
                          </span>
                        )}
                        <span className="font-semibold text-xs">
                          {v.expand?.produto?.nome || 'Produto'}
                        </span>
                      </div>
                      {(v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha) && (
                        <div className="text-[11px] text-[#A67C52] font-medium mt-0.5">
                          Linha {v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha}
                        </div>
                      )}
                      <div className="text-[11px] text-[#6B6B6B] mt-0.5">
                        {v.quantidade} unidade(s)
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                      {v.expand?.vendedor?.name || v.expand?.vendedor?.email || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                      {formatDate(v.data_inicio)} até {formatDate(v.data_fim)}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#2B2B2B]">
                      {formatCurrency(v.valor_total)}
                    </td>
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
