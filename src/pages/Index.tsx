import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Index() {
  const { user, role, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (role === 'ADMIN') {
      navigate('/admin', { replace: true })
    } else if (role === 'VENDEDOR') {
      navigate('/vendas', { replace: true })
    } else {
      navigate('/relatorio', { replace: true })
    }
  }, [user, role, isLoading, navigate])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
        <p className="text-sm font-semibold text-[#6B6B6B]">Redirecionando para seu painel...</p>
      </div>
    </div>
  )
}
