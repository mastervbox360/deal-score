import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { startCheckout } from '../lib/checkoutService'
import { UserTier } from '../lib/database.types'
import AppHeader from '../components/AppHeader'
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_BODY, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <AppHeader />

      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', padding: '28px 24px', gap: 28, alignItems: 'flex-start' }}>

        {/* Sidebar */}
        <aside style={{ width: SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 24 }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: TEXT3, marginBottom: 6, paddingLeft: 10 }}>{group.label}</div>
              {group.items.map(item => (
                <button key={item.id} onClick={() => setActivePane(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 7,
                  border: 'none', background: activePane === item.id ? '#fff' : 'transparent',
                  boxShadow: activePane === item.id ? `0 1px 4px rgba(0,0,0,.08), inset 0 0 0 .5px ${BORDER}` : 'none',
                  color: activePane === item.id ? NAVY : TEXT2, fontWeight: activePane === item.id ? 600 : 400,
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', marginBottom: 1,
                  transition: 'all .15s',
                }}>
                  <i className={`ti ${item.icon}`} style={{ fontSize: 14, opacity: activePane === item.id ? 1 : .65 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <Badge color="soon">soon</Badge>}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Content panel */}
        <main style={{ flex: 1, background: '#fff', border: `.5px solid ${BORDER}`, borderRadius: 10, padding: '24px 28px', minWidth: 0 }}>

          {/* ── PROFILE ── */}
          {activePane === 'profile' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Profile</h2>

              <div style={{ ...sect }}>
                <div style={sHdr}><div style={sTitle}>Personal details</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 10 }}>
                  <div>
                    <label style={lbl}>Full name</label>
                    <input style={inp} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div>
                    <label style={lbl}>Email</label>
                    <div style={{ ...inp, background: BG_SEC, color: TEXT2 }}>{user?.email ?? '—'}</div>
                  </div>
                  <div>
                    <label style={lbl}>Company / trading name</label>
                    <input style={inp} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your company (optional)" />
                  </div>
                  <div>
                    <label style={lbl}>Phone</label>
                    <input style={inp} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={lbl}>About / bio <span style={{ fontWeight: 400, color: TEXT3 }}>optional</span></label>
                    <textarea style={{ ...inp, minHeight: 68, resize: 'vertical' }} value={bio} onChange={e => setBio(e.target.value)} placeholder="A short note about your sourcing business — shown on shared deal pages" />
                  </div>
                </div>
                {profileError && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 10 }}>{profileError}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <div style={{ fontSize: 11, color: TEAL, display: 'flex', alignItems: 'center', gap: 5, opacity: profileSaved ? 1 : 0, transition: 'opacity .3s', marginRight: 8 }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 13 }} /> Saved
                  </div>
                  <button onClick={handleProfileSave} disabled={profileSaving} style={{ padding: '6px 14px', border: 'none', borderRadius: 6, background: profileSaving ? '#9ca3af' : NAVY, color: '#fff', fontSize: 12, fontWeight: 600, cursor: profileSaving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {profileSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>

              <div style={{ ...sect }}>
                <div style={sHdr}><div style={sTitle}>Social links</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                  <div>
                    <label style={lbl}>LinkedIn</label>
                    <input style={inp} value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" />
                  </div>
                  <div>
                    <label style={lbl}>Instagram</label>
                    <input style={inp} value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@yourhandle" />
                  </div>
                </div>
                <SaveRow toastId="toast-social" />
              </div>

              <div style={{ ...sectLast }}>
                <div style={sHdr}><div style={sTitle}>Profile completion</div></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {[
                    { label: '+ Add logo', pane: 'branding' as PaneId, done: !!profile?.logo_url },
                    { label: '+ Add bio', pane: 'profile' as PaneId, done: !!bio },
                    { label: '+ Brand colour', pane: 'branding' as PaneId, done: !!profile?.brand_colour },
                    { label: '+ Sourcing fee default', pane: 'defaults' as PaneId, done: false },
                    { label: '+ Connect calendar', pane: 'integrations' as PaneId, done: false },
                  ].map(chip => (
                    <button key={chip.label} onClick={() => setActivePane(chip.pane)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: `.5px solid ${chip.done ? TEAL : BORDER}`, background: chip.done ? '#d1fae5' : '#fff', color: chip.done ? '#065f46' : NAVY, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                      {chip.done ? <><i className="ti ti-check" style={{ fontSize: 10, marginRight: 4 }} />{chip.label.replace('+ ', '')}</> : chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activePane === 'notifications' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Notifications</h2>
              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Deal workflow</div><div style={sSub}>Events in your deal pipeline</div></div></div>
                <TglRow label="Cooling-off expiring" desc="Remind me 48 hours before a buyer's cooling-off window closes" defaultOn />
                <TglRow label="Cooling-off expired" desc="Notify when the protection period ends and the deal is binding" defaultOn />
                <TglRow label="Offer deadline approaching" desc="24-hour warning before a deal's offer deadline" defaultOn />
                <TglRow label="Pack released" desc="Confirmation when an investor pack is successfully sent" defaultOn />
              </div>
              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Investor activity</div></div></div>
                <TglRow label="Fee received" desc="Notify when an investor fee payment is logged" defaultOn />
                <TglRow label="Investor logged" desc="Alert when a new investor is added to a deal" defaultOn />
              </div>
              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Reminders</div></div></div>
                <TglRow label="Viewing reminders" desc="Email reminder the morning of a scheduled viewing" defaultOn />
                <TglRow label="Follow-up nudges" desc="7-day nudge if a pack has been sent but no fee logged" />
              </div>
              <div style={sectLast}>
                <div style={sHdr}><div><div style={sTitle}>Digest</div></div></div>
                <TglRow label="Weekly summary email" desc="Every Monday — deals in progress, fees pending, pipeline snapshot" defaultOn />
                <TglRow label="Monthly performance summary" desc="1st of each month — fees earned, deals closed, referrals" defaultOn />
                <SaveRow toastId="toast-notif" />
              </div>
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {activePane === 'preferences' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Preferences</h2>
              <div style={sect}>
                <div style={sHdr}><div style={sTitle}>Display</div></div>
                <TglRow label="Compact pipeline view" desc="Reduce row height in the pipeline table for more deals on screen" />
                <TglRow label="Show deal reference prefix" desc="Display DS-001 style references on deal cards and lists" defaultOn />
                <TglRow label="Show metrics in sidebar" desc="Live cash flow and yield figures in the deal navigation sidebar" defaultOn />
              </div>
              <div style={sectLast}>
                <div style={sHdr}><div style={sTitle}>Region &amp; language</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                  <div>
                    <label style={lbl}>Currency</label>
                    <select style={sel}><option>£ GBP — British Pound</option></select>
                  </div>
                  <div>
                    <label style={lbl}>Date format</label>
                    <select style={sel}><option>DD / MM / YYYY</option><option>MM / DD / YYYY</option></select>
                  </div>
                  <div>
                    <label style={lbl}>Language</label>
                    <select style={sel}><option>English (UK)</option></select>
                  </div>
                </div>
                <SaveRow toastId="toast-prefs" />
              </div>
            </div>
          )}

          {/* ── BRANDING ── */}
          {activePane === 'branding' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Branding</h2>
              <div style={sect}>
                <div style={sHdr}>
                  <div><div style={sTitle}>Company details</div><div style={sSub}>Shown on shared deal pages and pack footers</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                  <div>
                    <label style={lbl}>Display name</label>
                    <input style={inp} defaultValue={companyName || ''} placeholder="Your trading name" />
                  </div>
                  <div>
                    <label style={lbl}>Tagline</label>
                    <input style={inp} placeholder="e.g. Off-market property specialists" />
                  </div>
                  <div>
                    <label style={lbl}>FCA / regulatory disclaimer</label>
                    <textarea style={{ ...inp, minHeight: 56, resize: 'vertical', gridColumn: '1/-1' }} placeholder="e.g. This is not financial advice. Past performance does not guarantee future results." />
                  </div>
                </div>
                <SaveRow toastId="toast-brand-co" />
              </div>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Logo <Badge color="pro">PRO</Badge></div><div style={sSub}>Appears on PDF pack covers and deal share pages</div></div></div>
                {isPro ? (
                  <div style={{ border: `.5px dashed ${BORDER}`, borderRadius: 8, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: BG_SEC }}>
                    <i className="ti ti-cloud-upload" style={{ fontSize: 24, color: TEXT3, display: 'block', marginBottom: 8 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT2, marginBottom: 3 }}>Click to upload your logo</div>
                    <div style={{ fontSize: 11, color: TEXT3 }}>PNG, SVG or JPG · Max 2MB · Transparent background recommended</div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ border: `.5px dashed ${BORDER}`, borderRadius: 8, padding: '24px 16px', textAlign: 'center', background: BG_SEC, filter: 'blur(1px)' }}>
                      <i className="ti ti-cloud-upload" style={{ fontSize: 24, color: TEXT3, display: 'block', marginBottom: 8 }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: TEXT2 }}>Click to upload your logo</div>
                    </div>
                    <GatedOverlay label="Upgrade to Pro to upload your logo" />
                  </div>
                )}
              </div>

              <div style={{ position: 'relative', ...sect }}>
                <div style={sHdr}><div style={sTitle}>Brand colours <Badge color="plus">PRO+</Badge></div></div>
                {!isProPlus && <GatedOverlay label="Upgrade to Pro Plus to unlock brand colours" />}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', opacity: isProPlus ? 1 : .4 }}>
                  <div>
                    <label style={lbl}>Primary colour</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: profile?.brand_colour ?? NAVY, border: `.5px solid ${BORDER}`, flexShrink: 0 }} />
                      <input style={inp} defaultValue={profile?.brand_colour ?? '#1B3A6B'} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Accent colour</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: profile?.accent_colour ?? TEAL, border: `.5px solid ${BORDER}`, flexShrink: 0 }} />
                      <input style={inp} defaultValue={profile?.accent_colour ?? '#1D9E75'} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative', ...sectLast }}>
                <div style={sHdr}><div style={sTitle}>Pack cover style <Badge color="plus">PRO+</Badge></div></div>
                {!isProPlus && <GatedOverlay label="Upgrade to Pro Plus to unlock cover styles" />}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, opacity: isProPlus ? 1 : .4 }}>
                  {[
                    { label: 'Branded', bg: NAVY_DARK, textC: '#fff', text: 'BRANDED' },
                    { label: 'Minimal', bg: BG_SEC, textC: TEXT2, text: 'MINIMAL' },
                    { label: 'Your brand', bg: `linear-gradient(135deg,${NAVY},${TEAL})`, textC: '#fff', text: 'YOUR BRAND' },
                  ].map((s, i) => (
                    <div key={s.label} style={{ border: `.5px solid ${i === 0 ? NAVY : BORDER}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }}>
                      <div style={{ height: 52, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: s.textC, letterSpacing: '.06em' }}>{s.text}</div>
                      <div style={{ padding: '7px 10px', fontSize: 11, fontWeight: 600, color: TEXT1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {isProPlus && <SaveRow toastId="toast-brand" />}
              </div>
            </div>
          )}

          {/* ── DEAL DEFAULTS ── */}
          {activePane === 'defaults' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Deal defaults</h2>
              <div style={sect}>
                <div style={sHdr}><div style={sTitle}>Tax &amp; ownership</div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                  {[
                    { lbl: 'Country', opts: ['England / NI — SDLT', 'Wales — LTT', 'Scotland — LBTT'] },
                    { lbl: 'Buyer type', opts: ['Additional property / BTL', 'First time buyer', 'Standard residential'] },
                    { lbl: 'Ownership structure', opts: ['Personal name', 'Limited company (SPV)', 'Partnership / LLP'] },
                    { lbl: 'Default strategy', opts: ['BTL — Buy to let', 'SA — Serviced accommodation', 'HMO — House in multiple occ.', 'Flip / refurb', 'BRRR'] },
                  ].map(f => (
                    <div key={f.lbl}>
                      <label style={lbl}>{f.lbl}</label>
                      <select style={sel}>{f.opts.map(o => <option key={o}>{o}</option>)}</select>
                    </div>
                  ))}
                  <div>
                    <label style={lbl}>Cooling-off period</label>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <input type="number" defaultValue={14} style={{ ...inp, flex: 1 }} />
                      <span style={{ padding: '7px 10px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: TEXT2, whiteSpace: 'nowrap' }}>days</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Sourcing fees</div><div style={sSub}>Defaults when generating deal packs and invoices</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                  <div>
                    <label style={lbl}>Default fee</label>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <input type="number" placeholder="2.5" style={{ ...inp, flex: 1 }} />
                      <span style={{ padding: '7px 10px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: TEXT2 }}>%</span>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Fee minimum</label>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ padding: '7px 10px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: '6px 0 0 6px', fontSize: 12, color: TEXT2, borderRight: 'none' }}>£</span>
                      <input type="number" placeholder="3000" style={{ ...inp, borderRadius: '0 6px 6px 0' }} />
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Payment terms</label>
                    <select style={sel}><option>Due on pack release</option><option>50% on reservation, 50% on completion</option><option>Due on completion</option></select>
                  </div>
                </div>
              </div>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Financing</div><div style={sSub}>Update when your broker confirms a new rate</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                  {[
                    { l: 'Finance method', type: 'select', opts: ['Mortgage', 'Bridging loan', 'Cash'] },
                    { l: 'LTV', type: 'number', val: '75', suf: '%' },
                    { l: 'Interest rate', type: 'number', val: '5.5', suf: '% pa' },
                    { l: 'Mortgage term', type: 'number', val: '25', suf: 'yrs' },
                    { l: 'Repayment type', type: 'select', opts: ['Interest only', 'Capital repayment'] },
                    { l: 'Arrangement fee', type: 'number', val: '995', pre: '£' },
                    { l: 'Solicitor / legal', type: 'number', val: '1500', pre: '£' },
                    { l: 'Survey', type: 'number', val: '400', pre: '£' },
                    { l: 'Broker fee', type: 'number', val: '500', pre: '£' },
                  ].map(f => (
                    <div key={f.l}>
                      <label style={lbl}>{f.l}</label>
                      {f.type === 'select' ? (
                        <select style={sel}>{(f.opts ?? []).map(o => <option key={o}>{o}</option>)}</select>
                      ) : f.pre ? (
                        <div style={{ display: 'flex', gap: 0 }}>
                          <span style={{ padding: '7px 9px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: '6px 0 0 6px', fontSize: 12, color: TEXT2, borderRight: 'none' }}>{f.pre}</span>
                          <input type="number" defaultValue={f.val} style={{ ...inp, borderRadius: '0 6px 6px 0', borderLeft: 'none' }} />
                        </div>
                      ) : f.suf ? (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input type="number" defaultValue={f.val} style={{ ...inp, flex: 1 }} />
                          <span style={{ padding: '7px 9px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: TEXT2, whiteSpace: 'nowrap' }}>{f.suf}</span>
                        </div>
                      ) : (
                        <input type="number" defaultValue={f.val} style={inp} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Monthly running costs</div><div style={sSub}>DS Assistant will prompt you to confirm each one per deal</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                  {[
                    { l: 'Maintenance', val: '75', pre: '£', hint: 'Per month' },
                    { l: 'Buildings insurance', val: '30', pre: '£' },
                    { l: 'Management fee', val: '10', suf: '% rent', hint: '0 if self-managing' },
                    { l: 'Void allowance', val: '4', suf: 'wks/yr' },
                    { l: 'Accountancy', val: '50', pre: '£', hint: 'Pro-rated monthly' },
                    { l: 'Service charge/mo', val: '0', pre: '£' },
                    { l: 'Ground rent/mo', val: '0', pre: '£' },
                  ].map(f => (
                    <div key={f.l}>
                      <label style={lbl}>{f.l}</label>
                      {f.pre ? (
                        <div style={{ display: 'flex' }}>
                          <span style={{ padding: '7px 9px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: '6px 0 0 6px', fontSize: 12, color: TEXT2, borderRight: 'none' }}>{f.pre}</span>
                          <input type="number" defaultValue={f.val} style={{ ...inp, borderRadius: '0 6px 6px 0', borderLeft: 'none' }} />
                        </div>
                      ) : f.suf ? (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input type="number" defaultValue={f.val} style={{ ...inp, flex: 1 }} />
                          <span style={{ padding: '7px 9px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: TEXT2, whiteSpace: 'nowrap' }}>{f.suf}</span>
                        </div>
                      ) : <input type="number" defaultValue={f.val} style={inp} />}
                      {f.hint && <span style={fieldHint}>{f.hint}</span>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Deal targets</div><div style={sSub}>Deals below these thresholds are flagged on the analysis screen</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
                  {[
                    { l: 'Min gross yield', val: '6', suf: '%' },
                    { l: 'Min net yield', val: '4', suf: '%' },
                    { l: 'Min monthly cashflow', val: '200', pre: '£' },
                    { l: 'Min ROI', val: '10', suf: '%' },
                    { l: 'Min cash-on-cash', val: '8', suf: '%' },
                  ].map(f => (
                    <div key={f.l}>
                      <label style={lbl}>{f.l}</label>
                      {f.pre ? (
                        <div style={{ display: 'flex' }}>
                          <span style={{ padding: '7px 9px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: '6px 0 0 6px', fontSize: 12, color: TEXT2, borderRight: 'none' }}>{f.pre}</span>
                          <input type="number" defaultValue={f.val} style={{ ...inp, borderRadius: '0 6px 6px 0', borderLeft: 'none' }} />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input type="number" defaultValue={f.val} style={{ ...inp, flex: 1 }} />
                          <span style={{ padding: '7px 9px', background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 6, fontSize: 12, color: TEXT2 }}>{f.suf}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={sectLast}>
                <div style={sHdr}><div><div style={sTitle}>Sharing &amp; access</div><div style={sSub}>Defaults applied when creating new deal share links</div></div></div>
                <TglRow label="Protect address on shared links" desc="New deals default to masking the property address in investor share links and packs" defaultOn />
                <TglRow label="Require investor auth on share links" desc="Shared deal links require the investor to authenticate before viewing" defaultOn />
                <SaveRow toastId="toast-defaults" />
              </div>
            </div>
          )}

          {/* ── DS ASSISTANT ── */}
          {activePane === 'assistant' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>DS Assistant</h2>
              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Validation flags</div><div style={sSub}>Fields the Assistant always prompts you to confirm on each deal</div></div></div>
                <TglRow label="Flag maintenance allowance" desc="Prompt to confirm the default is appropriate for this property's age and condition" defaultOn />
                <TglRow label="Flag void allowance" desc="Confirm void % is appropriate for the local market" defaultOn />
                <TglRow label="Flag missing strategy fields" desc="Alert when SA nightly rate, HMO room count, or other strategy-specific fields are absent" defaultOn />
                <TglRow label="Flag below-target metrics" desc="Warn when a deal falls below the thresholds set in Deal Defaults" defaultOn />
              </div>
              <div style={sectLast}>
                <div style={sHdr}><div><div style={sTitle}>Assistant behaviour</div><div style={sSub}>Control how the DS Assistant works when analysing your deals</div></div></div>
                <TglRow label="Auto-suggest on deal open" desc="DS Assistant automatically surfaces insights when you open a deal, without waiting to be asked" defaultOn />
                <TglRow label="Strategy-specific analysis" desc="Show only the metrics and flags relevant to the deal's chosen strategy" defaultOn />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginTop: 12 }}>
                  <div>
                    <label style={lbl}>Confidence threshold</label>
                    <select style={sel}><option>Show all suggestions</option><option selected>Medium confidence +</option><option>High confidence only</option></select>
                    <span style={fieldHint}>How certain the Assistant must be before flagging an issue</span>
                  </div>
                  <div>
                    <label style={lbl}>Strategies to analyse</label>
                    <select style={sel}><option selected>All strategies</option><option>BTL only</option><option>SA only</option><option>HMO only</option></select>
                    <span style={fieldHint}>Limit assistant suggestions to specific strategies</span>
                  </div>
                </div>
                <SaveRow toastId="toast-assistant" />
              </div>
            </div>
          )}

          {/* ── SUBSCRIPTION ── */}
          {activePane === 'subscription' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Subscription</h2>

              <div style={sect}>
                <div style={sHdr}><div style={sTitle}>Current plan</div></div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: trialDays !== null ? '#f0fdf4' : BG_SEC, border: `.5px solid ${trialDays !== null ? '#86efac' : BORDER}`, borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: trialDays !== null ? '#d1fae5' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ti ${trialDays !== null ? 'ti-clock' : 'ti-crown'}`} style={{ fontSize: 16, color: trialDays !== null ? TEAL : NAVY }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: TEXT1, display: 'flex', alignItems: 'center', gap: 7 }}>
                        {tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Pro Plus'}
                        {trialDays !== null && <Badge color="trial">{trialDays} days remaining</Badge>}
                      </div>
                      <div style={{ fontSize: 11, color: TEXT2, marginTop: 2 }}>
                        {trialDays !== null ? 'No card required. Your deals and data are saved throughout.' : `Your current plan`}
                      </div>
                    </div>
                  </div>
                  {isPro && <button onClick={() => window.open('https://billing.stripe.com/p/login', '_blank')} style={{ padding: '7px 14px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Manage billing</button>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5px', background: BORDER, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                  {[['14', 'Deals saved'], ['6', 'Packs this month'], [trialDays !== null ? 'Active' : 'Live', 'Status']].map(([val, label]) => (
                    <div key={label} style={{ background: '#fff', padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: TEXT3, fontWeight: 600, marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: TEXT1 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {checkoutError && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>{checkoutError}</div>}

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Plans</div><div style={sSub}>Upgrade or downgrade at any time</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* Pro */}
                  <div style={{ border: `.5px solid ${tier === 'pro' ? NAVY : BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', background: tier === 'pro' ? BG_SEC : '#fff', borderBottom: `.5px solid ${BORDER}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TEXT1, display: 'flex', alignItems: 'center', gap: 7 }}>Pro {tier === 'pro' && <Badge color="current">Current</Badge>}</div>
                      <div style={{ fontSize: 11, color: TEXT2, marginTop: 2 }}>£29/mo · or £279/yr</div>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      {['All 7 deal strategies', 'Save deals & pipeline', 'PDF packs', 'Deal sharing', 'DealScore Assistant', 'Calendar sync'].map(f => (
                        <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: TEXT2, padding: '2px 0' }}>
                          <i className="ti ti-check" style={{ color: TEAL, fontSize: 10 }} /> {f}
                        </div>
                      ))}
                      {tier !== 'pro' && (
                        <button onClick={() => handleUpgrade('pro')} disabled={checkoutLoading !== null} style={{ width: '100%', marginTop: 12, padding: '8px', border: 'none', borderRadius: 6, background: NAVY, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {checkoutLoading === 'pro' ? 'Redirecting…' : 'Upgrade to Pro'}
                        </button>
                      )}
                      {tier === 'pro' && <div style={{ marginTop: 12, padding: '8px', border: `.5px solid ${BORDER}`, borderRadius: 6, textAlign: 'center', fontSize: 12, color: TEXT2 }}>Current plan</div>}
                    </div>
                  </div>
                  {/* Pro Plus */}
                  <div style={{ border: `.5px solid ${tier === 'pro_plus' ? NAVY : BORDER}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', background: `linear-gradient(135deg, ${NAVY_DARK}, #4f46e5)`, borderBottom: `.5px solid ${BORDER}` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Pro Plus</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>£59/mo · or £559/yr</div>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: TEXT3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Everything in Pro, plus:</div>
                      {['Smart Capture', 'Landscape Pro Plus PDF', 'Deal Optimiser', 'Visual branding', 'Webhooks & API'].map(f => (
                        <div key={f} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: TEXT2, padding: '2px 0' }}>
                          <i className="ti ti-check" style={{ color: PURPLE, fontSize: 10 }} /> {f}
                        </div>
                      ))}
                      {!isProPlus && (
                        <button onClick={() => handleUpgrade('pro_plus')} disabled={checkoutLoading !== null} style={{ width: '100%', marginTop: 12, padding: '8px', border: 'none', borderRadius: 6, background: `linear-gradient(135deg, ${NAVY_DARK}, #4f46e5)`, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                          {checkoutLoading === 'pro_plus' ? 'Redirecting…' : 'Upgrade to Pro Plus'}
                        </button>
                      )}
                      {isProPlus && <div style={{ marginTop: 12, padding: '8px', border: `.5px solid ${BORDER}`, borderRadius: 6, textAlign: 'center', fontSize: 12, color: TEXT2 }}>Current plan</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={sectLast}>
                <div style={sHdr}><div style={sTitle}>Payment</div></div>
                <div style={actionRow}>
                  <div>
                    <div style={actionLbl}>Payment method</div>
                    <div style={{ ...actionDesc, color: AMBER, display: 'flex', alignItems: 'center', gap: 4 }}><i className="ti ti-alert-circle" style={{ fontSize: 11 }} /> No card on file — add one before your trial ends</div>
                  </div>
                  <button style={{ padding: '6px 12px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Add card</button>
                </div>
                <div style={{ ...actionRow, borderBottom: 'none' }}>
                  <div>
                    <div style={actionLbl}>Invoice history</div>
                    <div style={actionDesc}>No invoices yet</div>
                  </div>
                  <button style={{ padding: '6px 12px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT2, fontSize: 12, cursor: 'default', fontFamily: 'inherit', opacity: .4, flexShrink: 0 }}>Download</button>
                </div>
              </div>
            </div>
          )}

          {/* ── REFERRALS ── */}
          {activePane === 'referrals' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Referrals</h2>
              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Your referral link</div><div style={sSub}>Earn 1 free month for every person who upgrades to Pro or above</div></div></div>
                <div style={{ background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: TEXT2, marginBottom: 8 }}>Share this link</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
                    <input readOnly value={referralLink} style={{ ...inp, flex: 1, background: '#fff', color: TEXT1, fontFamily: 'monospace', fontSize: 12 }} />
                    <button onClick={copyRef} style={{ padding: '7px 14px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Copy</button>
                    <div ref={refToast} style={{ position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)', background: NAVY, color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 6, opacity: 0, transition: 'opacity .3s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>Copied!</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5px', background: BORDER, borderRadius: 8, overflow: 'hidden' }}>
                  {[['3', 'Referrals sent'], ['2', 'Converted'], ['2', 'Months earned']].map(([val, lbl2]) => (
                    <div key={lbl2} style={{ background: '#fff', padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: TEXT3, fontWeight: 600, marginBottom: 3 }}>{lbl2}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: lbl2 === 'Months earned' ? TEAL : TEXT1 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={sectLast}>
                <div style={sHdr}><div style={sTitle}>Referral history</div></div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `.5px solid ${BORDER}` }}>
                      {['Referred to', 'Date sent', 'Status', 'Reward'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 600, color: TEXT3, textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { email: 'sarah@investormail.co.uk', date: '14 Apr 2026', status: 'Converted · Pro', reward: '+1 month', converted: true },
                      { email: 'james@propertynow.com', date: '2 Mar 2026', status: 'Converted · Pro', reward: '+1 month', converted: true },
                      { email: 'mike@homesearch.co.uk', date: '18 Feb 2026', status: 'Signed up · free', reward: '—', converted: false },
                    ].map(row => (
                      <tr key={row.email} style={{ borderBottom: `.5px solid ${BORDER}` }}>
                        <td style={{ padding: '10px 10px', color: TEXT1 }}>{row.email}</td>
                        <td style={{ padding: '10px 10px', color: TEXT2 }}>{row.date}</td>
                        <td style={{ padding: '10px 10px' }}>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: row.converted ? '#d1fae5' : '#f3f4f6', color: row.converted ? '#065f46' : TEXT2 }}>{row.status}</span>
                        </td>
                        <td style={{ padding: '10px 10px', fontWeight: 600, color: row.converted ? TEAL : TEXT3 }}>{row.reward}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── AGENCY ── */}
          {activePane === 'agency' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Agency</h2>
              <div style={sect}>
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <i className="ti ti-building-store" style={{ fontSize: 22, color: PURPLE }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: TEXT3, marginBottom: 8 }}>Coming soon</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: TEXT1, marginBottom: 6 }}>DealScore Agency</div>
                  <div style={{ fontSize: 12, color: TEXT2, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>Your brand, your domain, your investors — DealScore runs invisibly behind the scenes.</div>
                </div>
              </div>
              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>What's included</div><div style={sSub}>Everything in Pro Plus, plus full white-labelling and team management</div></div></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                    <div key={f.title} style={{ background: BG_SEC, border: `.5px solid ${BORDER}`, borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <i className={`ti ${f.icon}`} style={{ fontSize: 14, color: PURPLE }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT1 }}>{f.title}</div>
                      </div>
                      <div style={{ fontSize: 11, color: TEXT2 }}>{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={sectLast}>
                <div style={sHdr}><div><div style={sTitle}>Join the waiting list</div><div style={sSub}>We'll email you before Agency launches publicly</div></div></div>
                {agencySubmitted ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <i className="ti ti-circle-check" style={{ fontSize: 28, color: TEAL, display: 'block', marginBottom: 8 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: TEXT1, marginBottom: 3 }}>You're on the list</div>
                    <div style={{ fontSize: 12, color: TEXT2 }}>We'll email {agencyEmail} before Agency launches.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 12 }}>
                      <div><label style={lbl}>Name</label><input style={inp} value={agencyName} onChange={e => setAgencyName(e.target.value)} /></div>
                      <div><label style={lbl}>Email</label><input style={inp} value={agencyEmail} onChange={e => setAgencyEmail(e.target.value)} /></div>
                      <div style={{ gridColumn: '1/-1' }}><label style={lbl}>Company / trading name</label><input style={inp} value={agencyCompany} onChange={e => setAgencyCompany(e.target.value)} placeholder="e.g. Mardania Property Sourcing" /></div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={lbl}>Team size</label>
                        <select style={sel} value={agencyTeamSize} onChange={e => setAgencyTeamSize(e.target.value)}>
                          {['Just me', '2–5', '6–15', '15+'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={lbl}>Anything specific you need? <span style={{ fontWeight: 400, color: TEXT3 }}>optional</span></label>
                        <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={agencyNotes} onChange={e => setAgencyNotes(e.target.value)} placeholder="e.g. I need a custom domain and my own investor login page…" />
                      </div>
                    </div>
                    <button onClick={() => { if (agencyEmail.includes('@')) setAgencySubmitted(true) }} style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: PURPLE, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Join waiting list</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── INTEGRATIONS ── */}
          {activePane === 'integrations' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Integrations</h2>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Calendar <Badge color="pro">PRO</Badge></div><div style={sSub}>Sync viewings, Day 15 countdowns, and chase reminders</div></div></div>
                {[
                  { name: 'Google Calendar', desc: 'Not connected', connected: false, iconBg: '#fff4f4', iconBorder: '#ffd0d0', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/><path d="M3.15283 7.3455L6.43833 9.755C7.32733 7.554 9.48033 6 11.9998 6C13.5293 6 14.9208 6.577 15.9803 7.5195L18.8088 4.691C17.0228 3.0265 14.6338 2 11.9998 2C8.15883 2 4.82783 4.1685 3.15283 7.3455Z" fill="#FF3D00"/><path d="M12.0002 22C14.5832 22 16.9302 21.0115 18.7047 19.404L15.6097 16.785C14.5719 17.5742 13.3039 18.001 12.0002 18C9.39916 18 7.19066 16.3415 6.35866 14.027L3.09766 16.5395C4.75266 19.778 8.11366 22 12.0002 22Z" fill="#4CAF50"/><path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/></svg> },
                  { name: 'Apple Calendar', desc: 'Connected', connected: true, iconBg: '#f5f5f5', iconBorder: '#e5e5e5', icon: <i className="ti ti-brand-apple" style={{ fontSize: 15, color: '#333' }} /> },
                  { name: 'Outlook / Microsoft 365', desc: 'Not connected', connected: false, iconBg: '#f0f4ff', iconBorder: '#c7d4ff', icon: <i className="ti ti-mail" style={{ fontSize: 15, color: '#0078d4' }} /> },
                ].map(row => (
                  <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `.5px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: row.iconBg, border: `.5px solid ${row.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{row.icon}</div>
                      <div>
                        <div style={actionLbl}>{row.name}</div>
                        <div style={{ ...actionDesc, color: row.connected ? TEAL : TEXT2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {row.connected && <i className="ti ti-circle-check" style={{ fontSize: 10 }} />} {row.desc}
                        </div>
                      </div>
                    </div>
                    <button style={{ padding: '5px 12px', border: `.5px solid ${row.connected ? '#fca5a5' : BORDER}`, borderRadius: 6, background: '#fff', color: row.connected ? '#dc2626' : TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      {row.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>

              {[
                { title: 'Property portals', sub: 'Auto-import listing data when you paste a URL into a new deal', items: ['Rightmove', 'Zoopla', 'OnTheMarket'] },
                { title: 'Workflow', sub: 'Connect to your existing tools and automations', items: ['Zapier', 'Notion', 'Airtable'] },
              ].map(group => (
                <div key={group.title} style={sect}>
                  <div style={sHdr}><div><div style={sTitle}>{group.title}</div><div style={sSub}>{group.sub}</div></div></div>
                  {group.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 0', borderBottom: `.5px solid ${BORDER}` }}>
                      <div style={actionLbl}>{item}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f3f4f6', color: TEXT2 }}>Coming soon</span>
                        <button style={{ padding: '5px 12px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Notify me</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div style={sectLast}>
                <div style={sHdr}><div style={sTitle}>Webhooks &amp; API</div></div>
                {[['Webhook endpoint', 'POST deal events to your URL'], ['API key', 'Access the DealScore API from your own tools']].map(([lbl2, desc2]) => (
                  <div key={lbl2} style={{ ...actionRow, borderBottom: 'none', paddingBottom: 11, paddingTop: 11, borderTop: `.5px solid ${BORDER}` }}>
                    <div>
                      <div style={actionLbl}>{lbl2}</div>
                      <div style={actionDesc}>{desc2}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: '#f1f5f9', color: '#64748b', whiteSpace: 'nowrap' }}>Coming soon</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACCOUNT & SECURITY ── */}
          {activePane === 'security' && (
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: TEXT1, margin: '0 0 20px' }}>Account &amp; Security</h2>

              <div style={sect}>
                <div style={sHdr}><div style={sTitle}>Sign-in &amp; authentication</div></div>
                {[
                  { label: 'Password', desc: 'Last changed — never', warn: true, btn: 'Change password' },
                  { label: 'Google SSO', desc: 'Sign in with your Google account', warn: false, btn: 'Connect Google' },
                  { label: 'Two-factor authentication', desc: 'Not enabled — adds extra protection', warn: true, btn: 'Enable 2FA' },
                ].map(row => (
                  <div key={row.label} style={actionRow}>
                    <div>
                      <div style={actionLbl}>{row.label}</div>
                      <div style={{ ...actionDesc, color: row.warn ? AMBER : TEXT2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {row.warn && <i className="ti ti-alert-circle" style={{ fontSize: 11 }} />} {row.desc}
                      </div>
                    </div>
                    <button style={{ padding: '5px 12px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>{row.btn}</button>
                  </div>
                ))}
              </div>

              <div style={sect}>
                <div style={sHdr}><div style={sTitle}>Privacy</div></div>
                <TglRow label="Default privacy mode on" desc="Masks addresses, seller names, and personal data at startup. Toggle off anytime from the header." />
              </div>

              <div style={sect}>
                <div style={sHdr}><div><div style={sTitle}>Active sessions</div><div style={sSub}>Devices currently signed in to DealScore</div></div></div>
                {[
                  { device: 'MacBook Pro — Chrome', icon: 'ti-device-laptop', desc: 'Current session · London, UK', current: true },
                  { device: 'iPhone 15 — Safari', icon: 'ti-device-mobile', desc: 'Last active 2 hours ago · London, UK', current: false },
                  { device: 'Windows PC — Edge', icon: 'ti-device-desktop', desc: 'Last active 3 days ago · Birmingham, UK', current: false },
                ].map(s => (
                  <div key={s.device} style={actionRow}>
                    <div>
                      <div style={{ ...actionLbl, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <i className={`ti ${s.icon}`} style={{ fontSize: 13, color: TEXT2 }} /> {s.device}
                      </div>
                      <div style={{ ...actionDesc, color: s.current ? TEAL : TEXT2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {s.current && <i className="ti ti-circle-check" style={{ fontSize: 10 }} />} {s.desc}
                      </div>
                    </div>
                    <button disabled={s.current} style={{ padding: '5px 12px', border: `.5px solid ${s.current ? BORDER : '#fca5a5'}`, borderRadius: 6, background: '#fff', color: s.current ? TEXT2 : '#dc2626', fontSize: 12, cursor: s.current ? 'default' : 'pointer', fontFamily: 'inherit', flexShrink: 0, opacity: s.current ? .4 : 1 }}>
                      {s.current ? 'This device' : 'Sign out'}
                    </button>
                  </div>
                ))}
                <div style={{ paddingTop: 12, textAlign: 'right' }}>
                  <button style={{ padding: '5px 12px', border: '.5px solid #fca5a5', borderRadius: 6, background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <i className="ti ti-logout" style={{ fontSize: 12 }} /> Sign out all other devices
                  </button>
                </div>
              </div>

              <div style={sectLast}>
                <div style={sHdr}><div style={{ ...sTitle, color: '#b91c1c' }}>Account actions</div></div>
                <div style={actionRow}>
                  <div>
                    <div style={actionLbl}>Export all my data</div>
                    <div style={actionDesc}>Download all deals, packs, and settings as a ZIP — GDPR Article 20</div>
                  </div>
                  <button style={{ padding: '5px 12px', border: `.5px solid ${BORDER}`, borderRadius: 6, background: '#fff', color: TEXT1, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Export data</button>
                </div>
                <div style={{ ...actionRow, borderBottom: 'none' }}>
                  <div>
                    <div style={actionLbl}>Sign out</div>
                    <div style={actionDesc}>Sign out of this browser session</div>
                  </div>
                  <button onClick={() => { signOut().then(() => navigate('/login')) }} style={{ padding: '5px 12px', border: '.5px solid #fca5a5', borderRadius: 6, background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Sign out</button>
                </div>
                <div style={{ ...actionRow, borderBottom: 'none', marginTop: 8, paddingTop: 12, borderTop: `.5px solid ${BORDER}` }}>
                  <div>
                    <div style={{ ...actionLbl, color: '#dc2626' }}>Delete account</div>
                    <div style={actionDesc}>Permanently removes your account and all data. This cannot be undone.</div>
                  </div>
                  <button style={{ padding: '5px 12px', border: '.5px solid #fca5a5', borderRadius: 6, background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Delete account</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {upgradeModal && (
        <UpgradeModal state={upgradeModal} onClose={() => setUpgradeModal(null)} />
      )}
    </div>
  )
}
