import React, { useEffect, useState, useMemo } from 'react'
import { atributosService } from '@/services/atributos'
import { produtosService } from '@/services/produtos'
import type { AtributoRecord } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Palette,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
} from 'lucide-react'

export default function AdminAtributos() {
  const [atributos, setAtributos] = useState<AtributoRecord[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Criar / Editar
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAtributo, setEditingAtributo] = useState<AtributoRecord | null>(null)
  const [codigoAtr, setCodigoAtr] = useState('')
  const [descricaoAtr, setDescricaoAtr] = useState('')
  const [ativo, setAtivo] = useState<boolean>(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Modal Aviso Bloqueio Exclusão
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [blockedAtributo, setBlockedAtributo] = useState<AtributoRecord | null>(null)
  const [blockedCount, setBlockedCount] = useState<number>(0)

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await atributosService.getAll()
      setAtributos(list)

      // Carregar produtos para calcular contagem de vinculados nos 9 campos atr01..atr09
      const prods = await produtosService.getAll()
      const cMap: Record<string, number> = {}

      for (const p of prods) {
        const atrFields = [
          p.atr01,
          p.atr02,
          p.atr03,
          p.atr04,
          p.atr05,
          p.atr06,
          p.atr07,
          p.atr08,
          p.atr09,
        ]
        const uniqueInProd = new Set(atrFields.filter((id): id is string => Boolean(id)))
        uniqueInProd.forEach((atrId) => {
          cMap[atrId] = (cMap[atrId] || 0) + 1
        })
      }
      setCounts(cMap)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar atributos',
        description: 'Não foi possível buscar a lista de atributos.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime
  useRealtime<AtributoRecord>('atributos', () => loadData())

  const openCreateModal = () => {
    setEditingAtributo(null)
    setCodigoAtr('')
    setDescricaoAtr('')
    setAtivo(true)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (atr: AtributoRecord) => {
    setEditingAtributo(atr)
    setCodigoAtr(atr.codigo_atr)
    setDescricaoAtr(atr.descricao_atr)
    setAtivo(atr.ativo !== false)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    const trimmedCod = codigoAtr.trim().toUpperCase()
    const trimmedDesc = descricaoAtr.trim().toUpperCase()

    if (!trimmedCod) {
      errs.codigoAtr = 'O código do atributo (CODIGO_ATR) é obrigatório.'
    } else {
      // Validação em tempo real de código duplicado
      const exists = atributos.some(
        (a) => a.id !== editingAtributo?.id && a.codigo_atr?.trim().toUpperCase() === trimmedCod,
      )
      if (exists) {
        errs.codigoAtr = 'Este código já está em uso por outro atributo.'
      }
    }

    if (!trimmedDesc) {
      errs.descricaoAtr = 'A descrição do atributo (DESCRICAO_ATR) é obrigatória.'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const payload = {
        codigo_atr: codigoAtr.trim().toUpperCase(),
        descricao_atr: descricaoAtr.trim().toUpperCase(),
        ativo,
      }

      if (editingAtributo) {
        await atributosService.update(editingAtributo.id, payload)
        toast({
          title: 'Atributo atualizado!',
          description: `O atributo "${payload.codigo_atr}" foi atualizado com sucesso.`,
        })
      } else {
        await atributosService.create(payload)
        toast({
          title: 'Atributo criado!',
          description: `O atributo "${payload.codigo_atr}" foi cadastrado com sucesso.`,
        })
      }

      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar atributo',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (atr: AtributoRecord) => {
    const qtdVinculada = counts[atr.id] || 0
    if (qtdVinculada > 0) {
      setBlockedAtributo(atr)
      setBlockedCount(qtdVinculada)
      setBlockModalOpen(true)
      return
    }

    if (
      !window.confirm(
        `Tem certeza que deseja excluir o atributo "${atr.codigo_atr} — ${atr.descricao_atr}"?`,
      )
    )
      return

    try {
      await atributosService.delete(atr.id)
      toast({
        title: 'Atributo excluído',
        description: 'O atributo foi removido com sucesso.',
      })
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Não foi possível excluir o atributo.',
      })
    }
  }

  const handleDesativar = async (atr: AtributoRecord) => {
    try {
      await atributosService.update(atr.id, { ativo: false })
      toast({
        title: 'Atributo desativado',
        description: `O atributo "${atr.codigo_atr}" foi desativado e não aparecerá para novas seleções.`,
      })
      setBlockModalOpen(false)
      loadData()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao desativar',
        description: err instanceof Error ? err.message : 'Não foi possível alterar o atributo.',
      })
    }
  }

  const filteredAtributos = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return atributos.filter((a) => {
      const matchCod = a.codigo_atr.toLowerCase().includes(term)
      const matchDesc = a.descricao_atr.toLowerCase().includes(term)
      return matchCod || matchDesc
    })
  }, [atributos, searchTerm])

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#A67C52]">
            <Palette className="h-4 w-4" />
            <span>Cores, Tecidos & Materiais TIDELLI</span>
          </div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Tabela de Atributos</h2>
          <p className="text-sm text-[#6B6B6B]">
            Gerenciamento de acabamentos, cores, cordas e tecidos para vinculação nos produtos
            (ATR01 a ATR09).
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Atributo</span>
        </Button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>
      </div>

      {/* Tabela de Atributos */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : filteredAtributos.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhum atributo encontrado.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Código (CODIGO_ATR)</th>
                <th className="px-4 py-3">Descrição (DESCRICAO_ATR)</th>
                <th className="px-4 py-3">Produtos Vinculados</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {filteredAtributos.map((atr) => {
                const qtd = counts[atr.id] || 0
                return (
                  <tr key={atr.id} className="hover:bg-[#FAF7F3] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-xs text-[#A67C52] bg-[#FAF7F3] px-2.5 py-1 rounded-md border border-[#E5E0DA]">
                        {atr.codigo_atr}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[#2B2B2B]">{atr.descricao_atr}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B2B2B] bg-[#F7F5F2] px-2.5 py-1 rounded-md border border-[#E5E0DA]">
                        <Package className="h-3.5 w-3.5 text-[#A67C52]" />
                        <span>{qtd} móvel(is)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {atr.ativo !== false ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold uppercase"
                        >
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-zinc-100 text-zinc-600 border-zinc-300 text-[10px] font-bold uppercase"
                        >
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(atr)}
                          className="h-8 text-xs border-[#E5E0DA] hover:bg-[#FAF7F3]"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1 text-[#A67C52]" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(atr)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          title="Excluir atributo"
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

      {/* Modal Criar / Editar Atributo */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingAtributo ? 'Editar Atributo' : 'Novo Atributo'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Defina o código de referência e a descrição do material, acabamento ou cor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="atrCodigo" className="text-xs font-semibold text-[#2B2B2B]">
                Código do Atributo (CODIGO_ATR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="atrCodigo"
                value={codigoAtr}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase()
                  setCodigoAtr(val)
                  if (formErrors.codigoAtr) setFormErrors((p) => ({ ...p, codigoAtr: '' }))
                }}
                placeholder="Ex: TECIDO-LINHO-BEGE, MADEIRA-TAUARI, COR-GRAFITE"
                className="bg-[#FBF9F6] border-[#E5E0DA] font-mono text-xs uppercase"
              />
              {formErrors.codigoAtr && (
                <p className="text-xs text-red-600">{formErrors.codigoAtr}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="atrDescricao" className="text-xs font-semibold text-[#2B2B2B]">
                Descrição do Atributo (DESCRICAO_ATR) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="atrDescricao"
                value={descricaoAtr}
                onChange={(e) => {
                  setDescricaoAtr(e.target.value.toUpperCase())
                  if (formErrors.descricaoAtr) setFormErrors((p) => ({ ...p, descricaoAtr: '' }))
                }}
                placeholder="Ex: TECIDO LINHO BEGE, MADEIRA TAUARI..."
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.descricaoAtr && (
                <p className="text-xs text-red-600">{formErrors.descricaoAtr}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 px-1">
              <div className="flex flex-col">
                <Label
                  htmlFor="atrAtivo"
                  className="text-xs font-semibold text-[#2B2B2B] cursor-pointer"
                >
                  Atributo Ativo
                </Label>
                <span className="text-[11px] text-[#8C8C8C]">
                  Disponível para seleção no formulário de produtos
                </span>
              </div>
              <Switch id="atrAtivo" checked={ativo} onCheckedChange={setAtivo} />
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
                  : editingAtributo
                    ? 'Salvar Alterações'
                    : 'Criar Atributo'}
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
                Não é possível excluir este atributo
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B6B6B] pt-2 leading-relaxed">
              Existem <strong>{blockedCount} móvel(is)</strong> que utilizam o atributo{' '}
              <strong className="text-[#2B2B2B]">
                "{blockedAtributo?.codigo_atr} — {blockedAtributo?.descricao_atr}"
              </strong>{' '}
              em seus campos de configuração (ATR01 a ATR09).
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 space-y-2">
            <p className="font-semibold">O que você pode fazer?</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
              <li>
                <strong>Desativar o atributo:</strong> ele deixará de aparecer para novas seleções
                em produtos, mantendo o histórico nos móveis já vinculados.
              </li>
              <li>
                <strong>Remover dos produtos:</strong> altere os produtos vinculados desmarcando
                este atributo antes de tentar excluí-lo definitivamente.
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
            {blockedAtributo && (
              <Button
                onClick={() => handleDesativar(blockedAtributo)}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white font-semibold text-xs"
              >
                Desativar Atributo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
