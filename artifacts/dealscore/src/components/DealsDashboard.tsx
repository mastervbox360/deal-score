import React, { useState } from 'react';

interface Metric { l: string; v: string; c?: string; }
interface Deal {
  id: string; strat: string; score: string; scoreCls: string; scoreLabel: string;
  status: string; statusLabel: string; addr: string; price: string; desc: string;
  heroLabel?: string; heroVal?: string; heroCls?: string; incomplete?: boolean;
  metrics: Metric[]; rejectReason?: string; archivedDate?: string;
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
  const scoreLabel = verdict ? verdict.charAt(0) + verdict.slice(1).toLowerCase() : 'Incomplete';
  const cf = calcResult?.monthlyCashFlow;
  return {
    id: deal.deal_ref ?? deal.id?.slice(0,8).toUpperCase(),
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

function getDoorSVG(dealId: string) {
  const configs: Record<string, any> = {
    'DS-001': { color: '#8B2635', num: '1' }, 'DS-002': { color: '#1B3A6B', num: '2' },
    'DS-003': { color: '#2D6A4F', num: '3' }, 'DS-004': { color: '#3D3D3D', num: '4' },
    'DS-005': { color: '#1D7A6B', num: '5' }, 'DS-006': { color: '#C47D1A', num: '6' },
  };
  const dc = configs[dealId] || { color: '#253343', num: '?' };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 126" style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="240" height="126" fill="#152540" />
      <rect x="0" y="107" width="240" height="19" fill="#0d1c2e" />
      <rect x="52" y="60" width="136" height="49" fill="#cec9c0" />
      <polygon points="36,63 120,18 204,63" fill="#253343" />
      <rect x="106" y="77" width="28" height="34" fill={dc.color} rx="1.5" />
      <text x="120" y="110.5" fontFamily="Georgia,serif" fontSize="6" fontWeight="bold" fill="#3d2600" textAnchor="middle">{dc.num}</text>
    </svg>
  );
}

function DealCard({ deal, mode, onOpen }: { deal: Deal; mode: string; onOpen?: (id: string) => void }) {
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
          <button className="cbtn cbtn-primary" onClick={() => onOpen?.(deal.id)}>Open</button>
        </div>
      </div>
    );
  }
  return (
    <div className="da">
      <div className="da-photo">
        <div className="da-photo-placeholder">{getDoorSVG(deal.id)}</div>
        <span className="da-strat-badge">{deal.strat}</span>
      </div>
      <div className="da-body">
        <div className="da-price">{deal.price} · {deal.desc}</div>
        <div className="da-addr-row">
          <div className="da-addr pii">{deal.addr}</div>
          <span className={`da-score-badge ${deal.scoreCls}`}>{deal.scoreLabel}</span>
        </div>
        <div className="da-ref">{deal.id}</div>
        <div className="da-mrow">
          {deal.metrics.map((m, idx) => (
            <div key={idx} className="dam"><div className="dam-l">{m.l}</div><div className={`dam-v ${m.c}`}>{m.v}</div></div>
          ))}
        </div>
      </div>
      <div className="da-foot">
        <span className={`ds-status ${deal.status}`}>{deal.statusLabel}</span>
        <div className="da-acts">
          <button className="cbtn cbtn-primary" onClick={() => onOpen?.(deal.id)}>Open <i className="ti ti-arrow-right"></i></button>
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
  const [archivedVisible, setArchivedVisible] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>(notifications);
  const [stratFilter, setStratFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
          <select className="fsel" onChange={e => setStratFilter(e.target.value)}>
            <option value="">All strategies</option>
            <option value="BTL">BTL</option><option value="HMO">HMO</option><option value="FLIP">FLIP</option>
            <option value="SA">SA</option><option value="BRRR">BRRR</option><option value="R2R">R2R</option><option value="SOCIAL">Social</option>
          </select>
          <select className="fsel" onChange={e => setScoreFilter(e.target.value)}>
            <option value="">All scores</option>
            <option value="RECOMMENDED">Recommended</option><option value="REVIEW">Review</option><option value="AVOID">Avoid</option>
          </select>
          <select className="fsel" onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="sourcing">Sourcing</option><option value="ready">Ready</option><option value="live">Live</option>
            <option value="reserved">Reserved</option><option value="pack-sent">Pack sent</option><option value="complete">Complete</option>
          </select>
          <button className="fsel" onClick={() => setArchivedVisible(!archivedVisible)}><i className="ti ti-archive"></i> Archived &amp; rejected</button>
        </div>
      </div>

      <div className="content-wrap" style={{ padding: '20px 24px' }}>
        {archivedVisible && archivedDeals.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="arc-sub-hdr"><i className="ti ti-archive arc-sub-icon"></i><span className="arc-sub-label">Archived</span><span className="arc-sub-count">{archivedDeals.length}</span></div>
            <div className="cgrid g3c">{archivedDeals.map(d => <DealCard key={d.id} deal={d} mode={viewMode} onOpen={onOpenDeal} />)}</div>
          </div>
        )}

        {(viewMode === 'grid' || viewMode === 'grid-compact') && (
          <div className={`cgrid ${viewMode === 'grid-compact' ? 'g4c' : 'g3c'}`}>
            {filtered.map(d => <DealCard key={d.id} deal={d} mode={viewMode} onOpen={onOpenDeal} />)}
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
                <div className="dl-acts"><button className="cbtn cbtn-primary" onClick={() => onOpenDeal?.(d.id)}>Open <i className="ti ti-arrow-right"></i></button></div>
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
                      <div className="kc-foot"><button className="kc-open" onClick={() => onOpenDeal?.(d.id)}>Open</button></div>
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
