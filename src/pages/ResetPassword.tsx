import React, { useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { KeyRound, CheckCircle2 } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Token de recuperação não encontrado ou inválido na URL.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== passwordConfirm) {
      setError('As senhas digitadas não conferem.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      setSuccess(true)
      toast({
        title: 'Senha redefinida!',
        description: 'Sua nova senha foi salva com sucesso. Você já pode fazer login.',
      })
    } catch (err: unknown) {
      console.error(err)
      setError('Não foi possível redefinir a senha. O token pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F2] px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-8 shadow-md">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A67C52] text-white font-bold text-xl">
              LP
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#2B2B2B]">Redefinir Senha</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Crie uma nova senha segura para a sua conta.
            </p>
          </div>

          {!token && (
            <div className="mt-6 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              Link de redefinição inválido. Solicite um novo link na página de recuperação.
            </div>
          )}

          {success ? (
            <div className="mt-6 flex flex-col items-center text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-[#2B2B2B]">Senha alterada com sucesso!</p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-[#A67C52] hover:bg-[#8C643F] text-white"
              >
                Ir para o Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="space-y-1.5">
                <Label htmlFor="pass" className="text-xs font-semibold text-[#2B2B2B]">
                  Nova Senha (mínimo 8 caracteres)
                </Label>
                <Input
                  id="pass"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-[#FBF9F6] border-[#E5E0DA]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passConfirm" className="text-xs font-semibold text-[#2B2B2B]">
                  Confirmar Nova Senha
                </Label>
                <Input
                  id="passConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="h-11 bg-[#FBF9F6] border-[#E5E0DA]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !token}
                className="w-full h-11 bg-[#A67C52] hover:bg-[#8C643F] text-white font-semibold text-sm transition-all"
              >
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-[#6B6B6B] hover:text-[#2B2B2B]">
                  Cancelar e voltar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
