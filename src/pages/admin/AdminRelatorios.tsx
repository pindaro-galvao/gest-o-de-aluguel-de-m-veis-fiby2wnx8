import React, { useEffect, useState, useMemo } from 'react'
import { vendasService } from '@/services/vendas'
import { orcamentosService } from '@/services/orcamentos'
import { produtosService } from '@/services/produtos'
import { clientesService } from '@/services/clientes'
import type { VendaRecord, OrcamentoRecord, ProdutoRecord, ClienteRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

export default function AdminRelatorios() {
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([])
  const [clientes, setClientes] = useState<ClienteRecord[]>([])
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [periodoFilter, setPeriodoFilter] = useState('TODOS') // 'TODOS' | '30' | '90' | '180' | '365'

  useEffect(() => {
    const load = async () => {
      try {
        const [v, o, c, p] = await Promise.all([
          vendasService.getAll(),
          orcamentosService.getAll(),
          clientesService.getAll(),
          produtosService.getAll(),
        ])
        setVendas(v)
        setOrcamentos(o)
        setClientes(c)
        setProdutos(p)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filtragem por Período
  const filteredVendas = useMemo(() => {
    if (periodoFilter === 'TODOS') return vendas
    const dias = parseInt(periodoFilter, 10)
    const limite = new Date()
    limite.setDate(limite.getDate() - dias)

    return vendas.filter((v) => {
      const createdDate = new Date(v.created || v.data_inicio)
      return createdDate >= limite
    })
  }, [vendas, periodoFilter])

  const filteredOrcamentos = useMemo(() => {
    if (periodoFilter === 'TODOS') return orcamentos
    const dias = parseInt(periodoFilter, 10)
    const limite = new Date()
    limite.setDate(limite.getDate() - dias)

    return orcamentos.filter((o) => {
      const createdDate = new Date(o.created)
      return createdDate >= limite
    })
  }, [orcamentos, periodoFilter])

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

        <div className="flex items-center gap-3">
          <div className="w-48">
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
            {filteredVendas.length} contratos no período
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
            {filteredOrcamentos.length} cotações emitidas
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
                      <div>{v.expand?.produto?.nome || '-'}</div>
                      {v.expand?.produto?.linha && (
                        <span className="text-[11px] text-[#A67C52] font-medium">
                          Linha {v.expand.produto.linha}
                        </span>
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
