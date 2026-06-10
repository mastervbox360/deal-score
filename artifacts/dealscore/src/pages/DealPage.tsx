import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { loadDeal } from '../lib/dealService'
import { Deal } from '../lib/database.types'
import DealChrome, { TabKey } from '../components/DealChrome'
import AnalysisHub from '../components/AnalysisHub'
import DealOverview from '../components/DealOverview'

// ─── Tab content stubs ────────────────────────────────────────────────────────
// Each tab renders its own content inside the DealChrome shell.
// These stubs will be replaced with real tab components in subsequent stages.

const TEAL    = '#1D9E75'
const NAVY    = '#1B3A6B'
const BG_SEC  = '#f5f6f8'
const DS_BORDER = '#e3e5e9'

function TabStub({ label, deal }: { label: string; deal: Deal }) {
  return (
    <div style={{
      maxWidth: '1280px', margin: '0 auto', padding: '28px 24px 60px',
    }}>
      <div style={{
        background: '#fff', border: `.5px solid ${DS_BORDER}`, borderRadius: '12px',
        padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'rgba(27,58,107,.07)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '22px',
        }}>
          📋
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2332', marginBottom: '8px' }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', color: '#5a6270', marginBottom: '20px', lineHeight: 1.6 }}>
          This tab is coming soon. Deal: <strong>{deal.reference}</strong> · {deal.strategy}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 16px', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, color: NAVY }}>{deal.deal_score ?? 'No score'}</div>
            <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px' }}>Deal score</div>
          </div>
          <div style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 16px', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, color: TEAL }}>{deal.cash_flow !== null ? `£${Math.round(deal.cash_flow).toLocaleString('en-GB')}` : '—'}</div>
            <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px' }}>Monthly CF</div>
          </div>
          <div style={{ background: BG_SEC, border: `.5px solid ${DS_BORDER}`, borderRadius: '8px', padding: '10px 16px', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, color: '#374151' }}>{deal.gross_yield !== null ? `${deal.gross_yield.toFixed(1)}%` : '—'}</div>
            <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px' }}>Gross yield</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const VALID_TABS: TabKey[] = ['overview', 'analysis', 'content', 'seller', 'investors']

function parseTab(raw: string | null): TabKey {
  if (raw && (VALID_TABS as string[]).includes(raw)) return raw as TabKey
  return 'overview'
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DealPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = parseTab(searchParams.get('tab'))

  const [deal, setDeal]       = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return }
    setLoading(true)
    loadDeal(id).then(data => {
      if (!data) setNotFound(true)
      else setDeal(data)
      setLoading(false)
    })
  }, [id])

  function handleTabChange(tab: TabKey) {
    setSearchParams({ tab }, { replace: true })
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: BG_SEC, fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '14px' }}>Loading deal…</div>
        </div>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound || !deal) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: BG_SEC, fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Deal not found</div>
          <div style={{ fontSize: '13px' }}>This deal may have been deleted or you may not have access.</div>
        </div>
      </div>
    )
  }

  // ── Render with chrome ─────────────────────────────────────────────────────
  return (
    <DealChrome deal={deal} activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'overview'   && <DealOverview deal={deal} onTabChange={handleTabChange} />}
      {activeTab === 'analysis'  && <AnalysisHub deal={deal} />}
      {activeTab === 'content'   && <TabStub label="Content"    deal={deal} />}
      {activeTab === 'seller'    && <TabStub label="Seller"     deal={deal} />}
      {activeTab === 'investors' && <TabStub label="Investors"  deal={deal} />}
    </DealChrome>
  )
}
