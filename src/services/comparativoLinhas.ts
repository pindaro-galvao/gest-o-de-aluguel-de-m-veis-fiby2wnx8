import type {
  VendaRecord,
  OrcamentoRecord,
  OrcamentoItemRecord,
  LinhaRecord,
  ProdutoRecord,
} from '@/types/database'
import { formatDataISO, getDiasNoPeriodo } from '@/services/disponibilidade'

export interface MetricasLinha {
  linhaId: string // ID da linha ou 'SEM_LINHA'
  linhaNome: string
  linhaOrdem: number
  linhaAtiva: boolean
  // Faturamento realizado (apenas vendas ativas e encerradas, ignorando canceladas)
  faturamentoTotal: number
  faturamentoAtivo: number
  faturamentoEncerrado: number
  // Contratos e diárias
  numeroContratos: number // Quantidade de vendas distintas que tiveram dias no período
  diariasVendidas: number // Soma de (dias_no_periodo × quantidade)
  ticketMedioContrato: number // faturamentoTotal / numeroContratos (ou 0 se 0 contratos)
  // Participação
  participacaoPercent: number // (faturamentoTotal / faturamentoGeralPeriodo) * 100
  // Potencial de orçamentos aprovados
  faturamentoPotencialOrcamentos: number
  orcamentosAprovadosQtd: number
  // Itens em vendas/orçamentos
  produtosDistintosQtd: number
}

export interface ComparativoLinhasResultado {
  dataInicio: string
  dataFim: string
  diasPeriodo: number
  linhas: MetricasLinha[]
  // Resumos do período atual
  faturamentoGeral: number
  faturamentoAtivoGeral: number
  faturamentoEncerradoGeral: number
  totalContratos: number
  totalDiariasVendidas: number
  linhasComVendasCount: number
  linhaCampeã?: MetricasLinha
  faturamentoPotencialGeral: number
  // Comparação com período anterior de mesma duração
  periodoAnterior?: {
    dataInicio: string
    dataFim: string
    faturamentoGeral: number
    variacaoPercentual: number | null // null se faturamento anterior era 0 e atual é 0 ou se não aplicável
  }
}

/**
 * Normaliza string YYYY-MM-DD
 */
export function normalizarData(d: string | Date | undefined | null): string {
  if (!d) return ''
  return formatDataISO(d)
}

/**
 * Calcula o número de dias de sobreposição entre dois intervalos [ini1, fim1] e [ini2, fim2] inclusivos.
 */
export function calcularDiasSobreposicao(
  ini1: string,
  fim1: string,
  ini2: string,
  fim2: string,
): number {
  if (!ini1 || !fim1 || !ini2 || !fim2) return 0
  const maxIni = ini1 > ini2 ? ini1 : ini2
  const minFim = fim1 < fim2 ? fim1 : fim2
  if (maxIni > minFim) return 0
  return getDiasNoPeriodo(maxIni, minFim).length
}

/**
 * Calcula o período anterior imediatamente precedente, com o mesmo número exato de dias.
 */
export function obterPeriodoAnterior(
  dataInicioStr: string,
  dataFimStr: string,
): { dataInicio: string; dataFim: string } {
  const dInicio = new Date(
    dataInicioStr.includes('T') ? dataInicioStr : `${dataInicioStr}T00:00:00`,
  )
  const dFim = new Date(dataFimStr.includes('T') ? dataFimStr : `${dataFimStr}T00:00:00`)
  const duracaoMs = dFim.getTime() - dInicio.getTime() + 24 * 60 * 60 * 1000

  const anteriorFim = new Date(dInicio.getTime() - 24 * 60 * 60 * 1000)
  const anteriorInicio = new Date(anteriorFim.getTime() - duracaoMs + 24 * 60 * 60 * 1000)

  return {
    dataInicio: formatDataISO(anteriorInicio),
    dataFim: formatDataISO(anteriorFim),
  }
}

/**
 * Processa o faturamento das linhas para uma janela de datas especificada.
 */
