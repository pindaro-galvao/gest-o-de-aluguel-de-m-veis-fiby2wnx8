import React, { useState, useMemo } from 'react'
import type {
  LinhaRecord,
  ProdutoRecord,
  VendaRecord,
  OrcamentoRecord,
  OrcamentoItemRecord,
} from '@/types/database'
import {
  comparativoLinhasService,
  type ComparativoLinhasResultado,
  type MetricasLinha,
} from '@/services/comparativoLinhas'
import { formatDataISO } from '@/services/disponibilidade'
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
  Layers,
  TrendingUp,
  TrendingDown,
  Trophy,
  Filter,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  ArrowUpDown,
  Info,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react'

interface RelatorioComparativoLinhasProps {
  linhas: LinhaRecord[]
  produtos: ProdutoRecord[]
  vendas: VendaRecord[]
  orcamentos: OrcamentoRecord[]
  orcamentoItens: OrcamentoItemRecord[]
  loading?: boolean
}

type TipoOrdenacao =
  | 'faturamento_desc'
  | 'faturamento_asc'
  | 'participacao_desc'
  | 'contratos_desc'
  | 'diarias_desc'
  | 'ticket_desc'
  | 'potencial_desc'
  | 'nome_asc'

// Cores temáticas para cada linha (paleta LP Móveis TIDELLI: madeira, grafite, verde oliva, âmbar, bronze)
const PALETA_CORES = [
  '#A67C52', // Madeira clássica / bronze
  '#4A7C59', // Verde oliva natural
  '#3D4A54', // Grafite azulado
  '#C88746', // Âmbar queimado
  '#7A5C43', // Mogno escuro
  '#5C7882', // Ardósia
  '#9B4D36', // Terracota
  '#6B7A46', // Musgo
  '#8A5E78', // Malva
  '#8C8C8C', // Grafite médio
]

