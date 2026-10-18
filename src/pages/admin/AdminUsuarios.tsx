import React, { useEffect, useState } from 'react'
import { usuariosService } from '@/services/usuarios'
import type { UserRecord, UserRole } from '@/types/database'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { UserPlus, Search, Edit2, Shield, Check, X, MailCheck } from 'lucide-react'

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('TODOS')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('CLIENTE')
  const [isSaving, setIsSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      const list = await usuariosService.getAll({ role: roleFilter })
      setUsuarios(list)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível buscar a lista de usuários.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsuarios()
  }, [roleFilter])

  const openCreateModal = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setPassword('')
    setRole('CLIENTE')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (user: UserRecord) => {
    setEditingUser(user)
    setName(user.name || '')
    setEmail(user.email || '')
    setPassword('') // Opcional na edição
    setRole(user.role || 'CLIENTE')
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: { name?: string; email?: string; password?: string } = {}
    if (!name.trim()) errs.name = 'O nome completo é obrigatório.'
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) errs.email = 'E-mail válido é obrigatório.'

    if (!editingUser) {
      if (!password || password.length < 8) {
        errs.password = 'A senha deve conter no mínimo 8 caracteres.'
      }
    } else if (password && password.length < 8) {
      errs.password = 'Se for alterar, a nova senha deve ter no mínimo 8 caracteres.'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSaving(true)
    try {
      if (editingUser) {
        const payload: Partial<UserRecord> & { password?: string; passwordConfirm?: string } = {
          name: name.trim().toUpperCase(),
          role,
        }
        if (password) {
          payload.password = password
          payload.passwordConfirm = password
        }
        await usuariosService.update(editingUser.id, payload)
        toast({
          title: 'Usuário atualizado!',
          description: `Os dados de ${name} foram salvos com sucesso.`,
        })
      } else {
        await usuariosService.create({
          name: name.trim().toUpperCase(),
          email: email.trim(),
          password,
          passwordConfirm: password,
          role,
        })
        toast({
          title: 'Usuário criado com sucesso!',
          description: 'E-mail de verificação disparado automaticamente.',
        })
      }

      setIsModalOpen(false)
      loadUsuarios()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar usuário',
        description: err instanceof Error ? err.message : 'Verifique os dados informados.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredUsuarios = usuarios.filter((u) => {
    const term = searchTerm.toLowerCase()
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term))
    )
  })

  const getRoleBadge = (r: UserRole) => {
    if (r === 'ADMIN') return <Badge className="bg-amber-600 text-white font-semibold">ADMIN</Badge>
    if (r === 'VENDEDOR')
      return <Badge className="bg-[#4A7C59] text-white font-semibold">VENDEDOR</Badge>
    return <Badge className="bg-blue-600 text-white font-semibold">CLIENTE</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#2B2B2B]">Gestão de Usuários</h2>
          <p className="text-sm text-[#6B6B6B]">
            Controle de acessos, papéis (ADMIN, VENDEDOR, CLIENTE) e credenciais.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-[#A67C52] hover:bg-[#8C643F] text-white gap-2 shadow-xs"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-[#E5E0DA]"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="bg-white border-[#E5E0DA]">
              <SelectValue placeholder="Filtrar por Papel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Papéis</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="VENDEDOR">VENDEDOR</SelectItem>
              <SelectItem value="CLIENTE">CLIENTE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4 sm:p-6 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6B6B6B]">
            Nenhum usuário encontrado para os critérios selecionados.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-[#2B2B2B]">
            <thead className="bg-[#FAF7F3] text-xs font-bold uppercase tracking-wider text-[#6B6B6B]">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Status E-mail</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE6]">
              {filteredUsuarios.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF7F3] transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-[#2B2B2B]">
                    {u.name || 'Sem nome informado'}
                  </td>
                  <td className="px-4 py-3.5 text-[#6B6B6B]">{u.email}</td>
                  <td className="px-4 py-3.5">{getRoleBadge(u.role)}</td>
                  <td className="px-4 py-3.5">
                    {u.verified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4A7C59]">
                        <Check className="h-3.5 w-3.5" /> Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <MailCheck className="h-3.5 w-3.5" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[#6B6B6B]">
                    {u.created ? new Date(u.created).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(u)}
                      className="h-8 gap-1 text-xs font-medium text-[#A67C52] hover:bg-amber-50"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Criar / Editar Usuário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#2B2B2B]">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6B6B6B]">
              {editingUser
                ? 'Atualize as informações cadastrais e o nível de acesso.'
                : 'Cadastre um novo usuário com envio de verificação de e-mail.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="userName" className="text-xs font-semibold text-[#2B2B2B]">
                Nome Completo
              </Label>
              <Input
                id="userName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.toUpperCase())
                  if (formErrors.name) setFormErrors((p) => ({ ...p, name: '' }))
                }}
                placeholder="Ex: CARLOS OLIVEIRA"
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.name && <p className="text-xs text-red-600">{formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="userEmail" className="text-xs font-semibold text-[#2B2B2B]">
                E-mail
              </Label>
              <Input
                id="userEmail"
                type="email"
                disabled={!!editingUser}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formErrors.email) setFormErrors((p) => ({ ...p, email: undefined }))
                }}
                placeholder="carlos@lpmoveis.com.br"
                className={`bg-[#FBF9F6] border-[#E5E0DA] ${
                  editingUser ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
              {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="userRole" className="text-xs font-semibold text-[#2B2B2B]">
                Papel de Acesso
              </Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger className="bg-[#FBF9F6] border-[#E5E0DA]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">ADMIN (Acesso Total)</SelectItem>
                  <SelectItem value="VENDEDOR">VENDEDOR (Minhas Vendas & Carteira)</SelectItem>
                  <SelectItem value="CLIENTE">
                    CLIENTE (Orçamentos & Relatórios Próprios)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="userPass" className="text-xs font-semibold text-[#2B2B2B]">
                {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha Inicial'}
              </Label>
              <Input
                id="userPass"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (formErrors.password) setFormErrors((p) => ({ ...p, password: undefined }))
                }}
                placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
                className="bg-[#FBF9F6] border-[#E5E0DA]"
              />
              {formErrors.password && <p className="text-xs text-red-600">{formErrors.password}</p>}
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
                {isSaving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
