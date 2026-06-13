import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Metric { l: string; v: string; c?: string; }
interface Deal {
  id: string; dbId: string; strat: string; score: string; scoreCls: string; scoreLabel: string;
  status: string; statusLabel: string; addr: string; price: string; desc: string;
  heroLabel?: string; heroVal?: string; heroCls?: string; incomplete?: boolean;
  metrics: Metric[]; rejectReason?: string; archivedDate?: string; photoUrl?: string;
}
interface Notification { id: string; unread: boolean; type: string; icon: string; deal: string; msg: string; time: string; }
interface TodayTask { id: string; type: string; typeLabel: string; addr: string; detail: string; actionLabel: string; dateStr?: string; }
interface DealsDashboardProps {
  deals?: Deal[]; notifications?: Notification[]; todayTasks?: TodayTask[];
  userName?: string; userEmail?: string; userInitials?: string;
  onNewDeal?: () => void; onOpenDeal?: (id: string) => void;
  onPipeline?: () => void; onCompare?: () => void;
  onSellers?: () => void; onInvestors?: () => void; onSignOut?: () => void;
}

function mapDealToProps(deal: any, calcResult: any): Deal {
  const verdict = deal.verdict ?? calcResult?.verdict ?? null;
  const scoreCls = verdict === 'RECOMMENDED' ? 'rec' : verdict === 'REVIEW' ? 'rev' : verdict === 'AVOID' ? 'avo' : 'inc';
  const scoreLabel = verdict ? verdict.charAt(0) + verdict.slice(1).toLowerCase() : '';
  const cf = calcResult?.monthlyCashFlow;
  return {
    id: deal.deal_ref ?? deal.id?.slice(0,8).toUpperCase(),
    dbId: deal.id,
    strat: deal.strategy ?? 'BTL',
    score: verdict ?? 'INCOMPLETE', scoreCls, scoreLabel,
    status: deal.status ?? 'sourcing',
    statusLabel: deal.status ? deal.status.charAt(0).toUpperCase() + deal.status.slice(1) : 'Sourcing',
    addr: deal.address ?? 'No address',
    price: deal.inputs?.purchasePrice ? '£' + Number(deal.inputs.purchasePrice).toLocaleString() : 'Price not set',
    desc: [deal.inputs?.bedrooms, 'bed', deal.inputs?.propertyType].filter(Boolean).join(' '),
    heroVal: cf ? (cf >= 0 ? '+' : '') + '£' + Math.abs(cf).toFixed(0) + '/mo' : '—',
    heroCls: cf > 0 ? 'gr' : cf < 0 ? 're' : '',
    metrics: [
      { l: 'Monthly CF', v: cf ? (cf >= 0 ? '+' : '') + '£' + Math.abs(cf).toFixed(0) : '—', c: cf > 0 ? 'gr' : 're' },
      { l: 'Gross yield', v: calcResult?.grossYield ? calcResult.grossYield.toFixed(1) + '%' : '—', c: '' },
      { l: 'CoC ROI', v: calcResult?.cocRoi ? calcResult.cocRoi.toFixed(1) + '%' : '—', c: '' },
    ]
  };
}

export { mapDealToProps };

