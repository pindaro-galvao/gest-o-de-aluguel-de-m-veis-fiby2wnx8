import pb from '@/lib/pocketbase/client'
import type {
  ProdutoRecord,
  VendaRecord,
  OrcamentoRecord,
  OrcamentoItemRecord,
} from '@/types/database'

export interface ReservaItemInfo {
  id: string
  origem: 'venda' | 'orcamento'
  quantidade: number
  dataInicio: string
  dataFim: string
  status: string
  clienteNome: string
  vendedorNome?: string
  observacoes?: string
}

export interface DiaOcupacaoInfo {
  data: string // 'YYYY-MM-DD'
  diaNumero: number
  diaSemana: number // 0=Dom, 6=Sab
  comprometido: number
  livre: number
  esgotado: boolean
  parcial: boolean
  totalmenteLivre: boolean
  reservas: ReservaItemInfo[]
}

export interface MapaOcupacaoMensalResultado {
  produto: ProdutoRecord
  ano: number
  mes: number // 1 a 12
  mesNome: string
  quantidadeEstoque: number
  diasNoMes: number
  dias: DiaOcupacaoInfo[]
  maxComprometido: number
  minLivre: number
  mediaComprometimento: number
  taxaOcupacaoMediaMes: number
}

export interface ProdutoTaxaOcupacao {
  produto: ProdutoRecord
  diasPeriodo: number
  quantidadeEstoque: number
  unidadesDiaDisponiveis: number // estoque * diasPeriodo
  unidadesDiaComprometidas: number // soma diária de ocupação no período
  taxaOcupacaoPercent: number // (unidadesDiaComprometidas / unidadesDiaDisponiveis) * 100
  valorLocacaoDiaria: number
  valorEstimadoComprometido: number // soma dia a dia (unidades comprometidas * valor_locacao_diaria)
}

export interface RelatorioTaxaOcupacaoResultado {
  dataInicio: string
  dataFim: string
  diasPeriodo: number
  produtos: ProdutoTaxaOcupacao[]
  totalUnidadesDiaDisponiveis: number
  totalUnidadesDiaComprometidas: number
  taxaMediaGeral: number
  valorTotalEstimadoComprometido: number
  produtoMaisOcupado?: ProdutoTaxaOcupacao
}

export interface DisponibilidadeResultado {
  produtoId: string
  quantidadeEstoque: number
  maxComprometidoNoPeriodo: number
  disponivelMinimo: number
  temDisponibilidade: boolean
  diasConsultados: number
  mensagem: string
  detalhePorDia?: Array<{
    data: string
    comprometido: number
    disponivel: number
  }>
}

/**
 * Normaliza uma data para 'YYYY-MM-DD' sem interferência de fuso horário.
 */
