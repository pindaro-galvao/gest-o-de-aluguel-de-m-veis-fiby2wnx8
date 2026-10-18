import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { vendasService } from '@/services/vendas'
import { orcamentosService } from '@/services/orcamentos'
import { clientesService } from '@/services/clientes'
import { useRealtime } from '@/hooks/use-realtime'
import type { VendaRecord, OrcamentoRecord, ClienteRecord } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BadgeDollarSign,
  Receipt,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function VendedorDashboard() {
  const { user } = useAuth()
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [orcamentos, setOrcamentos] = useState<OrcamentoRecord[]>([])
  const [clientesCount, setClientesCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const [v, o, c] = await Promise.all([
        vendasService.getAll(),
        orcamentosService.getAll(),
        clientesService.getAll(),
      ])
      setVendas(v)
      setOrcamentos(o)
      setClientesCount(c.length)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime<VendaRecord>('vendas', () => loadData())
  useRealtime<OrcamentoRecord>('orcamentos', () => loadData())

  const faturamentoMinhasVendas = useMemo(() => {
    return vendas
      .filter((v) => v.status === 'ativa')
      .reduce((acc, curr) => acc + (curr.valor_total || 0), 0)
  }, [vendas])

  const orcamentosAbertos = useMemo(() => {
    return orcamentos.filter((o) => o.status === 'enviado' || o.status === 'rascunho').length
  }, [orcamentos])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Banner de Boas-vindas ao Vendedor */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-gradient-to-r from-white via-[#FAF7F3] to-[#F1ECE6] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
              <Sparkles className="h-4 w-4" />
              <span>Painel Comercial Individual</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-[#2B2B2B]">
              Olá, {user?.name ? user.name.split(' ')[0] : 'Vendedor'}!
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              Aqui está o resumo das suas vendas e orçamentos em andamento.
            </p>
          </div>

          <div className="flex gap-2.5">
            <Link to="/orcamentos">
              <Button
                variant="outline"
                className="border-[#E5E0DA] text-xs font-semibold gap-1.5 bg-white"
              >
                <Receipt className="h-4 w-4 text-[#A67C52]" />
                <span>Novo Orçamento</span>
              </Button>
            </Link>
            <Link to="/vendas">
              <Button className="bg-[#A67C52] hover:bg-[#8C643F] text-white text-xs font-semibold gap-1.5 shadow-xs">
                <BadgeDollarSign className="h-4 w-4" />
                <span>Nova Locação</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cards de Indicadores do Vendedor */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase">
              Minhas Vendas Ativas
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-[#4A7C59]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">
              {formatCurrency(faturamentoMinhasVendas)}
            </div>
            <p className="text-xs text-[#4A7C59] mt-1 font-medium">
              {vendas.filter((v) => v.status === 'ativa').length} contratos vigentes
            </p>
          </div>
        </div>

        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase">
              Meus Orçamentos Abertos
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-[#A67C52]">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">{orcamentosAbertos}</div>
            <p className="text-xs text-amber-700 mt-1 font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 lp-pulse-pending inline-block" />
              <span>Aguardando retorno do cliente</span>
            </p>
          </div>
        </div>

        <div className="lp-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase">
              Carteira Geral de Clientes
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-[#2B2B2B]">{clientesCount}</div>
            <p className="text-xs text-[#6B6B6B] mt-1">Disponíveis para contato e vendas</p>
          </div>
        </div>
      </div>

      {/* Grid: Minhas Últimas Vendas & Meus Últimos Orçamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minhas Locações Recentes */}
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1ECE6] pb-3">
            <div className="flex items-center gap-2">
              <BadgeDollarSign className="h-5 w-5 text-[#A67C52]" />
              <h3 className="font-bold text-base text-[#2B2B2B]">Minhas Locações Recentes</h3>
            </div>
            <Link to="/vendas" className="text-xs font-semibold text-[#A67C52] hover:underline">
              Ver todas
            </Link>
          </div>

          {vendas.length === 0 ? (
            <p className="text-xs text-[#6B6B6B] py-4">Você ainda não cadastrou vendas.</p>
          ) : (
            <div className="space-y-3">
              {vendas.slice(0, 4).map((v) => (
                <div
                  key={v.id}
                  className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#2B2B2B]">
                      {v.expand?.cliente?.nome || 'Cliente'}
                    </div>
                    <div className="text-[11px] text-[#6B6B6B]">
                      {v.expand?.produto?.nome}
                      {(v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha) && (
                        <span className="text-[#A67C52] font-medium ml-1">
                          · Linha{' '}
                          {v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha}
                        </span>
                      )}{' '}
                      ({v.quantidade} un.)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[#A67C52]">
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

        {/* Meus Orçamentos Recentes */}
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F1ECE6] pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#A67C52]" />
              <h3 className="font-bold text-base text-[#2B2B2B]">Meus Orçamentos Recentes</h3>
            </div>
            <Link to="/orcamentos" className="text-xs font-semibold text-[#A67C52] hover:underline">
              Ver todos
            </Link>
          </div>

          {orcamentos.length === 0 ? (
            <p className="text-xs text-[#6B6B6B] py-4">Você ainda não emitiu orçamentos.</p>
          ) : (
            <div className="space-y-3">
              {orcamentos.slice(0, 4).map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[#2B2B2B]">
                      {o.expand?.cliente?.nome || 'Cliente'}
                    </div>
                    <div className="text-[11px] text-[#6B6B6B]">
                      Validade: {new Date(o.validade).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-[#2B2B2B]">
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
    </div>
  )
}