function PlaceholderHouse({ strategy, dealId }: { strategy: string; dealId: string }) {
  const doors: Record<string, [string, string]> = {
    BTL:  ['#C0392B','#8B1A0A'],
    HMO:  ['#1D9E75','#0D6B4D'],
    BRRR: ['#1B3A6B','#0D1F3C'],
    SA:   ['#D97706','#92510A'],
    FLIP: ['#1C1C1C','#111111'],
    R2R:  ['#6B46A0','#3D1F72'],
  }
  const [door, shadow] = doors[strategy] ?? ['#D97706','#92510A']
  const gid = `sky-${dealId}`
  return (
    <svg viewBox="0 0 280 160" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',display:'block'}}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#1e3a5f"/>
          <stop offset="100%" stopColor="#0d1f3c"/>
        </radialGradient>
      </defs>
      <rect width="280" height="160" fill={`url(#${gid})`}/>
      <circle cx="45" cy="22" r="1" fill="#fff" opacity=".7"/>
      <circle cx="100" cy="14" r="1.2" fill="#fff" opacity=".6"/>
      <circle cx="180" cy="18" r="1" fill="#fff" opacity=".8"/>
      <circle cx="240" cy="28" r=".8" fill="#fff" opacity=".5"/>
      <circle cx="260" cy="10" r="1.1" fill="#fff" opacity=".7"/>
      <circle cx="30" cy="38" r=".7" fill="#fff" opacity=".5"/>
      <circle cx="155" cy="32" r=".9" fill="#fff" opacity=".6"/>
      <rect x="0" y="148" width="280" height="12" fill="#0d1a2e"/>
      <rect x="195" y="52" width="8" height="28" fill="#2a2e35"/>
      <circle cx="199" cy="50" r="3" fill="#3a3f47" opacity=".7"/>
      <circle cx="199" cy="46" r="2" fill="#3a3f47" opacity=".4"/>
      <polygon points="140,28 215,80 65,80" fill="#2a2e35"/>
      <polygon points="140,28 215,80 200,80 140,36 80,80 65,80" fill="#32373f"/>
      <rect x="72" y="80" width="136" height="68" fill="#E8E0D5"/>
      <rect x="86" y="92" width="22" height="20" fill="#c8dde8" rx="1"/>
      <line x1="97" y1="92" x2="97" y2="112" stroke="#E8E0D5" strokeWidth="1.5"/>
      <line x1="86" y1="102" x2="108" y2="102" stroke="#E8E0D5" strokeWidth="1.5"/>
      <rect x="172" y="92" width="22" height="20" fill="#c8dde8" rx="1"/>
      <line x1="183" y1="92" x2="183" y2="112" stroke="#E8E0D5" strokeWidth="1.5"/>
      <line x1="172" y1="102" x2="194" y2="102" stroke="#E8E0D5" strokeWidth="1.5"/>
      <rect x="126" y="108" width="28" height="40" fill={door} rx="2"/>
      <rect x="130" y="112" width="9" height="10" fill={shadow} opacity=".4" rx="1"/>
      <rect x="141" y="112" width="9" height="10" fill={shadow} opacity=".4" rx="1"/>
      <rect x="130" y="125" width="9" height="10" fill={shadow} opacity=".4" rx="1"/>
      <rect x="141" y="125" width="9" height="10" fill={shadow} opacity=".4" rx="1"/>
      <circle cx="151" cy="129" r="2" fill="#D4AF37"/>
      <rect x="132" y="140" width="16" height="8" fill="#D4AF37" rx="1"/>
    </svg>
  )
}