function processarJanela(
  dataInicioStr: string,
  dataFimStr: string,
  todasLinhas: LinhaRecord[],
  produtos: ProdutoRecord[],
  vendas: VendaRecord[],
  orcamentos: OrcamentoRecord[],
  orcamentoItens: OrcamentoItemRecord[],
): {
  metricasLinhas: MetricasLinha[]
  faturamentoGeral: number
  faturamentoAtivoGeral: number
  faturamentoEncerradoGeral: number
  totalContratos: number
  totalDiarias: number
  faturamentoPotencialGeral: number
} {
  const inicio = normalizarData(dataInicioStr)
  const fim = normalizarData(dataFimStr)
  const diasFiltro = getDiasNoPeriodo(inicio, fim).length

  if (diasFiltro === 0) {
    return {
      metricasLinhas: [],
      faturamentoGeral: 0,
      faturamentoAtivoGeral: 0,
      faturamentoEncerradoGeral: 0,
      totalContratos: 0,
      totalDiarias: 0,
      faturamentoPotencialGeral: 0,
    }
  }

  // Mapa de produtos por ID para acesso rápido
  const produtoMap = new Map<string, ProdutoRecord>()
  for (const p of produtos) {
    produtoMap.set(p.id, p)
  }

  // Mapa de linha por ID e por nome
  const linhaMap = new Map<string, LinhaRecord>()
  for (const l of todasLinhas) {
    linhaMap.set(l.id, l)
  }

  // Estrutura acumuladora interna por chave de linha (id ou 'SEM_LINHA')
  interface Acumulador {
    linhaId: string
    linhaNome: string
    linhaOrdem: number
    linhaAtiva: boolean
    faturamentoTotal: number
    faturamentoAtivo: number
    faturamentoEncerrado: number
    contratosIds: Set<string>
    diariasVendidas: number
    produtosIds: Set<string>
    faturamentoPotencialOrcamentos: number
    orcamentosAprovadosIds: Set<string>
  }

  const acumuladores = new Map<string, Acumulador>()

  // Inicializa com todas as linhas existentes para garantir que linhas com 0 vendas apareçam
  for (const l of todasLinhas) {
    acumuladores.set(l.id, {
      linhaId: l.id,
      linhaNome: l.nome,
      linhaOrdem: l.ordem ?? 999,
      linhaAtiva: l.ativo ?? true,
      faturamentoTotal: 0,
      faturamentoAtivo: 0,
      faturamentoEncerrado: 0,
      contratosIds: new Set(),
      diariasVendidas: 0,
      produtosIds: new Set(),
      faturamentoPotencialOrcamentos: 0,
      orcamentosAprovadosIds: new Set(),
    })
  }

  // Inicializa bucket para produtos sem linha
  const CHAVE_SEM_LINHA = 'SEM_LINHA'
  acumuladores.set(CHAVE_SEM_LINHA, {
    linhaId: CHAVE_SEM_LINHA,
    linhaNome: 'Sem linha definida',
    linhaOrdem: 9999,
    linhaAtiva: true,
    faturamentoTotal: 0,
    faturamentoAtivo: 0,
    faturamentoEncerrado: 0,
    contratosIds: new Set(),
    diariasVendidas: 0,
    produtosIds: new Set(),
    faturamentoPotencialOrcamentos: 0,
    orcamentosAprovadosIds: new Set(),
  })

  // 1. Processar Vendas (apenas ativas e encerradas, ignorar canceladas)
  for (const v of vendas) {
    if (v.status === 'cancelada') continue
    if (!v.data_inicio || !v.data_fim) continue

    const vIni = normalizarData(v.data_inicio)
    const vFim = normalizarData(v.data_fim)

    const diasSobrepostos = calcularDiasSobreposicao(vIni, vFim, inicio, fim)
    if (diasSobrepostos <= 0) continue

    const duracaoTotalContrato = Math.max(1, getDiasNoPeriodo(vIni, vFim).length)
    const proporcao = Math.min(1, Math.max(0, diasSobrepostos / duracaoTotalContrato))
    const valorNoPeriodo = Number(((v.valor_total || 0) * proporcao).toFixed(2))

    // Identificar a linha do produto
    const prod = v.expand?.produto || (v.produto ? produtoMap.get(v.produto) : undefined)
    const linhaId = prod?.linha || prod?.expand?.linha?.id

    let bucketKey = CHAVE_SEM_LINHA
    if (linhaId && acumuladores.has(linhaId)) {
      bucketKey = linhaId
    } else if (prod?.expand?.linha?.nome) {
      // Tentar encontrar pelo nome
      const porNome = todasLinhas.find(
        (l) => l.nome.toLowerCase() === prod.expand?.linha?.nome.toLowerCase(),
      )
      if (porNome) bucketKey = porNome.id
    }

    const bucket = acumuladores.get(bucketKey)!
    bucket.faturamentoTotal += valorNoPeriodo
    if (v.status === 'ativa') {
      bucket.faturamentoAtivo += valorNoPeriodo
    } else {
      bucket.faturamentoEncerrado += valorNoPeriodo
    }

    bucket.contratosIds.add(v.id)
    const qtd = v.quantidade || 1
    bucket.diariasVendidas += diasSobrepostos * qtd
    if (v.produto) bucket.produtosIds.add(v.produto)
  }

  // 2. Processar Orçamentos APROVADOS (faturamento potencial por linha)
  // Mapear orçamentos por ID
  const orcamentoMap = new Map<string, OrcamentoRecord>()
  for (const o of orcamentos) {
    orcamentoMap.set(o.id, o)
  }

  // Agrupar itens de orçamento aprovado
  for (const item of orcamentoItens) {
    const orc =
      item.expand?.orcamento || (item.orcamento ? orcamentoMap.get(item.orcamento) : undefined)
    if (!orc || orc.status !== 'aprovado') continue

    // Datas do orçamento (se não tiver data de período, usar validade ou data_aprovacao para checar se cai no período)
    const oIni = orc.data_inicio ? normalizarData(orc.data_inicio) : ''
    const oFim = orc.data_fim ? normalizarData(orc.data_fim) : ''

    let diasSobrepostos = 0
    let duracaoTotal = 1

    if (oIni && oFim) {
      diasSobrepostos = calcularDiasSobreposicao(oIni, oFim, inicio, fim)
      duracaoTotal = Math.max(1, getDiasNoPeriodo(oIni, oFim).length)
    } else {
      // Fallback: se o orçamento aprovado não tem datas de início/fim, checar se a data de aprovação (ou created) cai dentro do filtro
      const dataRef = normalizarData(orc.data_aprovacao || orc.created)
      if (dataRef >= inicio && dataRef <= fim) {
        diasSobrepostos = 1
        duracaoTotal = 1
      }
    }

    if (diasSobrepostos <= 0) continue

    const prod = item.expand?.produto || (item.produto ? produtoMap.get(item.produto) : undefined)
    const linhaId = prod?.linha || prod?.expand?.linha?.id

    let bucketKey = CHAVE_SEM_LINHA
    if (linhaId && acumuladores.has(linhaId)) {
      bucketKey = linhaId
    } else if (prod?.expand?.linha?.nome) {
      const porNome = todasLinhas.find(
        (l) => l.nome.toLowerCase() === prod.expand?.linha?.nome.toLowerCase(),
      )
      if (porNome) bucketKey = porNome.id
    }

    const bucket = acumuladores.get(bucketKey)!

    // Estimar valor do item no período
    const valorDiario = prod?.valor_locacao_diaria || prod?.valor_locacao_mensal || 0
    const qtdItem = item.quantidade || 1
    const valorPotencialItem =
      valorDiario > 0
        ? valorDiario * diasSobrepostos * qtdItem
        : (orc.valor_total || 0) * (diasSobrepostos / duracaoTotal)

    bucket.faturamentoPotencialOrcamentos += Number(valorPotencialItem.toFixed(2))
    bucket.orcamentosAprovadosIds.add(orc.id)
  }

  // 3. Consolidar métricas gerais
  let faturamentoGeral = 0
  let faturamentoAtivoGeral = 0
  let faturamentoEncerradoGeral = 0
  let totalDiarias = 0
  const todosContratosSet = new Set<string>()
  let faturamentoPotencialGeral = 0

  for (const b of acumuladores.values()) {
    faturamentoGeral += b.faturamentoTotal
    faturamentoAtivoGeral += b.faturamentoAtivo
    faturamentoEncerradoGeral += b.faturamentoEncerrado
    totalDiarias += b.diariasVendidas
    faturamentoPotencialGeral += b.faturamentoPotencialOrcamentos
    b.contratosIds.forEach((id) => todosContratosSet.add(id))
  }

  faturamentoGeral = Number(faturamentoGeral.toFixed(2))
  faturamentoAtivoGeral = Number(faturamentoAtivoGeral.toFixed(2))
  faturamentoEncerradoGeral = Number(faturamentoEncerradoGeral.toFixed(2))
  faturamentoPotencialGeral = Number(faturamentoPotencialGeral.toFixed(2))

  // Converter acumuladores para lista de MetricasLinha
  const listaLinhas: MetricasLinha[] = []
  for (const b of acumuladores.values()) {
    // Se for "Sem linha definida" e não tiver vendas nem orçamentos nem produtos, podemos omitir
    if (
      b.linhaId === CHAVE_SEM_LINHA &&
      b.faturamentoTotal === 0 &&
      b.faturamentoPotencialOrcamentos === 0 &&
      b.contratosIds.size === 0
    ) {
      continue
    }

    const numContratos = b.contratosIds.size
    const ticketMedio =
      numContratos > 0 ? Number((b.faturamentoTotal / numContratos).toFixed(2)) : 0
    const participacao =
      faturamentoGeral > 0 ? Number(((b.faturamentoTotal / faturamentoGeral) * 100).toFixed(1)) : 0

    listaLinhas.push({
      linhaId: b.linhaId,
      linhaNome: b.linhaNome,
      linhaOrdem: b.linhaOrdem,
      linhaAtiva: b.linhaAtiva,
      faturamentoTotal: Number(b.faturamentoTotal.toFixed(2)),
      faturamentoAtivo: Number(b.faturamentoAtivo.toFixed(2)),
      faturamentoEncerrado: Number(b.faturamentoEncerrado.toFixed(2)),
      numeroContratos: numContratos,
      diariasVendidas: b.diariasVendidas,
      ticketMedioContrato: ticketMedio,
      participacaoPercent: participacao,
      faturamentoPotencialOrcamentos: Number(b.faturamentoPotencialOrcamentos.toFixed(2)),
      orcamentosAprovadosQtd: b.orcamentosAprovadosIds.size,
      produtosDistintosQtd: b.produtosIds.size,
    })
  }

  // Ordenação padrão: maior faturamento realizado primeiro, depois por ordem configurada
  listaLinhas.sort((a, b) => {
    if (b.faturamentoTotal !== a.faturamentoTotal) {
      return b.faturamentoTotal - a.faturamentoTotal
    }
    return a.linhaOrdem - b.linhaOrdem
  })

  return {
    metricasLinhas: listaLinhas,
    faturamentoGeral,
    faturamentoAtivoGeral,
    faturamentoEncerradoGeral,
    totalContratos: todosContratosSet.size,
    totalDiarias,
    faturamentoPotencialGeral,
  }
}

