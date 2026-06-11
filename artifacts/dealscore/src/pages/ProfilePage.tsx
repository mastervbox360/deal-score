import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { startCheckout } from '../lib/checkoutService'
import { UserTier } from '../lib/database.types'
import UpgradeModal, { UpgradeModalState } from '../components/UpgradeModal'

const NAVY = '#1B3A6B'
const NAVY_DARK = '#152d55'
const TEAL = '#1D9E75'
const TEAL_MID = '#10B981'
const BORDER = '#e3e5e9'
const BG_BODY = '#eef0f4'
const BG_SEC = '#f5f6f8'
const TEXT1 = '#1a1a2e'
const TEXT2 = '#6c757d'
const TEXT3 = '#adb5bd'
const AMBER = '#D97706'
const PURPLE = '#7C3AED'

type PaneId = 'profile' | 'notifications' | 'preferences' | 'branding' | 'defaults' | 'assistant' | 'subscription' | 'referrals' | 'agency' | 'integrations' | 'security'

const NAV_GROUPS: { label: string; items: { id: PaneId; icon: string; label: string; badge?: string }[] }[] = [
  { label: 'You', items: [
    { id: 'profile', icon: 'ti-user', label: 'Profile' },
    { id: 'notifications', icon: 'ti-bell', label: 'Notifications' },
    { id: 'preferences', icon: 'ti-adjustments-horizontal', label: 'Preferences' },
  ]},
  { label: 'Business', items: [
    { id: 'branding', icon: 'ti-palette', label: 'Branding' },
    { id: 'defaults', icon: 'ti-settings-2', label: 'Deal defaults' },
    { id: 'assistant', icon: 'ti-robot', label: 'DS Assistant' },
  ]},
  { label: 'Growth', items: [
    { id: 'subscription', icon: 'ti-crown', label: 'Subscription' },
    { id: 'referrals', icon: 'ti-gift', label: 'Referrals' },
    { id: 'agency', icon: 'ti-building-store', label: 'Agency', badge: 'soon' },
  ]},
  { label: 'Technical', items: [
    { id: 'integrations', icon: 'ti-plug-connected', label: 'Integrations' },
    { id: 'security', icon: 'ti-shield-lock', label: 'Account & Security' },
  ]},
]

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function S(styles: React.CSSProperties): React.CSSProperties { return styles }

