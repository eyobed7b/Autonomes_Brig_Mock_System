import { useEffect, useState, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, PolygonF } from '@react-google-maps/api';
import regionsData from './regions.json';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions = {
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1117' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8b9db0' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#253545' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d4e0f0' }] },
    { featureType: 'administrative.province', elementType: 'labels.text.fill', stylers: [{ color: '#7ec8e3' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a5f' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111827' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2f4a' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1b4b82' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#4a9eff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#062040' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d7ab5' }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

const WS_URL = 'ws://localhost:4000';

// Maps GeoJSON shapeName → tower region names
const REGION_TOWER_MAP = {
  'Addis Ababa': ['Addis Ababa'],
  'Amhara': ['Bahir Dar', 'Gondar', 'Dessie'],
  'SNNPR': ['Hawassa', 'Sodo'],
  'Southern Nations, Nationalities and Peoples': ['Hawassa', 'Sodo'],
  'Oromia': ['Jimma', 'Adama'],
  'Tigray': ['Mekelle'],
  'Dire Dawa': ['Dire Dawa'],
  'Harari': ['Harar'],
  'Harari People': ['Harar'],
  'Benishangul-Gumuz': ['Assosa'],
  'Benshangul-Gumuz': ['Assosa'],
  'Gambela': ['Gambela'],
  'Somali': ['Jijiga'],
};

const HEALTH_TIERS = [
  { min: 90, color: '#22c55e', label: 'Excellent (>90%)', opacity: 0.42 },
  { min: 75, color: '#06b6d4', label: 'Good (75–90%)', opacity: 0.42 },
  { min: 60, color: '#f59e0b', label: 'Warning (60–75%)', opacity: 0.45 },
  { min: 45, color: '#f97316', label: 'Degraded (45–60%)', opacity: 0.48 },
  { min: 0,  color: '#ef4444', label: 'Critical (<45%)', opacity: 0.52 },
];

function App() {
  const [view, setView] = useState('Business');
  const [overview, setOverview] = useState(null);
  const [towers, setTowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [selectedTower, setSelectedTower] = useState(null);
  const [banks, setBanks] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "👋 Hi! I'm the Safaricom Network Intelligence Assistant.\n\nAsk me about network health, M-Pesa performance, bank APIs, or incident alerts." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const mapCenter = useMemo(() => ({ lat: 9.145, lng: 40.48967 }), []);

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => { setConnected(true); setLoading(false); };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'init' || data.type === 'update') {
          setOverview(data.overview);
          setTowers(data.towers);
          if (data.banks) setBanks(data.banks);
        }
      };
      ws.onclose = () => { setConnected(false); reconnectTimeout = setTimeout(connect, 3000); };
    };
    connect();
    return () => { ws?.close(); clearTimeout(reconnectTimeout); };
  }, []);

  const isBusiness = view === 'Business';
  const isTechnology = view === 'Technology';

  const businessStats = useMemo(() => {
    if (!towers.length) return null;
    const mpesaSuccessAvg = towers.reduce((sum, t) => sum + (Number(t.mpesaSuccessRate) || 0), 0) / towers.length;
    const failedAmountTotal = towers.reduce((sum, t) => sum + (Number(t.mpesaFailedAmount) || 0), 0);
    return {
      mpesaSuccessAvg,
      failedAmountTotal,
    };
  }, [towers]);

  const techStats = useMemo(() => {
    if (!towers.length) return null;

    const avgVoice = towers.reduce((sum, t) => sum + (Number(t.voiceSuccessRate) || 0), 0) / towers.length;
    const avgData = towers.reduce((sum, t) => sum + (Number(t.dataSuccessRate) || 0), 0) / towers.length;
    const avgThroughput = towers.reduce((sum, t) => sum + (Number(t.dataThroughputMbps) || 0), 0) / towers.length;
    const worstAvailabilityTower = towers.reduce((worst, t) => {
      if (!worst) return t;
      return (Number(t.currentAvailability) || 0) < (Number(worst.currentAvailability) || 0) ? t : worst;
    }, null);

    return {
      avgVoice,
      avgData,
      avgThroughput,
      worstAvailabilityTower,
    };
  }, [towers]);

  const techDashboardData = useMemo(() => {
    if (!towers.length) return null;
    const avgVoice = towers.reduce((s, t) => s + (Number(t.voiceSuccessRate) || 0), 0) / towers.length;
    const avgData  = towers.reduce((s, t) => s + (Number(t.dataSuccessRate)  || 0), 0) / towers.length;
    const avgSms   = towers.reduce((s, t) => s + (Number(t.smsSuccessRate)   || 0), 0) / towers.length;
    const regionMap = {};
    towers.forEach(t => {
      if (!regionMap[t.region]) regionMap[t.region] = [];
      regionMap[t.region].push(t);
    });
    const regions = Object.entries(regionMap).map(([region, ts]) => {
      const avail = ts.reduce((s, t) => s + (Number(t.currentAvailability) || 0), 0) / ts.length;
      const incidents = ts.filter(t => Number(t.currentAvailability) < 80).length;
      return { region, avail, incidents, towers: ts.length };
    }).sort((a, b) => a.avail - b.avail);
    return { avgVoice, avgData, avgSms, regions };
  }, [towers]);

  const getRegionStyle = (shapeName) => {
    const towerRegions = REGION_TOWER_MAP[shapeName] || [shapeName];
    const regionTowers = towers.filter(t => towerRegions.includes(t.region));
    if (regionTowers.length === 0) return { fillColor: '#1e3a5f', fillOpacity: 0.18 };
    const avgAvail  = regionTowers.reduce((s, t) => s + (Number(t.currentAvailability) || 0), 0) / regionTowers.length;
    const avgMpesa  = regionTowers.reduce((s, t) => s + (Number(t.mpesaSuccessRate)     || 0), 0) / regionTowers.length;
    const score = (avgAvail + avgMpesa) / 2;
    const tier = HEALTH_TIERS.find(t => score >= t.min) || HEALTH_TIERS[HEALTH_TIERS.length - 1];
    return { fillColor: tier.color, fillOpacity: tier.opacity };
  };

  const getMarkerColor = (tower) => {
    const score = ((Number(tower.currentAvailability) || 0) + (Number(tower.mpesaSuccessRate) || 0)) / 2;
    return (HEALTH_TIERS.find(t => score >= t.min) || HEALTH_TIERS[HEALTH_TIERS.length - 1]).color;
  };

  const sendChat = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    setChatMessages(m => [...m, { role: 'user', text }]);
    setChatLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setChatMessages(m => [...m, { role: 'assistant', text: data.reply || 'No response.' }]);
    } catch {
      setChatMessages(m => [...m, { role: 'assistant', text: '⚠️ Could not reach the network assistant. Please ensure the backend is running.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {isLoaded && isBusiness && (
        <div className="map-background">
          <GoogleMap mapContainerStyle={mapContainerStyle} zoom={6} center={mapCenter} options={mapOptions}>
            {regionsData.features.map((feature, idx) => {
              const paths =
                feature.geometry.type === 'Polygon'
                  ? [feature.geometry.coordinates[0].map(c => ({ lat: c[1], lng: c[0] }))]
                  : feature.geometry.coordinates.map(p => p[0].map(c => ({ lat: c[1], lng: c[0] })));
              return (
                <PolygonF
                  key={idx}
                  paths={paths}
                  options={{
                    ...getRegionStyle(feature.properties.shapeName),
                    strokeColor: 'rgba(255, 255, 255, 0.25)',
                    strokeWeight: 1,
                  }}
                />
              );
            })}
            {towers.map(tower => (
              <MarkerF
                key={tower.id}
                position={{ lat: tower.lat, lng: tower.lng }}
                onClick={() => setSelectedTower(tower)}
                icon={{
                  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                  fillColor: getMarkerColor(tower),
                  fillOpacity: 1,
                  strokeWeight: 1.5,
                  strokeColor: '#ffffff',
                  scale: 1.6,
                }}
              />
            ))}

            {selectedTower && (
              <InfoWindowF
                position={{ lat: selectedTower.lat, lng: selectedTower.lng }}
                onCloseClick={() => setSelectedTower(null)}
              >
                <div style={{ color: '#0f172a', minWidth: 250, fontFamily: 'system-ui, sans-serif' }}>
                  <strong style={{ fontSize: 13 }}>{selectedTower.name}</strong>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{selectedTower.region}</div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, fontSize: 12, lineHeight: 1.65 }}>
                    <div>📶 GSM Availability: <strong>{Number(selectedTower.currentAvailability).toFixed(0)}%</strong></div>
                    <div>🎤 Voice SR: <strong>{Number(selectedTower.voiceSuccessRate).toFixed(1)}%</strong></div>
                    <div>📡 Data SR: <strong>{Number(selectedTower.dataSuccessRate).toFixed(1)}%</strong></div>
                    <div>⚡ Throughput: <strong>{Number(selectedTower.dataThroughputMbps).toFixed(0)} Mbps</strong></div>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 2, fontSize: 12, lineHeight: 1.65 }}>
                    <div>💸 M-Pesa Success: <strong>{Number(selectedTower.mpesaSuccessRate)}%</strong></div>
                    <div>📊 Transactions: <strong>{selectedTower.mpesaTransactionCount}</strong></div>
                    <div>💰 Failed ETB: <strong>{Number(selectedTower.mpesaFailedAmount).toFixed(0)}</strong></div>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 2, fontSize: 12 }}>
                    👥 Active Users: <strong>{(selectedTower.activeUsers || 0).toLocaleString()}</strong>
                  </div>
                </div>
              </InfoWindowF>
            )}
          </GoogleMap>

          {/* Region health legend */}
          <div className="map-legend">
            <div className="legend-title">Region Health</div>
            <div className="legend-subtitle">Combined GSM + M-Pesa</div>
            {HEALTH_TIERS.map(({ color, label }) => (
              <div key={label} className="legend-item">
                <span className="legend-dot" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {isTechnology && (
        <div className="tech-background" aria-hidden="true">
          <svg viewBox="0 0 1200 800" preserveAspectRatio="none">
            <defs>
              <linearGradient id="techGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgba(56, 189, 248, 0.28)" />
                <stop offset="1" stopColor="rgba(96, 165, 250, 0.06)" />
              </linearGradient>
              <linearGradient id="techLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(56, 189, 248, 0.18)" />
                <stop offset="1" stopColor="rgba(96, 165, 250, 0.55)" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width="1200" height="800" fill="url(#techGlow)" />

            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={`g${i}`}
                x1={(i + 1) * 65}
                y1="0"
                x2={(i + 1) * 65}
                y2="800"
                stroke="rgba(148, 163, 184, 0.06)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1="0"
                y1={(i + 1) * 65}
                x2="1200"
                y2={(i + 1) * 65}
                stroke="rgba(148, 163, 184, 0.06)"
                strokeWidth="1"
              />
            ))}

            <path
              d="M0 540 C 180 520, 240 420, 360 440 C 520 468, 560 360, 720 370 C 900 380, 940 300, 1200 310"
              fill="none"
              stroke="url(#techLine)"
              strokeWidth="6"
            />
            <path
              d="M0 540 C 180 520, 240 420, 360 440 C 520 468, 560 360, 720 370 C 900 380, 940 300, 1200 310 L 1200 800 L 0 800 Z"
              fill="rgba(56, 189, 248, 0.08)"
            />
          </svg>
        </div>
      )}

      <div className="dashboard-center">
        <header className="header">
          <div className="safaricom-logo">📱 Safaricom</div>
          <h1>{view} Operations</h1>
          <div className="toggle-group">
            <button className={view === 'Business' ? 'toggle active' : 'toggle'} onClick={() => setView('Business')}>Business</button>
            <button className={view === 'Technology' ? 'toggle active' : 'toggle'} onClick={() => setView('Technology')}>Technology</button>
          </div>
        </header>

        {/* ── Shared KPI grid (both views) ── */}
        <section className="overview-grid">
          <div className={`card ${isBusiness ? 'card-business' : 'card-tech'}`}>
            <h2>Revenue At Risk</h2>
            <p className="metric">
              ETB {overview?.totalRevenueAtRisk == null ? '—' : overview.totalRevenueAtRisk.toLocaleString()}
            </p>
          </div>
          <div className={`card ${isBusiness ? 'card-mpesa' : 'card-tech'}`}>
            <h2>M-Pesa Success</h2>
            <p className="metric">{businessStats ? `${businessStats.mpesaSuccessAvg.toFixed(1)}%` : '—'}</p>
          </div>
          <div className={`card ${isBusiness ? 'card-business' : 'card-tech'}`}>
            <h2>Active Users</h2>
            <p className="metric">
              {overview?.totalActiveUsers != null ? overview.totalActiveUsers.toLocaleString() : '—'}
            </p>
          </div>
          <div className={`card ${isBusiness ? 'card-mpesa' : 'card-tech'}`}>
            <h2>GSM Availability</h2>
            <p className="metric">{overview?.globalNetworkAvailability != null ? `${overview.globalNetworkAvailability}%` : '—'}</p>
          </div>
          <div className={`card ${isBusiness ? 'card-business' : 'card-tech'}`}>
            <h2>Avg Throughput</h2>
            <p className="metric">{overview?.avgDataThroughputMbps != null ? `${overview.avgDataThroughputMbps} Mbps` : '—'}</p>
          </div>
        </section>

        {isTechnology && (
          <section className="tech-analytics">
            {/* ── Panel 1: Bank TX Success Rate ── */}
            <div className="card tech-panel">
              <div className="tech-panel-header">
                <h3>💳 Bank TX Success Rate</h3>
                <span className="tech-panel-sub">M-Pesa gateway · last 10 min</span>
              </div>
              <div className="bank-chart">
                {banks.length === 0 ? (
                  <p className="muted-text">Connecting to bank APIs…</p>
                ) : banks.map(bank => {
                  const bc = bank.successRate >= 97 ? '#22c55e' : bank.successRate >= 93 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={bank.id} className="bank-row">
                      <span className="bank-label" title={bank.fullName}>{bank.name}</span>
                      <div className="bank-bar-track">
                        <div className="bank-bar-fill" style={{ width: `${Math.max(2, bank.successRate)}%`, background: bc }} />
                      </div>
                      <span className="bank-pct" style={{ color: bc }}>{bank.successRate.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
              {banks.some(b => b.successRate < 95) && (
                <div className="panel-alert panel-alert-warn">
                  ⚠️ {banks.filter(b => b.successRate < 95).map(b => b.name).join(', ')} below 95% success threshold — monitor for M-Pesa payment failures.
                </div>
              )}
            </div>

            {/* ── Panel 2: API Health & Connectivity ── */}
            <div className="card tech-panel">
              <div className="tech-panel-header">
                <h3>🔌 API Health &amp; Connectivity</h3>
                <span className="tech-panel-sub">Gateway status · live</span>
              </div>
              <div className="api-health-table">
                <div className="api-row api-header-row">
                  <span>Bank</span><span>Status</span><span>Latency</span><span>Incidents</span>
                </div>
                {banks.map(bank => (
                  <div key={bank.id} className="api-row">
                    <span className="api-bank-name" title={bank.fullName}>{bank.fullName}</span>
                    <span className={`api-status-badge ${bank.connected ? 'api-up' : 'api-down'}`}>
                      {bank.connected ? '● Online' : '● Offline'}
                    </span>
                    <span className={`api-latency-badge ${bank.apiLatencyMs > 400 ? 'lat-high' : bank.apiLatencyMs > 250 ? 'lat-med' : 'lat-ok'}`}>
                      {bank.apiLatencyMs}ms
                    </span>
                    <span className={bank.incidents > 0 ? 'inc-badge' : 'ok-badge'}>
                      {bank.incidents > 0 ? `⚠ ${bank.incidents}` : '✓ Clear'}
                    </span>
                  </div>
                ))}
              </div>
              {banks.some(b => !b.connected || b.apiLatencyMs > 350) && (
                <div className="panel-alert panel-alert-critical">
                  🔴{banks.filter(b => !b.connected).length > 0 && ` ${banks.filter(b => !b.connected).map(b => b.name).join(', ')} offline.`}
                  {banks.filter(b => b.apiLatencyMs > 350).length > 0 && ` High latency: ${banks.filter(b => b.apiLatencyMs > 350).map(b => `${b.name} (${b.apiLatencyMs}ms)`).join(', ')}.`}
                </div>
              )}
            </div>

            {/* ── Panel 3: Voice / Data / SMS Health ── */}
            <div className="card tech-panel">
              <div className="tech-panel-header">
                <h3>📡 Service Health</h3>
                <span className="tech-panel-sub">Avg across {towers.length} sites</span>
              </div>
              {!techDashboardData ? <p className="muted-text">Loading…</p> : (
                <div className="service-health">
                  {[
                    { label: 'Voice Calls',   value: techDashboardData.avgVoice, icon: '🎤' },
                    { label: 'Data Sessions', value: techDashboardData.avgData,  icon: '📶' },
                    { label: 'SMS',           value: techDashboardData.avgSms,   icon: '✉️'  },
                  ].map(({ label, value, icon }) => {
                    const sc = value >= 97 ? '#22c55e' : value >= 90 ? '#06b6d4' : value >= 80 ? '#f59e0b' : '#ef4444';
                    const st = value >= 97 ? 'Excellent' : value >= 90 ? 'Good' : value >= 80 ? 'Warning' : 'Critical';
                    return (
                      <div key={label} className="service-row">
                        <div className="service-label-row">
                          <span>{icon} {label}</span>
                          <span style={{ color: sc, fontWeight: 700 }}>{value.toFixed(1)}% · {st}</span>
                        </div>
                        <div className="service-bar-track">
                          <div className="service-bar-fill" style={{ width: `${value}%`, background: sc }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="service-throughput-row">
                    <span>⚡ Avg Throughput</span>
                    <strong>{techStats?.avgThroughput?.toFixed(0) || '—'} Mbps</strong>
                  </div>
                  <div className="service-throughput-row">
                    <span>📍 Lowest Availability Site</span>
                    <strong style={{ color: '#ef4444' }}>
                      {techStats?.worstAvailabilityTower?.name || '—'} · {Number(techStats?.worstAvailabilityTower?.currentAvailability || 0).toFixed(0)}%
                    </strong>
                  </div>
                </div>
              )}
              {techDashboardData && (techDashboardData.avgVoice < 94 || techDashboardData.avgData < 94 || techDashboardData.avgSms < 94) && (
                <div className="panel-alert panel-alert-warn">
                  ⚠️ {[
                    techDashboardData.avgVoice < 94 && `Voice ${techDashboardData.avgVoice.toFixed(1)}%`,
                    techDashboardData.avgData  < 94 && `Data ${techDashboardData.avgData.toFixed(1)}%`,
                    techDashboardData.avgSms   < 94 && `SMS ${techDashboardData.avgSms.toFixed(1)}%`,
                  ].filter(Boolean).join(' · ')} — below 94% SLA threshold.
                </div>
              )}
            </div>

            {/* ── Panel 4: Regional Availability + Incidents ── */}
            <div className="card tech-panel">
              <div className="tech-panel-header">
                <h3>🗺️ Regional Availability</h3>
                <span className="tech-panel-sub">Per-region GSM · live</span>
              </div>
              {!techDashboardData ? <p className="muted-text">Loading…</p> : (
                <div className="regional-list">
                  {techDashboardData.regions.map(({ region, avail, incidents, towers: tCount }) => {
                    const rc = avail >= 97 ? '#22c55e' : avail >= 90 ? '#06b6d4' : avail >= 80 ? '#f59e0b' : '#ef4444';
                    return (
                      <div key={region} className="region-row">
                        <div className="region-label-row">
                          <span className="region-name">{region}</span>
                          {incidents > 0
                            ? <span className="inc-badge">⚠ {incidents} incident{incidents !== 1 ? 's' : ''}</span>
                            : <span className="ok-badge">✓ OK</span>}
                        </div>
                        <div className="service-bar-track">
                          <div className="service-bar-fill" style={{ width: `${avail}%`, background: rc }} />
                        </div>
                        <div className="region-meta">
                          <span style={{ color: rc, fontWeight: 600 }}>{avail.toFixed(1)}%</span>
                          <span>{tCount} site{tCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {techDashboardData && techDashboardData.regions.some(r => r.incidents > 0) && (
                <div className="panel-alert panel-alert-critical">
                  🔴 Active incidents in: {techDashboardData.regions.filter(r => r.incidents > 0).map(r => `${r.region} (${r.incidents} site${r.incidents !== 1 ? 's' : ''} below 80%)`).join(', ')}.
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {isBusiness && (
        <aside className="sidebar-left auto-hide">
          <h3>📶 GSM Performance</h3>
          <p className="subtitle" style={{ display: 'block', marginBottom: '15px' }}>Technology Site Health</p>
          <div className="tower-list">
            {towers.map(tower => (
              <div key={tower.id} className="tower-card" style={{ marginBottom: '12px' }}>
                <p className="tower-name">{tower.name}</p>
                <div className="tower-metrics-grid" style={{ marginTop: '8px' }}>
                  <div><p>Voice</p><strong>{Number(tower.voiceSuccessRate).toFixed(1)}%</strong></div>
                  <div><p>Data</p><strong>{Number(tower.dataSuccessRate).toFixed(1)}%</strong></div>
                  <div><p>Mbps</p><strong>{Number(tower.dataThroughputMbps).toFixed(0)}</strong></div>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                  👥 {(tower.activeUsers || 0).toLocaleString()} active users
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {isBusiness && (
        <aside className="sidebar-right auto-hide">
          <h3>💸 M-Pesa Performance</h3>
          <p className="subtitle" style={{ display: 'block', marginBottom: '15px' }}>Business Impact Analytics</p>
          <div className="tower-list">
            {towers.map(tower => (
              <div key={tower.id} className="tower-card" style={{ marginBottom: '12px' }}>
                <p className="tower-name">{tower.name}</p>
                <div className="tower-metrics-grid" style={{ marginTop: '8px' }}>
                  <div><p>Tx Count</p><strong>{tower.mpesaTransactionCount}</strong></div>
                  <div><p>Success</p><strong>{tower.mpesaSuccessRate}%</strong></div>
                  <div><p>Failed ETB</p><strong>{Number(tower.mpesaFailedAmount).toFixed(0)}</strong></div>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--safaricom-green)', fontWeight: 600 }}>
                  👥 {(tower.activeUsers || 0).toLocaleString()} active users
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ── Chatbot FAB + Panel ── */}
      <button
        className={`chatbot-fab${chatOpen ? ' chatbot-fab-open' : ''}`}
        onClick={() => setChatOpen(o => !o)}
        title="Network Intelligence Assistant"
      >
        {chatOpen ? '✕' : '💬'}
      </button>

      {chatOpen && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <span>🤖 Network Intelligence</span>
            <span className="chatbot-status-dot" />
            <span className="chatbot-status-label">Live</span>
          </div>
          <div
            className="chat-messages"
            ref={el => { if (el) el.scrollTop = el.scrollHeight; }}
          >
            {chatMessages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role}`}>
                <pre>{m.text}</pre>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-bubble assistant chat-thinking">
                <span /><span /><span />
              </div>
            )}
          </div>
          <form className="chat-input-row" onSubmit={sendChat}>
            <input
              className="chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about network health…"
              disabled={chatLoading}
              autoFocus
            />
            <button
              className="chat-send-btn"
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
