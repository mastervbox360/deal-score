import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
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
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<Home />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/deal/new" element={<NewDealPage />} />
          <Route path="/deal/:id" element={<DealPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/investors" element={<InvestorsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
