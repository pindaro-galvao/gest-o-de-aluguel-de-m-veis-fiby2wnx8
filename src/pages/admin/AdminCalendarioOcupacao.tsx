import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { produtosService } from '@/services/produtos'
import {
  disponibilidadeService,
  formatDataISO,
  type MapaOcupacaoMensalResultado,
  type DiaOcupacaoInfo,
} from '@/services/disponibilidade'
import type { ProdutoRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Armchair,
  Package,
  Layers,
  Info,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'

const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function AdminCalendarioOcupacao() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>('')
  const [produtoBusca, setProdutoBusca] = useState('')
  const [dropdownAberto, setDropdownAberto] = useState(false)

  // Controle de Mês/Ano (default: mês atual)
  const hoje = useMemo(() => new Date(), [])
  const [ano, setAno] = useState<number>(hoje.getFullYear())
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1) // 1 a 12

  // Dados do mapa mensal
  const [mapaMensal, setMapaMensal] = useState<MapaOcupacaoMensalResultado | null>(null)
  const [loadingMapa, setLoadingMapa] = useState(false)

  // Modal / Detalhes de um dia clicado
  const [diaSelecionado, setDiaSelecionado] = useState<DiaOcupacaoInfo | null>(null)
  const [isModalDiaOpen, setIsModalDiaOpen] = useState(false)

  // 1. Carrega a lista de produtos
  useEffect(() => {
    let cancel = false
    const carregar = async () => {
      try {
        setLoadingProdutos(true)
        const lista = await produtosService.getAll()
        if (cancel) return
        setProdutos(lista)

        // Verifica parâmetro da URL 'produto' ou pré-seleciona o primeiro
        const paramProd = searchParams.get('produto')
        const paramAno = searchParams.get('ano')
        const paramMes = searchParams.get('mes')

        if (paramAno) {
          const a = parseInt(paramAno, 10)
          if (!isNaN(a) && a >= 2020 && a <= 2040) setAno(a)
        }
        if (paramMes) {
          const m = parseInt(paramMes, 10)
          if (!isNaN(m) && m >= 1 && m <= 12) setMes(m)
        }

        if (paramProd && lista.some((p) => p.id === paramProd)) {
          setProdutoSelecionadoId(paramProd)
        } else if (lista.length > 0) {
          setProdutoSelecionadoId(lista[0].id)
        }
      } catch (err) {
        console.error('Erro ao carregar produtos para o calendário:', err)
      } finally {
        if (!cancel) setLoadingProdutos(false)
      }
    }
    carregar()
    return () => {
      cancel = true
    }
  }, [searchParams])

  // 2. Carrega o mapa mensal do produto quando produto/ano/mês mudam
  useEffect(() => {
    if (!produtoSelecionadoId) return
    let cancel = false
    const carregarMapa = async () => {
      try {
        setLoadingMapa(true)
        const res = await disponibilidadeService.getMapaOcupacaoMensal(
          produtoSelecionadoId,
          ano,
          mes,
        )
        if (cancel) return
        setMapaMensal(res)
      } catch (err) {
        console.error('Erro ao buscar mapa de ocupação mensal:', err)
      } finally {
        if (!cancel) setLoadingMapa(false)
      }
    }
    carregarMapa()
    return () => {
      cancel = true
    }
  }, [produtoSelecionadoId, ano, mes])

  // Atualiza query param suavemente
  const handleSelectProduto = (prodId: string) => {
    setProdutoSelecionadoId(prodId)
    setDropdownAberto(false)
    setSearchParams(
      (prev) => {
        prev.set('produto', prodId)
        return prev
      },
      { replace: true },
    )
  }

  // Navegação do Mês
  const handleMesAnterior = () => {
    if (mes === 1) {
      setMes(12)
      setAno((a) => a - 1)
    } else {
      setMes((m) => m - 1)
    }
  }

  const handleProximoMes = () => {
    if (mes === 12) {
      setMes(1)
      setAno((a) => a + 1)
    } else {
      setMes((m) => m + 1)
    }
  }

  const handleHoje = () => {
    setAno(hoje.getFullYear())
    setMes(hoje.getMonth() + 1)
  }

  // Filtragem de produtos para o dropdown de busca
  const produtosFiltrados = useMemo(() => {
    const q = produtoBusca.toLowerCase().trim()
    if (!q) return produtos
    return produtos.filter((p) => {
      const cod = (p.codigo || '').toLowerCase()
      const nome = p.nome.toLowerCase()
      const linha = (p.expand?.linha?.nome || '').toLowerCase()
      const tipo = (p.expand?.tipo?.nome || '').toLowerCase()
      return cod.includes(q) || nome.includes(q) || linha.includes(q) || tipo.includes(q)
    })
  }, [produtos, produtoBusca])

  const produtoAtual = useMemo(() => {
    return produtos.find((p) => p.id === produtoSelecionadoId) || mapaMensal?.produto
  }, [produtos, produtoSelecionadoId, mapaMensal])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Grid do Calendário: calcula os dias em branco antes do dia 1
  const primeiroDiaSemana = useMemo(() => {
    return new Date(ano, mes - 1, 1).getDay()
  }, [ano, mes])

  const hojeFormatado = formatDataISO(hoje)

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo / Header com navegação e atalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <CalendarIcon className="h-4 w-4" />
            <span>Disponibilidade & Reservas</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Calendário de Ocupação por Produto</h2>
          <p className="text-sm text-[#6B6B6B]">
            Acompanhe dia a dia o comprometimento físico do acervo em contratos e orçamentos
            aprovados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/relatorios')}
            className="border-[#E5E0DA] bg-white text-xs font-semibold text-[#2B2B2B] hover:bg-[#FAF7F3]"
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-[#A67C52]" />
            Relatório de Taxa de Ocupação
          </Button>
        </div>
      </div>

      {/* Barra de Filtros: Seleção de Produto + Navegação de Mês */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Seletor com busca do Produto */}
          <div className="lg:col-span-7 relative">
            <label className="text-xs font-bold text-[#6B6B6B] uppercase mb-1.5 block">
              Móvel TIDELLI Selecionado
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownAberto(!dropdownAberto)}
                className="w-full flex items-center justify-between rounded-lg border border-[#E5E0DA] bg-[#FAF7F3] px-3 py-2.5 text-left text-sm hover:border-[#A67C52] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Armchair className="h-4 w-4 text-[#A67C52] shrink-0" />
                  {produtoAtual ? (
                    <div className="truncate">
                      <span className="font-mono font-bold text-[#A67C52] mr-2">
                        {produtoAtual.codigo || 'S/CÓD'}
                      </span>
                      <span className="font-semibold text-[#2B2B2B]">{produtoAtual.nome}</span>
                      {(produtoAtual.expand?.linha?.nome || produtoAtual.linha) && (
                        <span className="text-xs text-[#6B6B6B] ml-2">
                          (Linha {produtoAtual.expand?.linha?.nome || produtoAtual.linha})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[#8C8C8C]">Selecione um produto...</span>
                  )}
                </div>
                <Badge className="bg-white text-[#2B2B2B] border border-[#E5E0DA] text-[10px] ml-2 shrink-0">
                  {produtoAtual ? `${produtoAtual.quantidade_estoque} un. no estoque` : '0 un.'}
                </Badge>
              </button>

              {/* Dropdown com busca interna */}
              {dropdownAberto && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-[#E5E0DA] bg-white shadow-xl p-2 max-h-80 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                    <Input
                      autoFocus
                      placeholder="Buscar por código, nome ou linha..."
                      value={produtoBusca}
                      onChange={(e) => setProdutoBusca(e.target.value)}
                      className="pl-8 text-xs bg-[#FAF7F3] border-[#E5E0DA] h-8"
                    />
                  </div>
                  <div className="overflow-y-auto space-y-1 pr-1 flex-1 max-h-60">
                    {loadingProdutos ? (
                      <p className="text-xs text-center text-[#8C8C8C] py-4">
                        Carregando catálogo...
                      </p>
                    ) : produtosFiltrados.length === 0 ? (
                      <p className="text-xs text-center text-[#8C8C8C] py-4">
                        Nenhum produto encontrado
                      </p>
                    ) : (
                      produtosFiltrados.map((p) => {
                        const isSelected = p.id === produtoSelecionadoId
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectProduto(p.id)}
                            className={`w-full flex items-center justify-between text-left p-2 rounded-lg text-xs transition-colors ${
                              isSelected
                                ? 'bg-[#A67C52] text-white font-semibold'
                                : 'hover:bg-[#FAF7F3] text-[#2B2B2B]'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <span
                                className={`font-mono font-bold mr-1.5 ${
                                  isSelected ? 'text-white' : 'text-[#A67C52]'
                                }`}
                              >
                                {p.codigo || 'S/CÓD'}
                              </span>
                              <span>{p.nome}</span>
                              {(p.expand?.linha?.nome || p.linha) && (
                                <span
                                  className={`ml-1.5 opacity-80 ${
                                    isSelected ? 'text-white' : 'text-[#6B6B6B]'
                                  }`}
                                >
                                  • Linha {p.expand?.linha?.nome || p.linha}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] shrink-0 font-medium px-1.5 py-0.5 rounded ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#EFECE8] text-[#6B6B6B]'
                              }`}
                            >
                              {p.quantidade_estoque} un.
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navegação de Mês */}
          <div className="lg:col-span-5 flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 sm:pt-5">
            <div className="flex items-center gap-1.5 bg-[#FAF7F3] border border-[#E5E0DA] rounded-lg p-1 w-full sm:w-auto justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMesAnterior}
                className="h-8 w-8 p-0 text-[#2B2B2B] hover:bg-white"
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="px-3 text-center min-w-[150px]">
                <span className="font-bold text-sm text-[#2B2B2B] capitalize">
                  {mapaMensal?.mesNome || 'Mês'} {ano}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleProximoMes}
                className="h-8 w-8 p-0 text-[#2B2B2B] hover:bg-white"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleHoje}
              className="border-[#E5E0DA] bg-white text-xs font-semibold text-[#2B2B2B] hover:bg-[#FAF7F3] h-10 px-3 w-full sm:w-auto"
            >
              Mês Atual
            </Button>
          </div>
        </div>

        {/* Card Informativo do Produto Selecionado */}
        {produtoAtual && (
          <div className="border-t border-[#F1ECE6] pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B6B6B]">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                <strong>Estoque Total:</strong>{' '}
                <span className="text-[#2B2B2B] font-bold">
                  {produtoAtual.quantidade_estoque} unidade(s)
                </span>
              </span>
              <span>
                <strong>Diária:</strong>{' '}
                <span className="text-[#A67C52] font-bold">
                  {formatCurrency(
                    produtoAtual.valor_locacao_diaria || produtoAtual.valor_locacao_mensal || 0,
                  )}
                  /dia
                </span>
              </span>
              {produtoAtual.expand?.tipo?.nome && (
                <span>
                  <strong>Categoria:</strong> {produtoAtual.expand.tipo.nome}
                </span>
              )}
              {produtoAtual.dimensoes && (
                <span>
                  <strong>Dimensões:</strong> {produtoAtual.dimensoes}
                </span>
              )}
            </div>

            {mapaMensal && (
              <div className="flex items-center gap-3">
                <span className="bg-[#FAF7F3] border border-[#E5E0DA] px-2.5 py-1 rounded text-[#2B2B2B]">
                  Ocupação no Mês:{' '}
                  <strong className="text-[#A67C52]">{mapaMensal.taxaOcupacaoMediaMes}%</strong>
                </span>
                <span className="bg-[#FAF7F3] border border-[#E5E0DA] px-2.5 py-1 rounded text-[#2B2B2B]">
                  Pior saldo livre:{' '}
                  <strong
                    className={
                      mapaMensal.minLivre === 0
                        ? 'text-red-600'
                        : mapaMensal.minLivre < produtoAtual.quantidade_estoque
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }
                  >
                    {mapaMensal.minLivre} un.
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legenda de Cores Explicativa */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#6B6B6B]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-[#2B2B2B]">Legenda do Calendário:</span>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block shadow-2xs" />
            <span>Totalmente Livre (0 ocupadas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500 inline-block shadow-2xs" />
            <span>Parcialmente Ocupado (há saldo)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500 inline-block shadow-2xs" />
            <span>Esgotado (0 livres no dia)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#8C8C8C]">
          <Info className="h-3.5 w-3.5 text-[#A67C52]" />
          <span>Clique em qualquer dia para ver a lista de reservas</span>
        </div>
      </div>

      {/* Grid Mensal do Calendário */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white shadow-sm overflow-hidden">
        {/* Cabeçalho dos 7 dias da semana (Dom - Sáb) */}
        <div className="grid grid-cols-7 border-b border-[#E5E0DA] bg-[#FAF7F3] text-center text-xs font-bold text-[#6B6B6B] uppercase">
          {DIAS_DA_SEMANA.map((diaNome, idx) => {
            const isFimDeSemana = idx === 0 || idx === 6
            return (
              <div
                key={diaNome}
                className={`py-3 px-1 border-r border-[#E5E0DA] last:border-r-0 ${
                  isFimDeSemana ? 'text-[#A67C52] bg-[#F7F2EB]/60' : ''
                }`}
              >
                {diaNome}
              </div>
            )
          })}
        </div>

        {/* Corpo do Calendário */}
        {loadingMapa ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
            <p className="text-xs font-semibold text-[#6B6B6B]">Carregando ocupação do mês...</p>
          </div>
        ) : !mapaMensal ? (
          <div className="p-12 text-center text-sm text-[#6B6B6B]">
            Selecione um produto para visualizar o calendário.
          </div>
        ) : (
          <div className="grid grid-cols-7 auto-rows-fr divide-y divide-[#E5E0DA]">
            {/* Células em branco dos dias que antecedem o dia 1 */}
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[105px] sm:min-h-[120px] bg-[#FBF9F6]/50 border-r border-[#E5E0DA] last:border-r-0 p-2 opacity-40 select-none"
              />
            ))}

            {/* Dias do Mês */}
            {mapaMensal.dias.map((d) => {
              const isHoje = d.data === hojeFormatado
              const isFimDeSemana = d.diaSemana === 0 || d.diaSemana === 6
              const totalEstoque = mapaMensal.quantidadeEstoque

              // Definição visual do status do dia
              let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200'
              let dotBg = 'bg-emerald-500'
              let statusTexto = 'Livre'

              if (d.esgotado) {
                badgeBg = 'bg-red-50 text-red-700 border-red-200'
                dotBg = 'bg-red-500'
                statusTexto = 'Esgotado'
              } else if (d.parcial) {
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200'
                dotBg = 'bg-amber-500'
                statusTexto = `${d.livre} livre(s)`
              }

              return (
                <div
                  key={d.data}
                  onClick={() => {
                    setDiaSelecionado(d)
                    setIsModalDiaOpen(true)
                  }}
                  className={`min-h-[105px] sm:min-h-[125px] border-r border-[#E5E0DA] last:border-r-0 p-2 sm:p-2.5 flex flex-col justify-between cursor-pointer transition-all hover:bg-[#F9F6F1] group relative ${
                    isFimDeSemana ? 'bg-[#FCFAF7]' : 'bg-white'
                  } ${isHoje ? 'ring-2 ring-inset ring-[#A67C52] bg-amber-50/20' : ''}`}
                >
                  {/* Topo do Dia: Número do dia + badge Hoje */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-extrabold ${
                        isHoje
                          ? 'h-6 w-6 rounded-full bg-[#A67C52] text-white flex items-center justify-center font-bold text-xs'
                          : isFimDeSemana
                            ? 'text-[#A67C52]'
                            : 'text-[#2B2B2B]'
                      }`}
                    >
                      {d.diaNumero}
                    </span>

                    {/* Indicador de Bolinha de Status */}
                    <span className={`h-2.5 w-2.5 rounded-full ${dotBg} shadow-2xs`} />
                  </div>

                  {/* Informação Central de Ocupação */}
                  <div className="my-1.5 space-y-1">
                    <div className="text-[11px] font-medium text-[#2B2B2B] leading-tight flex items-baseline justify-between">
                      <span className="text-[#6B6B6B] text-[10px]">Ocupadas:</span>
                      <strong className="font-extrabold">
                        {d.comprometido} / {totalEstoque}
                      </strong>
                    </div>

                    <div className="text-[11px] font-medium leading-tight flex items-baseline justify-between">
                      <span className="text-[#6B6B6B] text-[10px]">Livres:</span>
                      <span
                        className={`font-bold ${
                          d.livre === 0
                            ? 'text-red-600'
                            : d.livre < totalEstoque
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {d.livre} un.
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do Dia com Badge do Status */}
                  <div className="pt-1 border-t border-[#F1ECE6] flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0 border ${badgeBg} truncate max-w-full`}
                    >
                      {statusTexto}
                    </Badge>

                    {d.reservas.length > 0 && (
                      <span
                        title={`${d.reservas.length} reserva(s) ativa(s)`}
                        className="text-[9px] font-bold bg-[#EFECE8] text-[#2B2B2B] px-1 py-0.2 rounded"
                      >
                        {d.reservas.length} {d.reservas.length === 1 ? 'res.' : 'res.'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal com Detalhes do Dia Clicado */}
      <Dialog open={isModalDiaOpen} onOpenChange={setIsModalDiaOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B] flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-[#A67C52]" />
              <span>
                Detalhe do Dia{' '}
                {diaSelecionado
                  ? new Date(`${diaSelecionado.data}T12:00:00`).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      weekday: 'long',
                    })
                  : ''}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              {produtoAtual?.codigo} — {produtoAtual?.nome}
            </DialogDescription>
          </DialogHeader>

          {diaSelecionado && (
            <div className="space-y-4 pt-2">
              {/* Resumo Numérico do Dia */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">
                    Estoque Total
                  </span>
                  <div className="text-xl font-extrabold text-[#2B2B2B]">
                    {mapaMensal?.quantidadeEstoque} un.
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">Ocupadas</span>
                  <div
                    className={`text-xl font-extrabold ${
                      diaSelecionado.comprometido > 0 ? 'text-amber-600' : 'text-[#2B2B2B]'
                    }`}
                  >
                    {diaSelecionado.comprometido} un.
                  </div>
                </div>

                <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-3">
                  <span className="text-[10px] font-bold uppercase text-[#6B6B6B]">
                    Disponíveis
                  </span>
                  <div
                    className={`text-xl font-extrabold ${
                      diaSelecionado.livre === 0
                        ? 'text-red-600'
                        : diaSelecionado.livre < (mapaMensal?.quantidadeEstoque || 0)
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    {diaSelecionado.livre} un.
                  </div>
                </div>
              </div>

              {/* Lista de Reservas / Contratos / Orçamentos que afetam o dia */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2B2B2B]">
                  Reservas Sobrepostas Neste Dia ({diaSelecionado.reservas.length})
                </h4>

                {diaSelecionado.reservas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E5E0DA] bg-[#FAF7F3] p-6 text-center text-xs text-[#6B6B6B]">
                    Nenhuma locação ou orçamento compromete este produto nesta data. Todas as{' '}
                    <strong>{mapaMensal?.quantidadeEstoque} unidades</strong> estão livres.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {diaSelecionado.reservas.map((r, i) => (
                      <div
                        key={`${r.id}-${i}`}
                        className="rounded-xl border border-[#E5E0DA] bg-white p-3 space-y-2 hover:border-[#A67C52] transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[10px] font-bold uppercase ${
                                r.origem === 'venda'
                                  ? 'bg-[#A67C52] text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {r.origem === 'venda' ? 'Locação Ativa' : 'Orçamento Aprovado'}
                            </Badge>
                            <span className="text-xs font-bold text-[#2B2B2B]">
                              {r.quantidade} unidade(s)
                            </span>
                          </div>

                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-semibold text-zinc-700 bg-zinc-50"
                          >
                            Status: {r.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-[#6B6B6B] pt-1 border-t border-[#F1ECE6]">
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="h-3.5 w-3.5 text-[#A67C52] shrink-0" />
                            <span className="truncate">
                              <strong>Cliente:</strong> {r.clienteNome}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="h-3.5 w-3.5 text-[#A67C52] shrink-0" />
                            <span>
                              {new Date(`${r.dataInicio}T00:00:00`).toLocaleDateString('pt-BR')} a{' '}
                              {new Date(`${r.dataFim}T00:00:00`).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        {r.vendedorNome && (
                          <div className="text-[11px] text-[#8C8C8C]">
                            Responsável: {r.vendedorNome}
                          </div>
                        )}

                        {r.observacoes && (
                          <p className="text-[11px] text-[#6B6B6B] bg-[#FAF7F3] p-2 rounded-md italic">
                            "{r.observacoes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão fechar */}
              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setIsModalDiaOpen(false)}
                  className="bg-[#A67C52] hover:bg-[#8C643F] text-white text-xs"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
