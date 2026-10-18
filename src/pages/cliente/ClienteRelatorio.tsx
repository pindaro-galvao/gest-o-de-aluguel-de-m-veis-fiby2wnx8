import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { vendasService } from '@/services/vendas'
import { clientesService } from '@/services/clientes'
import { calcularDiasPeriodo } from '@/services/disponibilidade'
import type { VendaRecord, ClienteRecord } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Calendar,
  CreditCard,
  Armchair,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  Printer,
} from 'lucide-react'
import { ContratoModal } from '@/components/ContratoModal'

export default function ClienteRelatorio() {
  const { user } = useAuth()
  const [vendas, setVendas] = useState<VendaRecord[]>([])
  const [cliente, setCliente] = useState<ClienteRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Modal Visualizar / Imprimir Contrato
  const [selectedVendaContrato, setSelectedVendaContrato] = useState<VendaRecord | null>(null)
  const [isContratoOpen, setIsContratoOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.id) return
        // Carrega vendas do próprio cliente (garantido pelas regras de RLS do PocketBase)
        const [vList, c] = await Promise.all([
          vendasService.getAll(),
          clientesService.getByUsuarioId(user.id).catch(() => null),
        ])
        setVendas(vList)
        setCliente(c)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const totalDiario = useMemo(() => {
    return vendas
      .filter((v) => v.status === 'ativa')
      .reduce((acc, curr) => {
        const valorUnit =
          curr.expand?.produto?.valor_locacao_diaria ??
          curr.expand?.produto?.valor_locacao_mensal ??
          0
        return acc + valorUnit * curr.quantidade
      }, 0)
  }, [vendas])

  const totalContratos = useMemo(() => {
    return vendas.reduce((acc, curr) => acc + curr.valor_total, 0)
  }, [vendas])
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo / Boas-vindas ao Cliente */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-gradient-to-r from-white via-[#FAF7F3] to-[#F1ECE6] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
              <ShieldCheck className="h-4 w-4" />
              <span>Espaço Exclusivo do Cliente</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-[#2B2B2B]">
              Relatório de Contratos & Locações
            </h2>
            <p className="text-sm text-[#6B6B6B] mt-0.5">
              Acompanhe seus móveis TIDELLI alugados, prazos de vigência e valores contratados por
              período.
            </p>
          </div>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-[#E5E0DA] gap-1.5 text-xs font-semibold bg-white"
          >
            <Download className="h-4 w-4 text-[#A67C52]" />
            <span>Imprimir Relatório</span>
          </Button>
        </div>
      </div>

      {/* Resumo de Indicadores do Cliente */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">
            Locações Ativas em Seu Espaço
          </span>
          <div className="mt-3 text-2xl font-extrabold text-[#4A7C59]">
            {vendas.filter((v) => v.status === 'ativa').length} contrato(s)
          </div>
          <span className="text-xs text-[#4A7C59] mt-1 block font-medium">
            Móveis em uso no endereço cadastrado
          </span>
        </div>

        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">
            Diária Total Vigente
          </span>
          <div className="mt-3 text-2xl font-extrabold text-[#A67C52]">
            {formatCurrency(totalDiario)}
            <span className="text-xs font-normal text-[#6B6B6B]">/dia</span>
          </div>
          <span className="text-xs text-[#6B6B6B] mt-1 block">
            Soma das diárias de móveis contratados
          </span>
        </div>

        <div className="lp-card rounded-xl p-5">
          <span className="text-xs font-semibold text-[#6B6B6B] uppercase">
            Total Global de Locações
          </span>
          <div className="mt-3 text-2xl font-extrabold text-[#2B2B2B]">
            {formatCurrency(totalContratos)}
          </div>
          <span className="text-xs text-[#6B6B6B] mt-1 block">
            {vendas.length} contrato(s) no histórico
          </span>
        </div>
      </div>

      {/* Lista detalhada dos Móveis e Contratos do Cliente */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1ECE6] pb-3">
          <div className="flex items-center gap-2">
            <Armchair className="h-5 w-5 text-[#A67C52]" />
            <h3 className="font-bold text-base text-[#2B2B2B]">Meus Móveis Alugados</h3>
          </div>
          <Badge className="bg-[#FAF7F3] text-[#2B2B2B] border border-[#E5E0DA]">
            {vendas.length} itens
          </Badge>
        </div>

        {vendas.length === 0 ? (
          <div className="py-12 text-center text-[#6B6B6B]">
            <p className="text-sm font-medium">
              Você ainda não possui contratos de locação ativos.
            </p>
            <p className="text-xs mt-1">
              Consulte a aba de Orçamentos para aprovar sua primeira proposta.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vendas.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-white hover:shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {v.expand?.produto?.codigo && (
                      <span className="font-mono text-xs font-bold text-[#A67C52] bg-white px-2 py-0.5 rounded border border-[#E5E0DA] shadow-2xs">
                        {v.expand.produto.codigo}
                      </span>
                    )}
                    <h4 className="font-bold text-base text-[#2B2B2B]">
                      {v.expand?.produto?.nome || 'Móvel TIDELLI'}
                      {(v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha) && (
                        <span className="font-semibold text-[#A67C52] ml-1">
                          · Linha{' '}
                          {v.expand?.produto?.expand?.linha?.nome || v.expand?.produto?.linha}
                        </span>
                      )}{' '}
                    </h4>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        v.status === 'ativa'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                      }`}
                    >
                      {v.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#6B6B6B]">
                    Quantidade: <strong>{v.quantidade} unidade(s)</strong> • Categoria:{' '}
                    <strong className="uppercase">
                      {v.expand?.produto?.expand?.tipo?.nome || v.expand?.produto?.tipo || 'MÓVEL'}
                    </strong>
                  </p>
                  {v.expand?.produto?.dimensoes && (
                    <p className="text-xs text-[#6B6B6B]">
                      Dimensões: {v.expand?.produto?.dimensoes}
                    </p>
                  )}
                  {(() => {
                    const prod = v.expand?.produto
                    if (!prod || !prod.expand) return null
                    const atrKeys = [
                      'atr01',
                      'atr02',
                      'atr03',
                      'atr04',
                      'atr05',
                      'atr06',
                      'atr07',
                      'atr08',
                      'atr09',
                    ] as const
                    const chips: string[] = []
                    for (const k of atrKeys) {
                      const atrObj = prod.expand[k]
                      if (atrObj && (atrObj.descricao_atr || atrObj.codigo_atr)) {
                        chips.push(atrObj.descricao_atr || atrObj.codigo_atr)
                      }
                    }
                    if (chips.length === 0) return null
                    return (
                      <div className="pt-1 flex flex-wrap gap-1 items-center">
                        {chips.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-[#FAF7F3] text-[#6B6B6B] border border-[#E5E0DA] px-2 py-0.5 rounded-md"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                  {v.observacoes && (
                    <p className="text-xs text-[#6B6B6B] italic mt-1 bg-white/70 p-1.5 rounded border border-[#E5E0DA]">
                      {v.observacoes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-6 border-t md:border-t-0 md:border-l border-[#E5E0DA] pt-3 md:pt-0 md:pl-6 text-xs">
                  <div>
                    <span className="text-[#6B6B6B] block">Período de Locação:</span>
                    <span className="font-semibold text-[#2B2B2B]">
                      {new Date(v.data_inicio).toLocaleDateString('pt-BR')} a{' '}
                      {new Date(v.data_fim).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-[#A67C52] font-semibold block">
                      {calcularDiasPeriodo(v.data_inicio, v.data_fim)} diárias
                    </span>
                  </div>

                  <div>
                    <span className="text-[#6B6B6B] block">Diária Unitária:</span>
                    <span className="font-semibold text-[#2B2B2B]">
                      {formatCurrency(
                        v.expand?.produto?.valor_locacao_diaria ??
                          v.expand?.produto?.valor_locacao_mensal ??
                          0,
                      )}
                      /dia
                    </span>
                  </div>

                  <div className="text-right min-w-[120px]">
                    <span className="text-[#6B6B6B] block">Valor Total:</span>
                    <span className="text-base font-extrabold text-[#A67C52]">
                      {formatCurrency(v.valor_total)}
                    </span>
                  </div>

                  {/* Botão Gerar Contrato */}
                  {(v.status === 'ativa' || v.status === 'encerrada') && (
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVendaContrato(v)
                          setIsContratoOpen(true)
                        }}
                        className="h-8 gap-1 text-xs border-[#A67C52] text-[#A67C52] hover:bg-[#A67C52] hover:text-white font-semibold transition-colors shadow-2xs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Gerar Contrato</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Contrato Imprimível */}
      <ContratoModal
        venda={selectedVendaContrato}
        open={isContratoOpen}
        onOpenChange={setIsContratoOpen}
      />

      {/* Informações de Suporte e Manutenção */}
      <div className="rounded-xl border border-[#E5E0DA] bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-sm text-[#2B2B2B]">Precisa renovar ou trocar de móvel?</h4>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Entre em contato com nossa equipe comercial para solicitar extensões ou substituições de
            acervo.
          </p>
        </div>
        <div className="text-xs font-semibold text-[#A67C52] bg-[#FAF7F3] px-3 py-2 rounded-lg border border-[#E5E0DA]">
          Atendimento TIDELLI: contato@lpmoveis.com.br
        </div>
      </div>
    </div>
  )
}
