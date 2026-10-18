import pb from '@/lib/pocketbase/client'
import type {
  ProdutoRecord,
  VendaRecord,
  OrcamentoRecord,
  OrcamentoItemRecord,
} from '@/types/database'

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
}
