import React, { useEffect, useState, useMemo } from 'react'
import { linhasService } from '@/services/linhas'
import { produtosService } from '@/services/produtos'
import type { LinhaRecord } from '@/types/database'
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
import { Sparkles, Plus, Search, Edit3, Trash2, AlertTriangle, Package } from 'lucide-react'

export default function AdminLinhas() {
  const [linhas, setLinhas] = useState<LinhaRecord[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Criar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLinha, setEditingLinha] = useState<LinhaRecord | null>(null)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ordem, setOrdem] = useState<number>(1)
  const [ativo, setAtivo] = useState<boolean>(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Modal Aviso Bloqueio Exclusão
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockedLinha, setBlockedLinha] = useState<LinhaRecord | null>(null)
  const [blockedCount, setBlockedCount] = useState<number>(0)

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await linhasService.getAll()
      setLinhas(list)

      // Carregar produtos para calcular contagem de vinculados
      const prods = await produtosService.getAll()
      const lMap: Record<string, number> = {}
      for (const p of prods) {
        if (p.linha) {
          lMap[p.linha] = (lMap[p.linha] || 0) + 1
        }
      }
      setCounts(lMap)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar linhas',
        description: 'Não foi possível buscar a lista de linhas.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime
  useRealtime<LinhaRecord>('linhas', () => loadData())

  const openCreateModal = () => {
    setEditingLinha(null)
    setNome('')
    setDescricao('')
    setOrdem(linhas.length + 1)
    setAtivo(true)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (lin: LinhaRecord) => {
    setEditingLinha(lin)
    setNome(lin.nome)
    setDescricao(lin.descricao || '')
    setOrdem(lin.ordem ?? 1)
    setAtivo(lin.ativo !== false)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'O nome da linha é obrigatório.'
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

      if (editingLinha) {
        await linhasService.update(editingLinha.id, payload)
        toast({
          title: 'Linha atualizada!',
          description: `A linha "${nome}" foi atualizada com sucesso.`,
        })
      } else {
        await linhasService.create(payload)
        toast({
          title: 'Linha criada!',
          description: `A linha "${nome}" foi cadastrada com sucesso.`,
        })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar linha',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (lin: LinhaRecord) => {
    const qtdVinculada = counts[lin.id] || 0
    if (qtdVinculada > 0) {
      setBlockedLinha(lin)
      setBlockedCount(qtdVinculada)
      setBlockModalOpen(true)
      return
    }

    if (!window.confirm(`Tem certeza que deseja excluir a linha "${lin.nome}"?`)) return

    try {
      await linhasService.delete(lin.id)
      toast({
        title: 'Linha excluída',
        description: 'A linha foi removida com sucesso.',
      })
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Não foi possível excluir a linha.',
      })
    }
  }

  const handleDesativar = async (lin: LinhaRecord) => {
    try {
      await linhasService.update(lin.id, { ativo: false })
      toast({
        title: 'Linha desativada',
        description: `A linha "${lin.nome}" foi desativada e não aparecerá em novos cadastros.`,
      })
      setBlockModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao desativar',
        description: err instanceof Error ? err.message : 'Não foi possível alterar a linha.',
      })
    }
  }

  const filteredLinhas = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return linhas.filter((l) => {
      const matchNome = l.nome.toLowerCase().includes(term)
      const matchDesc = (l.descricao || '').toLowerCase().includes(term)
      return matchNome || matchDesc
    })
  }, [linhas, searchTerm])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <Sparkles className="h-4 w-4" />
            <span>Coleções & Acabamentos TIDELLI</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Linhas de Produtos</h2>
          <p className="text-sm text-[#6B6B6B]">
            Gerencie as linhas de design (Maui, Biarritz, Club, Tulum, Maragogi, Trancoso, Painho,
            Noronha, etc.).
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Linha</span>
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

      {/* Tabela de Linhas */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : filteredLinhas.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">Nenhuma linha encontrada.</div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Ordem</th>
                <th className="px-4 py-3">Nome da Linha</th>
                <th className="px-4 py-3">Descrição do Conceito</th>
                <th className="px-4 py-3">Produtos Vinculados</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {filteredLinhas.map((lin) => {
                const qtd = counts[lin.id] || 0
                return (
                  <tr key={lin.id} className="hover:bg-[#FAF7F3] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-xs text-[#A67C52]">
                      #{lin.ordem ?? '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#2B2B2B]">Linha {lin.nome}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#6B6B6B] max-w-md">
                      {lin.descricao || '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B2B2B] bg-[#F7F5F2] px-2.5 py-1 rounded-md border border-[#E5E0DA]">
                        <Package className="h-3.5 w-3.5 text-[#A67C52]" />
                        <span>{qtd} móvel(is)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {lin.ativo !== false ? (
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
                          onClick={() => openEditModal(lin)}
                          className="h-8 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1 text-[#A67C52]" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(lin)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          title="Excluir linha"
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

      {/* Modal Criar / Editar Linha */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingLinha ? 'Editar Linha TIDELLI' : 'Nova Linha de Produtos'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Defina o nome da linha, conceito, ordem de exibição e disponibilidade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="linNome" className="text-xs font-semibold text-[#2B2B2B]">
                Nome da Linha <span className="text-red-500">*</span>
              </Label>
              <Input
                id="linNome"
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value)
                  if (formErrors.nome) setFormErrors((p) => ({ ...p, nome: '' }))
                }}
                placeholder="Ex: Maui, Biarritz, Tulum..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.nome && <p className="text-xs text-red-600">{formErrors.nome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linDesc" className="text-xs font-semibold text-[#2B2B2B]">
                Conceito / Materiais{' '}
                <span className="text-[11px] font-normal text-[#8C8C8C]">(opcional)</span>
              </Label>
              <Textarea
                id="linDesc"
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Acabamentos em corda náutica, estrutura em alumínio e tecidos nobres..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="linOrdem" className="text-xs font-semibold text-[#2B2B2B]">
                  Ordem de Exibição
                </Label>
                <Input
                  id="linOrdem"
                  type="number"
                  min="0"
                  value={ordem}
                  onChange={(e) => setOrdem(Number(e.target.value))}
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>

              <div className="flex items-center justify-between pt-5 px-2">
                <Label
                  htmlFor="linAtivo"
                  className="text-xs font-semibold text-[#2B2B2B] cursor-pointer"
                >
                  Linha Ativa
                </Label>
                <Switch id="linAtivo" checked={ativo} onCheckedChange={setAtivo} />
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
                {isSaving ? 'Salvando...' : editingLinha ? 'Salvar Alterações' : 'Criar Linha'}
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
                Não é possível excluir esta linha
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B6B6B] pt-2 leading-relaxed">
              Existem <strong>{blockedCount} móvel(is)</strong> cadastrados na linha{' '}
              <strong className="text-[#2B2B2B]">"{blockedLinha?.nome}"</strong>. Para preservar a
              integridade dos contratos e do catálogo, a exclusão direta é bloqueada.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-2">
            <p className="font-semibold">O que você pode fazer?</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
              <li>
                <strong>Desativar a linha:</strong> ela deixa de aparecer para novas inclusões, mas
                preserva o histórico de todos os produtos existentes.
              </li>
              <li>
                <strong>Reclassificar os produtos:</strong> altere o cadastro dos móveis vinculados
                para outra linha antes de tentar excluir.
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
            {blockedLinha && (
              <Button
                onClick={() => handleDesativar(blockedLinha)}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white font-semibold text-xs"
              >
                Desativar Linha
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
