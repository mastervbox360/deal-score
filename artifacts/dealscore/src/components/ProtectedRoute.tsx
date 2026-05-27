import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div style={{ padding: 40 }}>Loading...</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
