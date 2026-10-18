import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { LogIn, AlertCircle, Sparkles } from 'lucide-react'
import type { UserRecord } from '@/types/database'

export default function Login() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errs.email = 'O e-mail é obrigatório.'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Insira um formato de e-mail válido.'
    }

    if (!password) {
      errs.password = 'A senha é obrigatória.'
    } else if (password.length < 6) {
      errs.password = 'A senha deve ter no mínimo 6 caracteres.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      const authData = await pb.collection('users').authWithPassword(email.trim(), password)
      await refreshUser()

      const userRecord = authData.record as unknown as UserRecord
      const role = userRecord.role || 'CLIENTE'

      toast({
        title: 'Bem-vindo(a)!',
        description: `Login realizado com sucesso como ${role}.`,
      })

      // Redirecionamento por papel
      if (role === 'ADMIN') {
        navigate('/admin', { replace: true })
      } else if (role === 'VENDEDOR') {
        navigate('/vendas', { replace: true })
      } else {
        navigate('/relatorio', { replace: true })
      }
    } catch (err: unknown) {
      console.error('Erro de autenticação:', err)
      const message = err instanceof Error ? err.message : 'Credenciais inválidas.'
      setErrors({
        general: 'E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.',
      })
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: 'Não foi possível autenticar com os dados informados.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = (emailQuick: string) => {
    setEmail(emailQuick)
    setPassword('Skip@Pass')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F2] px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Card de Login */}
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-8 shadow-md">
          {/* Topo / Logotipo */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#A67C52] text-white shadow-md font-extrabold text-2xl tracking-wider">
              LP
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#2B2B2B] tracking-tight">LP MÓVEIS</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Gestão de Aluguel de Móveis de Alto Padrão TIDELLI
            </p>
          </div>

          {/* Erro Geral */}
          {errors.general && (
            <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[#2B2B2B]">
                E-mail corporativo ou pessoal
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@lpmoveis.com.br"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
                }}
                className={`h-11 bg-[#FBF9F6] border-[#E5E0DA] focus-visible:ring-[#A67C52] ${
                  errors.email ? 'border-red-400 focus-visible:ring-red-400' : ''
                }`}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-[#2B2B2B]">
                  Senha
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#A67C52] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                }}
                className={`h-11 bg-[#FBF9F6] border-[#E5E0DA] focus-visible:ring-[#A67C52] ${
                  errors.password ? 'border-red-400 focus-visible:ring-red-400' : ''
                }`}
                autoComplete="current-password"
              />
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#A67C52] hover:bg-[#8C643F] text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm mt-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Entrando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  <span>Entrar no Sistema</span>
                </div>
              )}
            </Button>
          </form>

          {/* Atalhos para Contas de Demonstração */}
          <div className="mt-8 border-t border-[#E5E0DA] pt-5">
            <div className="flex items-center gap-1 text-xs font-semibold text-[#6B6B6B] mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-[#A67C52]" />
              <span>Acesso Rápido de Teste (Senha: Skip@Pass)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('pindaro.galvao@outlook.com')}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E5E0DA] bg-[#F7F5F2] p-2 text-center transition-colors hover:border-[#A67C52] hover:bg-white"
              >
                <span className="text-xs font-bold text-[#A67C52]">ADMIN</span>
                <span className="text-[10px] text-[#6B6B6B] truncate max-w-full">Píndaro</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('carlos.vendas@lpmoveis.com.br')}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E5E0DA] bg-[#F7F5F2] p-2 text-center transition-colors hover:border-[#4A7C59] hover:bg-white"
              >
                <span className="text-xs font-bold text-[#4A7C59]">VENDEDOR</span>
                <span className="text-[10px] text-[#6B6B6B] truncate max-w-full">Carlos</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('mariana.cliente@residencia.com.br')}
                className="flex flex-col items-center justify-center rounded-lg border border-[#E5E0DA] bg-[#F7F5F2] p-2 text-center transition-colors hover:border-blue-600 hover:bg-white"
              >
                <span className="text-xs font-bold text-blue-600">CLIENTE</span>
                <span className="text-[10px] text-[#6B6B6B] truncate max-w-full">Mariana</span>
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé do Login */}
        <p className="mt-6 text-center text-xs text-[#8C8C8C]">
          Produtos fabricados pela TIDELLI • Sem vínculo institucional
        </p>
      </div>
    </div>
  )
}
