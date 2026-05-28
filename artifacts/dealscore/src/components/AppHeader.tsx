import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { UserTier } from '../lib/database.types'

const NAVY = '#1B3A6B'
const GREEN = '#00C896'

const TIER_LABELS: Record<UserTier, string> = {
  free:     'Free',
  pro:      'Pro',
  pro_plus: 'Pro Plus',
}

const TIER_BADGE: Record<UserTier, { bg: string; text: string }> = {
  free:     { bg: '#e5e7eb', text: '#374151' },
  pro:      { bg: '#dbeafe', text: '#1e40af' },
  pro_plus: { bg: '#fef3c7', text: '#92400e' },
}

function getInitials(fullName: string | null | undefined, email: string | null | undefined): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

export default function AppHeader() {
  const { user, profile, tier, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  const initials = getInitials(profile?.full_name, user?.email)
  const badge = TIER_BADGE[tier]
  const displayName = profile?.full_name || user?.email || ''

  return (
    <header style={{
      backgroundColor: NAVY,
      padding: '0 28px',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* Left: wordmark */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: '#fff',
          fontWeight: 700,
          fontSize: '18px',
          letterSpacing: '-0.3px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Deal<span style={{ color: '#60a5fa' }}>Score</span>
      </button>

      {/* Right group */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Deal advert — outline white */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'none',
            border: '1.5px solid rgba(255,255,255,0.55)',
            borderRadius: '7px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '0.1px',
            whiteSpace: 'nowrap',
          }}
        >
          Deal advert
        </button>

        {/* + New deal — filled green */}
        <button
          onClick={() => navigate('/app')}
          style={{
            backgroundColor: GREEN,
            border: 'none',
            borderRadius: '7px',
            color: NAVY,
            fontSize: '13px',
            fontWeight: 700,
            padding: '7px 15px',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '0.1px',
            whiteSpace: 'nowrap',
          }}
        >
          + New deal
        </button>

        {/* Avatar + dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(prev => !prev)}
            aria-label="Account menu"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#3b5fa0',
              border: '2px solid rgba(255,255,255,0.3)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'system-ui, sans-serif',
              flexShrink: 0,
            }}
          >
            {initials}
          </button>

          {open && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.13)',
              minWidth: '220px',
              zIndex: 200,
              overflow: 'hidden',
            }}>
              {/* Name + email + tier */}
              <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </div>
                {profile?.full_name && (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </div>
                )}
                <span style={{
                  display: 'inline-block',
                  backgroundColor: badge.bg,
                  color: badge.text,
                  borderRadius: '20px',
                  padding: '2px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  {TIER_LABELS[tier]}
                </span>
              </div>

              {/* Nav items */}
              <div style={{ padding: '6px 0' }}>
                <DropdownItem label="Profile settings" onClick={() => { setOpen(false); navigate('/profile') }} />
                <DropdownItem label="Billing" onClick={() => { setOpen(false); navigate('/profile') }} />
                <DropdownItem label="Refer a colleague" onClick={() => { setOpen(false); alert('Referral programme coming soon!') }} />
              </div>

              {/* Divider + sign out */}
              <div style={{ borderTop: '1px solid #f3f4f6', padding: '6px 0 4px' }}>
                <DropdownItem label="Sign out" onClick={handleSignOut} danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function DropdownItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '9px 16px',
        background: hovered ? (danger ? '#fff1f2' : '#f8fafc') : 'none',
        border: 'none',
        fontSize: '14px',
        fontWeight: 500,
        color: danger ? '#dc2626' : '#374151',
        cursor: 'pointer',
        fontFamily: 'system-ui, sans-serif',
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  )
}
