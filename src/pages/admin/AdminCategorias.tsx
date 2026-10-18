import React, { useEffect, useState, useMemo } from 'react'
import { categoriasService } from '@/services/categorias'
import { produtosService } from '@/services/produtos'
import type { CategoriaRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
} from 'lucide-react'

export default function AdminCategorias() {
  const [categorias, setCategorias] = useState<CategoriaRecord[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Criar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaRecord | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [ativo, setAtivo] = useState<boolean>(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Modal Aviso Bloqueio Exclusão
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockedCategoria, setBlockedCategoria] = useState<CategoriaRecord | null>(null)
  const [blockedCount, setBlockedCount] = useState<number>(0)

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await categoriasService.getAll()
      setCategorias(list)

      // Carregar produtos para calcular contagem de vinculados
      const prods = await produtosService.getAll()
      const cMap: Record<string, number> = {}
      for (const p of prods) {
        if (p.tipo) {
          cMap[p.tipo] = (cMap[p.tipo] || 0) + 1
        }
      }
      setCounts(cMap)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar categorias',
        description: 'Não foi possível buscar a lista de categorias.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime
  useRealtime<CategoriaRecord>('categorias', () => loadData())

  const openCreateModal = () => {
    setEditingCategoria(null)
    setNome('')
    setDescricao('')
    setOrdem(categorias.length + 1)
    setAtivo(true)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (cat: CategoriaRecord) => {
    setEditingCategoria(cat)
    setNome(cat.nome)
    setDescricao(cat.descricao || '')
    setOrdem(cat.ordem ?? 1)
    setAtivo(cat.ativo !== false)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'O nome da categoria é obrigatório.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        ordem: Number(ordem) || 0,
        ativo,
      }

      if (editingCategoria) {
        await categoriasService.update(editingCategoria.id, payload)
        toast({
          title: 'Categoria atualizada!',
          description: `A categoria "${nome}" foi atualizada com sucesso.`,
        })
      } else {
        await categoriasService.create(payload)
        toast({
          title: 'Categoria criada!',
          description: `A categoria "${nome}" foi cadastrada com sucesso.`,
        })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar categoria',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (cat: CategoriaRecord) => {
    const qtdVinculada = counts[cat.id] || 0
    if (qtdVinculada > 0) {
      setBlockedCategoria(cat)
      setBlockedCount(qtdVinculada)
      setBlockModalOpen(true)
      return
    }

    if (!window.confirm(`Tem certeza que deseja excluir a categoria "${cat.nome}"?`)) return

    try {
      await categoriasService.delete(cat.id)
      toast({
        title: 'Categoria excluída',
        description: 'A categoria foi removida com sucesso.',
      })
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Não foi possível excluir a categoria.',
      })
    }
  }

  const handleDesativar = async (cat: CategoriaRecord) => {
    try {
      await categoriasService.update(cat.id, { ativo: false })
      toast({
        title: 'Categoria desativada',
        description: `A categoria "${cat.nome}" foi desativada e não aparecerá em novos cadastros.`,
      })
      setBlockModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao desativar',
        description: err instanceof Error ? err.message : 'Não foi possível alterar a categoria.',
      })
    }
  }

  const filteredCategorias = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return categorias.filter((c) => {
      const matchNome = c.nome.toLowerCase().includes(term)
      const matchDesc = (c.descricao || '').toLowerCase().includes(term)
      return matchNome || matchDesc
    })
  }, [categorias, searchTerm])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <Layers className="h-4 w-4" />
            <span>Gerenciamento de Entidades</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Categorias de Móveis</h2>
          <p className="text-sm text-[#6B6B6B]">
            Cadastre, edite e organize os tipos de produtos disponíveis no sistema.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Categoria</span>
        </Button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>
      </div>

      {/* Tabela de Categorias */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : filteredCategorias.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhuma categoria encontrada.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Ordem</th>
                <th className="px-4 py-3">Nome da Categoria</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Produtos Vinculados</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {filteredCategorias.map((cat) => {
                const qtd = counts[cat.id] || 0
                return (
                  <tr key={cat.id} className="hover:bg-[#FAF7F3] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-xs text-[#A67C52]">
                      #{cat.ordem ?? '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#2B2B2B] capitalize">{cat.nome}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#6B6B6B] max-w-md">
                      {cat.descricao || '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B2B2B] bg-[#F7F5F2] px-2.5 py-1 rounded-md border border-[#E5E0DA]">
                        <Package className="h-3.5 w-3.5 text-[#A67C52]" />
                        <span>{qtd} móvel(is)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {cat.ativo !== false ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold uppercase"
                        >
                          Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-zinc-100 text-zinc-600 border-zinc-300 text-[10px] font-bold uppercase"
                        >
                          Inativa
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(cat)}
                          className="h-8 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1 text-[#A67C52]" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cat)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          title="Excluir categoria"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar / Editar Categoria */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Defina o nome, descrição, ordem de exibição e disponibilidade da categoria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="catNome" className="text-xs font-semibold text-[#2B2B2B]">
                Nome da Categoria <span className="text-red-500">*</span>
              </Label>
              <Input
                id="catNome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (formErrors.nome) setFormErrors((p) => ({ ...p, nome: '' }))
                }}
                placeholder="Ex: sofá, poltrona, mesa..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.nome && <p className="text-xs text-red-600">{formErrors.nome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catDesc" className="text-xs font-semibold text-[#2B2B2B]">
                Descrição <span className="text-[11px] font-normal text-[#8C8C8C]">(opcional)</span>
              </Label>
              <Textarea
                id="catDesc"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Sofás modulares, chaises e assentos para áreas sociais..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="catOrdem" className="text-xs font-semibold text-[#2B2B2B]">
                  Ordem de Exibição
                </Label>
                <Input
                  id="catOrdem"
                  type="number"
                  min="0"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>

              <div className="flex items-center justify-between pt-5 px-2">
                <Label
                  htmlFor="catAtivo"
                  className="text-xs font-semibold text-[#2B2B2B] cursor-pointer"
                >
                  Categoria Ativa
                </Label>
                <Switch id="catAtivo" checked={ativo} onCheckedChange={setAtivo} />
              </div>
            </div>

            <DialogFooter className="pt-3">
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
                {isSaving
                  ? 'Salvando...'
                  : editingCategoria
                    ? 'Salvar Alterações'
                    : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Bloqueio de Exclusão com Produtos Vinculados */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-[#2B2B2B]">
                Não é possível excluir esta categoria
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B6B6B] pt-2 leading-relaxed">
              Existem <strong>{blockedCount} móvel(is)</strong> cadastrados na categoria{' '}
              <strong className="text-[#2B2B2B]">"{blockedCategoria?.nome}"</strong>. Para preservar
              a integridade dos contratos e do catálogo, a exclusão direta é bloqueada.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-2">
            <p className="font-semibold">O que você pode fazer?</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
              <li>
                <strong>Desativar a categoria:</strong> ela deixa de aparecer para novas inclusões,
                mas preserva o histórico de todos os produtos existentes.
              </li>
              <li>
                <strong>Reclassificar os produtos:</strong> altere o cadastro dos móveis vinculados
                para outra categoria antes de tentar excluir.
              </li>
            </ul>
          </div>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setBlockModalOpen(false)}
              className="border-[#E5E0DA]"
            >
              Fechar
            </Button>
            {blockedCategoria && (
              <Button
                onClick={() => handleDesativar(blockedCategoria)}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white font-semibold text-xs"
              >
                Desativar Categoria
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
