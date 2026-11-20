import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Users,
  Armchair,
  Layers,
  FileText,
  BadgeDollarSign,
  Receipt,
  UserCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Palette,
  Calendar,
  Settings,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  path?: string
  icon: React.ComponentType<{ className?: string }>
  subItems?: { label: string; path: string }[]
}

export default function Layout() {
  const { user, role, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(true)
  const [configMenuOpen, setConfigMenuOpen] = useState(true)
  const [vendasMenuOpen, setVendasMenuOpen] = useState(true)

  // Se rota pública (login, reset-password etc.), apenas renderiza a página sem Layout
  const isAuthPage = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/confirm-email-change',
  ].includes(location.pathname)

  if (isAuthPage) {
    return <Outlet />
  }

  // Enquanto carrega a sessão PocketBase
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F5F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A67C52] border-t-transparent" />
          <p className="text-sm font-medium text-[#6B6B6B]">Carregando LP MÓVEIS...</p>
        </div>
      </div>
    )
  }

  // Redireciona para /login se não autenticado
  if (!user) {
    navigate('/login', { replace: true })
    return null
  }

  // Verificação de permissões por rota
  const path = location.pathname
  if (path.startsWith('/admin') && role !== 'ADMIN') {
    // Não tem permissão para /admin -> redireciona para a área correspondente
    if (role === 'VENDEDOR') {
      navigate('/vendas', { replace: true })
    } else {
      navigate('/relatorio', { replace: true })
    }
    return null
  }

  // Cliente não pode acessar rotas internas de vendedores/admin
  if (role === 'CLIENTE') {
    const allowed = ['/relatorio', '/orcamentos']
    if (!allowed.some((p) => path === p || path.startsWith(p + '/'))) {
      navigate('/relatorio', { replace: true })
      return null
    }
  }

  // Vendedor não pode acessar /admin
  if (role === 'VENDEDOR' && path.startsWith('/admin')) {
    navigate('/vendas', { replace: true })
    return null
  }

  // Itens de Menu conforme papel
  const renderMenuItems = () => {
    if (role === 'ADMIN') {
      return (
        <div className="flex flex-col gap-1.5 px-3">
          {/* Seção ADMINISTRAÇÃO com submenu */}
          <div>
            <button
              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wider text-[#A0A0A0] uppercase hover:bg-[#383838] hover:text-[#FFFFFF] transition-colors"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4 text-[#A67C52]" />
                <span>ADMINISTRAÇÃO</span>
              </div>
              {adminMenuOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {adminMenuOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-[#404040] pl-2">
                <NavLink
                  to="/admin"
                  end
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Painel Geral
                </NavLink>
                <NavLink
                  to="/admin/usuarios"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <Users className="h-4 w-4" />
                  Usuários
                </NavLink>
                <NavLink
                  to="/admin/produtos"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <Armchair className="h-4 w-4" />
                  Produtos TIDELLI
                </NavLink>

                {/* Submenu CONFIGURAÇÃO (Categorias, Linhas, Atributos) */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => setConfigMenuOpen(!configMenuOpen)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold tracking-wider text-[#B0B0B0] uppercase hover:bg-[#383838] hover:text-[#FFFFFF] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-[#A67C52]" />
                      <span>CONFIGURAÇÃO</span>
                    </div>
                    {configMenuOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {configMenuOpen && (
                    <div className="ml-3 mt-1 flex flex-col gap-1 border-l border-[#505050] pl-2">
                      <NavLink
                        to="/admin/categorias"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#A67C52] text-white'
                              : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                          }`
                        }
                      >
                        <Layers className="h-3.5 w-3.5" />
                        CATEGORIAS
                      </NavLink>
                      <NavLink
                        to="/admin/linhas"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#A67C52] text-white'
                              : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                          }`
                        }
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        LINHAS
                      </NavLink>
                      <NavLink
                        to="/admin/atributos"
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#A67C52] text-white'
                              : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                          }`
                        }
                      >
                        <Palette className="h-3.5 w-3.5" />
                        ATRIBUTOS
                      </NavLink>
                    </div>
                  )}
                </div>

                <NavLink
                  to="/admin/calendario"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <Calendar className="h-4 w-4" />
                  Calendário de Ocupação
                </NavLink>
                <NavLink
                  to="/admin/relatorios"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <FileText className="h-4 w-4" />
                  Relatórios Gerais
                </NavLink>
              </div>
            )}
          </div>

          {/* Seção VENDAS */}
          <div className="mt-2">
            <button
              onClick={() => setVendasMenuOpen(!vendasMenuOpen)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wider text-[#A0A0A0] uppercase hover:bg-[#383838] hover:text-[#FFFFFF] transition-colors"
            >
              <div className="flex items-center gap-2">
                <BadgeDollarSign className="h-4 w-4 text-[#A67C52]" />
                <span>VENDAS</span>
              </div>
              {vendasMenuOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {vendasMenuOpen && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-[#404040] pl-2">
                <NavLink
                  to="/admin/vendas"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <BadgeDollarSign className="h-4 w-4" />
                  Todas as Vendas
                </NavLink>
                <NavLink
                  to="/admin/orcamentos"
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#A67C52] text-white'
                        : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                    }`
                  }
                >
                  <Receipt className="h-4 w-4" />
                  Todos os Orçamentos
                </NavLink>
              </div>
            )}
          </div>

          {/* Seção CLIENTES */}
          <div className="mt-2">
            <NavLink
              to="/admin/clientes"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#A67C52] text-white shadow-sm'
                    : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
                }`
              }
            >
              <UserCheck className="h-4 w-4 text-[#A67C52]" />
              CLIENTES
            </NavLink>
          </div>
        </div>
      )
    }

    if (role === 'VENDEDOR') {
      return (
        <div className="flex flex-col gap-1.5 px-3">
          <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-[#8A8A8A] uppercase">
            VENDAS
          </div>
          <NavLink
            to="/vendas"
            end
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#A67C52] text-white shadow-sm'
                  : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
              }`
            }
          >
            <BadgeDollarSign className="h-4 w-4 text-[#A67C52]" />
            Minhas Vendas
          </NavLink>
          <NavLink
            to="/vendas/calendario"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#A67C52] text-white shadow-sm'
                  : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
              }`
            }
          >
            <Calendar className="h-4 w-4 text-[#A67C52]" />
            Calendário de Ocupação
          </NavLink>
          <NavLink
            to="/orcamentos"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#A67C52] text-white shadow-sm'
                  : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
              }`
            }
          >
            <Receipt className="h-4 w-4 text-[#A67C52]" />
            Meus Orçamentos
          </NavLink>

          <div className="mt-4 px-3 py-1 text-[11px] font-bold tracking-wider text-[#8A8A8A] uppercase">
            CARTEIRA
          </div>
          <NavLink
            to="/clientes"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#A67C52] text-white shadow-sm'
                  : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
              }`
            }
          >
            <UserCheck className="h-4 w-4 text-[#A67C52]" />
            Clientes
          </NavLink>
        </div>
      )
    }

    // Papel CLIENTE
    return (
      <div className="flex flex-col gap-1.5 px-3">
        <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-[#8A8A8A] uppercase">
          ÁREA DO CLIENTE
        </div>
        <NavLink
          to="/orcamentos"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#A67C52] text-white shadow-sm'
                : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
            }`
          }
        >
          <Receipt className="h-4 w-4 text-[#A67C52]" />
          ORÇAMENTOS
        </NavLink>
        <NavLink
          to="/relatorio"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#A67C52] text-white shadow-sm'
                : 'text-[#D0D0D0] hover:bg-[#383838] hover:text-white'
            }`
          }
        >
          <FileText className="h-4 w-4 text-[#A67C52]" />
          RELATÓRIO
        </NavLink>
      </div>
    )
  }

  const getPageTitle = () => {
    if (path === '/admin') return 'Painel Geral da Administração'
    if (path === '/admin/usuarios') return 'Gestão de Usuários'
    if (path === '/admin/produtos') return 'Catálogo de Produtos TIDELLI'
    if (path === '/admin/calendario' || path === '/vendas/calendario')
      return 'Calendário de Ocupação por Produto'
    if (path === '/admin/categorias') return 'Gestão de Categorias'
    if (path === '/admin/linhas') return 'Gestão de Linhas TIDELLI'
    if (path === '/admin/atributos') return 'Gestão de Atributos (Cores & Materiais)'
    if (path === '/admin/relatorios') return 'Relatórios Gerais Consolidados'
    if (path === '/admin/vendas' || path === '/vendas') return 'Gestão de Vendas & Locações'
    if (path === '/admin/orcamentos' || path === '/orcamentos') return 'Orçamentos & Cotações'
    if (path === '/admin/clientes' || path === '/clientes') return 'Gestão de Clientes'
    if (path === '/relatorio') return 'Meu Relatório de Locações'
    return 'LP MÓVEIS'
  }

  const getBadgeStyle = () => {
    if (role === 'ADMIN') return 'bg-amber-600/30 text-amber-300 border-amber-500/40'
    if (role === 'VENDEDOR') return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
    return 'bg-blue-600/30 text-blue-300 border-blue-500/40'
  }

  return (
    <div className="flex min-h-screen bg-[#F7F5F2]">
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity duration-250"
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-[260px] flex-col bg-[#2B2B2B] text-white shadow-xl transition-transform duration-250 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Topo / Logotipo */}
        <div className="flex h-16 items-center justify-between border-b border-[#3E3E3E] px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#A67C52] text-white shadow-sm font-bold text-lg tracking-wider">
              LP
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wide text-base text-white">LP MÓVEIS</span>
              <span className="text-[10px] text-[#A67C52] font-semibold tracking-widest uppercase">
                Aluguel de Móveis
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-[#A0A0A0] hover:bg-[#383838] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Identificação do Usuário */}
        <div className="border-b border-[#383838] bg-[#242424] px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col truncate pr-2">
              <span
                className="text-xs font-semibold text-white truncate"
                title={user.name || user.email}
              >
                {user.name || user.email}
              </span>
              <span className="text-[11px] text-[#8C8C8C] truncate">{user.email}</span>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 border ${getBadgeStyle()}`}
            >
              {role}
            </Badge>
          </div>
        </div>

        {/* Menu de Navegação */}
        <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
          {renderMenuItems()}
        </div>

        {/* Selo TIDELLI fornecedor */}
        <div className="border-t border-[#383838] p-3 text-center bg-[#232323]">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#A0A0A0]">
            <Sparkles className="h-3 w-3 text-[#A67C52]" />
            <span>Móveis TIDELLI</span>
          </div>
          <p className="text-[10px] text-[#707070] mt-0.5">Sem vínculo institucional direto</p>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex flex-1 flex-col lg:pl-[260px] min-w-0">
        {/* Header Fixo */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E5E0DA] bg-white/95 px-4 lg:px-8 backdrop-blur-sm shadow-2xs">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-[#2B2B2B] hover:bg-[#F7F5F2]"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-[#2B2B2B] tracking-tight">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <span className="text-xs text-[#6B6B6B]">Olá,</span>
              <span className="text-xs font-semibold text-[#2B2B2B]">
                {user.name ? user.name.split(' ')[0] : 'Usuário'}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="h-9 gap-1.5 border-[#E5E0DA] text-[#2B2B2B] hover:bg-[#F1ECE6] hover:text-[#B23B3B] transition-colors font-medium text-xs sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </Button>
          </div>
        </header>

        {/* Área de conteúdo das páginas com padding e animação */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Rodapé Discreto */}
        <footer className="border-t border-[#E5E0DA] bg-white px-4 py-4 text-center text-xs text-[#6B6B6B]">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>© {new Date().getFullYear()} LP MÓVEIS — Gestão de Aluguel de Móveis.</span>
            <span className="hidden sm:inline">•</span>
            <span>
              Produtos fabricados pela{' '}
              <a
                href="https://www.tidelli.com"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#A67C52] hover:underline"
              >
                TIDELLI
              </a>{' '}
              (fornecedor de produtos, sem vínculo institucional).
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