export const comparativoLinhasService = {
  /**
   * Executa a análise completa de faturamento entre linhas para um período dado,
   * incluindo janela anterior equivalente para cálculo de variação.
   */
  calcularComparativo(params: {
    dataInicioStr: string
    dataFimStr: string
    linhas: LinhaRecord[]
    produtos: ProdutoRecord[]
    vendas: VendaRecord[]
    orcamentos: OrcamentoRecord[]
    orcamentoItens: OrcamentoItemRecord[]
  }): ComparativoLinhasResultado {
    const { dataInicioStr, dataFimStr, linhas, produtos, vendas, orcamentos, orcamentoItens } =
      params

    const inicio = normalizarData(dataInicioStr)
    const fim = normalizarData(dataFimStr)
    const dias = getDiasNoPeriodo(inicio, fim).length

    // 1. Processar janela atual
    const atual = processarJanela(inicio, fim, linhas, produtos, vendas, orcamentos, orcamentoItens)

    // Identificar linha campeã de faturamento no período (se houver faturamento > 0)
    const campeã =
      atual.metricasLinhas.length > 0 && atual.metricasLinhas[0].faturamentoTotal > 0
        ? atual.metricasLinhas[0]
        : undefined

    const linhasComVendasCount = atual.metricasLinhas.filter((l) => l.faturamentoTotal > 0).length

    // 2. Processar janela anterior
    let periodoAnteriorInfo: ComparativoLinhasResultado['periodoAnterior'] = undefined
    if (dias > 0) {
      const ant = obterPeriodoAnterior(inicio, fim)
      const resultadoAnterior = processarJanela(
        ant.dataInicio,
        ant.dataFim,
        linhas,
        produtos,
        vendas,
        orcamentos,
        orcamentoItens,
      )

      let variacaoPercentual: number | null = null
      if (resultadoAnterior.faturamentoGeral > 0) {
        variacaoPercentual = Number(
          (
            ((atual.faturamentoGeral - resultadoAnterior.faturamentoGeral) /
              resultadoAnterior.faturamentoGeral) *
            100
          ).toFixed(1),
        )
      } else if (atual.faturamentoGeral > 0) {
        variacaoPercentual = 100
      } else {
        variacaoPercentual = 0
      }

      periodoAnteriorInfo = {
        dataInicio: ant.dataInicio,
        dataFim: ant.dataFim,
        faturamentoGeral: resultadoAnterior.faturamentoGeral,
        variacaoPercentual,
      }
    }

    return {
      dataInicio: inicio,
      dataFim: fim,
      diasPeriodo: dias,
      linhas: atual.metricasLinhas,
      faturamentoGeral: atual.faturamentoGeral,
      faturamentoAtivoGeral: atual.faturamentoAtivoGeral,
      faturamentoEncerradoGeral: atual.faturamentoEncerradoGeral,
      totalContratos: atual.totalContratos,
      totalDiariasVendidas: atual.totalDiarias,
      linhasComVendasCount,
      linhaCampeã: campeã,
      faturamentoPotencialGeral: atual.faturamentoPotencialGeral,
      periodoAnterior: periodoAnteriorInfo,
    }
  },
}
