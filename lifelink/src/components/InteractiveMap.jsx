import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Shield, Layers, AlertTriangle, Database, Activity, RefreshCw, ZoomIn, ZoomOut, Search, Compass, Globe, ExternalLink } from 'lucide-react';
import LocationSearchSelector from './LocationSearchSelector';

function computeHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function InteractiveMap({ selectedRequestId = null, onRequestSelect = null }) {
  const [spatialData, setSpatialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);

  // Region and Search Filters (Phase 9 & Section 2)
  const [activeRegion, setActiveRegion] = useState('hyderabad'); // 'hyderabad' | 'telangana' | 'india'
  const [selectedRadius, setSelectedRadius] = useState(15); // 5, 15, 30, 50 km
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Layer filters
  const [showHospitals, setShowHospitals] = useState(true);
  const [showBanks, setShowBanks] = useState(true);
  const [showDonors, setShowDonors] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showRings, setShowRings] = useState(true);

  const fetchSpatial = (overrideQuery = null) => {
    setLoading(true);
    const q = overrideQuery !== null ? overrideQuery : searchQuery;
    const params = new URLSearchParams({
      region: activeRegion,
      search: q
    });
    if (selectedRequestId) {
      params.append('requestId', selectedRequestId);
    }

    fetch(`/api/map/spatial-data?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setSpatialData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSpatial();
  }, [activeRegion, selectedRequestId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSpatial();
  };

  // Dynamic Coordinate Projection based on Active Region Bounding Box
  const projectCoords = (lat, lon) => {
    const reg = spatialData?.active_region || { minLat: 17.32, maxLat: 17.52, minLon: 78.34, maxLon: 78.58 };
    const width = 800, height = 500;

    const x = ((lon - reg.minLon) / (reg.maxLon - reg.minLon)) * width;
    const y = height - ((lat - reg.minLat) / (reg.maxLat - reg.minLat)) * height;

    return {
      x: Math.max(30, Math.min(width - 30, x)),
      y: Math.max(30, Math.min(height - 30, y))
    };
  };

  const getRingRadii = () => {
    if (activeRegion === 'hyderabad') {
      return { r1: 50, r2: 120, r3: 200, r4: 310 };
    } else if (activeRegion === 'telangana') {
      return { r1: 25, r2: 60, r3: 110, r4: 170 };
    }
    return { r1: 12, r2: 30, r3: 55, r4: 85 };
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Map Control Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blood-600 text-white flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>Emergency Spatial Radar & GIS</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                <span>{spatialData?.connection_state === 'CONNECTED_SQL_REALTIME' ? 'LIVE SQL GIS' : 'LIVE FEED'}</span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              {spatialData?.active_region?.name || 'Metropolitan Emergency Command'} • Synchronized to verified database records
            </p>
          </div>
        </div>

        {/* Region Switcher Controls (Phase 9) */}
        <div className="flex items-center bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold shadow-2xs">
          <button
            onClick={() => { setActiveRegion('hyderabad'); setZoomLevel(1); }}
            className={`px-3 py-1 rounded-lg transition ${
              activeRegion === 'hyderabad'
                ? 'bg-blood-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hyderabad (Metro)
          </button>
          <button
            onClick={() => { setActiveRegion('telangana'); setZoomLevel(1); }}
            className={`px-3 py-1 rounded-lg transition ${
              activeRegion === 'telangana'
                ? 'bg-blood-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Telangana (Regional)
          </button>
          <button
            onClick={() => { setActiveRegion('india'); setZoomLevel(1); }}
            className={`px-3 py-1 rounded-lg transition flex items-center space-x-1 ${
              activeRegion === 'india'
                ? 'bg-blood-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3 h-3 inline" />
            <span>India (National)</span>
          </button>
        </div>

        {/* India-Wide GIS Location Search & Active Location Indicator (Part 3, Section 4 & 5 - Radius selector removed from public UI) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-64 sm:w-80">
            <LocationSearchSelector
              value={searchQuery}
              onSelect={(item) => {
                if (!item) {
                  setSearchQuery('');
                  fetchSpatial('');
                  return;
                }
                const query = item.name;
                setSearchQuery(query);
                if (item.state && item.state !== 'Telangana') {
                  setActiveRegion('india');
                }
                fetchSpatial(query);
              }}
              placeholder="Search India: Delhi, Mumbai, Bengaluru, Hyderabad, PIN..."
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-800 truncate max-w-[180px]">
              {searchQuery ? `Zone: ${searchQuery}` : spatialData?.active_region?.name || 'Pan-India Active'}
            </span>
          </div>
        </div>

        {/* Layer Toggle Chips & Refresh */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center space-x-1 ${
              showHospitals ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            <span>Hospitals</span>
          </button>

          <button
            onClick={() => setShowBanks(!showBanks)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center space-x-1 ${
              showBanks ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Blood Banks</span>
          </button>

          <button
            onClick={() => setShowDonors(!showDonors)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center space-x-1 ${
              showDonors ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>Donor Clusters (Masked)</span>
          </button>

          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center space-x-1 ${
              showIncidents ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <span>Disasters</span>
          </button>

          <button
            onClick={() => setShowRings(!showRings)}
            className={`px-2.5 py-1 rounded-lg border font-medium transition flex items-center space-x-1 ${
              showRings ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-white text-slate-400 border-slate-200'
            }`}
          >
            <span>Escalation Rings</span>
          </button>

          <button
            onClick={fetchSpatial}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
            title="Refresh GIS Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SVG GIS Canvas with Pan & Zoom */}
      <div className="relative bg-slate-950 w-full h-[520px] overflow-hidden select-none">
        {/* Subtle Map Grid lines */}
        <svg
          className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200"
          viewBox="0 0 800 500"
          preserveAspectRatio="none"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
            </pattern>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="500" fill="url(#grid)" />

          {/* Regional Corridors (Hyderabad / Telangana / India) */}
          {activeRegion === 'hyderabad' && (
            <g>
              <path d="M 80,420 Q 300,450 720,400" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" strokeDasharray="6,4" />
              <path d="M 200,80 Q 400,260 600,480" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="3" strokeDasharray="6,4" />
              <text x="730" y="405" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="sans-serif">ORR South</text>
              <text x="610" y="475" fill="rgba(255,255,255,0.3)" fontSize="10" fontFamily="sans-serif">NH65 Corridor</text>
            </g>
          )}

          {activeRegion === 'india' && (
            <g>
              {/* Generalized India Geographic Backbone */}
              <path d="M 320,100 Q 300,160 260,260 Q 230,360 270,440 Q 340,360 380,260 Q 480,240 560,220" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" strokeDasharray="4,4" />
              <text x="290" y="90" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="sans-serif">North Region</text>
              <text x="210" y="270" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="sans-serif">Western Corridor</text>
              <text x="280" y="450" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="sans-serif">Southern Hub</text>
              <text x="500" y="220" fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="sans-serif">Eastern Sector</text>
            </g>
          )}

          {/* Escalation Radius Rings (5km, 15km, 30km, 50km) */}
          {showRings && (() => {
            const centerCoords = spatialData?.selected_request_center
              ? projectCoords(spatialData.selected_request_center.latitude, spatialData.selected_request_center.longitude)
              : projectCoords(17.4156, 78.4750);

            const { r1, r2, r3, r4 } = getRingRadii();

            return (
              <g>
                <circle
                  cx={centerCoords.x}
                  cy={centerCoords.y}
                  r={r1}
                  fill={selectedRadius === 5 ? "rgba(244, 63, 94, 0.08)" : "none"}
                  stroke={selectedRadius === 5 ? "#f43f5e" : "rgba(244, 63, 94, 0.45)"}
                  strokeWidth={selectedRadius === 5 ? 2.5 : 1.5}
                  strokeDasharray="4,3"
                />
                <text x={centerCoords.x + r1 + 5} y={centerCoords.y - 4} fill={selectedRadius === 5 ? "#fda4af" : "rgba(244, 63, 94, 0.8)"} fontSize="8" fontWeight={selectedRadius === 5 ? "bold" : "normal"} fontFamily="sans-serif">5 km</text>

                <circle
                  cx={centerCoords.x}
                  cy={centerCoords.y}
                  r={r2}
                  fill={selectedRadius === 15 ? "rgba(244, 63, 94, 0.06)" : "none"}
                  stroke={selectedRadius === 15 ? "#f43f5e" : "rgba(244, 63, 94, 0.35)"}
                  strokeWidth={selectedRadius === 15 ? 2.5 : 1.5}
                  strokeDasharray="4,4"
                />
                <text x={centerCoords.x + r2 + 5} y={centerCoords.y - 4} fill={selectedRadius === 15 ? "#fda4af" : "rgba(244, 63, 94, 0.7)"} fontSize="8" fontWeight={selectedRadius === 15 ? "bold" : "normal"} fontFamily="sans-serif">15 km</text>

                <circle
                  cx={centerCoords.x}
                  cy={centerCoords.y}
                  r={r3}
                  fill={selectedRadius === 30 ? "rgba(244, 63, 94, 0.05)" : "none"}
                  stroke={selectedRadius === 30 ? "#f43f5e" : "rgba(244, 63, 94, 0.25)"}
                  strokeWidth={selectedRadius === 30 ? 2.5 : 1}
                  strokeDasharray="5,5"
                />
                <text x={centerCoords.x + r3 + 5} y={centerCoords.y - 4} fill={selectedRadius === 30 ? "#fda4af" : "rgba(244, 63, 94, 0.6)"} fontSize="8" fontWeight={selectedRadius === 30 ? "bold" : "normal"} fontFamily="sans-serif">30 km</text>

                {r4 && (
                  <>
                    <circle
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      r={r4}
                      fill={selectedRadius === 50 ? "rgba(244, 63, 94, 0.04)" : "none"}
                      stroke={selectedRadius === 50 ? "#f43f5e" : "rgba(244, 63, 94, 0.15)"}
                      strokeWidth={selectedRadius === 50 ? 2.5 : 1}
                      strokeDasharray="6,6"
                    />
                    <text x={centerCoords.x + r4 + 5} y={centerCoords.y - 4} fill={selectedRadius === 50 ? "#fda4af" : "rgba(244, 63, 94, 0.5)"} fontSize="8" fontWeight={selectedRadius === 50 ? "bold" : "normal"} fontFamily="sans-serif">50 km</text>
                  </>
                )}
              </g>
            );
          })()}

          {/* Privacy-Preserving Donor Clusters (Aggregated by locality, exact homes protected) */}
          {showDonors && spatialData?.donor_clusters?.map((cluster, i) => {
            const pos = projectCoords(cluster.latitude, cluster.longitude);
            return (
              <g key={i} className="cursor-pointer" onClick={() => setSelectedPin({ type: 'DONOR_CLUSTER', data: cluster })}>
                <circle cx={pos.x} cy={pos.y} r={activeRegion === 'india' ? 18 : 26} fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1" />
                <circle cx={pos.x} cy={pos.y} r={activeRegion === 'india' ? 10 : 13} fill="#059669" />
                <text x={pos.x} y={pos.y + 3.5} fill="#ffffff" fontSize={activeRegion === 'india' ? 8 : 9} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  {cluster.total_donors}
                </text>
                <text x={pos.x} y={pos.y + (activeRegion === 'india' ? 24 : 38)} fill="#6ee7b7" fontSize="8" textAnchor="middle" fontFamily="sans-serif">
                  {cluster.locality.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Hospitals */}
          {showHospitals && spatialData?.facilities?.filter(f => f.type === 'HOSPITAL').map(h => {
            const pos = projectCoords(h.latitude, h.longitude);
            const isSelected = selectedPin?.data?.id === h.id;

            return (
              <g key={h.id} className="cursor-pointer" onClick={() => setSelectedPin({ type: 'HOSPITAL', data: h })}>
                {h.active_requests > 0 && (
                  <circle cx={pos.x} cy={pos.y} r={activeRegion === 'india' ? 16 : 22} fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.6" className="animate-ping" />
                )}
                <circle cx={pos.x} cy={pos.y} r={activeRegion === 'india' ? 10 : 14} fill={isSelected ? '#f43f5e' : '#be123c'} stroke="#ffffff" strokeWidth="2" />
                <text x={pos.x} y={pos.y + 4} fill="#ffffff" fontSize={activeRegion === 'india' ? 9 : 11} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">H</text>
                <text x={pos.x} y={pos.y + (activeRegion === 'india' ? 20 : 26)} fill="#fecdd3" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  {h.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Blood Banks */}
          {showBanks && spatialData?.facilities?.filter(f => f.type === 'BLOOD_BANK').map(b => {
            const pos = projectCoords(b.latitude, b.longitude);
            const isSelected = selectedPin?.data?.id === b.id;

            return (
              <g key={b.id} className="cursor-pointer" onClick={() => setSelectedPin({ type: 'BLOOD_BANK', data: b })}>
                <rect x={pos.x - (activeRegion === 'india' ? 9 : 13)} y={pos.y - (activeRegion === 'india' ? 9 : 13)} width={activeRegion === 'india' ? 18 : 26} height={activeRegion === 'india' ? 18 : 26} rx="5" fill={isSelected ? '#3b82f6' : '#2563eb'} stroke="#ffffff" strokeWidth="2" />
                <text x={pos.x} y={pos.y + 3.5} fill="#ffffff" fontSize={activeRegion === 'india' ? 8 : 10} fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">BB</text>
                <text x={pos.x} y={pos.y + (activeRegion === 'india' ? 20 : 26)} fill="#bfdbfe" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  {b.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Active Disaster Incidents */}
          {showIncidents && spatialData?.incidents?.map(inc => {
            const pos = projectCoords(inc.latitude || 17.4100, inc.longitude || 78.4300);
            return (
              <g key={inc.id} className="cursor-pointer" onClick={() => setSelectedPin({ type: 'INCIDENT', data: inc })}>
                <circle cx={pos.x} cy={pos.y} r={activeRegion === 'india' ? 14 : 18} fill="rgba(245, 158, 11, 0.3)" stroke="#f59e0b" strokeWidth="2" className="animate-pulse" />
                <circle cx={pos.x} cy={pos.y} r={activeRegion === 'india' ? 8 : 11} fill="#d97706" stroke="#ffffff" strokeWidth="1.5" />
                <text x={pos.x} y={pos.y + 3} fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">!</text>
                <text x={pos.x} y={pos.y + 22} fill="#fde68a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                  DISASTER
                </text>
              </g>
            );
          })}
        </svg>

        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 flex flex-col space-y-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.3, 2.5))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.3, 0.8))}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="text-[9px] text-slate-400 hover:text-white font-mono text-center pt-0.5"
            title="Reset Zoom"
          >
            1x
          </button>
        </div>

        {/* Selected Pin Inspection Card Overlay */}
        {selectedPin && (() => {
          const centerLat = spatialData?.selected_request_center?.lat || ((spatialData?.active_region?.minLat + spatialData?.active_region?.maxLat) / 2) || 17.42;
          const centerLon = spatialData?.selected_request_center?.lon || ((spatialData?.active_region?.minLon + spatialData?.active_region?.maxLon) / 2) || 78.46;
          const distKm = (selectedPin.data?.latitude && selectedPin.data?.longitude)
            ? computeHaversineKm(centerLat, centerLon, selectedPin.data.latitude, selectedPin.data.longitude)
            : null;

          return (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-slate-200 max-w-xs w-full text-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  {selectedPin.type.replace('_', ' ')}
                </span>
                <button onClick={() => setSelectedPin(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              {selectedPin.type === 'HOSPITAL' && (
                <div className="space-y-1.5 text-slate-700">
                  <div className="font-bold text-sm text-slate-900">{selectedPin.data.name}</div>
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold inline-flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    <span>Verified Healthcare Facility</span>
                  </div>
                  <div>Address: {selectedPin.data.address}</div>
                  {distKm !== null && (
                    <div className="text-slate-800 font-semibold flex items-center space-x-1">
                      <Navigation className="w-3 h-3 text-blood-600" />
                      <span>~{distKm} km (straight-line distance)</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1">
                    <span>Active Emergency Requests:</span>
                    <span className="font-bold text-rose-600">{selectedPin.data.active_requests}</span>
                  </div>
                  <div>Available Reserve Units: <strong className="text-slate-900">{selectedPin.data.available_stock} Units</strong></div>
                  <div>Emergency Triage: <strong className="text-slate-900">{selectedPin.data.contact_phone}</strong></div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPin.data.latitude},${selectedPin.data.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center mt-2 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1"
                  >
                    <span>Get Directions (Google Maps)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {selectedPin.type === 'BLOOD_BANK' && (
                <div className="space-y-1.5 text-slate-700">
                  <div className="font-bold text-sm text-slate-900">{selectedPin.data.name}</div>
                  <div className="text-[10px] text-blood-700 bg-blood-50 border border-blood-200 px-2 py-0.5 rounded font-semibold inline-flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-blood-600" />
                    <span>Licensed Regional Blood Bank</span>
                  </div>
                  <div>Address: {selectedPin.data.address}</div>
                  {distKm !== null && (
                    <div className="text-slate-800 font-semibold flex items-center space-x-1">
                      <Navigation className="w-3 h-3 text-blood-600" />
                      <span>~{distKm} km (straight-line distance)</span>
                    </div>
                  )}
                  <div>Operating Reserve: <strong className="text-slate-900">{selectedPin.data.available_stock} Total Units</strong></div>
                  <div>Universal O- Units Available: <strong className="text-blood-700">{selectedPin.data.available_o_neg} Units</strong></div>
                  <div>Dispatch Hotline: <strong className="text-slate-900">{selectedPin.data.contact_phone}</strong></div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPin.data.latitude},${selectedPin.data.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center mt-2 py-1.5 bg-blood-600 hover:bg-blood-700 text-white rounded-xl font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1"
                  >
                    <span>Get Directions (Google Maps)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {selectedPin.type === 'DONOR_CLUSTER' && (
                <div className="space-y-1.5 text-slate-700">
                  <div className="font-bold text-sm text-slate-900">{selectedPin.data.locality}</div>
                  <div>Registered Active Donors: <strong className="text-emerald-700">{selectedPin.data.total_donors} Donors</strong></div>
                  <div>Universal O- Donors: <strong className="text-blood-700">{selectedPin.data.o_neg_count}</strong></div>
                  <div className="text-[10px] text-slate-500 italic pt-1">
                    Privacy-by-Design Active: Individual donor addresses and phone numbers are strictly protected.
                  </div>
                </div>
              )}

              {selectedPin.type === 'INCIDENT' && (
                <div className="space-y-1.5 text-slate-700">
                  <div className="font-bold text-sm text-amber-900">{selectedPin.data.title}</div>
                  <div>Severity: <strong className="text-rose-600">{selectedPin.data.severity}</strong></div>
                  <div>{selectedPin.data.description}</div>
                  <div>Lead Coordinator: <strong>{selectedPin.data.coordinator_name}</strong></div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Legend Overlay at Bottom */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl text-[10px] text-slate-300 flex items-center space-x-4 border border-slate-700">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
            <span>Hospital</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span>
            <span>Blood Bank</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span>Donor Cluster (Masked)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Disaster Hotspot</span>
          </span>
          <span className="text-slate-400 border-l border-slate-700 pl-3">
            Last Sync: {spatialData?.timestamp ? new Date(spatialData.timestamp).toLocaleTimeString() : 'Live'}
          </span>
        </div>
      </div>
    </div>
  );
}