const inp = S({ width: '100%', padding: '7px 10px', border: `.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: TEXT1, outline: 'none', backgroundColor: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' })
const sel = S({ ...inp, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236c757d'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 9px center', paddingRight: 28 })
const sect = S({ marginBottom: 20, paddingBottom: 20, borderBottom: `.5px solid ${BORDER}` })
const sectLast = S({ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' })
const sHdr = S({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 })
const sTitle = S({ fontSize: 13, fontWeight: 700, color: TEXT1 })
const sSub = S({ fontSize: 11, color: TEXT2, marginTop: 2 })
const lbl = S({ display: 'block', fontSize: 11, fontWeight: 600, color: TEXT2, marginBottom: 4 })
const fieldHint = S({ display: 'block', fontSize: 10, color: TEXT3, marginTop: 3 })
const actionRow = S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `.5px solid ${BORDER}`, gap: 12 })
const actionLbl = S({ fontSize: 12, fontWeight: 600, color: TEXT1, marginBottom: 2 })
const actionDesc = S({ fontSize: 11, color: TEXT2 })

function TglRow({ label, desc, defaultOn = false }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `.5px solid ${BORDER}`, gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT1, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: TEXT2 }}>{desc}</div>
      </div>
      <button onClick={() => setOn(o => !o)} style={{ width: 38, height: 22, borderRadius: 11, border: 'none', background: on ? TEAL : '#d1d5db', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </button>
    </div>
  )
}

function SaveRow({ toastId, onSave, onCancel }: { toastId: string; onSave?: () => void; onCancel?: () => void }) {
  const [show, setShow] = useState(false)
  const [msg, setMsg] = useState('')
  function toast(m: string) { setMsg(m); setShow(true); setTimeout(() => setShow(false), 2500) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
      <div style={{ fontSize: 11, color: TEAL, display: 'flex', alignItems: 'center', gap: 5, opacity: show ? 1 : 0, transition: 'opacity .3s', marginRight: 8 }}>
        <i className={`ti ${msg.includes('discard') ? 'ti-arrow-back-up' : 'ti-circle-check'}`} style={{ fontSize: 13 }} />
        {msg || 'Saved'}
      </div>
      <button onClick={() => { toast('Changes discarded'); onCancel?.() }} style={{ padding: '6px 14px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
      <button onClick={() => { toast('Saved'); onSave?.() }} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Save changes</button>
    </div>
  )
}

function Badge({ color, children }: { color: 'pro' | 'plus' | 'soon' | 'trial' | 'current'; children: React.ReactNode }) {
  const styles: Record<string, React.CSSProperties> = {
    pro: { background: '#dbeafe', color: '#1e40af' },
    plus: { background: '#fef3c7', color: '#92400e' },
    soon: { background: '#f3f4f6', color: '#6b7280' },
    trial: { background: '#d1fae5', color: '#065f46' },
    current: { background: '#dbeafe', color: '#1e40af' },
  }
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, ...styles[color] }}>{children}</span>
}

function GatedOverlay({ label }: { label: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: NAVY, fontWeight: 600, background: '#fff', border: `.5px solid ${BORDER}`, padding: '7px 14px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
        <i className="ti ti-lock" style={{ fontSize: 13 }} /> {label}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [activePane, setActivePane] = useState<PaneId>('profile')
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState | null>(null)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [instagram, setInstagram] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState<'pro' | 'pro_plus' | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Agency waitlist
  const [agencyName, setAgencyName] = useState('')
  const [agencyEmail, setAgencyEmail] = useState('')
  const [agencyCompany, setAgencyCompany] = useState('')
  const [agencyTeamSize, setAgencyTeamSize] = useState('Just me')
  const [agencyNotes, setAgencyNotes] = useState('')
  const [agencySubmitted, setAgencySubmitted] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setCompanyName(profile.company_name ?? '')
      setPhone(profile.phone ?? '')
      setAgencyName(profile.full_name ?? '')
      setAgencyEmail(user?.email ?? '')
    }
  }, [profile, user])

  async function handleProfileSave() {
    if (!user) return
    setProfileSaving(true); setProfileSaved(false); setProfileError(null)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName || null,
      company_name: companyName || null,
      phone: phone || null,
    }).eq('id', user.id)
    setProfileSaving(false)
    if (error) { setProfileError(error.message); return }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  async function handleUpgrade(tier: 'pro' | 'pro_plus') {
    if (!user) return
    setCheckoutLoading(tier); setCheckoutError(null)
    try { await startCheckout(tier, user.id, user.email ?? '') }
    catch (e) { setCheckoutError(e instanceof Error ? e.message : 'Checkout failed'); setCheckoutLoading(null) }
  }

  const tier: UserTier = profile?.tier ?? 'free'
  const trialDays = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date() ? daysUntil(profile.trial_ends_at) : null
  const isProPlus = tier === 'pro_plus'
  const isPro = tier === 'pro' || isProPlus

  const referralCode = profile?.referral_code ?? (user?.email?.split('@')[0] ?? 'user')
  const referralLink = `getdealscore.co.uk/ref/${referralCode}`

  const refToast = useRef<HTMLDivElement>(null)
  function copyRef() {
    navigator.clipboard.writeText(referralLink).catch(() => {})
    if (refToast.current) {
      refToast.current.style.opacity = '1'
      setTimeout(() => { if (refToast.current) refToast.current.style.opacity = '0' }, 2000)
    }
  }

  // Upgrade modal state selection based on tier
  function openUpgrade() {
    if (tier === 'free') setUpgradeModal('A1')
    else if (tier === 'pro') setUpgradeModal('B')
    else setUpgradeModal('C')
  }

  const SIDEBAR_W = 224

  // Derived initials
  const nameParts = fullName.trim().split(/\s+/)
  const initials = ((nameParts[0]?.[0] ?? '') + (nameParts[1]?.[0] ?? '')).toUpperCase() || (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_BODY, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* ══ FULL APP HEADER ══ */}
      <div className="hdr">
        <div className="hdr-left">
          <div className="logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>Deal<span>Score</span></div>
          <div className="logo-sep"></div>
          <nav className="hdr-nav">
            <button className="hn" onClick={() => navigate('/dashboard')}>Deals</button>
            <div className="hn-sep"></div>
            <button className="hn" onClick={() => navigate('/pipeline')}>Pipeline</button>
            <div className="hn-sep"></div>
            <button className="hn" onClick={() => navigate('/compare')}>Compare</button>
          </nav>
        </div>
        <div className="hdr-centre">
          <div className="search-bar">
            <i className="ti ti-search"></i>
            <input type="text" placeholder="Search deals, sellers, addresses… " readOnly onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }} />
            <span className="search-kbd">⌘K</span>
          </div>
        </div>
        <div className="hdr-right">
          <nav className="hdr-right-nav">
            <button className="hn" onClick={() => navigate('/sellers-crm')}>Seller</button>
            <div className="hn-sep"></div>
            <button className="hn" onClick={() => navigate('/investors-crm')}>Investors</button>
          </nav>
          <div className="logo-sep"></div>
          <div className="notif-wrap">
            <button className="notif-btn" onClick={() => setNotifOpen(p => !p)}>
              <i className="ti ti-bell"></i>
            </button>
            {notifOpen && (
              <div className="notif-drop show">
                <div className="notif-drop-hdr">
                  <span className="notif-drop-title">Notifications</span>
                  <button className="notif-mark-all" onClick={() => setNotifOpen(false)}>Dismiss</button>
                </div>
                <div className="notif-list">
                  <div className="notif-empty">
                    <i className="ti ti-bell-off"></i>
                    <div className="notif-empty-msg">All caught up</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="logo-sep"></div>
          <button className="btn-new" onClick={() => navigate('/app')}><i className="ti ti-plus"></i> New deal</button>
          <div className="logo-sep"></div>
          <div className="avt-wrap">
            <div className="avt-wrap-inner" onClick={() => setAvatarOpen(p => !p)}>
              <div className="avt">{initials}</div>
              <i className="ti ti-chevron-down avt-chevron"></i>
            </div>
            {avatarOpen && (
              <div className="avt-drop show">
                <div className="avt-drop-head">
                  <div className="avt-drop-name">{fullName || user?.email?.split('@')[0] || 'User'}</div>
                  <div className="avt-drop-email">{user?.email ?? ''}</div>
                </div>
                <button className="avt-drop-item" onClick={() => { setAvatarOpen(false); setActivePane('profile') }}>
                  <i className="ti ti-user"></i> Profile settings
                </button>
                <div className="avt-drop-divider"></div>
                <button className="avt-drop-item danger" onClick={async () => { setAvatarOpen(false); await signOut(); navigate('/login') }}>
                  <i className="ti ti-logout"></i> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-wrap">
        <div className="page-header">
          <div className="page-header-title">Profile &amp; settings</div>
          <div className="page-header-sub">Manage your account, branding, and preferences</div>
        </div>

        <div className="page">

          {/* ══ LEFT NAV ══ */}
          <div className="nav-panel" style={{ width: '224px', minWidth: '224px', maxWidth: '224px', flexShrink: 0 }}>
            <div className="nav-identity">
              <div className="nav-avt">
                {initials}
                <div className="nav-avt-edit"><i className="ti ti-camera" /></div>
              </div>
              <div className="nav-name">{fullName || user?.email?.split('@')[0] || 'User'}</div>
              <div className="nav-email">{user?.email ?? ''}</div>
              <div className="nav-plan">
                <i className="ti ti-clock" style={{ fontSize: 10 }} />
                {trialDays !== null
                  ? `Pro Trial · ${trialDays} days left`
                  : isProPlus ? 'Pro Plus' : isPro ? 'Pro' : 'Free'}
              </div>
              <div className="nav-completion">
                <div className="nav-completion-lbl">
                  <span>Profile complete</span>
                  <span className="pct">63%</span>
                </div>
                <div className="nav-completion-bar">
                  <div className="nav-completion-fill" style={{ width: '63%' }} />
                </div>
              </div>
            </div>

            <div className="nav-card">
              {NAV_GROUPS.map(group => (
                <div key={group.label} className="nav-group">
                  <div className="nav-group-lbl">{group.label}</div>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      className={`nav-item${activePane === item.id ? ' active' : ''}`}
                      onClick={() => setActivePane(item.id)}
                    >
                      <i className={`ti ${item.icon}`} />
                      {item.label}
                      {item.badge === 'soon' && <span className="nav-soon">Soon</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ══ CONTENT ══ */}
          <div className="content-panel">

            {/* ══════════ PROFILE ══════════ */}
            {activePane === 'profile' && (
              <div>
                <div className="profile-hero">
                  <div className="profile-hero-banner" />
                  <div className="profile-hero-body">
                    <div className="profile-hero-row">
                      <div>
                        <div className="profile-hero-avt">
                          {initials}
                          <div className="profile-hero-avt-edit"><i className="ti ti-camera" /></div>
                        </div>
                        <div className="profile-hero-name">{fullName || user?.email?.split('@')[0] || 'User'}</div>
                        <div className="profile-hero-meta">
                          <span><i className="ti ti-mail" style={{ fontSize: 10 }} /> {user?.email ?? ''}</span>
                          <span><i className="ti ti-building" style={{ fontSize: 10 }} /> Property sourcer</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Profile completeness</div>
                    <div className="section-sub">A complete profile makes your investor packs look more professional</div>
                  </div>
                  <div className="completion-wrap">
                    <div className="completion-labels">
                      <span>5 of 8 fields complete</span>
                      <span className="pct">63%</span>
                    </div>
                    <div className="completion-bar">
                      <div className="completion-fill" style={{ width: '63%' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: TEXT2, marginBottom: 6 }}>Still missing — click to jump to the field:</div>
                  <div className="completion-missing">
                    <span className="missing-chip" onClick={() => setActivePane('branding')}>Company logo</span>
                    <span className="missing-chip" onClick={() => setActivePane('branding')}>Business address</span>
                    <span className="missing-chip" onClick={() => setActivePane('integrations')}>Connect calendar</span>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr"><div className="section-title">Personal details</div></div>
                  <div className="fg">
                    <div className="field">
                      <label>First name</label>
                      <input
                        type="text"
                        value={nameParts[0] ?? ''}
                        onChange={e => setFullName(e.target.value + (nameParts.slice(1).join(' ') ? ' ' + nameParts.slice(1).join(' ') : ''))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="field">
                      <label>Last name</label>
                      <input
                        type="text"
                        value={nameParts.slice(1).join(' ')}
                        onChange={e => setFullName((nameParts[0] ?? '') + (e.target.value ? ' ' + e.target.value : ''))}
                        placeholder="Last name"
                      />
                    </div>
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Company name <span style={{ fontSize: 10, fontWeight: 400, color: '#bbb' }}>(optional)</span></label>
                      <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Mardania Property Sourcing" />
                    </div>
                    <div className="field">
                      <label>Email address</label>
                      <input type="text" value={user?.email ?? ''} disabled />
                      <span className="field-link">Request email change →</span>
                    </div>
                    <div className="field">
                      <label>Phone number</label>
                      <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
                    </div>
                    <div className="field">
                      <label>Job title</label>
                      <input type="text" placeholder="e.g. Property Sourcing Specialist" />
                    </div>
                    <div className="field">
                      <label>Your role</label>
                      <select>
                        <option>Property sourcer</option>
                        <option>Investor</option>
                        <option>Estate agent</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Preferred contact</label>
                      <select>
                        <option>Email</option>
                        <option>Phone</option>
                        <option>WhatsApp</option>
                      </select>
                    </div>
                  </div>
                  <div className="divider-lbl"><span>About you</span></div>
                  <div className="fg col1" style={{ marginBottom: 14 }}>
                    <div className="field">
                      <label>Bio <span className="field-hint" style={{ display: 'inline', margin: 0 }}>— shown on investor deal pages and PDF packs</span></label>
                      <textarea style={{ minHeight: 68, resize: 'vertical' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="A short introduction to you and your sourcing business…" />
                    </div>
                  </div>
                  <div className="divider-lbl"><span>Social links</span></div>
                  <div className="fg" style={{ marginBottom: 0 }}>
                    <div className="field">
                      <label>LinkedIn</label>
                      <div className="pfx">
                        <span className="pfx-lbl">linkedin.com/in/</span>
                        <input type="text" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="yourname" />
                      </div>
                    </div>
                    <div className="field">
                      <label>Instagram</label>
                      <div className="pfx">
                        <span className="pfx-lbl">instagram.com/</span>
                        <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="yourhandle" />
                      </div>
                    </div>
                  </div>
                  {profileError && (
                    <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginTop: 10 }}>
                      {profileError}
                    </div>
                  )}
                  <div className="save-row">
                    <div style={{ fontSize: 11, color: TEAL, display: 'flex', alignItems: 'center', gap: 5, opacity: profileSaved ? 1 : 0, transition: 'opacity .3s', marginRight: 'auto' }}>
                      <i className="ti ti-circle-check" style={{ fontSize: 14 }} /> Saved
                    </div>
                    <button className="btn btn-sm" onClick={() => {}}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleProfileSave} disabled={profileSaving}>
                      {profileSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ NOTIFICATIONS ══════════ */}
            {activePane === 'notifications' && (
              <div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Deal workflow</div>
                    <div className="section-sub">Keep your pipeline moving</div>
                  </div>
                  <TglRow label="Daily deal digest" desc="Morning summary of active deals, viewings, and Day 15 countdowns" defaultOn />
                  <TglRow label="Day 15 countdown alerts" desc="Reminders at Day 10, 13, and 14 of every cooling-off window" defaultOn />
                  <TglRow label="Chase reminders" desc="Alert when a seller follow-up passes your next action date" defaultOn />
                  <TglRow label="Stale deal alerts" desc="Flag deals with no activity for more than 7 days" defaultOn />
                </div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Investor activity</div>
                    <div className="section-sub">Know when investors engage with your deals</div>
                  </div>
                  <TglRow label="Investor views deal link" desc="Real-time alert when a protected link is opened for the first time" />
                  <TglRow label="Investor downloads PDF" desc="Notified when an investor downloads from your shared link" />
                  <TglRow label="Link expiry warning" desc="24-hour reminder before a time-limited share link expires" defaultOn />
                </div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Viewing reminders <Badge color="pro">PRO</Badge></div>
                    <div className="section-sub">For viewings synced from your calendar</div>
                  </div>
                  <TglRow label="30-minute reminder" desc="Push and email before each scheduled viewing" defaultOn />
                  <TglRow label="Day-before summary" desc="Evening email listing tomorrow's viewings" defaultOn />
                </div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Digest timing</div></div>
                  <div className="fg" style={{ maxWidth: 360, marginBottom: 0 }}>
                    <div className="field">
                      <label>Send digest at</label>
                      <select><option>7:00 AM</option><option>8:00 AM</option><option>9:00 AM</option><option>10:00 AM</option></select>
                    </div>
                    <div className="field">
                      <label>Delivery</label>
                      <select><option>Email + in-app</option><option>Email only</option><option>In-app only</option></select>
                    </div>
                  </div>
                  <SaveRow toastId="toast-notif" />
                </div>
              </div>
            )}

            {/* ══════════ PREFERENCES ══════════ */}
            {activePane === 'preferences' && (
              <div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Pipeline view</div></div>
                  <TglRow label="Compact deal cards" desc="Denser list layout instead of expanded cards" />
                  <TglRow label="Show yield on deal cards" desc="Gross yield shown as the primary metric on pipeline cards" defaultOn />
                  <TglRow label="Highlight below-target deals" desc="Colour-code deals that fall below your Deal Defaults thresholds" defaultOn />
                  <div className="fg" style={{ maxWidth: 360, marginTop: 14, marginBottom: 0 }}>
                    <div className="field">
                      <label>Default pipeline layout</label>
                      <select><option>Kanban board</option><option>List view</option></select>
                    </div>
                    <div className="field">
                      <label>Default deal tab</label>
                      <select><option>Analysis</option><option>Summary</option><option>CRM / notes</option></select>
                    </div>
                  </div>
                </div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Language &amp; region</div></div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field">
                      <label>Currency</label>
                      <select><option>GBP — £</option><option>EUR — €</option><option>USD — $</option></select>
                    </div>
                    <div className="field">
                      <label>Date format</label>
                      <select><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select>
                    </div>
                    <div className="field">
                      <label>Number format</label>
                      <select><option>1,000.00</option><option>1.000,00</option></select>
                    </div>
                  </div>
                  <SaveRow toastId="toast-prefs" />
                </div>
              </div>
            )}

            {/* ══════════ BRANDING ══════════ */}
            {activePane === 'branding' && (
              <div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Company details</div></div>
                  <div className="fg">
                    <div className="field">
                      <label>Company / trading name</label>
                      <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Mardania Property Sourcing" />
                    </div>
                    <div className="field">
                      <label>Website</label>
                      <div className="pfx">
                        <span className="pfx-lbl">https://</span>
                        <input type="text" placeholder="yourwebsite.co.uk" />
                      </div>
                    </div>
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Tagline <span className="field-hint" style={{ display: 'inline', margin: 0 }}>— shown on PDF covers</span></label>
                      <input type="text" placeholder="e.g. Trusted property deals across South Wales" />
                    </div>
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>Business address <span className="field-hint" style={{ display: 'inline', margin: 0 }}>— shown in PDF footer</span></label>
                      <input type="text" placeholder="e.g. 123 Main St, Cardiff CF10 1AA" />
                    </div>
                    <div className="field" style={{ gridColumn: '1/-1' }}>
                      <label>FCA / compliance disclosure <span className="field-hint" style={{ display: 'inline', margin: 0 }}>— shown in PDF footer</span></label>
                      <textarea style={{ minHeight: 52, resize: 'vertical' }} placeholder="e.g. This property information is provided by a member of The Property Ombudsman…" />
                    </div>
                  </div>
                  <SaveRow toastId="toast-brand-co" />
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Logo <Badge color="pro">PRO</Badge></div>
                    <div className="section-sub">Appears on PDF pack covers and deal share pages</div>
                  </div>
                  {isPro ? (
                    <div className="logo-zone">
                      <i className="ti ti-cloud-upload" />
                      <div className="logo-zone-lbl">Click to upload your logo</div>
                      <div className="logo-zone-sub">PNG, SVG or JPG · Max 2MB · Transparent background recommended</div>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div className="logo-zone" style={{ filter: 'blur(1px)' }}>
                        <i className="ti ti-cloud-upload" />
                        <div className="logo-zone-lbl">Click to upload your logo</div>
                        <div className="logo-zone-sub">PNG, SVG or JPG · Max 2MB</div>
                      </div>
                      <GatedOverlay label="Upgrade to Pro to upload your logo" />
                    </div>
                  )}
                </div>

                <div className="gated-wrap">
                  <div className={`section${isProPlus ? '' : ' gated'}`}>
                    <div className="section-hdr">
                      <div className="section-title">Brand colours <Badge color="plus">PRO+</Badge></div>
                    </div>
                    <div className="fg">
                      <div className="field">
                        <label>Primary colour</label>
                        <div className="colour-row">
                          <div className="colour-swatch" style={{ background: NAVY }} />
                          <input className="colour-hex" type="text" defaultValue="#1B3A6B" />
                        </div>
                      </div>
                      <div className="field">
                        <label>Accent colour</label>
                        <div className="colour-row">
                          <div className="colour-swatch" style={{ background: TEAL }} />
                          <input className="colour-hex" type="text" defaultValue="#1D9E75" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {!isProPlus && (
                    <div className="gated-overlay">
                      <div className="lock-msg"><i className="ti ti-lock" /> Upgrade to Pro Plus to unlock brand colours</div>
                    </div>
                  )}
                </div>

                <div className="gated-wrap">
                  <div className={`section${isProPlus ? '' : ' gated'}`}>
                    <div className="section-hdr">
                      <div className="section-title">Pack cover style <Badge color="plus">PRO+</Badge></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      <div style={{ border: `.5px solid ${NAVY}`, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ height: 52, background: NAVY_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>BRANDED</div>
                        <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 600 }}>Branded</div>
                      </div>
                      <div style={{ border: `.5px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ height: 52, background: BG_SEC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: TEXT2, letterSpacing: '.06em' }}>MINIMAL</div>
                        <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 600 }}>Minimal</div>
                      </div>
                      <div style={{ border: `.5px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ height: 52, background: `linear-gradient(135deg,${NAVY},${TEAL})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '.06em' }}>YOUR BRAND</div>
                        <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 600 }}>Your brand</div>
                      </div>
                    </div>
                  </div>
                  {!isProPlus && (
                    <div className="gated-overlay">
                      <div className="lock-msg"><i className="ti ti-lock" /> Upgrade to Pro Plus to unlock cover styles</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ DEAL DEFAULTS ══════════ */}
            {activePane === 'defaults' && (
              <div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Tax &amp; ownership</div></div>
                  <div className="fg col3">
                    <div className="field"><label>Country</label><select><option>England / NI — SDLT</option><option>Wales — LTT</option><option>Scotland — LBTT</option></select></div>
                    <div className="field"><label>Buyer type</label><select><option>Additional property / BTL</option><option>First time buyer</option><option>Standard residential</option></select></div>
                    <div className="field"><label>Ownership structure</label><select><option>Personal name</option><option>Limited company (SPV)</option><option>Partnership / LLP</option></select></div>
                    <div className="field"><label>Default deal strategy</label><select><option>BTL — Buy to let</option><option>SA — Serviced accommodation</option><option>HMO — House in multiple occ.</option><option>Flip / refurb</option><option>BRRR</option></select></div>
                  </div>
                  <div className="divider-lbl"><span>Deal structure</span></div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field">
                      <label>Cooling off period</label>
                      <div className="pfx"><input type="number" defaultValue={14} /><span className="pfx-suf">days</span></div>
                      <span className="field-hint">Statutory buyer protection window</span>
                    </div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Sourcing fees</div>
                    <div className="section-sub">Used as defaults when generating deal packs and invoices</div>
                  </div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field"><label>Default sourcing fee</label><div className="pfx"><input type="number" placeholder="2.5" /><span className="pfx-suf">%</span></div></div>
                    <div className="field"><label>Fee minimum</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" placeholder="3000" /></div></div>
                    <div className="field"><label>Default payment terms</label><select><option>Due on pack release</option><option>50% on reservation, 50% on completion</option><option>Due on completion</option></select></div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Financing</div>
                    <div className="section-sub">Update when your broker confirms a new rate</div>
                  </div>
                  <div className="divider-lbl"><span>Primary finance</span></div>
                  <div className="fg col3">
                    <div className="field"><label>Finance method</label><select><option>Mortgage</option><option>Bridging loan</option><option>Cash</option></select></div>
                    <div className="field"><label>LTV</label><div className="pfx"><input type="number" defaultValue={75} /><span className="pfx-suf">%</span></div></div>
                    <div className="field"><label>Interest rate</label><div className="pfx"><input type="number" defaultValue={5.5} step={0.05} /><span className="pfx-suf">% pa</span></div></div>
                    <div className="field"><label>Mortgage term</label><div className="pfx"><input type="number" defaultValue={25} /><span className="pfx-suf">yrs</span></div></div>
                    <div className="field"><label>Repayment type</label><select><option>Interest only</option><option>Capital repayment</option></select></div>
                    <div className="field"><label>Arrangement fee</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={995} /></div></div>
                  </div>
                  <div className="divider-lbl"><span>Acquisition costs</span></div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field"><label>Solicitor / legal</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={1500} /></div></div>
                    <div className="field"><label>Survey</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={400} /></div></div>
                    <div className="field"><label>Broker fee</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={500} /></div></div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Monthly running costs</div>
                    <div className="section-sub">DS Assistant will prompt you to confirm each one per deal</div>
                  </div>
                  <div className="fg col3">
                    <div className="field"><label>Maintenance</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={75} /></div><span className="field-hint">Per month</span></div>
                    <div className="field"><label>Buildings insurance</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={30} /></div></div>
                    <div className="field"><label>Management fee</label><div className="pfx"><input type="number" defaultValue={10} /><span className="pfx-suf">% rent</span></div><span className="field-hint">0 if self-managing</span></div>
                    <div className="field"><label>Void allowance</label><div className="pfx"><input type="number" defaultValue={4} /><span className="pfx-suf">wks/yr</span></div></div>
                    <div className="field"><label>Accountancy</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={50} /></div><span className="field-hint">Pro-rated monthly</span></div>
                    <div className="field"><label>Other monthly</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={0} /></div></div>
                  </div>
                  <div className="divider-lbl"><span>Leasehold — leave at 0 for freehold</span></div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field"><label>Service charge/mo</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={0} /></div></div>
                    <div className="field"><label>Ground rent/mo</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={0} /></div></div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr"><div className="section-title">Refurb &amp; project</div></div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field"><label>Refurb contingency</label><div className="pfx"><input type="number" defaultValue={10} /><span className="pfx-suf">%</span></div><span className="field-hint">On top of quoted costs</span></div>
                    <div className="field"><label>Finance hold period</label><div className="pfx"><input type="number" defaultValue={6} /><span className="pfx-suf">months</span></div><span className="field-hint">Before re-mortgage</span></div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Deal targets</div>
                    <div className="section-sub">Deals below these thresholds are flagged on the analysis screen</div>
                  </div>
                  <div className="fg col3" style={{ marginBottom: 0 }}>
                    <div className="field"><label>Min gross yield</label><div className="pfx"><input type="number" defaultValue={6} step={0.5} /><span className="pfx-suf">%</span></div></div>
                    <div className="field"><label>Min net yield</label><div className="pfx"><input type="number" defaultValue={4} step={0.5} /><span className="pfx-suf">%</span></div></div>
                    <div className="field"><label>Min monthly cashflow</label><div className="pfx"><span className="pfx-lbl">£</span><input type="number" defaultValue={200} /></div></div>
                    <div className="field"><label>Min ROI</label><div className="pfx"><input type="number" defaultValue={10} /><span className="pfx-suf">%</span></div></div>
                    <div className="field"><label>Min cash-on-cash</label><div className="pfx"><input type="number" defaultValue={8} /><span className="pfx-suf">%</span></div></div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Sharing &amp; access</div>
                    <div className="section-sub">Defaults applied when creating new deal share links</div>
                  </div>
                  <TglRow label="Protect address on shared links" desc="New deals default to masking the property address in investor share links and packs" defaultOn />
                  <TglRow label="Require investor auth on share links" desc="Shared deal links require the investor to authenticate before viewing" defaultOn />
                </div>

                <div className="section">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                    <div>
                      <div className="section-title">Custom defaults</div>
                      <div className="section-sub" style={{ marginTop: 3 }}>Named values for anything not covered above — shown as reference on the deal form</div>
                    </div>
                    <button className="btn btn-sm" style={{ flexShrink: 0, marginTop: 2 }}><i className="ti ti-plus" style={{ fontSize: 12 }} /> Add field</button>
                  </div>
                  <div className="note" style={{ marginBottom: 12 }}>
                    <i className="ti ti-bulb" />
                    <span>Can't find a field you always use? <a href="#" style={{ color: NAVY, fontWeight: 600, textDecoration: 'none' }}>Request it →</a> — most-requested fields get added in future updates.</span>
                  </div>
                  <SaveRow toastId="toast-defaults" />
                </div>
              </div>
            )}

            {/* ══════════ DS ASSISTANT ══════════ */}
            {activePane === 'assistant' && (
              <div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Validation flags</div>
                    <div className="section-sub">Fields the Assistant always prompts you to confirm on each deal</div>
                  </div>
                  <TglRow label="Flag maintenance allowance" desc="Prompt to confirm the default is appropriate for this property's age and condition" defaultOn />
                  <TglRow label="Flag void allowance" desc="Confirm void % is appropriate for the local market" defaultOn />
                  <TglRow label="Flag missing strategy fields" desc="Alert when SA nightly rate, HMO room count, or other strategy-specific fields are absent" defaultOn />
                  <TglRow label="Flag below-target metrics" desc="Warn when a deal falls below the thresholds set in Deal Defaults" defaultOn />
                </div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Assistant behaviour</div>
                    <div className="section-sub">Control how the DS Assistant works when analysing your deals</div>
                  </div>
                  <TglRow label="Auto-suggest on deal open" desc="DS Assistant automatically surfaces insights when you open a deal, without waiting to be asked" defaultOn />
                  <TglRow label="Strategy-specific analysis" desc="Show only the metrics and flags relevant to the deal's chosen strategy (e.g. nightly rate for SA, room yield for HMO)" defaultOn />
                  <div className="fg col3" style={{ marginTop: 14, marginBottom: 0 }}>
                    <div className="field">
                      <label>Confidence threshold</label>
                      <select><option>Show all suggestions</option><option>Medium confidence +</option><option>High confidence only</option></select>
                      <span className="field-hint">How certain the Assistant must be before flagging an issue</span>
                    </div>
                    <div className="field">
                      <label>Strategies to analyse</label>
                      <select><option>All strategies</option><option>BTL only</option><option>SA only</option><option>HMO only</option><option>Flip / refurb only</option><option>BRRR only</option></select>
                      <span className="field-hint">Limit assistant suggestions to specific strategies</span>
                    </div>
                  </div>
                  <SaveRow toastId="toast-assistant" />
                </div>
              </div>
            )}

            {/* ══════════ SUBSCRIPTION ══════════ */}
            {activePane === 'subscription' && (
              <div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Current plan</div></div>
                  <div className="plan-banner">
                    <div className="plan-banner-left">
                      <div className="plan-banner-icon"><i className="ti ti-clock" /></div>
                      <div>
                        <div className="plan-banner-name">
                          {trialDays !== null
                            ? <>Pro Trial <span className="badge badge-trial" style={{ marginLeft: 4 }}>{trialDays} days remaining</span></>
                            : isProPlus ? 'Pro Plus' : isPro ? 'Pro' : 'Free'}
                        </div>
                        <div className="plan-banner-sub">
                          {trialDays !== null
                            ? 'No card required. Your deals and data are saved throughout.'
                            : 'Manage your subscription below.'}
                        </div>
                      </div>
                    </div>
                    <button className="btn">Manage billing</button>
                  </div>
                  <div className="plan-meta">
                    <div className="plan-meta-tile"><div className="lbl">Deals saved</div><div className="val">—</div></div>
                    <div className="plan-meta-tile"><div className="lbl">Packs this month</div><div className="val">—</div></div>
                    <div className="plan-meta-tile"><div className="lbl">Trial status</div><div className="val" style={{ color: TEAL }}>{trialDays !== null ? 'Active' : '—'}</div></div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Plans</div>
                    <div className="section-sub">Upgrade or downgrade at any time</div>
                  </div>
                  <div className="tier-grid">
                    <div className={`tier-card${(tier === 'pro' || trialDays !== null) && !isProPlus ? ' current' : ''}`}>
                      <div className="tier-head light">
                        <div className="tier-name" style={{ color: TEXT1 }}>
                          Pro{(tier === 'pro' || trialDays !== null) && !isProPlus && <span className="badge badge-current" style={{ marginLeft: 4 }}>Current</span>}
                        </div>
                        <div className="tier-price" style={{ color: TEXT2, marginTop: 2 }}>£29/mo · or £279/yr</div>
                      </div>
                      <div className="tier-body">
                        <div className="tier-feat"><i className="ti ti-check ok" /> All 7 deal strategies</div>
                        <div className="tier-feat"><i className="ti ti-check ok" /> Save deals &amp; pipeline</div>
                        <div className="tier-feat"><i className="ti ti-check ok" /> PDF packs</div>
                        <div className="tier-feat"><i className="ti ti-check ok" /> Deal sharing</div>
                        <div className="tier-feat"><i className="ti ti-check ok" /> DealScore Assistant</div>
                        <div className="tier-feat"><i className="ti ti-check ok" /> Calendar sync</div>
                        {(tier === 'pro' || trialDays !== null) && !isProPlus ? (
                          <button className="tier-cta cta-current">Current plan</button>
                        ) : (
                          <button className="tier-cta cta-navy" onClick={() => handleUpgrade('pro')} disabled={checkoutLoading === 'pro'}>
                            {checkoutLoading === 'pro' ? 'Loading…' : 'Upgrade to Pro'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className={`tier-card${isProPlus ? ' current' : ''}`}>
                      <div className="tier-head purple">
                        <div className="tier-name" style={{ color: '#fff' }}>
                          Pro Plus{isProPlus && <span className="badge badge-current" style={{ marginLeft: 4 }}>Current</span>}
                        </div>
                        <div className="tier-price" style={{ color: 'rgba(255,255,255,.55)', marginTop: 2 }}>£59/mo · or £559/yr</div>
                      </div>
                      <div className="tier-body">
                        <div className="tier-feat" style={{ fontSize: 10, fontWeight: 600, color: TEXT3, textTransform: 'uppercase', letterSpacing: '.06em', paddingBottom: 4 }}>Everything in Pro, plus:</div>
                        <div className="tier-feat"><i className="ti ti-check pp" /> Smart Capture</div>
                        <div className="tier-feat"><i className="ti ti-check pp" /> Landscape Pro Plus PDF</div>
                        <div className="tier-feat"><i className="ti ti-check pp" /> Deal Optimiser</div>
                        <div className="tier-feat"><i className="ti ti-check pp" /> Visual branding</div>
                        <div className="tier-feat"><i className="ti ti-check pp" /> Webhooks &amp; API</div>
                        {isProPlus ? (
                          <button className="tier-cta cta-current">Current plan</button>
                        ) : (
                          <button className="tier-cta cta-purple" onClick={() => handleUpgrade('pro_plus')} disabled={checkoutLoading === 'pro_plus'}>
                            {checkoutLoading === 'pro_plus' ? 'Loading…' : 'Upgrade to Pro Plus'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {checkoutError && <div style={{ marginTop: 10, fontSize: 11, color: '#dc2626' }}>{checkoutError}</div>}
                </div>

                <div className="section">
                  <div className="section-hdr"><div className="section-title">Payment</div></div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Payment method</div>
                      <div className="action-desc action-status-warn"><i className="ti ti-alert-circle" style={{ fontSize: 12 }} /> No card on file — add one before your trial ends</div>
                    </div>
                    <button className="btn">Add card</button>
                  </div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Invoice history</div>
                      <div className="action-desc">No invoices yet</div>
                    </div>
                    <button className="btn" style={{ opacity: .4, cursor: 'default' }}>Download</button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ REFERRALS ══════════ */}
            {activePane === 'referrals' && (
              <div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Your referral link</div>
                    <div className="section-sub">Earn 1 free month for every person who upgrades to Pro or above</div>
                  </div>
                  <div className="ref-box">
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEXT2, marginBottom: 6 }}>Share this link</div>
                    <div className="ref-link-row">
                      <input className="ref-link" type="text" value={referralLink} readOnly />
                      <button className="btn" onClick={copyRef}>Copy</button>
                    </div>
                    <div ref={refToast} style={{ fontSize: 11, color: TEAL, marginTop: 6, opacity: 0, transition: 'opacity .3s' }}>Copied!</div>
                  </div>
                  <div className="ref-stats">
                    <div className="ref-stat"><div className="lbl">Referrals sent</div><div className="val">—</div></div>
                    <div className="ref-stat"><div className="lbl">Converted</div><div className="val">—</div></div>
                    <div className="ref-stat"><div className="lbl">Months earned</div><div className="val" style={{ color: TEAL }}>—</div></div>
                  </div>
                </div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Referral history</div></div>
                  <table className="team-table">
                    <thead>
                      <tr><th>Referred to</th><th>Date sent</th><th>Status</th><th>Reward</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} style={{ color: TEXT3, fontSize: 11, textAlign: 'center', padding: '16px 0' }}>No referrals yet</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ══════════ AGENCY ══════════ */}
            {activePane === 'agency' && (
              <div>
                <div className="section">
                  <div className="agency-cs-hero">
                    <div className="agency-cs-icon"><i className="ti ti-building-store" /></div>
                    <div className="agency-cs-tag">Coming soon</div>
                    <div className="agency-cs-title">DealScore Agency</div>
                    <div className="agency-cs-sub">Your brand, your domain, your investors — DealScore runs invisibly behind the scenes.</div>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">What's included</div>
                    <div className="section-sub">Everything in Pro Plus, plus full white-labelling and team management</div>
                  </div>
                  <div className="agency-feat-grid">
                    {[
                      { icon: 'ti-world', title: 'Custom domain', desc: 'deals.yourbrand.co.uk — investors see your URL' },
                      { icon: 'ti-paint', title: 'Full app white-label', desc: 'Your logo and colours replace DealScore throughout' },
                      { icon: 'ti-mail', title: 'Branded email sender', desc: 'Pack notifications sent from your domain' },
                      { icon: 'ti-users', title: 'Team seats', desc: 'Add sourcers and VAs with role controls' },
                      { icon: 'ti-eye', title: 'Investor portal', desc: 'Branded read-only portal for investors to browse packs' },
                      { icon: 'ti-file-text', title: 'Custom PDF footer', desc: 'Your tagline and legal disclaimer — no DealScore mention' },
                      { icon: 'ti-login', title: 'Branded login page', desc: 'Investors sign in through your brand' },
                      { icon: 'ti-chart-bar', title: 'Agency analytics', desc: 'Team volume, investor engagement, pack performance' },
                    ].map(f => (
                      <div key={f.title} className="agency-feat">
                        <div className="agency-feat-head"><i className={`ti ${f.icon}`} /><div className="agency-feat-title">{f.title}</div></div>
                        <div className="agency-feat-desc">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Join the waiting list</div>
                    <div className="section-sub">We'll email you before Agency launches publicly</div>
                  </div>
                  {agencySubmitted ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <i className="ti ti-circle-check" style={{ fontSize: 28, color: TEAL, display: 'block', marginBottom: 8 }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1, marginBottom: 3 }}>You're on the list</div>
                      <div style={{ fontSize: 12, color: TEXT2 }}>We'll email {agencyEmail} before Agency launches.</div>
                    </div>
                  ) : (
                    <div>
                      <div className="fg">
                        <div className="field"><label>Name</label><input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} /></div>
                        <div className="field"><label>Email</label><input type="text" value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} /></div>
                        <div className="field" style={{ gridColumn: '1/-1' }}><label>Company / trading name</label><input type="text" value={agencyCompany} onChange={e => setAgencyCompany(e.target.value)} placeholder="e.g. Mardania Property Sourcing" /></div>
                        <div className="field" style={{ gridColumn: '1/-1' }}><label>Team size</label><select value={agencyTeamSize} onChange={e => setAgencyTeamSize(e.target.value)}><option>Just me</option><option>2–5</option><option>6–15</option><option>15+</option></select></div>
                        <div className="field" style={{ gridColumn: '1/-1' }}>
                          <label>Anything specific you need? <span className="field-hint" style={{ display: 'inline', margin: 0 }}>optional</span></label>
                          <textarea style={{ resize: 'vertical', minHeight: 56 }} value={agencyNotes} onChange={e => setAgencyNotes(e.target.value)} placeholder="e.g. I need a custom domain and my own investor login page…" />
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={() => setAgencySubmitted(true)} style={{ padding: '8px 20px' }}>Join waiting list</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ INTEGRATIONS ══════════ */}
            {activePane === 'integrations' && (
              <div>
                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Calendar <Badge color="pro">PRO</Badge></div>
                    <div className="section-sub">Sync viewings, Day 15 countdowns, and chase reminders</div>
                  </div>
                  <div className="int-row">
                    <div className="int-row-left">
                      <div className="int-logo" style={{ background: '#fff4f4', borderColor: '#ffd0d0' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
                          <path d="M3.15283 7.3455L6.43833 9.755C7.32733 7.554 9.48033 6 11.9998 6C13.5293 6 14.9208 6.577 15.9803 7.5195L18.8088 4.691C17.0228 3.0265 14.6338 2 11.9998 2C8.15883 2 4.82783 4.1685 3.15283 7.3455Z" fill="#FF3D00"/>
                          <path d="M12.0002 22C14.5832 22 16.9302 21.0115 18.7047 19.404L15.6097 16.785C14.5719 17.5742 13.3039 18.001 12.0002 18C9.39916 18 7.19066 16.3415 6.35866 14.027L3.09766 16.5395C4.75266 19.778 8.11366 22 12.0002 22Z" fill="#4CAF50"/>
                          <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
                        </svg>
                      </div>
                      <div><div className="action-label">Google Calendar</div><div className="action-desc">Not connected</div></div>
                    </div>
                    <button className="btn btn-sm">Connect</button>
                  </div>
                  <div className="int-row">
                    <div className="int-row-left">
                      <div className="int-logo" style={{ background: '#f5f5f5', borderColor: '#e5e5e5' }}><i className="ti ti-brand-apple" style={{ fontSize: 17, color: '#333' }} /></div>
                      <div><div className="action-label">Apple Calendar</div><div className="action-desc">Not connected</div></div>
                    </div>
                    <button className="btn btn-sm">Connect</button>
                  </div>
                  <div className="int-row">
                    <div className="int-row-left">
                      <div className="int-logo" style={{ background: '#f0f4ff', borderColor: '#c7d4ff' }}><i className="ti ti-mail" style={{ fontSize: 17, color: '#0078d4' }} /></div>
                      <div><div className="action-label">Outlook / Microsoft 365</div><div className="action-desc">Not connected</div></div>
                    </div>
                    <button className="btn btn-sm">Connect</button>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Property portals</div>
                    <div className="section-sub">Auto-import listing data when you paste a URL into a new deal</div>
                  </div>
                  {[
                    { label: 'Rightmove', desc: 'Import listing data from any Rightmove URL', logo: 'RM', logoStyle: { background: '#e8f4fd', borderColor: '#b8ddf7', fontSize: 10, fontWeight: 800, color: '#0066cc' } as React.CSSProperties },
                    { label: 'Zoopla', desc: 'Import listing data from any Zoopla URL', logo: 'Z', logoStyle: { background: '#fdf0e8', borderColor: '#f7d0b0', fontSize: 11, fontWeight: 800, color: '#e06000' } as React.CSSProperties },
                    { label: 'OnTheMarket', desc: 'Import listing and comparable sales data', logo: 'OTM', logoStyle: { background: '#edfaf3', borderColor: '#9fddbe', fontSize: 9, fontWeight: 800, color: '#1a7a45' } as React.CSSProperties },
                  ].map(item => (
                    <div key={item.label} className="int-row">
                      <div className="int-row-left">
                        <div className="int-logo" style={item.logoStyle}>{item.logo}</div>
                        <div><div className="action-label">{item.label}</div><div className="action-desc">{item.desc}</div></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-soon">Coming soon</span>
                        <button className="btn btn-sm">Notify me</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Workflow</div>
                    <div className="section-sub">Connect to your existing tools and automations</div>
                  </div>
                  {[
                    { label: 'Zapier', desc: 'Trigger workflows in 5,000+ apps on deal events', icon: 'ti-bolt', iconColor: '#7C3AED', logoStyle: { background: '#f5f0ff', borderColor: '#d4b8f7' } as React.CSSProperties },
                    { label: 'Notion', desc: 'Sync deal summaries to a Notion database', icon: 'ti-brand-notion', iconColor: '#333', logoStyle: { background: '#f5f5f5', borderColor: '#e5e5e5' } as React.CSSProperties },
                    { label: 'Airtable', desc: 'Push deal data to an Airtable base', icon: 'ti-table', iconColor: '#1a7a55', logoStyle: { background: '#e8fdf5', borderColor: '#9fddc8' } as React.CSSProperties },
                  ].map(item => (
                    <div key={item.label} className="int-row">
                      <div className="int-row-left">
                        <div className="int-logo" style={item.logoStyle}><i className={`ti ${item.icon}`} style={{ fontSize: 17, color: item.iconColor }} /></div>
                        <div><div className="action-label">{item.label}</div><div className="action-desc">{item.desc}</div></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-soon">Coming soon</span>
                        <button className="btn btn-sm">Notify me</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="section">
                  <div className="section-hdr"><div className="section-title">Webhooks &amp; API</div></div>
                  <div className="action-row">
                    <div><div className="action-label">Webhook endpoint</div><div className="action-desc">POST deal events to your URL</div></div>
                    <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>Coming soon</span>
                  </div>
                  <div className="action-row">
                    <div><div className="action-label">API key</div><div className="action-desc">Access the DealScore API from your own tools</div></div>
                    <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 10, padding: '3px 8px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>Coming soon</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ ACCOUNT & SECURITY ══════════ */}
            {activePane === 'security' && (
              <div>
                <div className="section">
                  <div className="section-hdr"><div className="section-title">Sign-in &amp; authentication</div></div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Password</div>
                      <div className="action-desc action-status-warn"><i className="ti ti-alert-circle" style={{ fontSize: 11 }} /> Last changed — never</div>
                    </div>
                    <button className="btn btn-sm">Change password</button>
                  </div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Google SSO</div>
                      <div className="action-desc">Sign in with your Google account</div>
                    </div>
                    <button className="btn btn-sm">Connect Google</button>
                  </div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Two-factor authentication</div>
                      <div className="action-desc action-status-warn"><i className="ti ti-alert-circle" style={{ fontSize: 11 }} /> Not enabled — adds extra protection</div>
                    </div>
                    <button className="btn btn-sm">Enable 2FA</button>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr"><div className="section-title">Privacy</div></div>
                  <TglRow label="Default privacy mode on" desc="Masks addresses, seller names, and personal data at startup. Toggle off anytime from the header." />
                </div>

                <div className="section">
                  <div className="section-hdr">
                    <div className="section-title">Active sessions</div>
                    <div className="section-sub">Devices currently signed in to DealScore</div>
                  </div>
                  <div className="action-row">
                    <div>
                      <div className="action-label" style={{ display: 'flex', alignItems: 'center', gap: 7 }}><i className="ti ti-device-laptop" style={{ fontSize: 14, color: TEXT2 }} /> This device</div>
                      <div className="action-desc action-status-ok"><i className="ti ti-circle-check" style={{ fontSize: 11 }} /> Current session</div>
                    </div>
                    <button className="btn btn-sm" style={{ opacity: .35, cursor: 'default' }}>This device</button>
                  </div>
                </div>

                <div className="section">
                  <div className="section-hdr"><div className="section-title" style={{ color: '#b91c1c' }}>Account actions</div></div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Export all my data</div>
                      <div className="action-desc">Download all deals, packs, and settings as a ZIP — GDPR Article 20</div>
                    </div>
                    <button className="btn btn-sm">Export data</button>
                  </div>
                  <div className="action-row">
                    <div>
                      <div className="action-label">Sign out</div>
                      <div className="action-desc">Sign out of this browser session</div>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => { signOut().then(() => navigate('/login')) }}>Sign out</button>
                  </div>
                  <div className="action-row">
                    <div>
                      <div className="action-label" style={{ color: '#dc2626' }}>Delete account</div>
                      <div className="action-desc">Permanently removes your account and all data. This cannot be undone.</div>
                    </div>
                    <button className="btn btn-sm btn-danger">Delete account</button>
                  </div>
                </div>
              </div>
            )}

          </div>{/* /content-panel */}
        </div>{/* /page */}
      </div>{/* /page-wrap */}

      {upgradeModal && (
        <UpgradeModal state={upgradeModal} onClose={() => setUpgradeModal(null)} />
      )}
    </div>
  )
}
