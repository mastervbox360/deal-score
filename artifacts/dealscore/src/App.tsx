import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from './lib/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from '@/pages/Home'
import DashboardPage from './pages/DashboardPage'
import DealPage from './pages/DealPage'
import ProfilePage from './pages/ProfilePage'
import InvestorsPage from './pages/InvestorsPage'
import SellersCrmPage from './pages/SellersCrmPage'
import InvestorsCrmPage from './pages/InvestorsCrmPage'
import PipelinePage from './pages/PipelinePage'
import ComparePage from './pages/ComparePage'
import HQPage from './pages/HQPage'
import LoginPage from './pages/LoginPage'
import InvestorSharePage from './pages/InvestorSharePage'
import AdvertBuilderPage from './pages/AdvertBuilderPage'
import CoverDesignerPage from './pages/CoverDesignerPage'
import RecommendationEnginePage from './pages/RecommendationEnginePage'

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
            {/* Public share page — no auth required */}
            <Route path="/share/:token" element={<InvestorSharePage />} />
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/deal/new" element={<Navigate to="/dashboard" replace />} />
            <Route path="/deal/:id" element={<ProtectedRoute><DealPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/investors" element={<ProtectedRoute><InvestorsPage /></ProtectedRoute>} />
            <Route path="/sellers-crm" element={<ProtectedRoute><SellersCrmPage /></ProtectedRoute>} />
            <Route path="/investors-crm" element={<ProtectedRoute><InvestorsCrmPage /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><PipelinePage /></ProtectedRoute>} />
            <Route path="/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
            <Route path="/hq" element={<ProtectedRoute><HQPage /></ProtectedRoute>} />
            <Route path="/advert-builder" element={<ProtectedRoute><AdvertBuilderPage /></ProtectedRoute>} />
            <Route path="/cover-designer" element={<ProtectedRoute><CoverDesignerPage /></ProtectedRoute>} />
            <Route path="/recommendation-engine" element={<ProtectedRoute><RecommendationEnginePage /></ProtectedRoute>} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
