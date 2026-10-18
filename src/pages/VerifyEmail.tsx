import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token de verificação ausente ou inválido.')
      setLoading(false)
      return
    }

    pb.collection('users')
      .confirmVerification(token)
      .then(() => {
        setSuccess(true)
      })
      .catch((err) => {
        console.error(err)
        setError('O token de verificação expirou ou já foi utilizado.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F5F2] px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-[#E5E0DA] bg-white p-8 text-center shadow-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#A67C52] text-white font-bold text-xl">
            LP
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[#2B2B2B]">Verificação de E-mail</h1>

          {loading && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#A67C52] border-t-transparent" />
              <p className="text-sm text-[#6B6B6B]">Validando sua conta...</p>
            </div>
          )}

          {!loading && success && (
            <div className="mt-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-[#2B2B2B]">
                Seu e-mail foi verificado com sucesso!
              </p>
              <p className="text-xs text-[#6B6B6B]">
                Sua conta está ativa e pronta para uso no sistema LP MÓVEIS.
              </p>
              <Link to="/login" className="block w-full pt-2">
                <Button className="w-full bg-[#A67C52] hover:bg-[#8C643F] text-white">
                  Acessar Minha Conta
                </Button>
              </Link>
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <Link to="/login" className="block w-full pt-2">
                <Button variant="outline" className="w-full border-[#E5E0DA]">
                  Voltar ao Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
