import React, { useEffect, useState, useMemo } from 'react'
import { produtosService } from '@/services/produtos'
import { categoriasService } from '@/services/categorias'
import { linhasService } from '@/services/linhas'
import { atributosService } from '@/services/atributos'
import { disponibilidadeService } from '@/services/disponibilidade'
import type { ProdutoRecord, CategoriaRecord, LinhaRecord, AtributoRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { Armchair, Plus, Search, Edit3, Trash2, Package, Palette, AlertCircle } from 'lucide-react'

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [categorias, setCategorias] = useState<CategoriaRecord[]>([])
  const [linhas, setLinhas] = useState<LinhaRecord[]>([])
  const [atributos, setAtributos] = useState<AtributoRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [tipoFilter, setTipoFilter] = useState('TODOS') // 'TODOS' ou categoria.id
  const [linhaFilter, setLinhaFilter] = useState('TODAS') // 'TODAS' ou linha.id
  const [searchTerm, setSearchTerm] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<ProdutoRecord | null>(null)

  // Form Fields
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [linhaId, setLinhaId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [dimensoes, setDimensoes] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number>(1)
  const [valorLocacaoDiaria, setValorLocacaoDiaria] = useState<number>(50)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [disponibilidadeHojeMap, setDisponibilidadeHojeMap] = useState<Record<string, number>>({})

  // 9 Atributos ATR01..ATR09
  const [atr01, setAtr01] = useState('NONE')
  const [atr02, setAtr02] = useState('NONE')
  const [atr03, setAtr03] = useState('NONE')
  const [atr04, setAtr04] = useState('NONE')
  const [atr05, setAtr05] = useState('NONE')
  const [atr06, setAtr06] = useState('NONE')
  const [atr07, setAtr07] = useState('NONE')
  const [atr08, setAtr08] = useState('NONE')
  const [atr09, setAtr09] = useState('NONE')

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [pList, cList, lList, aList] = await Promise.all([
        produtosService.getAll(),
        categoriasService.getAll(),
        linhasService.getAll(),
        atributosService.getAll(),
      ])
      setProdutos(pList)
      setCategorias(cList)
      setLinhas(lList)
      setAtributos(aList)

      // Carregar mapa de disponibilidade hoje para os produtos
      disponibilidadeService
        .getMapaDisponibilidadeHoje(pList)
        .then(setDisponibilidadeHojeMap)
        .catch(console.error)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar produtos',
        description: 'Não foi possível buscar a lista de móveis.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime
  useRealtime<ProdutoRecord>('produtos', () => {
    loadData()
  })
  useRealtime<CategoriaRecord>('categorias', () => {
    loadData()
  })
  useRealtime<LinhaRecord>('linhas', () => {
    loadData()
  })
  useRealtime<AtributoRecord>('atributos', () => {
    loadData()
  })

  // Lista de categorias para o formulário:
  // Se for criação: apenas ativas
  // Se for edição: ativas + categoria atual do produto (mesmo se inativa)
  const formCategorias = useMemo(() => {
    return categorias.filter((c) => {
      if (c.ativo) return true
      if (editingProduto && editingProduto.tipo === c.id) return true
      return false
    })
  }, [categorias, editingProduto])

  // Lista de linhas para o formulário:
  // Se for criação: apenas ativas
  // Se for edição: ativas + linha atual do produto (mesmo se inativa)
  const formLinhas = useMemo(() => {
    return linhas.filter((l) => {
      if (l.ativo) return true
      if (editingProduto && editingProduto.linha === l.id) return true
      return false
    })
  }, [linhas, editingProduto])

  // Lista de atributos para os selects do formulário:
  // Disponíveis: ativos + já selecionados no produto atual
  const formAtributos = useMemo(() => {
    return atributos.filter((a) => {
      if (a.ativo !== false) return true
      if (editingProduto) {
        const selected = [
          editingProduto.atr01,
          editingProduto.atr02,
          editingProduto.atr03,
          editingProduto.atr04,
          editingProduto.atr05,
          editingProduto.atr06,
          editingProduto.atr07,
          editingProduto.atr08,
          editingProduto.atr09,
        ]
        if (selected.includes(a.id)) return true
      }
      return false
    })
  }, [atributos, editingProduto])

  // Checagem se algum atributo foi duplicado entre os 9 campos
  const atributosDuplicadosAviso = useMemo(() => {
    const list = [atr01, atr02, atr03, atr04, atr05, atr06, atr07, atr08, atr09].filter(
      (id) => id && id !== 'NONE',
    )
    const countsAtr: Record<string, number> = {}
    let hasDup = false
    for (const id of list) {
      countsAtr[id] = (countsAtr[id] || 0) + 1
      if (countsAtr[id] > 1) hasDup = true
    }
    return hasDup
  }, [atr01, atr02, atr03, atr04, atr05, atr06, atr07, atr08, atr09])

  const openCreateModal = () => {
    setEditingProduto(null)
    setCodigo('')
    setNome('')
    setLinhaId('NONE')
    // Categoria padrão: a primeira ativa ou vazia
    const firstCat = categorias.find((c) => c.ativo)
    setTipoId(firstCat?.id || '')
    setDimensoes('')
    setDescricao('')
    setQuantidadeEstoque(1)
    setValorLocacaoDiaria(250)
    setFotoFile(null)
    setAtr01('NONE')
    setAtr02('NONE')
    setAtr03('NONE')
    setAtr04('NONE')
    setAtr05('NONE')
    setAtr06('NONE')
    setAtr07('NONE')
    setAtr08('NONE')
    setAtr09('NONE')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (p: ProdutoRecord) => {
    setEditingProduto(p)
    setCodigo(p.codigo || '')
    setNome(p.nome)
    setLinhaId(p.linha || 'NONE')
    setTipoId(p.tipo || '')
    setDimensoes(p.dimensoes || '')
    setDescricao(p.descricao || '')
    setQuantidadeEstoque(p.quantidade_estoque || 0)
    setValorLocacaoDiaria(p.valor_locacao_diaria || p.valor_locacao_mensal || 0)
    setFotoFile(null)
    setAtr01(p.atr01 || 'NONE')
    setAtr02(p.atr02 || 'NONE')
    setAtr03(p.atr03 || 'NONE')
    setAtr04(p.atr04 || 'NONE')
    setAtr05(p.atr05 || 'NONE')
    setAtr06(p.atr06 || 'NONE')
    setAtr07(p.atr07 || 'NONE')
    setAtr08(p.atr08 || 'NONE')
    setAtr09(p.atr09 || 'NONE')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const trimmedCodigo = codigo.trim()
    if (!trimmedCodigo) {
      errs.codigo = 'O código do móvel é obrigatório.'
    } else {
      const exists = produtos.some(
        (p) =>
          p.id !== editingProduto?.id &&
          p.codigo?.trim().toLowerCase() === trimmedCodigo.toLowerCase(),
      )
      if (exists) {
        errs.codigo = 'Código já existe em outro produto.'
      }
    }

    if (!nome.trim()) errs.nome = 'O nome do produto é obrigatório.'
    if (!tipoId || tipoId === 'NONE') errs.tipoId = 'A categoria é obrigatória.'
    if (quantidadeEstoque < 0) errs.quantidadeEstoque = 'Quantidade não pode ser negativa.'
    if (valorLocacaoDiaria <= 0)
      errs.valorLocacaoDiaria = 'O valor diário de locação deve ser superior a zero.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('codigo', codigo.trim())
      formData.append('nome', nome.trim())
      formData.append('tipo', tipoId)
      formData.append('linha', linhaId === 'NONE' ? '' : linhaId)
      formData.append('dimensoes', dimensoes.trim())
      formData.append('descricao', descricao.trim())
      formData.append('quantidade_estoque', String(quantidadeEstoque))
      formData.append('valor_locacao_diaria', String(valorLocacaoDiaria))
      formData.append('valor_locacao_mensal', String(valorLocacaoDiaria))
      if (fotoFile) {
        formData.append('foto', fotoFile)
      }

      // Adicionar os 9 atributos (vazio quando 'NONE' para desvincular)
      const atrMap: Record<string, string> = {
        atr01,
        atr02,
        atr03,
        atr04,
        atr05,
        atr06,
        atr07,
        atr08,
        atr09,
      }
      for (const [key, val] of Object.entries(atrMap)) {
        formData.append(key, val === 'NONE' ? '' : val)
      }

      if (editingProduto) {
        await produtosService.update(editingProduto.id, formData)
        toast({
          title: 'Produto atualizado!',
          description: `${nome} foi alterado com sucesso.`,
        })
      } else {
        await produtosService.create(formData)
        toast({
          title: 'Produto criado!',
          description: `${nome} foi adicionado ao catálogo TIDELLI.`,
        })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar móvel',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, nomeProd: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${nomeProd}"?`)) return
    try {
      await produtosService.delete(id)
      toast({
        title: 'Produto excluído',
        description: 'O móvel foi removido do catálogo com sucesso.',
      })
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o produto.',
      })
    }
  }

  // Contagem de produtos por categoria e por linha para os filtros
  const contagemPorCategoria = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of produtos) {
      if (p.tipo) {
        map[p.tipo] = (map[p.tipo] || 0) + 1
      }
    }
    return map
  }, [produtos])

  const contagemPorLinha = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of produtos) {
      if (p.linha) {
        map[p.linha] = (map[p.linha] || 0) + 1
      }
    }
    return map
  }, [produtos])

  const filteredProdutos = produtos.filter((p) => {
    const matchTipo = tipoFilter === 'TODOS' || p.tipo === tipoFilter
    const matchLinha = linhaFilter === 'TODAS' || p.linha === linhaFilter

    const term = searchTerm.toLowerCase()
    const nomeCategoria = p.expand?.tipo?.nome?.toLowerCase() || ''
    const nomeLinha = p.expand?.linha?.nome?.toLowerCase() || ''

    // Buscar também pelos atributos vinculados (código ou descrição)
    const atrStrings: string[] = []
    const atrKeys: (keyof NonNullable<ProdutoRecord['expand']>)[] = [
      'atr01',
      'atr02',
      'atr03',
      'atr04',
      'atr05',
      'atr06',
      'atr07',
      'atr08',
      'atr09',
    ]
    if (p.expand) {
      for (const k of atrKeys) {
        const atrObj = p.expand[k] as AtributoRecord | undefined
        if (atrObj) {
          if (atrObj.codigo_atr) atrStrings.push(atrObj.codigo_atr.toLowerCase())
          if (atrObj.descricao_atr) atrStrings.push(atrObj.descricao_atr.toLowerCase())
        }
      }
    }

    const codigoTerm = p.codigo ? p.codigo.toLowerCase() : ''
    const matchSearch =
      codigoTerm.includes(term) ||
      p.nome.toLowerCase().includes(term) ||
      nomeLinha.includes(term) ||
      nomeCategoria.includes(term) ||
      atrStrings.some((s) => s.includes(term)) ||
      (p.descricao && p.descricao.toLowerCase().includes(term))

    return matchTipo && matchLinha && matchSearch
  })

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <Package className="h-4 w-4" />
            <span>Fabricados por TIDELLI</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Catálogo de Móveis</h2>
          <p className="text-sm text-[#6B6B6B]">
            Gerenciamento físico dos modelos disponíveis para aluguel.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Móvel TIDELLI</span>
        </Button>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por nome, linha, categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>

        {/* Filtro por Categoria com Contagem */}
        <div className="w-full sm:w-56">
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="bg-white border-[#E5E0DA]">
              <SelectValue placeholder="Filtrar por Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas as Categorias ({produtos.length})</SelectItem>
              {categorias.map((cat) => {
                const count = contagemPorCategoria[cat.id] || 0
                return (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nome.toUpperCase()} ({count})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Linha com Contagem */}
        <div className="w-full sm:w-56">
          <Select value={linhaFilter} onValueChange={setLinhaFilter}>
            <SelectTrigger className="bg-white border-[#E5E0DA]">
              <SelectValue placeholder="Filtrar por Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas as Linhas</SelectItem>
              {linhas.map((lin) => {
                const count = contagemPorLinha[lin.id] || 0
                return (
                  <SelectItem key={lin.id} value={lin.id}>
                    Linha {lin.nome} ({count})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Produtos em Cards */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
        </div>
      ) : filteredProdutos.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-12 text-center text-[#6B6B6B]">
          Nenhum produto encontrado no catálogo.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProdutos.map((p) => {
            const imageUrl = produtosService.getImageUrl(p)
            const nomeCategoria = p.expand?.tipo?.nome || 'Móvel'
            const nomeLinha = p.expand?.linha?.nome

            return (
              <div
                key={p.id}
                className="lp-card rounded-2xl overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Foto ou Placeholder estilizado */}
                  <div className="relative h-48 w-full bg-[#EFECE8] flex items-center justify-center overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={p.nome}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-[#A0A0A0]">
                        <Armchair className="h-10 w-10 text-[#C4B8AB]" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">
                          Móvel TIDELLI
                        </span>
                      </div>
                    )}
                    {p.codigo && (
                      <Badge className="absolute top-3 left-3 bg-white/90 text-[#2B2B2B] border border-[#E5E0DA] font-mono font-bold text-[10px] uppercase shadow-xs">
                        {p.codigo}
                      </Badge>
                    )}
                    <Badge className="absolute top-3 right-3 bg-[#2B2B2B]/85 text-white font-semibold text-[10px] uppercase backdrop-blur-xs">
                      {nomeCategoria}
                    </Badge>
                  </div>

                  {/* Informações */}
                  <div className="p-4 space-y-2">
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        {nomeLinha ? (
                          <span className="inline-block text-[11px] font-semibold text-[#A67C52] tracking-wide">
                            Linha {nomeLinha}
                          </span>
                        ) : (
                          <span />
                        )}
                        {p.codigo && (
                          <span className="text-[10px] font-mono font-semibold text-[#8C8C8C] bg-[#FAF7F3] px-1.5 py-0.5 rounded border border-[#E5E0DA]">
                            {p.codigo}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-[#2B2B2B] line-clamp-1">{p.nome}</h3>
                    </div>{' '}
                    {p.dimensoes && (
                      <p className="text-xs text-[#6B6B6B]">Dimensões: {p.dimensoes}</p>
                    )}
                    {p.descricao && (
                      <p className="text-xs text-[#6B6B6B] line-clamp-2">{p.descricao}</p>
                    )}
                    {/* Chips discretos de Atributos Vinculados (regra: vazio não aparece e não quebra) */}
                    {(() => {
                      const chips: Array<{ id: string; codigo: string; desc: string }> = []
                      const keys: (keyof NonNullable<ProdutoRecord['expand']>)[] = [
                        'atr01',
                        'atr02',
                        'atr03',
                        'atr04',
                        'atr05',
                        'atr06',
                        'atr07',
                        'atr08',
                        'atr09',
                      ]
                      if (p.expand) {
                        for (const k of keys) {
                          const atrRec = p.expand[k] as AtributoRecord | undefined
                          if (atrRec && atrRec.codigo_atr) {
                            chips.push({
                              id: atrRec.id,
                              codigo: atrRec.codigo_atr,
                              desc: atrRec.descricao_atr || atrRec.codigo_atr,
                            })
                          }
                        }
                      }
                      if (chips.length === 0) return null

                      return (
                        <div className="pt-1.5 flex flex-wrap gap-1 items-center">
                          {chips.map((chip, idx) => (
                            <span
                              key={`${chip.id}-${idx}`}
                              title={`${chip.codigo} — ${chip.desc}`}
                              className="inline-flex items-center text-[10px] font-medium bg-[#F4F1EA] text-[#6B6B6B] border border-[#E5E0DA] px-2 py-0.5 rounded-md hover:text-[#2B2B2B] hover:border-[#A67C52] transition-colors"
                            >
                              {chip.desc}
                            </span>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="border-t border-[#E5E0DA] pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#6B6B6B]">Locação Diária</div>
                      <div className="text-base font-extrabold text-[#A67C52]">
                        {formatCurrency(p.valor_locacao_diaria ?? p.valor_locacao_mensal ?? 0)}
                        <span className="text-[10px] font-normal text-[#6B6B6B]">/dia</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#6B6B6B]">Estoque / Hoje</div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-xs font-bold text-[#2B2B2B]">
                          {p.quantidade_estoque} un.
                        </span>
                        {(() => {
                          const dispHoje = disponibilidadeHojeMap[p.id] ?? p.quantidade_estoque
                          const semEstoque = dispHoje <= 0
                          return (
                            <span
                              title={`Disponível hoje: ${dispHoje} de ${p.quantidade_estoque} un.`}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                semEstoque
                                  ? 'bg-red-100 text-red-700'
                                  : dispHoje < p.quantidade_estoque
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {dispHoje} livre(s)
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#F1ECE6]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(p)}
                      className="flex-1 h-8 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1 text-[#A67C52]" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id, p.nome)}
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      title="Excluir móvel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar Produto */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingProduto ? 'Editar Móvel TIDELLI' : 'Novo Móvel para Aluguel'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Preencha os dados do móvel para inclusão ou atualização no catálogo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prodCodigo" className="text-xs font-semibold text-[#2B2B2B]">
                  Código <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="prodCodigo"
                  value={codigo}
                  onChange={(e) => {
                    setCodigo(e.target.value)
                    if (formErrors.codigo) setFormErrors((p) => ({ ...p, codigo: '' }))
                  }}
                  placeholder="Ex: TDL-MAU-001"
                  className="bg-[#FBF9F6] border-[#E5E0DA] font-mono text-xs uppercase"
                />
                {formErrors.codigo && <p className="text-xs text-red-600">{formErrors.codigo}</p>}
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="prodNome" className="text-xs font-semibold text-[#2B2B2B]">
                  Nome do Produto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="prodNome"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value)
                    if (formErrors.nome) setFormErrors((p) => ({ ...p, nome: '' }))
                  }}
                  placeholder="Ex: Sofá Retrátil Maui 3 Lugares"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.nome && <p className="text-xs text-red-600">{formErrors.nome}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Dropdown de Linha alimentado pela coleção 'linhas' (com opção vazia) */}
              <div className="space-y-1.5">
                <Label htmlFor="prodLinha" className="text-xs font-semibold text-[#2B2B2B]">
                  Linha <span className="text-[11px] font-normal text-[#8C8C8C]">(opcional)</span>
                </Label>
                <Select value={linhaId} onValueChange={setLinhaId}>
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue placeholder="Nenhuma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem linha específica</SelectItem>
                    {formLinhas.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        Linha {l.nome} {!l.ativo ? '(inativa)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dropdown de Categoria alimentado pela coleção 'categorias' (obrigatório) */}
              <div className="space-y-1.5">
                <Label htmlFor="prodTipo" className="text-xs font-semibold text-[#2B2B2B]">
                  Categoria <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={tipoId}
                  onValueChange={(val) => {
                    setTipoId(val)
                    if (formErrors.tipoId) setFormErrors((p) => ({ ...p, tipoId: '' }))
                  }}
                >
                  <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formCategorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome.toUpperCase()} {!c.ativo ? '(inativa)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.tipoId && <p className="text-xs text-red-600">{formErrors.tipoId}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodDim" className="text-xs font-semibold text-[#2B2B2B]">
                  Dimensões (L x P x A)
                </Label>
                <Input
                  id="prodDim"
                  value={dimensoes}
                  onChange={(e) => setDimensoes(e.target.value)}
                  placeholder="Ex: 240 x 110 x 85 cm"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prodValor" className="text-xs font-semibold text-[#2B2B2B]">
                  Valor Locação Diária (R$/dia)
                </Label>
                <Input
                  id="prodValor"
                  type="number"
                  min="1"
                  step="1"
                  value={valorLocacaoDiaria}
                  onChange={(e) => setValorLocacaoDiaria(Number(e.target.value))}
                  placeholder="Ex: 50"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.valorLocacaoDiaria && (
                  <p className="text-xs text-red-600">{formErrors.valorLocacaoDiaria}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodEstoque" className="text-xs font-semibold text-[#2B2B2B]">
                  Estoque Físico Total
                </Label>
                <Input
                  id="prodEstoque"
                  type="number"
                  min="0"
                  value={quantidadeEstoque}
                  onChange={(e) => setQuantidadeEstoque(Number(e.target.value))}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.quantidadeEstoque && (
                  <p className="text-xs text-red-600">{formErrors.quantidadeEstoque}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prodDesc" className="text-xs font-semibold text-[#2B2B2B]">
                Descrição Detalhada e Acabamento
              </Label>
              <Textarea
                id="prodDesc"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes de materiais, corda náutica, estrutura de alumínio, tecidos..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prodFoto" className="text-xs font-semibold text-[#2B2B2B]">
                Foto do Móvel
              </Label>
              <Input
                id="prodFoto"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFotoFile(e.target.files[0])
                  }
                }}
                className="bg-[#FBF9F6] border-[#E5E0DA] text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#A67C52] file:text-white hover:file:bg-[#8C643F]"
              />
            </div>

            {/* Seção ATRIBUTOS: 9 selects (ATR01 a ATR09) alimentados pela coleção atributos */}
            <div className="rounded-xl border border-[#E5E0DA] bg-[#FAF7F3] p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#2B2B2B]">
                  <Palette className="h-4 w-4 text-[#A67C52]" />
                  <span>Atributos do Móvel (Cores, Tecidos & Acabamentos)</span>
                </div>
                <span className="text-[11px] text-[#8C8C8C]">ATR01 a ATR09 (todos opcionais)</span>
              </div>

              {atributosDuplicadosAviso && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Aviso: o mesmo atributo foi selecionado em mais de um campo deste produto.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { label: 'ATR01', val: atr01, setVal: setAtr01 },
                  { label: 'ATR02', val: atr02, setVal: setAtr02 },
                  { label: 'ATR03', val: atr03, setVal: setAtr03 },
                  { label: 'ATR04', val: atr04, setVal: setAtr04 },
                  { label: 'ATR05', val: atr05, setVal: setAtr05 },
                  { label: 'ATR06', val: atr06, setVal: setAtr06 },
                  { label: 'ATR07', val: atr07, setVal: setAtr07 },
                  { label: 'ATR08', val: atr08, setVal: setAtr08 },
                  { label: 'ATR09', val: atr09, setVal: setAtr09 },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <Label className="text-[11px] font-semibold text-[#6B6B6B]">{item.label}</Label>
                    <Select value={item.val} onValueChange={item.setVal}>
                      <SelectTrigger className="bg-white border-[#E5E0DA] h-8 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="NONE">— (vazio)</SelectItem>
                        {formAtributos.map((atr) => (
                          <SelectItem key={atr.id} value={atr.id} className="text-xs">
                            {atr.codigo_atr} — {atr.descricao_atr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4">
              {' '}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-[#E5E0DA]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white"
              >
                {isSaving ? 'Salvando...' : editingProduto ? 'Salvar Móvel' : 'Cadastrar no Acervo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