function DealCard({ deal, mode, onOpen, photos, onPhotoUpload }: {
  deal: Deal; mode: string; onOpen?: (id: string) => void;
  photos?: Record<string, string>;
  onPhotoUpload?: (e: React.ChangeEvent<HTMLInputElement>, dealId: string) => void;
}) {
  const navigate = useNavigate()
  if (mode === 'grid-compact') {
    return (
      <div className={`bc bc-${deal.scoreCls}`}>
        <div className="bc-head"><div className="bc-strat">{deal.strat}</div><div className="bc-score">{deal.scoreLabel}</div></div>
        <div className="bc-main">
          <div className="bc-addr pii">{deal.addr}</div>
          <div className="bc-price">{deal.price} · {deal.desc}</div>
          <div className="bc-hero-l">{deal.heroLabel}</div>
          <div className={`bc-hero-v ${deal.heroCls}`}>{deal.heroVal}</div>
        </div>
        <div className="bc-foot">
          <span className={`ds-status ${deal.status}`}>{deal.statusLabel}</span>
          <div style={{display:'flex', gap:3}}>
            <button style={{fontSize:11, fontWeight:500, padding:'5px 9px', borderRadius:6, cursor:'pointer', border:'.5px solid #e3e5e9', fontFamily:'inherit', display:'flex', alignItems:'center', background:'#f5f6f8', color:'#555', whiteSpace:'nowrap'}} onClick={() => navigate(`/deal/${deal.dbId}?tab=analysis&view=inputs&editing=true`)}>Edit</button>
            <button style={{fontSize:11, fontWeight:500, padding:'5px 9px', borderRadius:6, cursor:'pointer', border:'.5px solid var(--navy)', fontFamily:'inherit', display:'flex', alignItems:'center', background:'var(--navy)', color:'#fff', whiteSpace:'nowrap'}} onClick={() => onOpen?.(deal.dbId)}>Open</button>
          </div>
        </div>
      </div>
    );
  }
  const scoreClass = deal.scoreCls === 'avo' ? 'av' : deal.scoreCls;
  const goToDeal = () => navigate(`/deal/${deal.dbId}?tab=overview`);
  const photoUrl = photos?.[deal.dbId || deal.id] || deal.photoUrl || '';
  return (
    <div className={`da${deal.incomplete ? ' da-incomplete' : ''} da-${deal.scoreCls || 'inc'}`}>
      <div className="da-photo">
        {photoUrl
          ? <div className="da-photo-bg" style={{ backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          : <div className="da-photo-placeholder"><PlaceholderHouse strategy={deal.strat ?? ''} dealId={deal.id ?? deal.dbId ?? ''} /></div>
        }
        <span className="da-strat-badge">{deal.strat}</span>
        <label className="da-photo-upload" title="Add photo" style={{ cursor: 'pointer' }}>
          <i className="ti ti-camera-plus" /> Photo
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onPhotoUpload?.(e, deal.dbId || deal.id)} />
        </label>
      </div>
      <div className="da-body">
        <div className="da-price">
          {deal.price && deal.price !== 'Price not set' && deal.price !== 'Incomplete' ? `${deal.price}${deal.desc ? ` · ${deal.desc}` : ''}` : ''}
        </div>
        <div className="da-addr-row">
          <div className={`da-addr${!deal.addr || deal.addr === 'No address' ? ' da-empty' : ''}`}>
            {deal.addr && deal.addr !== 'No address' ? deal.addr : 'Address not set'}
          </div>
          {deal.scoreLabel && <span className={`da-score-badge ${scoreClass}`}>{deal.scoreLabel}</span>}
        </div>
        <div className="da-ref">{deal.id}</div>
        <div className="da-mrow">
          {deal.metrics.map((m, idx) => (
            <div key={idx} className="dam">
              <div className="dam-l">{m.l}</div>
              <div className={`dam-v ${m.c || ''}`}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="da-foot">
        <span className={`ds-status ${deal.status}`}>
          <i className="ti ti-circle-filled" style={{ fontSize: '6px' }} /> {deal.statusLabel}
        </span>
        <div className="da-acts">
          {deal.incomplete ? (
            <button className="cbtn cbtn-primary" onClick={goToDeal}>
              Complete inputs <i className="ti ti-arrow-right" />
            </button>
          ) : (
            <>
              <button style={{fontSize:11, fontWeight:500, padding:'5px 9px', borderRadius:6, cursor:'pointer', border:'.5px solid #e3e5e9', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3, background:'#f5f6f8', color:'#555', whiteSpace:'nowrap'}} onClick={() => navigate(`/deal/${deal.dbId}?tab=analysis&view=inputs&editing=true`)}>Edit</button>
              <button style={{fontSize:11, fontWeight:500, padding:'5px 9px', borderRadius:6, cursor:'pointer', border:'.5px solid var(--navy)', fontFamily:'inherit', display:'flex', alignItems:'center', gap:3, background:'var(--navy)', color:'#fff', whiteSpace:'nowrap'}} onClick={goToDeal}>Open</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DealsDashboard({
  deals = [], notifications = [], todayTasks = [],
  userName = 'User', userEmail = '', userInitials = 'U',
  onNewDeal, onOpenDeal, onPipeline, onCompare, onSellers, onInvestors, onSignOut
}: DealsDashboardProps) {
  const [viewMode, setViewMode] = useState<'grid'|'grid-compact'|'list'|'board'>('grid');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false);
  const navigate = useNavigate();
  const [archivedVisible, setArchivedVisible] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(notifications);
  const [stratFilter, setStratFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dealPhotos, setDealPhotos] = useState<Record<string, string>>({});
  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, dealId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) setDealPhotos(prev => ({ ...prev, [dealId]: dataUrl }));
    };
    reader.readAsDataURL(file);
  }
  const unreadCount = notifs.filter(n => n.unread).length;
  const activeDeals = deals.filter(d => d.status !== 'archived' && d.status !== 'deleted');
  const archivedDeals = deals.filter(d => d.status === 'archived');
  const filtered = activeDeals.filter(d => {
    if (stratFilter && d.strat !== stratFilter) return false;
    if (scoreFilter && d.score !== scoreFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    if (searchQuery && !d.addr.toLowerCase().includes(searchQuery.toLowerCase()) && !d.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={privacyMode ? 'privacy' : ''}>
      <div className="hdr">
        <div className="hdr-left">
          <div className="logo">Deal<span>Score</span></div>
          <div className="logo-sep"></div>
          <nav className="hdr-nav">
            <button className="hn on">Deals</button>
            <div className="hn-sep"></div>
            <button className="hn" onClick={onPipeline}>Pipeline</button>
            <div className="hn-sep"></div>
            <button className="hn" onClick={onCompare}>Compare</button>
          </nav>
        </div>
        <div className="hdr-centre">
          <div className="search-bar">
            <i className="ti ti-search"></i>
            <input type="text" placeholder="Search deals, sellers, addresses… " onChange={e => setSearchQuery(e.target.value)} />
            <span className="search-kbd">⌘K</span>
          </div>
        </div>
        <div className="hdr-right">
          <nav className="hdr-right-nav">
            <button className="hn" onClick={onSellers}>Seller</button>
            <div className="hn-sep"></div>
            <button className="hn" onClick={onInvestors}>Investors</button>
          </nav>
          <div className="logo-sep"></div>
          <div className="notif-wrap">
            <button className="notif-btn" onClick={() => setNotifOpen(!notifOpen)}>
              <i className="ti ti-bell"></i>
              {unreadCount > 0 && <span className="notif-badge show"></span>}
            </button>
            {notifOpen && (
              <div className="notif-drop show">
                <div className="notif-drop-hdr">
                  <span className="notif-drop-title">Notifications</span>
                  <button className="notif-mark-all" onClick={() => setNotifs(notifs.map(n => ({ ...n, unread: false })))}>Mark all read</button>
                </div>
                <div className="notif-list">
                  {notifs.length === 0 && <div className="notif-empty"><i className="ti ti-bell-off"></i><div className="notif-empty-msg">All caught up</div></div>}
                  {notifs.map(n => (
                    <div key={n.id} className={`notif-item ${n.unread ? 'unread' : ''}`}>
                      <div className={`notif-icon-wrap ${n.type}`}><i className={`ti ${n.icon}`}></i></div>
                      <div className="notif-body"><div className="notif-deal-tag">{n.deal}</div><div className="notif-msg">{n.msg}</div><div className="notif-time">{n.time}</div></div>
                      {n.unread && <div className="notif-unread-dot"></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="logo-sep"></div>
          <button className="btn-new" onClick={onNewDeal}><i className="ti ti-plus"></i> New deal</button>
          <div className="logo-sep"></div>
          <div className="avt-wrap">
            <div className="avt-wrap-inner" onClick={() => setAvatarOpen(!avatarOpen)}>
              <div className={`avt ${privacyMode ? 'privacy-on' : ''}`}>{userInitials}</div>
              <i className="ti ti-chevron-down avt-chevron"></i>
            </div>
            {avatarOpen && (
              <div className="avt-drop show">
                <div className="avt-drop-head"><div className="avt-drop-name">{userName}</div><div className="avt-drop-email">{userEmail}</div></div>
                <button className="avt-drop-item"><i className="ti ti-user"></i> Profile</button>
                <div className="avt-drop-divider"></div>
                <div className="avt-drop-toggle" onClick={() => setPrivacyMode(!privacyMode)}>
                  <div className="avt-drop-toggle-left"><i className="ti ti-eye-off"></i> Privacy mode</div>
                  <label className="mini-toggle"><input type="checkbox" checked={privacyMode} readOnly /><span className="mini-track"></span><span className="mini-thumb"></span></label>
                </div>
                <div className="avt-drop-divider"></div>
                <button className="avt-drop-item danger" onClick={onSignOut}><i className="ti ti-logout"></i> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {privacyMode && (
        <div className="privacy-banner show">
          <i className="ti ti-eye-off" style={{ fontSize: '13px' }}></i>
          <span>Privacy mode is on — addresses and seller names are hidden</span>
          <button onClick={() => setPrivacyMode(false)} style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, color: '#fef3c7', background: 'none', border: '.5px solid rgba(254,243,199,.4)', borderRadius: '20px', padding: '2px 10px', cursor: 'pointer' }}>Turn off</button>
        </div>
      )}

      <div className={`today-strip ${todayCollapsed ? 'collapsed' : ''}`}>
        <div className="ts-lbl">
          <i className="ti ti-calendar-event" style={{ fontSize: '11px' }}></i> Today &amp; coming up
          <button className="ts-toggle-btn" onClick={() => setTodayCollapsed(!todayCollapsed)}>{todayCollapsed ? 'Show' : 'Hide'}</button>
        </div>
        {!todayCollapsed && (
          <div className="ts-row">
            {todayTasks.map(task => (
              <div key={task.id} className={`ts-chip ${task.type}`}>
                <div className="ts-type">{task.typeLabel}</div>
                <div className="ts-addr pii">{task.addr}</div>
                <div className="ts-detail">{task.detail}</div>
                <button className="ts-action"><i className="ti ti-arrow-right" style={{ fontSize: '10px' }}></i> {task.actionLabel}</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        background:'#fff', borderRadius:12, border:'.5px solid #e3e5e9',
        padding:'16px 18px', margin:'12px 24px', display:'flex', alignItems:'flex-start', gap:14,
        position:'relative', boxShadow:'0 1px 3px rgba(0,0,0,.06)'
      }}>
        <div style={{
          width:36, height:36, borderRadius:9, background:'#eef3fb',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
          border:'.5px solid rgba(27,58,107,.1)'
        }}>
          <i className="ti ti-layout-grid" style={{fontSize:16, color:'var(--navy)'}} />
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:3}}>
            Your deal pipeline at a glance
          </div>
          <div style={{fontSize:12, color:'var(--text-2)', lineHeight:1.5}}>
            Track all active deals from sourcing to completion. Deal cards give instant access to any deal, and Compare puts deals side by side. Hit <strong>+ New deal</strong> to start sourcing.
          </div>
        </div>
        <button style={{
          background:'none', border:'none', color:'#ccc', cursor:'pointer',
          fontSize:16, padding:4, lineHeight:1, position:'absolute', top:10, right:12
        }}>×</button>
      </div>

      <div className="tbar">
        <div className="tbar-left">
          <div className="vgrp">
            <button className={`vbtn vb-icon ${viewMode === 'grid' ? 'on' : ''}`} onClick={() => setViewMode('grid')}><i className="ti ti-layout-grid"></i></button>
            <button className={`vbtn vb-icon ${viewMode === 'grid-compact' ? 'on' : ''}`} onClick={() => setViewMode('grid-compact')}><i className="ti ti-layout-grid-add"></i></button>
            <div className="vgrp-sep"></div>
            <button className={`vbtn vb-icon ${viewMode === 'list' ? 'on' : ''}`} onClick={() => setViewMode('list')}><i className="ti ti-table"></i></button>
          </div>
          <div className="vgrp">
            <button className={`vbtn ${viewMode === 'board' ? 'on' : ''}`} onClick={() => setViewMode('board')}><i className="ti ti-layout-kanban"></i> Deal Board</button>
          </div>
        </div>
        <div className="tbar-right">
          <select style={{padding:'5px 8px', border:'.5px solid #e3e5e9', borderRadius:7, fontSize:11, background:'#fff', color:'#555', outline:'none', fontFamily:'inherit', cursor:'pointer'}} onChange={e => setStratFilter(e.target.value)}>
            <option value="">All strategies</option>
            <option value="BTL">BTL</option><option value="HMO">HMO</option><option value="FLIP">FLIP</option>
            <option value="SA">SA</option><option value="BRRR">BRRR</option><option value="R2R">R2R</option><option value="SOCIAL">Social</option>
          </select>
          <select style={{padding:'5px 8px', border:'.5px solid #e3e5e9', borderRadius:7, fontSize:11, background:'#fff', color:'#555', outline:'none', fontFamily:'inherit', cursor:'pointer'}} onChange={e => setScoreFilter(e.target.value)}>
            <option value="">All scores</option>
            <option value="RECOMMENDED">Recommended</option><option value="REVIEW">Review</option><option value="AVOID">Avoid</option>
          </select>
          <select style={{padding:'5px 8px', border:'.5px solid #e3e5e9', borderRadius:7, fontSize:11, background:'#fff', color:'#555', outline:'none', fontFamily:'inherit', cursor:'pointer'}} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <optgroup label="Active pipeline">
              <option value="sourcing">Sourcing</option>
              <option value="ready">Ready</option>
              <option value="live">Live</option>
              <option value="pack-sent">Pack sent</option>
              <option value="reserved">Reserved</option>
            </optgroup>
            <optgroup label="Exits">
              <option value="complete">Completed ✓</option>
              <option value="withdrawn">Withdrawn — fell through</option>
            </optgroup>
            <optgroup label="Removed">
              <option value="archived">Archived — paused</option>
              <option value="deleted">Rejected — removed as weak</option>
            </optgroup>
          </select>
          <select style={{padding:'5px 8px', border:'.5px solid #e3e5e9', borderRadius:7, fontSize:11, background:'#fff', color:'#555', outline:'none', fontFamily:'inherit', cursor:'pointer'}}>
            <option>Newest first</option>
            <option>Score: best first</option>
            <option>Cash flow: high–low</option>
            <option>Viewings: soonest</option>
          </select>
          <input
            type="text"
            placeholder="Search deals..."
            style={{padding:'5px 10px', border:'.5px solid #e3e5e9', borderRadius:7, fontSize:11, background:'#fff', outline:'none', width:140, fontFamily:'inherit'}}
          />
          <button className="fsel" onClick={() => setArchivedVisible(!archivedVisible)}><i className="ti ti-archive"></i> Archived &amp; rejected</button>
        </div>
      </div>

      <div className="content-wrap">
        {archivedVisible && archivedDeals.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="arc-sub-hdr"><i className="ti ti-archive arc-sub-icon"></i><span className="arc-sub-label">Archived</span><span className="arc-sub-count">{archivedDeals.length}</span></div>
            <div className="cgrid g3c">{archivedDeals.map(d => <DealCard key={d.id} deal={d} mode={viewMode} onOpen={onOpenDeal} photos={dealPhotos} onPhotoUpload={handlePhotoUpload} />)}</div>
          </div>
        )}

        {(viewMode === 'grid' || viewMode === 'grid-compact') && (
          <div className={`cgrid ${viewMode === 'grid-compact' ? 'g4c' : 'g3c'}`}>
            {filtered.map(d => <DealCard key={d.id} deal={d} mode={viewMode} onOpen={onOpenDeal} photos={dealPhotos} onPhotoUpload={handlePhotoUpload} />)}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="dl">
            <div className="dl-row dl-head"><span>Deal</span><span>Strategy / Score</span><span>Cash flow</span><span>ROI</span><span>Status</span><span></span></div>
            {filtered.map(d => (
              <div key={d.id} className="dl-row">
                <div><div className="dl-addr pii">{d.addr}</div><div className="dl-sub">{d.id} · {d.price}</div></div>
                <div><div className="ds-tag"><span className="dst-strat">{d.strat}</span><span className={`dst-score ${d.scoreCls}`}>{d.scoreLabel}</span></div></div>
                <div className={`dl-val ${d.heroCls}`}>{d.heroVal}</div>
                <div className="dl-val">{d.metrics.find(m => m.l.includes('ROI'))?.v || '—'}</div>
                <div><span className={`ds-status ${d.status}`}>{d.statusLabel}</span></div>
                <div className="dl-acts" style={{display:'flex', gap:3}}>
                  <button style={{fontSize:11, fontWeight:500, padding:'5px 9px', borderRadius:6, cursor:'pointer', border:'.5px solid #e3e5e9', fontFamily:'inherit', display:'flex', alignItems:'center', background:'#f5f6f8', color:'#555', whiteSpace:'nowrap'}} onClick={() => navigate(`/deal/${d.dbId}?tab=analysis&view=inputs&editing=true`)}>Edit</button>
                  <button style={{fontSize:11, fontWeight:500, padding:'5px 9px', borderRadius:6, cursor:'pointer', border:'.5px solid var(--navy)', fontFamily:'inherit', display:'flex', alignItems:'center', background:'var(--navy)', color:'#fff', whiteSpace:'nowrap'}} onClick={() => onOpenDeal?.(d.dbId)}>Open</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'board' && (
          <div className="board-wrap show"><div className="board">
            {['sourcing','ready','live','reserved','pack-sent','complete'].map(stage => (
              <div key={stage} className="kb-col">
                <div className={`kb-hdr ${stage}`}><div className="kb-stage"><span className={`kb-stage-name ${stage}`}>{stage.replace('-',' ').toUpperCase()}</span><span className="kb-count">{activeDeals.filter(d => d.status === stage).length}</span></div></div>
                <div className={`kb-body ${stage}`}>
                  {activeDeals.filter(d => d.status === stage).map(d => (
                    <div key={d.id} className="kc">
                      <div className="kc-top"><span className="kc-strat">{d.strat}</span><span className={`kc-score ${d.scoreCls}`}>{d.score}</span></div>
                      <div className="kc-addr pii">{d.addr}</div>
                      <div className="kc-price">{d.id} · {d.price}</div>
                      <div className="kc-foot"><button className="kc-open" onClick={() => onOpenDeal?.(d.dbId)}>Open</button></div>
                    </div>
                  ))}
                  <div className="kc-add" onClick={onNewDeal}><i className="ti ti-plus"></i> Add deal</div>
                </div>
              </div>
            ))}
          </div></div>
        )}
      </div>
    </div>
  );
}