export function formatDataISO(date: Date | string): string {
  if (typeof date === 'string') {
    if (date.includes('T')) {
      date = date.split('T')[0]
    } else if (date.includes(' ')) {
      date = date.split(' ')[0]
    }
    return date
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Retorna todos os dias ('YYYY-MM-DD') inclusivos entre dataInicio e dataFim.
 */
export function getDiasNoPeriodo(inicioStr: string, fimStr: string): string[] {
  const dInicio = new Date(inicioStr.includes('T') ? inicioStr : `${inicioStr}T00:00:00`)
  const dFim = new Date(fimStr.includes('T') ? fimStr : `${fimStr}T00:00:00`)

  if (isNaN(dInicio.getTime()) || isNaN(dFim.getTime()) || dFim < dInicio) {
    return []
  }

  const dias: string[] = []
  const atual = new Date(dInicio)
  while (atual <= dFim) {
    dias.push(formatDataISO(atual))
    atual.setDate(atual.getDate() + 1)
  }
  return dias
}

/**
 * Calcula o número exato de dias no período (mínimo 1 se fim >= inicio).
 */
export function calcularDiasPeriodo(inicioStr: string, fimStr: string): number {
  if (!inicioStr || !fimStr) return 0
  const dias = getDiasNoPeriodo(inicioStr, fimStr)
  return dias.length
}

export const disponibilidadeService = {
  /**
   * Consulta a disponibilidade de um produto específico em um intervalo de datas.
   * Considera:
   * 1. Vendas ATIVAS cujo período [data_inicio, data_fim] se sobrepõe ao período consultado.
   * 2. Orçamentos APROVADOS que possuam o produto em orcamento_itens e período sobreposto.
   * Pode opcionalmente ignorar o ID de uma venda que está sendo editada (vendaIgnoradaId).
   */
  async verificarDisponibilidadeProduto(
    produto: ProdutoRecord | string,
    dataInicioStr: string,
    dataFimStr: string,
    quantidadeSolicitada: number = 1,
    vendaIgnoradaId?: string,
  ): Promise<DisponibilidadeResultado> {
    const produtoId = typeof produto === 'string' ? produto : produto.id
    let estoque = typeof produto === 'object' ? produto.quantidade_estoque : 0

    if (typeof produto === 'string') {
      try {
        const pRec = await pb.collection('produtos').getOne<ProdutoRecord>(produtoId)
        estoque = pRec.quantidade_estoque || 0
      } catch (e) {
        console.error('Erro ao buscar produto para verificar disponibilidade:', e)
      }
    }

    const dias = getDiasNoPeriodo(dataInicioStr, dataFimStr)
    if (dias.length === 0) {
      return {
        produtoId,
        quantidadeEstoque: estoque,
        maxComprometidoNoPeriodo: 0,
        disponivelMinimo: estoque,
        temDisponibilidade: estoque >= quantidadeSolicitada,
        diasConsultados: 0,
        mensagem: 'Período inválido ou data de término anterior ao início.',
      }
    }

    // Busca vendas ativas do produto
    let vendasAtivas: VendaRecord[] = []
    try {
      vendasAtivas = await pb.collection('vendas').getFullList<VendaRecord>({
        filter: `produto = "${produtoId}" && status = "ativa"`,
      })
      if (vendaIgnoradaId) {
        vendasAtivas = vendasAtivas.filter((v) => v.id !== vendaIgnoradaId)
      }
    } catch (e) {
      console.error('Erro ao buscar vendas ativas:', e)
    }

    // Busca orçamentos aprovados que incluam esse produto
    // Nota: orçamentos com status 'convertido' já viraram venda na tabela 'vendas',
    // portanto não devem ser contados em duplicidade com as vendas ativas.
    let itensAprovados: Array<{ quantidade: number; orcamento: OrcamentoRecord }> = []
    try {
      const orcItens = await pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
        filter: `produto = "${produtoId}"`,
        expand: 'orcamento',
      })
      itensAprovados = orcItens
        .map((it) => ({
          quantidade: it.quantidade || 0,
          orcamento: it.expand?.orcamento as unknown as OrcamentoRecord,
        }))
        .filter((it) => it.orcamento && it.orcamento.status === 'aprovado')
    } catch (e) {
      console.error('Erro ao buscar itens de orcamentos aprovados:', e)
    }

    // Para cada dia do período consultado, calcular o comprometimento
    const mapaPorDia: Record<string, number> = {}
    for (const dia of dias) {
      mapaPorDia[dia] = 0
    }

    // Adiciona comprometimento das vendas
    for (const v of vendasAtivas) {
      if (!v.data_inicio || !v.data_fim) continue
      const vDias = getDiasNoPeriodo(v.data_inicio, v.data_fim)
      const vQtd = v.quantidade || 0
      for (const d of vDias) {
        if (mapaPorDia[d] !== undefined) {
          mapaPorDia[d] += vQtd
        }
      }
    }

    // Adiciona comprometimento de orçamentos aprovados (se tiverem data_inicio e data_fim)
    for (const item of itensAprovados) {
      const orc = item.orcamento
      if (orc.data_inicio && orc.data_fim) {
        const oDias = getDiasNoPeriodo(orc.data_inicio, orc.data_fim)
        for (const d of oDias) {
          if (mapaPorDia[d] !== undefined) {
            mapaPorDia[d] += item.quantidade
          }
        }
      }
    }

    // Calcula max comprometido e min disponível
    let maxComprometido = 0
    let minDisponivel = estoque
    const detalhePorDia = dias.map((dia) => {
      const comp = mapaPorDia[dia] || 0
      if (comp > maxComprometido) maxComprometido = comp
      const disp = Math.max(0, estoque - comp)
      if (disp < minDisponivel) minDisponivel = disp
      return {
        data: dia,
        comprometido: comp,
        disponivel: disp,
      }
    })

    const temDisponibilidade = minDisponivel >= quantidadeSolicitada

    let mensagem = ''
    if (minDisponivel <= 0) {
      mensagem = 'Sem disponibilidade no período escolhido (todas as unidades estão comprometidas).'
    } else if (minDisponivel < quantidadeSolicitada) {
      mensagem = `Apenas ${minDisponivel} unidade(s) disponível(is) no período (solicitado: ${quantidadeSolicitada}).`
    } else {
      mensagem = `Disponível: ${minDisponivel} de ${estoque} unidade(s) livres no período escolhido.`
    }

    return {
      produtoId,
      quantidadeEstoque: estoque,
      maxComprometidoNoPeriodo: maxComprometido,
      disponivelMinimo: minDisponivel,
      temDisponibilidade,
      diasConsultados: dias.length,
      mensagem,
      detalhePorDia,
    }
  },

  /**
   * Disponibilidade rápida para "hoje" para exibição em catálogo / cards
   */
  async getDisponibilidadeHoje(produtoId: string, estoqueTotal: number): Promise<number> {
    const hoje = formatDataISO(new Date())
    try {
      const res = await this.verificarDisponibilidadeProduto(
        { id: produtoId, quantidade_estoque: estoqueTotal } as ProdutoRecord,
        hoje,
        hoje,
        1,
      )
      return res.disponivelMinimo
    } catch {
      return estoqueTotal
    }
  },

  /**
   * Mapa de disponibilidade hoje para múltiplos produtos de uma vez
   */
  async getMapaDisponibilidadeHoje(produtos: ProdutoRecord[]): Promise<Record<string, number>> {
    const hoje = formatDataISO(new Date())
    const mapa: Record<string, number> = {}

    // Busca todas as vendas ativas que cobrem "hoje"
    try {
      const vendasAtivas = await pb.collection('vendas').getFullList<VendaRecord>({
        filter: 'status = "ativa"',
      })

      const comprometidoMap: Record<string, number> = {}
      for (const v of vendasAtivas) {
        if (!v.data_inicio || !v.data_fim) continue
        const ini = formatDataISO(v.data_inicio)
        const fim = formatDataISO(v.data_fim)
        if (hoje >= ini && hoje <= fim) {
          comprometidoMap[v.produto] = (comprometidoMap[v.produto] || 0) + (v.quantidade || 0)
        }
      }

      for (const p of produtos) {
        const comp = comprometidoMap[p.id] || 0
        mapa[p.id] = Math.max(0, (p.quantidade_estoque || 0) - comp)
      }
    } catch (e) {
      console.error('Erro ao calcular mapa de disponibilidade hoje:', e)
      for (const p of produtos) {
        mapa[p.id] = p.quantidade_estoque || 0
      }
    }

    return mapa
  },

  /**
   * Retorna o mapa completo dia a dia do mês (1 a N) com comprometimento e reservas de um produto.
   * Evita N+1 buscando locações e orçamentos do período do mês uma única vez.
   */
  async getMapaOcupacaoMensal(
    produtoId: string,
    ano: number,
    mes: number, // 1 a 12
  ): Promise<MapaOcupacaoMensalResultado> {
    // Busca os dados do produto
    const produto = await pb.collection('produtos').getOne<ProdutoRecord>(produtoId, {
      expand: 'tipo,linha,atr01,atr02',
    })
    const estoque = produto.quantidade_estoque || 0

    // Delimita início e fim do mês
    const primDiaDate = new Date(ano, mes - 1, 1)
    const ultDiaDate = new Date(ano, mes, 0)
    const diasNoMes = ultDiaDate.getDate()

    const mesStr = String(mes).padStart(2, '0')
    const inicioMesStr = `${ano}-${mesStr}-01`
    const fimMesStr = `${ano}-${mesStr}-${String(diasNoMes).padStart(2, '0')}`

    // Busca vendas ativas do produto que podem se sobrepor ao mês
    // data_fim >= inicioMesStr && data_inicio <= fimMesStr
    let vendas: VendaRecord[] = []
    try {
      vendas = await pb.collection('vendas').getFullList<VendaRecord>({
        filter: `produto = "${produtoId}" && status = "ativa" && data_fim >= "${inicioMesStr} 00:00:00" && data_inicio <= "${fimMesStr} 23:59:59"`,
        expand: 'cliente,vendedor',
      })
    } catch {
      // Fallback sem filtro estrito de data se PB rejeitar datetime format
      try {
        const todasVendas = await pb.collection('vendas').getFullList<VendaRecord>({
          filter: `produto = "${produtoId}" && status = "ativa"`,
          expand: 'cliente,vendedor',
        })
        vendas = todasVendas.filter((v) => {
          if (!v.data_inicio || !v.data_fim) return false
          const ini = formatDataISO(v.data_inicio)
          const fim = formatDataISO(v.data_fim)
          return fim >= inicioMesStr && ini <= fimMesStr
        })
      } catch (errFallback) {
        console.error('Erro ao buscar vendas no mapa de ocupação:', errFallback)
      }
    }

    // Busca itens de orçamentos aprovados do produto
    let orcamentoItens: OrcamentoItemRecord[] = []
    try {
      const itens = await pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
        filter: `produto = "${produtoId}"`,
        expand: 'orcamento,orcamento.cliente,orcamento.vendedor',
      })
      orcamentoItens = itens.filter((it) => {
        const orc = it.expand?.orcamento as unknown as OrcamentoRecord | undefined
        if (!orc || orc.status !== 'aprovado' || !orc.data_inicio || !orc.data_fim) return false
        const ini = formatDataISO(orc.data_inicio)
        const fim = formatDataISO(orc.data_fim)
        return fim >= inicioMesStr && ini <= fimMesStr
      })
    } catch (eItens) {
      console.error('Erro ao buscar itens de orçamentos no mapa de ocupação:', eItens)
    }

    // Estrutura dia a dia do mês
    const diasInfo: DiaOcupacaoInfo[] = []
    let somaComprometido = 0
    let maxComprometido = 0
    let minLivre = estoque

    for (let d = 1; d <= diasNoMes; d++) {
      const diaStr = `${ano}-${mesStr}-${String(d).padStart(2, '0')}`
      const dateObj = new Date(ano, mes - 1, d)
      const diaSemana = dateObj.getDay()

      const reservasDia: ReservaItemInfo[] = []
      let compDia = 0

      // Checa vendas
      for (const v of vendas) {
        if (!v.data_inicio || !v.data_fim) continue
        const ini = formatDataISO(v.data_inicio)
        const fim = formatDataISO(v.data_fim)
        if (diaStr >= ini && diaStr <= fim) {
          const qtd = v.quantidade || 0
          compDia += qtd
          reservasDia.push({
            id: v.id,
            origem: 'venda',
            quantidade: qtd,
            dataInicio: ini,
            dataFim: fim,
            status: v.status,
            clienteNome: v.expand?.cliente?.nome || 'Cliente não identificado',
            vendedorNome: v.expand?.vendedor?.name || v.expand?.vendedor?.email,
            observacoes: v.observacoes,
          })
        }
      }

      // Checa orçamentos aprovados
      for (const it of orcamentoItens) {
        const orc = it.expand?.orcamento as unknown as OrcamentoRecord
        const ini = formatDataISO(orc.data_inicio!)
        const fim = formatDataISO(orc.data_fim!)
        if (diaStr >= ini && diaStr <= fim) {
          const qtd = it.quantidade || 0
          compDia += qtd
          reservasDia.push({
            id: orc.id,
            origem: 'orcamento',
            quantidade: qtd,
            dataInicio: ini,
            dataFim: fim,
            status: 'aprovado',
            clienteNome: orc.expand?.cliente?.nome || 'Cliente não identificado',
            vendedorNome: orc.expand?.vendedor?.name || orc.expand?.vendedor?.email,
            observacoes: orc.observacoes,
          })
        }
      }

      const livre = Math.max(0, estoque - compDia)
      if (compDia > maxComprometido) maxComprometido = compDia
      if (livre < minLivre) minLivre = livre
      somaComprometido += compDia

      const esgotado = estoque > 0 && livre === 0
      const parcial = compDia > 0 && livre > 0
      const totalmenteLivre = compDia === 0

      diasInfo.push({
        data: diaStr,
        diaNumero: d,
        diaSemana,
        comprometido: compDia,
        livre,
        esgotado,
        parcial,
        totalmenteLivre,
        reservas: reservasDia,
      })
    }

    const nomesMeses = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]

    const mediaComprometimento =
      diasNoMes > 0 ? Number((somaComprometido / diasNoMes).toFixed(2)) : 0
    const unidadesTotaisMes = estoque * diasNoMes
    const taxaOcupacaoMediaMes =
      unidadesTotaisMes > 0 ? Number(((somaComprometido / unidadesTotaisMes) * 100).toFixed(1)) : 0

    return {
      produto,
      ano,
      mes,
      mesNome: nomesMeses[mes - 1] || '',
      quantidadeEstoque: estoque,
      diasNoMes,
      dias: diasInfo,
      maxComprometido,
      minLivre,
      mediaComprometimento,
      taxaOcupacaoMediaMes,
    }
  },

  /**
   * Calcula o relatório consolidado de taxa de ocupação para todos os produtos (ou filtrados por linha)
   * em um intervalo de datas qualquer.
   * Realiza busca agregada prévia para evitar N+1.
   */
  async calcularTaxaOcupacaoEstoquePeriodo(
    dataInicioStr: string,
    dataFimStr: string,
    linhaId?: string,
  ): Promise<RelatorioTaxaOcupacaoResultado> {
    const inicio = formatDataISO(dataInicioStr)
    const fim = formatDataISO(dataFimStr)
    const dias = getDiasNoPeriodo(inicio, fim)
    const totalDias = dias.length

    if (totalDias === 0) {
      return {
        dataInicio: inicio,
        dataFim: fim,
        diasPeriodo: 0,
        produtos: [],
        totalUnidadesDiaDisponiveis: 0,
        totalUnidadesDiaComprometidas: 0,
        taxaMediaGeral: 0,
        valorTotalEstimadoComprometido: 0,
      }
    }

    // 1. Busca produtos
    let produtos = await pb.collection('produtos').getFullList<ProdutoRecord>({
      expand: 'linha,tipo',
      sort: 'nome',
    })
    if (linhaId && linhaId !== 'TODAS') {
      produtos = produtos.filter((p) => p.linha === linhaId || p.expand?.linha?.nome === linhaId)
    }

    // 2. Busca todas as vendas ativas que sobrepõem o período
    let vendasAtivas: VendaRecord[] = []
    try {
      const allVendas = await pb.collection('vendas').getFullList<VendaRecord>({
        filter: 'status = "ativa"',
      })
      vendasAtivas = allVendas.filter((v) => {
        if (!v.data_inicio || !v.data_fim) return false
        const vIni = formatDataISO(v.data_inicio)
        const vFim = formatDataISO(v.data_fim)
        return vFim >= inicio && vIni <= fim
      })
    } catch (eVendas) {
      console.error('Erro ao buscar vendas no relatório de ocupação:', eVendas)
    }

    // 3. Busca itens de orçamentos aprovados que sobrepõem o período
    let itensAprovados: Array<{ produtoId: string; quantidade: number; ini: string; fim: string }> =
      []
    try {
      const allItens = await pb.collection('orcamento_itens').getFullList<OrcamentoItemRecord>({
        expand: 'orcamento',
      })
      itensAprovados = allItens
        .map((it) => {
          const orc = it.expand?.orcamento as unknown as OrcamentoRecord | undefined
          if (!orc || orc.status !== 'aprovado' || !orc.data_inicio || !orc.data_fim) return null
          const iniOrc = formatDataISO(orc.data_inicio)
          const fimOrc = formatDataISO(orc.data_fim)
          if (fimOrc < inicio || iniOrc > fim) return null
          return {
            produtoId: it.produto,
            quantidade: it.quantidade || 0,
            ini: iniOrc,
            fim: fimOrc,
          }
        })
        .filter((it): it is NonNullable<typeof it> => it !== null)
    } catch (eItens) {
      console.error('Erro ao buscar itens de orçamentos no relatório de ocupação:', eItens)
    }

    // 4. Mapear reservas por produto
    // Para cada produto: lista de intervalos { ini, fim, quantidade }
    interface IntervaloReserva {
      ini: string
      fim: string
      quantidade: number
    }
    const reservasPorProduto = new Map<string, IntervaloReserva[]>()

    for (const v of vendasAtivas) {
      if (!v.produto) continue
      if (!reservasPorProduto.has(v.produto)) reservasPorProduto.set(v.produto, [])
      reservasPorProduto.get(v.produto)!.push({
        ini: formatDataISO(v.data_inicio),
        fim: formatDataISO(v.data_fim),
        quantidade: v.quantidade || 0,
      })
    }

    for (const item of itensAprovados) {
      if (!reservasPorProduto.has(item.produtoId)) reservasPorProduto.set(item.produtoId, [])
      reservasPorProduto.get(item.produtoId)!.push({
        ini: item.ini,
        fim: item.fim,
        quantidade: item.quantidade,
      })
    }

    // 5. Para cada produto, calcular as métricas no período
    let somaTotalDisponivel = 0
    let somaTotalComprometido = 0
    let somaTotalValor = 0

    const resultadosProdutos: ProdutoTaxaOcupacao[] = produtos.map((p) => {
      const estoque = p.quantidade_estoque || 0
      const unidadesDiaDisponiveis = estoque * totalDias
      const valorDiario = p.valor_locacao_diaria || p.valor_locacao_mensal || 0
      const reservas = reservasPorProduto.get(p.id) || []

      let unidadesDiaComprometidas = 0

      // Varre dia a dia do período
      for (const dia of dias) {
        let compHoje = 0
        for (const r of reservas) {
          if (dia >= r.ini && dia <= r.fim) {
            compHoje += r.quantidade
          }
        }
        unidadesDiaComprometidas += compHoje
      }

      const taxaOcupacaoPercent =
        unidadesDiaDisponiveis > 0
          ? Number(((unidadesDiaComprometidas / unidadesDiaDisponiveis) * 100).toFixed(1))
          : 0

      const valorEstimadoComprometido = unidadesDiaComprometidas * valorDiario

      somaTotalDisponivel += unidadesDiaDisponiveis
      somaTotalComprometido += unidadesDiaComprometidas
      somaTotalValor += valorEstimadoComprometido

      return {
        produto: p,
        diasPeriodo: totalDias,
        quantidadeEstoque: estoque,
        unidadesDiaDisponiveis,
        unidadesDiaComprometidas,
        taxaOcupacaoPercent,
        valorLocacaoDiaria: valorDiario,
        valorEstimadoComprometido,
      }
    })

    // Ordena padrão: maior taxa de ocupação primeiro
    resultadosProdutos.sort((a, b) => b.taxaOcupacaoPercent - a.taxaOcupacaoPercent)

    const taxaMediaGeral =
      somaTotalDisponivel > 0
        ? Number(((somaTotalComprometido / somaTotalDisponivel) * 100).toFixed(1))
        : 0

    const produtoMaisOcupado =
      resultadosProdutos.length > 0 && resultadosProdutos[0].unidadesDiaComprometidas > 0
        ? resultadosProdutos[0]
        : undefined

    return {
      dataInicio: inicio,
      dataFim: fim,
      diasPeriodo: totalDias,
      produtos: resultadosProdutos,
      totalUnidadesDiaDisponiveis: somaTotalDisponivel,
      totalUnidadesDiaComprometidas: somaTotalComprometido,
      taxaMediaGeral,
      valorTotalEstimadoComprometido: somaTotalValor,
      produtoMaisOcupado,
    }
  },
}