export function RelatorioComparativoLinhas({
  linhas,
  produtos,
  vendas,
  orcamentos,
  orcamentoItens,
  loading = false,
}: RelatorioComparativoLinhasProps) {
  // Inicialização com "Mês Atual"
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })

  const [dataFim, setDataFim] = useState<string>(() => {
    const d = new Date()
    const ultDia = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(ultDia.getDate()).padStart(2, '0')}`
  })

  const [presetAtivo, setPresetAtivo] = useState<
    'mes_atual' | 'mes_anterior' | 'proximo_mes' | 'prox_30' | 'ano_atual' | 'personalizado'
  >('mes_atual')

  const [ordenacao, setOrdenacao] = useState<TipoOrdenacao>('faturamento_desc')
  const [somenteComVendas, setSomenteComVendas] = useState(false)

  // Aplicador de presets de período
  const aplicarPreset = (
    preset: 'mes_atual' | 'mes_anterior' | 'proximo_mes' | 'prox_30' | 'ano_atual',
  ) => {
    setPresetAtivo(preset)
    const hoje = new Date()
    const ano = hoje.getFullYear()
    const mes = hoje.getMonth() // 0-indexed

    if (preset === 'mes_atual') {
      const ini = `${ano}-${String(mes + 1).padStart(2, '0')}-01`
      const ult = new Date(ano, mes + 1, 0).getDate()
      const fim = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ult).padStart(2, '0')}`
      setDataInicio(ini)
      setDataFim(fim)
    } else if (preset === 'mes_anterior') {
      const dataAnt = new Date(ano, mes - 1, 1)
      const antAno = dataAnt.getFullYear()
      const antMes = dataAnt.getMonth() + 1
      const ult = new Date(antAno, antMes, 0).getDate()
      const ini = `${antAno}-${String(antMes).padStart(2, '0')}-01`
      const fim = `${antAno}-${String(antMes).padStart(2, '0')}-${String(ult).padStart(2, '0')}`
      setDataInicio(ini)
      setDataFim(fim)
    } else if (preset === 'proximo_mes') {
      const proxDate = new Date(ano, mes + 1, 1)
      const pAno = proxDate.getFullYear()
      const pMes = proxDate.getMonth() + 1
      const ult = new Date(pAno, pMes, 0).getDate()
      const ini = `${pAno}-${String(pMes).padStart(2, '0')}-01`
      const fim = `${pAno}-${String(pMes).padStart(2, '0')}-${String(ult).padStart(2, '0')}`
      setDataInicio(ini)
      setDataFim(fim)
    } else if (preset === 'prox_30') {
      const ini = formatDataISO(hoje)
      const fimObj = new Date(hoje)
      fimObj.setDate(fimObj.getDate() + 29)
      const fim = formatDataISO(fimObj)
      setDataInicio(ini)
      setDataFim(fim)
    } else if (preset === 'ano_atual') {
      const ini = `${ano}-01-01`
      const fim = `${ano}-12-31`
      setDataInicio(ini)
      setDataFim(fim)
    }
  }

  // Executar o cálculo comparativo
  const resultado: ComparativoLinhasResultado = useMemo(() => {
    if (!dataInicio || !dataFim) {
      return {
        dataInicio: '',
        dataFim: '',
        diasPeriodo: 0,
        linhas: [],
        faturamentoGeral: 0,
        faturamentoAtivoGeral: 0,
        faturamentoEncerradoGeral: 0,
        totalContratos: 0,
        totalDiariasVendidas: 0,
        linhasComVendasCount: 0,
        faturamentoPotencialGeral: 0,
      }
    }

    return comparativoLinhasService.calcularComparativo({
      dataInicioStr: dataInicio,
      dataFimStr: dataFim,
      linhas,
      produtos,
      vendas,
      orcamentos,
      orcamentoItens,
    })
  }, [dataInicio, dataFim, linhas, produtos, vendas, orcamentos, orcamentoItens])

  // Formatação BRL
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatNumero = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val)
  }

  const formatDataBR = (isoStr: string) => {
    if (!isoStr) return '-'
    const [y, m, d] = isoStr.split('-')
    if (!y || !m || !d) return isoStr
    return `${d}/${m}/${y}`
  }

  // Lista com ordenação e filtro
  const linhasExibicao = useMemo(() => {
    let list = [...resultado.linhas]
    if (somenteComVendas) {
      list = list.filter((l) => l.faturamentoTotal > 0 || l.faturamentoPotencialOrcamentos > 0)
    }

    list.sort((a, b) => {
      switch (ordenacao) {
        case 'faturamento_desc':
          return b.faturamentoTotal - a.faturamentoTotal
        case 'faturamento_asc':
          return a.faturamentoTotal - b.faturamentoTotal
        case 'participacao_desc':
          return b.participacaoPercent - a.participacaoPercent
        case 'contratos_desc':
          return b.numeroContratos - a.numeroContratos
        case 'diarias_desc':
          return b.diariasVendidas - a.diariasVendidas
        case 'ticket_desc':
          return b.ticketMedioContrato - a.ticketMedioContrato
        case 'potencial_desc':
          return b.faturamentoPotencialOrcamentos - a.faturamentoPotencialOrcamentos
        case 'nome_asc':
          return a.linhaNome.localeCompare(b.linhaNome)
        default:
          return b.faturamentoTotal - a.faturamentoTotal
      }
    })

    return list
  }, [resultado.linhas, ordenacao, somenteComVendas])

  // Maior faturamento entre as linhas para calibrar escala gráfica
  const maiorFaturamentoLinha = useMemo(() => {
    return resultado.linhas.reduce((max, l) => Math.max(max, l.faturamentoTotal), 0)
  }, [resultado.linhas])

  // Exportação CSV do comparativo
  const exportarCSV = () => {
    const headers = [
      'Linha',
      'Status Linha',
      'Faturamento Realizado (R$)',
      'Participação (%)',
      'Contratos',
      'Diárias Vendidas',
      'Ticket Médio (R$)',
      'Faturamento Ativo (R$)',
      'Faturamento Encerrado (R$)',
      'Potencial Orçamentos Aprovados (R$)',
    ]

    const rows = linhasExibicao.map((l) => [
      `"${l.linhaNome}"`,
      l.linhaAtiva ? 'Ativa' : 'Inativa',
      l.faturamentoTotal.toFixed(2),
      l.participacaoPercent.toFixed(1),
      l.numeroContratos,
      l.diariasVendidas,
      l.ticketMedioContrato.toFixed(2),
      l.faturamentoAtivo.toFixed(2),
      l.faturamentoEncerrado.toFixed(2),
      l.faturamentoPotencialOrcamentos.toFixed(2),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `comparativo-faturamento-linhas-${dataInicio}-a-${dataFim}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="rounded-2xl border border-[#E5E0DA] bg-white p-6 shadow-sm space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F1ECE6] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FAF7F3] border border-[#E5E0DA] text-[#A67C52]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[#2B2B2B]">
                Comparativo de Faturamento entre Linhas
              </h3>
              <p className="text-xs text-[#6B6B6B]">
                Análise financeira por linha TIDELLI no período: realizado proporcional às diárias,
                faturamento ativo vs. encerrado e potencial de orçamentos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportarCSV}
            className="border-[#E5E0DA] text-xs font-semibold gap-1.5 bg-white text-[#2B2B2B] hover:bg-[#FAF7F3]"
            title="Exportar dados do comparativo em planilha CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#A67C52]" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* Caixa de Filtros e Presets de Período da Seção */}
      <div className="rounded-xl bg-[#FAF7F3] border border-[#E5E0DA] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-[#A67C52]" />
            Período de Comparação entre Linhas
          </span>

          {/* Presets Rápidos */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={presetAtivo === 'mes_atual' ? 'default' : 'outline'}
              onClick={() => aplicarPreset('mes_atual')}
              className={`h-7 px-2.5 text-[11px] font-semibold ${
                presetAtivo === 'mes_atual'
                  ? 'bg-[#A67C52] text-white'
                  : 'bg-white border-[#E5E0DA] text-[#2B2B2B] hover:bg-zinc-50'
              }`}
            >
              Mês Atual
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetAtivo === 'mes_anterior' ? 'default' : 'outline'}
              onClick={() => aplicarPreset('mes_anterior')}
              className={`h-7 px-2.5 text-[11px] font-semibold ${
                presetAtivo === 'mes_anterior'
                  ? 'bg-[#A67C52] text-white'
                  : 'bg-white border-[#E5E0DA] text-[#2B2B2B] hover:bg-zinc-50'
              }`}
            >
              Mês Anterior
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetAtivo === 'proximo_mes' ? 'default' : 'outline'}
              onClick={() => aplicarPreset('proximo_mes')}
              className={`h-7 px-2.5 text-[11px] font-semibold ${
                presetAtivo === 'proximo_mes'
                  ? 'bg-[#A67C52] text-white'
                  : 'bg-white border-[#E5E0DA] text-[#2B2B2B] hover:bg-zinc-50'
              }`}
            >
              Próximo Mês
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetAtivo === 'prox_30' ? 'default' : 'outline'}
              onClick={() => aplicarPreset('prox_30')}
              className={`h-7 px-2.5 text-[11px] font-semibold ${
                presetAtivo === 'prox_30'
                  ? 'bg-[#A67C52] text-white'
                  : 'bg-white border-[#E5E0DA] text-[#2B2B2B] hover:bg-zinc-50'
              }`}
            >
              Próximos 30 dias
            </Button>
            <Button
              type="button"
              size="sm"
              variant={presetAtivo === 'ano_atual' ? 'default' : 'outline'}
              onClick={() => aplicarPreset('ano_atual')}
              className={`h-7 px-2.5 text-[11px] font-semibold ${
                presetAtivo === 'ano_atual'
                  ? 'bg-[#A67C52] text-white'
                  : 'bg-white border-[#E5E0DA] text-[#2B2B2B] hover:bg-zinc-50'
              }`}
            >
              Ano Atual
            </Button>
          </div>
        </div>

        {/* Datas manuais e régua explicativa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#6B6B6B]">Data de Início</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value)
                setPresetAtivo('personalizado')
              }}
              className="bg-white border-[#E5E0DA] h-8 text-xs text-[#2B2B2B]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#6B6B6B]">Data de Término</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value)
                setPresetAtivo('personalizado')
              }}
              className="bg-white border-[#E5E0DA] h-8 text-xs text-[#2B2B2B]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[#6B6B6B]">Janela Avaliada</label>
            <div className="h-8 flex items-center justify-between px-3 rounded-md bg-white border border-[#E5E0DA] text-xs text-[#2B2B2B]">
              <span className="font-semibold">{resultado.diasPeriodo} dia(s)</span>
              <span className="text-[10px] text-[#6B6B6B]">
                {formatDataBR(resultado.dataInicio)} a {formatDataBR(resultado.dataFim)}
              </span>
            </div>
          </div>
        </div>

        {/* Nota explicativa sobre a regra de cálculo proporcional */}
        <div className="flex items-start gap-2 pt-1 text-[11px] text-[#8C8C8C]">
          <Info className="h-3.5 w-3.5 mt-0.5 text-[#A67C52] shrink-0" />
          <span>
            <strong>Regra de apropriação:</strong> Locações cujo período atravessa as bordas do
            intervalo têm seu faturamento apropriado proporcionalmente aos dias exatos de
            sobreposição com a janela filtrada. Orçamentos aprovados aparecem como faturamento
            potencial separado.
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#A67C52] border-t-transparent" />
        </div>
      ) : resultado.diasPeriodo <= 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E0DA] p-12 text-center text-xs text-[#6B6B6B]">
          Selecione um intervalo de datas válido para calcular o comparativo de faturamento entre
          linhas.
        </div>
      ) : (
        <>
          {/* Cards-resumo no topo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Linha Campeã */}
            <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Linha Campeã
                  </span>
                  <Trophy className="h-4 w-4 text-[#A67C52]" />
                </div>
                <div className="mt-2">
                  {resultado.linhaCampeã ? (
                    <div>
                      <div
                        className="font-extrabold text-lg text-[#2B2B2B] truncate"
                        title={resultado.linhaCampeã.linhaNome}
                      >
                        Linha {resultado.linhaCampeã.linhaNome}
                      </div>
                      <div className="text-xs font-bold text-[#A67C52] mt-0.5">
                        {formatCurrency(resultado.linhaCampeã.faturamentoTotal)}
                        <span className="text-[11px] font-normal text-[#6B6B6B] ml-1">
                          ({resultado.linhaCampeã.participacaoPercent}%)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-[#6B6B6B]">
                      Nenhuma venda no período
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-[#6B6B6B] mt-2 block">
                Maior volume financeiro realizado
              </span>
            </div>

            {/* Card 2: Faturamento Total do Período */}
            <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Faturamento do Período
                  </span>
                  <DollarSign className="h-4 w-4 text-[#4A7C59]" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#2B2B2B]">
                  {formatCurrency(resultado.faturamentoGeral)}
                </div>
              </div>
              <div className="text-[10px] text-[#6B6B6B] mt-2 flex items-center justify-between">
                <span>{resultado.totalContratos} contrato(s)</span>
                <span>{resultado.totalDiariasVendidas} diárias</span>
              </div>
            </div>

            {/* Card 3: Linhas com Vendas */}
            <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Linhas com Vendas
                  </span>
                  <Layers className="h-4 w-4 text-[#3D4A54]" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-[#2B2B2B]">
                  {resultado.linhasComVendasCount}{' '}
                  <span className="text-sm font-normal text-[#6B6B6B]">
                    / {resultado.linhas.length} linhas
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#E5E0DA] h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-[#3D4A54] transition-all duration-300"
                  style={{
                    width: `${
                      resultado.linhas.length > 0
                        ? Math.round(
                            (resultado.linhasComVendasCount / resultado.linhas.length) * 100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Card 4: Variação vs. Período Anterior */}
            <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                    Variação vs. Anterior
                  </span>
                  {resultado.periodoAnterior?.variacaoPercentual !== null &&
                  resultado.periodoAnterior?.variacaoPercentual !== undefined ? (
                    resultado.periodoAnterior.variacaoPercentual >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-[#4A7C59]" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )
                  ) : (
                    <Calendar className="h-4 w-4 text-[#6B6B6B]" />
                  )}
                </div>
                <div className="mt-2">
                  {resultado.periodoAnterior &&
                  resultado.periodoAnterior.variacaoPercentual !== null ? (
                    <div
                      className={`text-2xl font-extrabold flex items-baseline gap-1 ${
                        resultado.periodoAnterior.variacaoPercentual >= 0
                          ? 'text-[#4A7C59]'
                          : 'text-red-600'
                      }`}
                    >
                      <span>
                        {resultado.periodoAnterior.variacaoPercentual >= 0 ? '+' : ''}
                        {resultado.periodoAnterior.variacaoPercentual}%
                      </span>
                    </div>
                  ) : (
                    <div className="text-2xl font-extrabold text-[#6B6B6B]">—</div>
                  )}
                </div>
              </div>
              <div className="text-[10px] text-[#6B6B6B] mt-2 truncate">
                {resultado.periodoAnterior ? (
                  <span>
                    Ant.: {formatCurrency(resultado.periodoAnterior.faturamentoGeral)} (
                    {formatDataBR(resultado.periodoAnterior.dataInicio)} a{' '}
                    {formatDataBR(resultado.periodoAnterior.dataFim)})
                  </span>
                ) : (
                  <span>Mesma janela anterior</span>
                )}
              </div>
            </div>
          </div>

          {/* Gráfico Comparativo de Barras */}
          <div className="rounded-xl border border-[#E5E0DA] bg-white p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1ECE6] pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#2B2B2B]">
                  Distribuição Visual do Faturamento por Linha
                </h4>
                <p className="text-xs text-[#6B6B6B]">
                  Participação percentual e volume financeiro comparado no período selecionado.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSomenteComVendas(!somenteComVendas)}
                  className="h-7 text-xs text-[#A67C52] hover:bg-[#FAF7F3]"
                >
                  {somenteComVendas ? 'Mostrar todas as linhas' : 'Ocultar linhas zeradas'}
                </Button>
              </div>
            </div>

            {linhasExibicao.length === 0 ? (
              <p className="text-xs text-[#6B6B6B] py-6 text-center">
                Nenhuma linha com faturamento registrado neste período.
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                {linhasExibicao.map((linha, idx) => {
                  const cor = PALETA_CORES[idx % PALETA_CORES.length]
                  const larguraPercent =
                    maiorFaturamentoLinha > 0
                      ? Math.max(
                          3,
                          Math.round((linha.faturamentoTotal / maiorFaturamentoLinha) * 100),
                        )
                      : 0

                  return (
                    <div key={linha.linhaId} className="space-y-1 group">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cor }}
                          />
                          <span className="font-bold text-[#2B2B2B] truncate">
                            Linha {linha.linhaNome}
                          </span>
                          {!linha.linhaAtiva && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 bg-zinc-100 text-zinc-600 border-zinc-200"
                            >
                              Inativa
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <span className="text-[11px] text-[#6B6B6B]">
                            {linha.numeroContratos} contrato(s) · {linha.diariasVendidas} diárias
                          </span>
                          <span className="font-mono font-bold text-xs text-[#2B2B2B] min-w-[90px]">
                            {formatCurrency(linha.faturamentoTotal)}
                          </span>
                          <span
                            className="text-xs font-extrabold px-1.5 py-0.5 rounded text-white min-w-[48px] text-center"
                            style={{ backgroundColor: cor }}
                          >
                            {linha.participacaoPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso com breakdown de Ativo vs Encerrado */}
                      <div className="w-full bg-[#FAF7F3] border border-[#E5E0DA] h-3 rounded-full overflow-hidden flex">
                        {linha.faturamentoTotal > 0 ? (
                          <>
                            {/* Parcela Ativa */}
                            <div
                              className="h-full transition-all duration-500 relative group-hover:brightness-110"
                              style={{
                                width: `${
                                  maiorFaturamentoLinha > 0
                                    ? (
                                        (linha.faturamentoAtivo / maiorFaturamentoLinha) *
                                        100
                                      ).toFixed(2)
                                    : 0
                                }%`,
                                backgroundColor: cor,
                              }}
                              title={`Ativo: ${formatCurrency(linha.faturamentoAtivo)}`}
                            />
                            {/* Parcela Encerrada (tom mais escuro) */}
                            <div
                              className="h-full transition-all duration-500 opacity-60 relative group-hover:brightness-110"
                              style={{
                                width: `${
                                  maiorFaturamentoLinha > 0
                                    ? (
                                        (linha.faturamentoEncerrado / maiorFaturamentoLinha) *
                                        100
                                      ).toFixed(2)
                                    : 0
                                }%`,
                                backgroundColor: cor,
                              }}
                              title={`Encerrado: ${formatCurrency(linha.faturamentoEncerrado)}`}
                            />
                          </>
                        ) : (
                          <div className="h-full w-full bg-transparent" />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Legenda das barras */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-[#6B6B6B] pt-3 border-t border-[#F1ECE6]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#A67C52]" />
                      <span>Faturamento Contratos Ativos</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#A67C52] opacity-60" />
                      <span>Faturamento Contratos Encerrados</span>
                    </span>
                  </div>
                  <span>
                    Total acumulado do período:{' '}
                    <strong className="text-[#2B2B2B]">
                      {formatCurrency(resultado.faturamentoGeral)}
                    </strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabela Comparativa Detalhada e Ordenável */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[#2B2B2B]">
                  Tabela Detalhada por Linha ({linhasExibicao.length} linhas)
                </h4>
                <Badge className="bg-[#FAF7F3] text-[#2B2B2B] border border-[#E5E0DA] text-[10px]">
                  {resultado.diasPeriodo} dias
                </Badge>
              </div>

              {/* Seletor de ordenação */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B6B6B] flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" />
                  Ordenar por:
                </span>
                <Select
                  value={ordenacao}
                  onValueChange={(val) => setOrdenacao(val as TipoOrdenacao)}
                >
                  <SelectTrigger className="bg-white border-[#E5E0DA] h-8 text-xs w-52">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faturamento_desc">Maior Faturamento Realizado</SelectItem>
                    <SelectItem value="faturamento_asc">Menor Faturamento Realizado</SelectItem>
                    <SelectItem value="participacao_desc">Maior Participação %</SelectItem>
                    <SelectItem value="contratos_desc">Mais Contratos</SelectItem>
                    <SelectItem value="diarias_desc">Mais Diárias Vendidas</SelectItem>
                    <SelectItem value="ticket_desc">Maior Ticket Médio</SelectItem>
                    <SelectItem value="potencial_desc">Maior Potencial (Orçamentos)</SelectItem>
                    <SelectItem value="nome_asc">Nome da Linha (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {linhasExibicao.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5E0DA] p-8 text-center text-xs text-[#6B6B6B]">
                Nenhuma linha encontrada para exibição.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E5E0DA]">
                <table className="w-full text-left text-xs text-[#2B2B2B]">
                  <thead className="bg-[#FAF7F3] font-bold uppercase text-[#6B6B6B] border-b border-[#E5E0DA]">
                    <tr>
                      <th className="px-3 py-3">Linha TIDELLI</th>
                      <th className="px-3 py-3 text-right">Faturamento Realizado</th>
                      <th className="px-3 py-3 min-w-[130px]">Participação</th>
                      <th className="px-3 py-3 text-center">Contratos</th>
                      <th className="px-3 py-3 text-center">Diárias Vendidas</th>
                      <th className="px-3 py-3 text-right">Ticket Médio</th>
                      <th className="px-3 py-3 text-right">Ativo / Encerrado</th>
                      <th className="px-3 py-3 text-right">Potencial Aprovado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1ECE6]">
                    {linhasExibicao.map((linha, idx) => {
                      const cor = PALETA_CORES[idx % PALETA_CORES.length]
                      const isCampeã =
                        resultado.linhaCampeã && resultado.linhaCampeã.linhaId === linha.linhaId

                      return (
                        <tr
                          key={linha.linhaId}
                          className={`hover:bg-[#FAF7F3] transition-colors ${
                            isCampeã ? 'bg-[#FAF7F3]/60' : ''
                          }`}
                        >
                          {/* Linha TIDELLI */}
                          <td className="px-3 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: cor }}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[#2B2B2B]">
                                    Linha {linha.linhaNome}
                                  </span>
                                  {isCampeã && (
                                    <span title="Linha campeã de faturamento no período">
                                      <Trophy className="h-3 w-3 text-[#A67C52] inline-block" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#8C8C8C] block">
                                  {linha.produtosDistintosQtd > 0
                                    ? `${linha.produtosDistintosQtd} móvel(is) movimentados`
                                    : 'Sem movimentação no período'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Faturamento Realizado */}
                          <td className="px-3 py-3 text-right font-extrabold font-mono text-[#2B2B2B]">
                            {formatCurrency(linha.faturamentoTotal)}
                          </td>

                          {/* Participação % */}
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-[#2B2B2B]">
                                  {linha.participacaoPercent}%
                                </span>
                              </div>
                              <div className="w-full bg-[#E5E0DA] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, linha.participacaoPercent)}%`,
                                    backgroundColor: cor,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Contratos */}
                          <td className="px-3 py-3 text-center font-semibold text-[#2B2B2B]">
                            {linha.numeroContratos}
                          </td>

                          {/* Diárias Vendidas */}
                          <td className="px-3 py-3 text-center text-xs">
                            <span className="font-bold text-[#2B2B2B]">
                              {formatNumero(linha.diariasVendidas)}
                            </span>
                            <span className="text-[10px] text-[#8C8C8C] block">dias × un.</span>
                          </td>

                          {/* Ticket Médio */}
                          <td className="px-3 py-3 text-right font-mono text-[#6B6B6B]">
                            {linha.ticketMedioContrato > 0
                              ? formatCurrency(linha.ticketMedioContrato)
                              : '—'}
                          </td>

                          {/* Ativo vs Encerrado */}
                          <td className="px-3 py-3 text-right text-[11px]">
                            <div className="text-emerald-700 font-semibold">
                              {formatCurrency(linha.faturamentoAtivo)}
                            </div>
                            <div className="text-[#8C8C8C] text-[10px]">
                              {formatCurrency(linha.faturamentoEncerrado)}
                            </div>
                          </td>

                          {/* Potencial Orçamentos Aprovados */}
                          <td className="px-3 py-3 text-right">
                            {linha.faturamentoPotencialOrcamentos > 0 ? (
                              <div>
                                <span className="font-bold text-[#A67C52] font-mono">
                                  {formatCurrency(linha.faturamentoPotencialOrcamentos)}
                                </span>
                                <span className="text-[10px] text-[#8C8C8C] block">
                                  {linha.orcamentosAprovadosQtd} orçamento(s)
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#8C8C8C]">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Linha de Totais Consolidados */}
                  <tfoot className="bg-[#FAF7F3] border-t-2 border-[#E5E0DA] font-bold text-xs text-[#2B2B2B]">
                    <tr>
                      <td className="px-3 py-3">
                        Total Consolidado ({resultado.linhas.length} linhas)
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold font-mono text-sm">
                        {formatCurrency(resultado.faturamentoGeral)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-extrabold">100%</span>
                      </td>
                      <td className="px-3 py-3 text-center">{resultado.totalContratos}</td>
                      <td className="px-3 py-3 text-center">
                        {formatNumero(resultado.totalDiariasVendidas)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono">
                        {resultado.totalContratos > 0
                          ? formatCurrency(resultado.faturamentoGeral / resultado.totalContratos)
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px]">
                        <div className="text-emerald-700 font-semibold">
                          {formatCurrency(resultado.faturamentoAtivoGeral)}
                        </div>
                        <div className="text-[#8C8C8C] text-[10px]">
                          {formatCurrency(resultado.faturamentoEncerradoGeral)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#A67C52]">
                        {formatCurrency(resultado.faturamentoPotencialGeral)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
