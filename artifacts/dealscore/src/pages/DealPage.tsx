import { useParams } from 'react-router-dom'

export default function DealPage() {
  const { id } = useParams()
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Deal</h1>
      <p>Deal ID: {id}</p>
    </div>
  )
}
