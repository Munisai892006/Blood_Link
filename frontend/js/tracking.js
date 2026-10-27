// LifeLink - Live GPS & Telemetry Tracking Map Module (Leaflet)
let trackingMap = null;
let vehicleMarker = null;
let sourceMarker = null;
let destMarker = null;
let routePolyline = null;
let pollingTimer = null;

function initTrackingMap(elementId = 'trackingMap', defaultLat = 17.4225, defaultLng = 78.4518, defaultZoom = 13) {
  if (trackingMap) {
    trackingMap.remove();
    trackingMap = null;
  }

  const container = document.getElementById(elementId);
  if (!container) return null;

  trackingMap = L.map(elementId).setView([defaultLat, defaultLng], defaultZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors | LifeLink Emergency Logistics'
  }).addTo(trackingMap);

  return trackingMap;
}

function startLiveTransportTracking(transport, telemetryList = []) {
  if (!trackingMap) {
    initTrackingMap('trackingMap', 17.4225, 78.4518, 13);
  }

  // Hospital Icons
  const hospitalIcon = L.divIcon({
    className: 'custom-map-icon',
    html: '<div style="background-color: #0B1B3D; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-weight: bold;"><i class="bi bi-hospital"></i></div>',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const ambulanceIcon = L.divIcon({
    className: 'custom-map-icon',
    html: '<div style="background-color: #D32F2F; color: white; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 0 0 6px rgba(211, 47, 47, 0.3); font-size: 1.1rem;"><i class="bi bi-truck"></i></div>',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });

  // Coordinates for demo: NIMS (source) to Apollo (dest)
  const sourceLat = 17.4225, sourceLng = 78.4518;
  const destLat = 17.4156, destLng = 78.4124;

  if (sourceMarker) trackingMap.removeLayer(sourceMarker);
  if (destMarker) trackingMap.removeLayer(destMarker);
  if (routePolyline) trackingMap.removeLayer(routePolyline);

  sourceMarker = L.marker([sourceLat, sourceLng], { icon: hospitalIcon })
    .addTo(trackingMap)
    .bindPopup('<b>Donor Center:</b> NIMS Hyderabad');

  destMarker = L.marker([destLat, destLng], { icon: hospitalIcon })
    .addTo(trackingMap)
    .bindPopup('<b>Recipient Center:</b> Apollo Hospitals Jubilee Hills');

  // Simulated arterial route coordinates
  const routePoints = [
    [17.4225, 78.4518],
    [17.4210, 78.4450],
    [17.4180, 78.4320],
    [17.4165, 78.4210],
    [17.4158, 78.4150],
    [17.4156, 78.4124]
  ];

  const lineColor = transport.greenCorridorActive ? '#00897B' : '#D32F2F';
  routePolyline = L.polyline(routePoints, {
    color: lineColor,
    weight: 5,
    opacity: 0.85,
    dashArray: transport.greenCorridorActive ? null : '8, 8'
  }).addTo(trackingMap);

  // Set latest vehicle marker
  let curLat = sourceLat, curLng = sourceLng;
  if (telemetryList && telemetryList.length > 0) {
    const latest = telemetryList[0];
    curLat = latest.latitude;
    curLng = latest.longitude;
    updateTelemetryGauge(latest);
  }

  if (vehicleMarker) trackingMap.removeLayer(vehicleMarker);
  vehicleMarker = L.marker([curLat, curLng], { icon: ambulanceIcon })
    .addTo(trackingMap)
    .bindPopup(`<b>Emergency Transport:</b> ${transport.trackingNumber}<br>Status: ${transport.status}`);

  trackingMap.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

  // Start polling every 5 seconds
  if (pollingTimer) clearInterval(pollingTimer);
  pollingTimer = setInterval(async () => {
    try {
      const history = await api.getTelemetry(transport.id);
      if (history && history.length > 0) {
        const p = history[0];
        vehicleMarker.setLatLng([p.latitude, p.longitude]);
        updateTelemetryGauge(p);
      }
    } catch (e) {
      console.warn('Telemetry poll silent skip:', e);
    }
  }, 5000);
}

function updateTelemetryGauge(point) {
  const tempEl = document.getElementById('telemetryTemp');
  const speedEl = document.getElementById('telemetrySpeed');
  const batteryEl = document.getElementById('telemetryBattery');
  const timeEl = document.getElementById('telemetryLastPing');

  if (tempEl && point.coldBoxTempCelsius !== undefined) {
    tempEl.innerText = point.coldBoxTempCelsius.toFixed(1) + ' °C';
    // Cold box sterile target: 2 - 4 C
    if (point.coldBoxTempCelsius >= 2.0 && point.coldBoxTempCelsius <= 4.0) {
      tempEl.className = 'gauge-val text-success';
    } else if (point.coldBoxTempCelsius <= 6.0) {
      tempEl.className = 'gauge-val text-warning';
    } else {
      tempEl.className = 'gauge-val text-danger';
    }
  }

  if (speedEl && point.speedKmh !== undefined) {
    speedEl.innerText = Math.round(point.speedKmh) + ' km/h';
  }

  if (batteryEl && point.batteryLevelPercent !== undefined) {
    batteryEl.innerText = point.batteryLevelPercent + '%';
  }

  if (timeEl && point.recordedAt) {
    timeEl.innerText = formatDateTime(point.recordedAt);
  }
}
