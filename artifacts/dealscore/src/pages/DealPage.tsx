import { useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'

export default function DealPage() {
  const { id } = useParams()
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <AppHeader />
      <div style={{ padding: '40px' }}>
        <h1>Deal</h1>
        <p>Deal ID: {id}</p>
      </div>
    </div>
  )
}
