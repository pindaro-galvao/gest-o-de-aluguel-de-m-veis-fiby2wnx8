import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'

import Layout from './components/Layout'
import Index from './pages/Index'
import NotFound from './pages/NotFound'

// Auth Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ConfirmEmailChange from './pages/ConfirmEmailChange'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminProdutos from './pages/admin/AdminProdutos'
import AdminCategorias from './pages/admin/AdminCategorias'
import AdminLinhas from './pages/admin/AdminLinhas'
import AdminAtributos from './pages/admin/AdminAtributos'
import AdminRelatorios from './pages/admin/AdminRelatorios'

// Vendas & Orçamentos Pages
import VendedorDashboard from './pages/vendas/VendedorDashboard'
import VendasList from './pages/vendas/VendasList'
import OrcamentosList from './pages/orcamentos/OrcamentosList'

// Clientes & Relatório Cliente Pages
import ClientesList from './pages/clientes/ClientesList'
import ClienteRelatorio from './pages/cliente/ClienteRelatorio'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rotas Públicas de Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/confirm-email-change" element={<ConfirmEmailChange />} />

          {/* Rotas Protegidas dentro do Layout Principal */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />

            {/* Rotas ADMIN */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/produtos" element={<AdminProdutos />} />
            <Route path="/admin/categorias" element={<AdminCategorias />} />
            <Route path="/admin/linhas" element={<AdminLinhas />} />
            <Route path="/admin/atributos" element={<AdminAtributos />} />
            <Route path="/admin/relatorios" element={<AdminRelatorios />} />
            <Route path="/admin/vendas" element={<VendasList isAdminView={true} />} />
            <Route path="/admin/orcamentos" element={<OrcamentosList isAdminView={true} />} />
            <Route path="/admin/clientes" element={<ClientesList />} />

            {/* Rotas VENDEDOR */}
            <Route path="/vendas" element={<VendedorDashboard />} />
            <Route path="/orcamentos" element={<OrcamentosList isAdminView={false} />} />
            <Route path="/clientes" element={<ClientesList />} />

            {/* Rotas CLIENTE */}
            <Route path="/relatorio" element={<ClienteRelatorio />} />
          </Route>

          {/* 404 Handler */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
