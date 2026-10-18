import React, { useEffect, useState, useMemo } from 'react'
import { produtosService } from '@/services/produtos'
import { categoriasService } from '@/services/categorias'
import { linhasService } from '@/services/linhas'
import type { ProdutoRecord, CategoriaRecord, LinhaRecord } from '@/types/database'
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
import { Armchair, Plus, Search, Edit3, Trash2, Package } from 'lucide-react'

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState<ProdutoRecord[]>([])
  const [categorias, setCategorias] = useState<CategoriaRecord[]>([])
  const [linhas, setLinhas] = useState<LinhaRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [tipoFilter, setTipoFilter] = useState('TODOS') // 'TODOS' ou categoria.id
  const [linhaFilter, setLinhaFilter] = useState('TODAS') // 'TODAS' ou linha.id
  const [searchTerm, setSearchTerm] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduto, setEditingProduto] = useState<ProdutoRecord | null>(null)

  // Form Fields
  const [nome, setNome] = useState('')
  const [linhaId, setLinhaId] = useState('')
  const [tipoId, setTipoId] = useState('')
  const [dimensoes, setDimensoes] = useState('')
  const [descricao, setDescricao] = useState('')
  const [quantidadeEstoque, setQuantidadeEstoque] = useState<number>(1)
  const [valorLocacaoMensal, setValorLocacaoMensal] = useState<number>(200)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [pList, cList, lList] = await Promise.all([
        produtosService.getAll(),
        categoriasService.getAll(),
        linhasService.getAll(),
      ])
      setProdutos(pList)
      setCategorias(cList)
      setLinhas(lList)
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

  const openCreateModal = () => {
    setEditingProduto(null)
    setNome('')
    setLinhaId('NONE')
    // Categoria padrão: a primeira ativa ou vazia
    const firstCat = categorias.find((c) => c.ativo)
    setTipoId(firstCat?.id || '')
    setDimensoes('')
    setDescricao('')
    setQuantidadeEstoque(1)
    setValorLocacaoMensal(250)
    setFotoFile(null)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (p: ProdutoRecord) => {
    setEditingProduto(p)
    setNome(p.nome)
    setLinhaId(p.linha || 'NONE')
    setTipoId(p.tipo || '')
    setDimensoes(p.dimensoes || '')
    setDescricao(p.descricao || '')
    setQuantidadeEstoque(p.quantidade_estoque || 0)
    setValorLocacaoMensal(p.valor_locacao_mensal || 0)
    setFotoFile(null)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'O nome do produto é obrigatório.'
    if (!tipoId || tipoId === 'NONE') errs.tipoId = 'A categoria é obrigatória.'
    if (quantidadeEstoque < 0) errs.quantidadeEstoque = 'Quantidade não pode ser negativa.'
    if (valorLocacaoMensal <= 0)
      errs.valorLocacaoMensal = 'O valor mensal deve ser superior a zero.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('tipo', tipoId)
      formData.append('linha', linhaId === 'NONE' ? '' : linhaId)
      formData.append('dimensoes', dimensoes.trim())
      formData.append('descricao', descricao.trim())
      formData.append('quantidade_estoque', String(quantidadeEstoque))
      formData.append('valor_locacao_mensal', String(valorLocacaoMensal))
      if (fotoFile) {
        formData.append('foto', fotoFile)
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

    const matchSearch =
      p.nome.toLowerCase().includes(term) ||
      nomeLinha.includes(term) ||
      nomeCategoria.includes(term) ||
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
                    <Badge className="absolute top-3 right-3 bg-[#2B2B2B]/85 text-white font-semibold text-[10px] uppercase backdrop-blur-xs">
                      {nomeCategoria}
                    </Badge>
                  </div>

                  {/* Informações */}
                  <div className="p-4 space-y-2">
                    <div>
                      {nomeLinha && (
                        <span className="inline-block text-[11px] font-semibold text-[#A67C52] tracking-wide mb-0.5">
                          Linha {nomeLinha}
                        </span>
                      )}
                      <h3 className="font-bold text-base text-[#2B2B2B] line-clamp-1">{p.nome}</h3>
                    </div>
                    {p.dimensoes && (
                      <p className="text-xs text-[#6B6B6B]">Dimensões: {p.dimensoes}</p>
                    )}
                    {p.descricao && (
                      <p className="text-xs text-[#6B6B6B] line-clamp-2">{p.descricao}</p>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="border-t border-[#E5E0DA] pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#6B6B6B]">Locação Mensal</div>
                      <div className="text-base font-extrabold text-[#A67C52]">
                        {formatCurrency(p.valor_locacao_mensal)}
                        <span className="text-[10px] font-normal text-[#6B6B6B]">/mês</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-[#6B6B6B]">Estoque</div>
                      <span className="text-xs font-bold text-[#2B2B2B]">
                        {p.quantidade_estoque} un.
                      </span>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                  Valor Locação Mensal (R$)
                </Label>
                <Input
                  id="prodValor"
                  type="number"
                  min="1"
                  step="1"
                  value={valorLocacaoMensal}
                  onChange={(e) => setValorLocacaoMensal(Number(e.target.value))}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.valorLocacaoMensal && (
                  <p className="text-xs text-red-600">{formErrors.valorLocacaoMensal}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodEstoque" className="text-xs font-semibold text-[#2B2B2B]">
                  Estoque Disponível
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
                rows={3}
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

            <DialogFooter className="pt-4">
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
