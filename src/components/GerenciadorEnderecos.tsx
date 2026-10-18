import React, { useState } from 'react'
import type { EnderecoRecord } from '@/types/database'
import { enderecosService, type CreateEnderecoDTO } from '@/services/enderecos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  AlertTriangle,
  Building,
  PowerOff,
  Power,
} from 'lucide-react'

interface GerenciadorEnderecosProps {
  clienteId: string
  clienteNome: string
  enderecos: EnderecoRecord[]
  onEnderecosChange: () => void
  readOnly?: boolean
}

export function GerenciadorEnderecos({
  clienteId,
  clienteNome,
  enderecos,
  onEnderecosChange,
  readOnly = false,
}: GerenciadorEnderecosProps) {
  // Modal Novo / Editar Endereço
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [identificacao, setIdentificacao] = useState('')
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [uf, setUf] = useState('SP')
  const [cep, setCep] = useState('')
  const [principal, setPrincipal] = useState(false)
  const [ativo, setAtivo] = useState(true)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Estado para exclusão e bloqueio
  const [deletingEndereco, setDeletingEndereco] = useState<EnderecoRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [bloqueioMsg, setBloqueioMsg] = useState<string | null>(null)
  const [isBloqueioOpen, setIsBloqueioOpen] = useState(false)

  const openCreateModal = () => {
    setEditingId(null)
    setIdentificacao(enderecos.length === 0 ? 'PRINCIPAL' : '')
    setLogradouro('')
    setNumero('')
    setComplemento('')
    setBairro('')
    setCidade('SÃO PAULO')
    setUf('SP')
    setCep('')
    // Se for o primeiro endereço do cliente, pré-marca como principal
    setPrincipal(enderecos.length === 0)
    setAtivo(true)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (end: EnderecoRecord) => {
    setEditingId(end.id)
    setIdentificacao(end.identificacao || '')
    setLogradouro(end.logradouro || '')
    setNumero(end.numero || '')
    setComplemento(end.complemento || '')
    setBairro(end.bairro || '')
    setCidade(end.cidade || '')
    setUf(end.uf || 'SP')
    setCep(end.cep || '')
    setPrincipal(!!end.principal)
    setAtivo(end.ativo !== false)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!logradouro.trim()) errs.logradouro = 'Logradouro é obrigatório.'
    if (!numero.trim()) errs.numero = 'Número é obrigatório.'
    if (!bairro.trim()) errs.bairro = 'Bairro é obrigatório.'
    if (!cidade.trim()) errs.cidade = 'Cidade é obrigatória.'
    if (!uf.trim()) errs.uf = 'UF é obrigatória.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      const data: CreateEnderecoDTO = {
        cliente: clienteId,
        identificacao: identificacao.trim().toUpperCase(),
        logradouro: logradouro.trim().toUpperCase(),
        numero: numero.trim().toUpperCase(),
        complemento: complemento.trim().toUpperCase(),
        bairro: bairro.trim().toUpperCase(),
        cidade: cidade.trim().toUpperCase(),
        uf: uf.trim().toUpperCase(),
        cep: cep.trim().toUpperCase(),
        principal,
        ativo,
      }

      if (editingId) {
        await enderecosService.update(editingId, data)
        toast({
          title: 'Endereço atualizado!',
          description: 'As alterações foram salvas com sucesso.',
        })
      } else {
        await enderecosService.create(data)
        toast({
          title: 'Endereço cadastrado!',
          description: 'Novo endereço vinculado ao cliente com sucesso.',
        })
      }

      setIsModalOpen(false)
      onEnderecosChange()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar endereço',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetPrincipal = async (end: EnderecoRecord) => {
    try {
      await enderecosService.setPrincipal(end.id, clienteId)
      toast({
        title: 'Endereço Principal Definido!',
        description: `${end.identificacao || end.logradouro} agora é o endereço padrão deste cliente.`,
      })
      onEnderecosChange()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao definir principal',
        description: err instanceof Error ? err.message : 'Não foi possível alterar o principal.',
      })
    }
  }

  const handleToggleAtivo = async (end: EnderecoRecord) => {
    try {
      await enderecosService.toggleAtivo(end.id, end.ativo !== false)
      toast({
        title: end.ativo !== false ? 'Endereço desativado' : 'Endereço reativado',
        description:
          end.ativo !== false
            ? 'O endereço não aparecerá em novos orçamentos, mas seu histórico foi mantido.'
            : 'O endereço voltou a ficar disponível para novos orçamentos.',
      })
      onEnderecosChange()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }

  const confirmDelete = async () => {
    if (!deletingEndereco) return
    setIsDeleting(true)
    try {
      await enderecosService.delete(deletingEndereco.id)
      toast({
        title: 'Endereço excluído!',
        description: 'O endereço foi removido com sucesso da base.',
      })
      setDeletingEndereco(null)
      onEnderecosChange()
    } catch (err: unknown) {
      console.error(err)
      const errorMsg =
        err instanceof Error ? err.message : 'Não foi possível excluir este endereço.'
      // Se for bloqueio por vínculo, abrir modal claro de orientação com alternativa de desativação
      setBloqueioMsg(errorMsg)
      setIsBloqueioOpen(true)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#A67C52]" />
          <h4 className="text-xs font-bold text-[#2B2B2B] uppercase tracking-wider">
            Endereços Cadastrados ({enderecos.length})
          </h4>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="sm"
            onClick={openCreateModal}
            className="h-7 text-xs bg-[#A67C52] hover:bg-[#8C643F] text-white gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>Adicionar Endereço</span>
          </Button>
        )}
      </div>

      {enderecos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E5E0DA] bg-[#FAF7F3] p-5 text-center text-xs text-[#6B6B6B]">
          <p className="font-semibold text-[#2B2B2B]">
            Nenhum endereço cadastrado para este cliente.
          </p>
          <p className="mt-1 text-[11px]">
            Cadastre ao menos um endereço para permitir a emissão de orçamentos e contratos.
          </p>
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              onClick={openCreateModal}
              className="mt-3 h-7 text-xs bg-[#A67C52] hover:bg-[#8C643F] text-white"
            >
              Cadastrar Primeiro Endereço
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {enderecos.map((end) => {
            const isAtivo = end.ativo !== false
            return (
              <div
                key={end.id}
                className={`rounded-xl border p-3 transition-colors ${
                  end.principal
                    ? 'border-[#A67C52] bg-[#FAF7F3]/80'
                    : isAtivo
                      ? 'border-[#E5E0DA] bg-white'
                      : 'border-[#E5E0DA] bg-zinc-50 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-[#2B2B2B]">
                        {end.identificacao || 'ENDEREÇO'}
                      </span>
                      {end.principal && (
                        <Badge className="bg-[#A67C52] text-white text-[10px] font-bold uppercase gap-1 px-1.5 py-0">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          <span>Principal</span>
                        </Badge>
                      )}
                      {!isAtivo && (
                        <Badge
                          variant="outline"
                          className="bg-zinc-200 text-zinc-700 text-[10px] uppercase"
                        >
                          Inativo
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-[#2B2B2B]">
                      <strong>{end.logradouro}</strong>, {end.numero}
                      {end.complemento && <span> - {end.complemento}</span>}
                    </p>
                    <p className="text-[11px] text-[#6B6B6B]">
                      {end.bairro} • {end.cidade}/{end.uf}
                      {end.cep && <span> • CEP {end.cep}</span>}
                    </p>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-1 self-end sm:self-auto pt-1 sm:pt-0">
                      {!end.principal && isAtivo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrincipal(end)}
                          className="h-7 text-[11px] text-[#A67C52] hover:bg-[#FAF7F3] px-2 gap-1"
                          title="Tornar este o endereço padrão do cliente"
                        >
                          <Star className="h-3 w-3" />
                          <span className="hidden sm:inline">Definir Principal</span>
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(end)}
                        className="h-7 w-7 p-0 text-[#6B6B6B] hover:bg-[#FAF7F3]"
                        title="Editar endereço"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtivo(end)}
                        className="h-7 w-7 p-0 text-[#6B6B6B] hover:bg-[#FAF7F3]"
                        title={isAtivo ? 'Desativar endereço' : 'Reativar endereço'}
                      >
                        {isAtivo ? (
                          <PowerOff className="h-3.5 w-3.5 text-zinc-500" />
                        ) : (
                          <Power className="h-3.5 w-3.5 text-emerald-600" />
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingEndereco(end)}
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                        title="Excluir endereço"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar/Editar Endereço */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingId ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              Endereço para o cliente <strong>{clienteNome}</strong>. Textos serão salvos em
              MAIÚSCULO.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="endIdent" className="text-xs font-semibold text-[#2B2B2B]">
                  Identificação / Apelido do Endereço
                </Label>
                <Input
                  id="endIdent"
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value.toUpperCase())}
                  placeholder="EX: RESIDÊNCIA JARDINS, ESCRITÓRIO PAULISTA..."
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endCep" className="text-xs font-semibold text-[#2B2B2B]">
                  CEP
                </Label>
                <Input
                  id="endCep"
                  value={cep}
                  onChange={(e) => setCep(e.target.value.toUpperCase())}
                  placeholder="01310-200"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1">
                <Label htmlFor="endLogr" className="text-xs font-semibold text-[#2B2B2B]">
                  Logradouro (Rua, Av., Al.) *
                </Label>
                <Input
                  id="endLogr"
                  value={logradouro}
                  onChange={(e) => {
                    setLogradouro(e.target.value.toUpperCase())
                    if (formErrors.logradouro) setFormErrors((p) => ({ ...p, logradouro: '' }))
                  }}
                  placeholder="AV. PAULISTA"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.logradouro && (
                  <p className="text-xs text-red-600">{formErrors.logradouro}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="endNum" className="text-xs font-semibold text-[#2B2B2B]">
                  Número *
                </Label>
                <Input
                  id="endNum"
                  value={numero}
                  onChange={(e) => {
                    setNumero(e.target.value.toUpperCase())
                    if (formErrors.numero) setFormErrors((p) => ({ ...p, numero: '' }))
                  }}
                  placeholder="1500"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.numero && <p className="text-xs text-red-600">{formErrors.numero}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="endComp" className="text-xs font-semibold text-[#2B2B2B]">
                  Complemento
                </Label>
                <Input
                  id="endComp"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value.toUpperCase())}
                  placeholder="APTO 82, BLOCO B..."
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="endBairro" className="text-xs font-semibold text-[#2B2B2B]">
                  Bairro *
                </Label>
                <Input
                  id="endBairro"
                  value={bairro}
                  onChange={(e) => {
                    setBairro(e.target.value.toUpperCase())
                    if (formErrors.bairro) setFormErrors((p) => ({ ...p, bairro: '' }))
                  }}
                  placeholder="BELA VISTA"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.bairro && <p className="text-xs text-red-600">{formErrors.bairro}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="endCidade" className="text-xs font-semibold text-[#2B2B2B]">
                  Cidade *
                </Label>
                <Input
                  id="endCidade"
                  value={cidade}
                  onChange={(e) => {
                    setCidade(e.target.value.toUpperCase())
                    if (formErrors.cidade) setFormErrors((p) => ({ ...p, cidade: '' }))
                  }}
                  placeholder="SÃO PAULO"
                  className="bg-[#FBF9F6] border-[#E5E0DA]"
                />
                {formErrors.cidade && <p className="text-xs text-red-600">{formErrors.cidade}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="endUf" className="text-xs font-semibold text-[#2B2B2B]">
                  UF *
                </Label>
                <Input
                  id="endUf"
                  maxLength={2}
                  value={uf}
                  onChange={(e) => {
                    setUf(e.target.value.toUpperCase())
                    if (formErrors.uf) setFormErrors((p) => ({ ...p, uf: '' }))
                  }}
                  placeholder="SP"
                  className="bg-[#FBF9F6] border-[#E5E0DA] text-center"
                />
                {formErrors.uf && <p className="text-xs text-red-600">{formErrors.uf}</p>}
              </div>
            </div>

            <div className="pt-2 border-t border-[#F1ECE6] flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#2B2B2B]">
                <input
                  type="checkbox"
                  checked={principal}
                  onChange={(e) => setPrincipal(e.target.checked)}
                  className="rounded border-[#E5E0DA] text-[#A67C52] focus:ring-[#A67C52]"
                />
                <span>Definir como Endereço Principal do Cliente</span>
              </label>

              {editingId && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#6B6B6B]">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="rounded border-[#E5E0DA] text-[#A67C52] focus:ring-[#A67C52]"
                  />
                  <span>Ativo</span>
                </label>
              )}
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
                {isSaving ? 'Salvando...' : editingId ? 'Atualizar Endereço' : 'Salvar Endereço'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog
        open={deletingEndereco !== null}
        onOpenChange={(open) => !open && setDeletingEndereco(null)}
      >
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#2B2B2B]">
              Excluir Endereço?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B6B6B]">
              Tem certeza que deseja excluir o endereço{' '}
              <strong>{deletingEndereco?.identificacao || deletingEndereco?.logradouro}</strong>? Se
              houver orçamentos ou contratos vinculados a ele, a exclusão será bloqueada pelo
              sistema para proteção do histórico comercial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E5E0DA]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de bloqueio de exclusão amigável com opção de desativar */}
      <Dialog open={isBloqueioOpen} onOpenChange={setIsBloqueioOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-[#2B2B2B]">
                Exclusão Não Permitida
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B6B6B] pt-2">
              {bloqueioMsg ||
                'Este endereço possui orçamentos ou contratos vinculados e não pode ser deletado fisicamente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-[#FAF7F3] border border-[#E5E0DA] p-3 rounded-lg text-xs space-y-1.5 text-[#2B2B2B]">
            <p className="font-semibold">Alternativa recomendada:</p>
            <p className="text-[#6B6B6B]">
              Em vez de excluir, você pode <strong>desativar o endereço</strong>. Ele deixará de
              aparecer nas opções de novos orçamentos, mas todo o histórico dos contratos passados
              será preservado com segurança.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBloqueioOpen(false)
                setDeletingEndereco(null)
              }}
              className="border-[#E5E0DA]"
            >
              Entendido, manter endereço
            </Button>
            {deletingEndereco && (
              <Button
                type="button"
                onClick={async () => {
                  try {
                    await enderecosService.update(deletingEndereco.id, { ativo: false })
                    toast({
                      title: 'Endereço desativado com sucesso!',
                      description: 'O endereço agora está inativo para novos orçamentos.',
                    })
                    setIsBloqueioOpen(false)
                    setDeletingEndereco(null)
                    onEnderecosChange()
                  } catch (e) {
                    console.error(e)
                  }
                }}
                className="bg-[#A67C52] hover:bg-[#8C643F] text-white"
              >
                Desativar Endereço Agora
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
