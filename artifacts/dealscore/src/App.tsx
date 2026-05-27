import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from '@/pages/Home'
import DashboardPage from './pages/DashboardPage'
import DealPage from './pages/DealPage'
import NewDealPage from './pages/NewDealPage'
import ProfilePage from './pages/ProfilePage'
import InvestorsPage from './pages/InvestorsPage'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/app" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/deal/new" element={<ProtectedRoute><NewDealPage /></ProtectedRoute>} />
            <Route path="/deal/:id" element={<ProtectedRoute><DealPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/investors" element={<ProtectedRoute><InvestorsPage /></ProtectedRoute>} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
