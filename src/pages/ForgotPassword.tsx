import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Informe um endereço de e-mail válido.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await pb.collection('users').requestPasswordReset(email.trim())
      setSubmitted(true)
      toast({
        title: 'Solicitação enviada!',
        description: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.',
      })
    } catch (err: unknown) {
      console.error(err)
      // Por segurança, mostramos sucesso mesmo se o e-mail não existir
      setSubmitted(true)
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
            <h1 className="mt-4 text-2xl font-bold text-[#2B2B2B]">Recuperar Senha</h1>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Digite seu e-mail cadastrado para receber as instruções de recuperação.
            </p>
          </div>

          {submitted ? (
            <div className="mt-6 flex flex-col items-center text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2B2B2B]">E-mail enviado!</p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Verifique a caixa de entrada do endereço <strong>{email}</strong> com o link para
                  criar uma nova senha.
                </p>
              </div>
              <Link to="/login" className="w-full">
                <Button className="w-full bg-[#A67C52] hover:bg-[#8C643F] text-white mt-2">
                  Voltar para o Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-[#2B2B2B]">
                  Seu e-mail cadastrado
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@lpmoveis.com.br"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError(null)
                  }}
                  className="h-11 bg-[#FBF9F6] border-[#E5E0DA]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#A67C52] hover:bg-[#8C643F] text-white font-semibold text-sm transition-all"
              >
                {loading ? (
                  'Enviando...'
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Enviar Link de Recuperação</span>
                  </div>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B6B6B] hover:text-[#2B2B2B]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar para o Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
