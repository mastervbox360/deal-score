import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { listDeals, deleteDeal } from '../lib/dealService'
import { Deal, DealStatus } from '../lib/database.types'

const NAVY = '#1B3A6B'

const STRATEGY_COLOURS: Record<Deal['strategy'], string> = {
  BTL:    '#1B3A6B',
  HMO:    '#0d7377',
  FLIP:   '#d97706',
  SA:     '#7c3aed',
  BRRR:   '#059669',
  R2R:    '#dc2626',
  SOCIAL: '#2563eb',
}

const STATUS_LABELS: Record<DealStatus, string> = {
  analysing:  'Analysing',
  reviewing:  'Reviewing',
  presenting: 'Presenting',
  closed:     'Closed',
  dead:       'Dead',
}

const STATUS_COLOURS: Record<DealStatus, { bg: string; text: string }> = {
  analysing:  { bg: '#fef3c7', text: '#92400e' },
  reviewing:  { bg: '#dbeafe', text: '#1e40af' },
  presenting: { bg: '#d1fae5', text: '#065f46' },
  closed:     { bg: '#f3f4f6', text: '#374151' },
  dead:       { bg: '#fee2e2', text: '#991b1b' },
}

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return '£' + value.toLocaleString('en-GB')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const fetchDeals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const data = await listDeals(user.id)
    setDeals(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  async function handleDelete(id: string) {
    setDeleting(prev => new Set(prev).add(id))
    const ok = await deleteDeal(id)
    if (ok) {
      setDeals(prev => prev.filter(d => d.id !== id))
    }
    setDeleting(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top nav bar */}
      <header style={{ backgroundColor: NAVY, padding: '0 32px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>
          Deal<span style={{ color: '#60a5fa' }}>Score</span>
        </span>
        <button
          onClick={() => navigate('/app')}
          style={{ backgroundColor: '#fff', color: NAVY, border: 'none', borderRadius: '6px', padding: '7px 16px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
        >
          + New deal
        </button>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
            My Deals {!loading && <span style={{ color: '#6b7280', fontWeight: 400, fontSize: '18px' }}>({deals.length})</span>}
          </h1>
          <button
            onClick={() => navigate('/app')}
            style={{ backgroundColor: NAVY, color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            + New deal
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: '15px' }}>
            Loading your deals…
          </div>
        )}

        {/* Empty state */}
        {!loading && deals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📋</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>No deals yet</h2>
            <p style={{ fontSize: '15px', color: '#6b7280', marginBottom: '24px' }}>
              Save a deal from the analyser to see it here
            </p>
            <button
              onClick={() => navigate('/app')}
              style={{ backgroundColor: NAVY, color: '#fff', border: 'none', borderRadius: '6px', padding: '11px 24px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
            >
              + Analyse a deal
            </button>
          </div>
        )}

        {/* Deal grid */}
        {!loading && deals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {deals.map(deal => {
              const statusStyle = STATUS_COLOURS[deal.status] ?? STATUS_COLOURS.analysing
              const strategyColour = STRATEGY_COLOURS[deal.strategy] ?? NAVY
              const isDeleting = deleting.has(deal.id)

              return (
                <div
                  key={deal.id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    opacity: isDeleting ? 0.5 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* Top row: strategy badge + status pill */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      backgroundColor: strategyColour,
                      color: '#fff',
                      borderRadius: '5px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}>
                      {deal.strategy}
                    </span>
                    <span style={{
                      backgroundColor: statusStyle.bg,
                      color: statusStyle.text,
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {STATUS_LABELS[deal.status]}
                    </span>
                  </div>

                  {/* Address */}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', lineHeight: '1.3' }}>
                      {deal.address || 'No address'}
                    </div>
                  </div>

                  {/* Price + reference */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Purchase price</div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: NAVY }}>{formatPrice(deal.purchase_price)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reference</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>{deal.reference}</div>
                    </div>
                  </div>

                  {/* Created date */}
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Created {formatDate(deal.created_at)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      onClick={() => navigate(`/app?deal=${deal.id}`)}
                      disabled={isDeleting}
                      style={{
                        flex: 1,
                        backgroundColor: NAVY,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '9px 0',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Open deal
                    </button>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      disabled={isDeleting}
                      style={{
                        backgroundColor: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '9px 14px',
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isDeleting ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
