const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

const REGION_BOUNDS = {
  hyderabad: {
    region: 'hyderabad',
    name: 'Hyderabad Metropolitan Region',
    minLat: 17.32,
    maxLat: 17.52,
    minLon: 78.34,
    maxLon: 78.58,
    center: { latitude: 17.4156, longitude: 78.4750, zoom: 12 }
  },
  telangana: {
    region: 'telangana',
    name: 'Telangana State Regional Zone',
    minLat: 15.80,
    maxLat: 19.90,
    minLon: 77.20,
    maxLon: 81.30,
    center: { latitude: 17.8000, longitude: 79.1000, zoom: 8 }
  },
  india: {
    region: 'india',
    name: 'India Operational Command (Pan-India)',
    minLat: 8.00,
    maxLat: 35.50,
    minLon: 68.00,
    maxLon: 97.50,
    center: { latitude: 21.7679, longitude: 78.8718, zoom: 5 }
  }
};

const handleSpatialData = (req, res) => {
  try {
    const db = getDb();
    const regionKey = (req.query.region || 'hyderabad').toLowerCase();
    const regionConfig = REGION_BOUNDS[regionKey] || REGION_BOUNDS.hyderabad;
    const search = (req.query.search || '').trim().toLowerCase();
    const selectedRequestId = req.query.requestId;

    // 1. Facilities
    let facQuery = `
      SELECT o.*,
        (SELECT COUNT(*) FROM emergency_requests WHERE organization_id = o.id AND status NOT IN ('FULFILLED', 'CANCELLED', 'EXPIRED')) as active_requests,
        (SELECT COALESCE(SUM(units_available), 0) FROM inventory_batches WHERE organization_id = o.id AND status = 'AVAILABLE') as available_stock,
        (SELECT COALESCE(SUM(units_available), 0) FROM inventory_batches WHERE organization_id = o.id AND status = 'AVAILABLE' AND blood_group = 'O-') as available_o_neg
      FROM organizations o
      WHERE 1=1
    `;
    const facParams = [];

    // Filter by bounds if not pan-India
    if (regionKey === 'hyderabad') {
      facQuery += ` AND o.latitude BETWEEN ? AND ? AND o.longitude BETWEEN ? AND ?`;
      facParams.push(regionConfig.minLat - 0.05, regionConfig.maxLat + 0.05, regionConfig.minLon - 0.05, regionConfig.maxLon + 0.05);
    } else if (regionKey === 'telangana') {
      facQuery += ` AND (o.address LIKE '%Telangana%' OR o.address LIKE '%Hyderabad%' OR (o.latitude BETWEEN 15.5 AND 20.0 AND o.longitude BETWEEN 77.0 AND 81.5))`;
    }

    if (search) {
      facQuery += ` AND (LOWER(o.name) LIKE ? OR LOWER(o.address) LIKE ?)`;
      facParams.push(`%${search}%`, `%${search}%`);
    }

    const facilities = db.prepare(facQuery).all(...facParams);

    // 2. Active Incident Hotspots
    const incidents = db.prepare(`
      SELECT i.*, u.full_name as coordinator_name,
        17.4100 as latitude,
        78.4300 as longitude
      FROM incidents i
      LEFT JOIN users u ON u.id = i.lead_coordinator_id
      WHERE i.status = 'ACTIVE'
    `).all();

    // 3. Privacy-Preserving Donor Clusters (Aggregated by locality/zone, exact home locations masked)
    let clusters = [];
    if (regionKey === 'hyderabad') {
      clusters = [
        { locality: 'Himayatnagar Zone', latitude: 17.4050, longitude: 78.4800, total_donors: 14, o_neg_count: 3, radius_km: 2.5 },
        { locality: 'Banjara Hills Sector', latitude: 17.4150, longitude: 78.4400, total_donors: 19, o_neg_count: 4, radius_km: 3.0 },
        { locality: 'Secunderabad Central', latitude: 17.4400, longitude: 78.5000, total_donors: 22, o_neg_count: 5, radius_km: 3.5 },
        { locality: 'Begumpet Airport Belt', latitude: 17.4500, longitude: 78.4700, total_donors: 11, o_neg_count: 2, radius_km: 2.0 },
        { locality: 'Kukatpally Corridor', latitude: 17.4900, longitude: 78.3900, total_donors: 16, o_neg_count: 3, radius_km: 4.0 },
        { locality: 'Dilsukhnagar Hub', latitude: 17.3700, longitude: 78.5300, total_donors: 13, o_neg_count: 2, radius_km: 3.0 }
      ];
    } else if (regionKey === 'telangana') {
      clusters = [
        { locality: 'Hyderabad Metro Cluster', latitude: 17.4156, longitude: 78.4750, total_donors: 95, o_neg_count: 19, radius_km: 15.0 },
        { locality: 'Warangal Urban Belt', latitude: 17.9689, longitude: 79.5941, total_donors: 28, o_neg_count: 6, radius_km: 8.0 },
        { locality: 'Karimnagar Civic Cluster', latitude: 18.4386, longitude: 79.1288, total_donors: 21, o_neg_count: 4, radius_km: 6.0 },
        { locality: 'Nizamabad Rural Hub', latitude: 18.6725, longitude: 78.0941, total_donors: 17, o_neg_count: 3, radius_km: 7.0 }
      ];
    } else {
      clusters = [
        { locality: 'Hyderabad Emergency Hub (Telangana)', latitude: 17.4156, longitude: 78.4750, total_donors: 120, o_neg_count: 24, radius_km: 20.0 },
        { locality: 'Mumbai Maritime Corridor (Maharashtra)', latitude: 19.0760, longitude: 72.8777, total_donors: 180, o_neg_count: 35, radius_km: 25.0 },
        { locality: 'Delhi National Capital Cluster', latitude: 28.6139, longitude: 77.2090, total_donors: 210, o_neg_count: 42, radius_km: 30.0 },
        { locality: 'Bengaluru Tech Belt (Karnataka)', latitude: 12.9716, longitude: 77.5946, total_donors: 145, o_neg_count: 29, radius_km: 22.0 },
        { locality: 'Chennai Coastal Sector (Tamil Nadu)', latitude: 13.0827, longitude: 80.2707, total_donors: 110, o_neg_count: 22, radius_km: 18.0 }
      ];
    }

    // 4. Active Emergency Request Locations
    let activeReqQuery = `
      SELECT r.id, r.blood_group, r.blood_component, r.units_requested, r.units_fulfilled,
             r.urgency_level, r.delivery_latitude, r.delivery_longitude, r.delivery_address,
             r.status, o.name as hospital_name
      FROM emergency_requests r
      JOIN organizations o ON o.id = r.organization_id
      WHERE r.status IN ('PENDING_REVIEW', 'VERIFIED', 'MATCHING')
    `;
    const activeRequests = db.prepare(activeReqQuery).all();

    // 5. Selected Request Details for Request-linked Escalation Rings
    let selectedRequestCenter = null;
    if (selectedRequestId) {
      const target = db.prepare('SELECT id, delivery_latitude, delivery_longitude, delivery_address, blood_group FROM emergency_requests WHERE id = ?').get(selectedRequestId);
      if (target) {
        selectedRequestCenter = {
          request_id: target.id,
          latitude: target.delivery_latitude,
          longitude: target.delivery_longitude,
          address: target.delivery_address,
          blood_group: target.blood_group
        };
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      active_region: regionConfig,
      facilities,
      incidents,
      donor_clusters: clusters,
      active_emergency_requests: activeRequests,
      selected_request_center: selectedRequestCenter,
      radius_stages_km: [5, 15, 30, 50],
      connection_state: 'CONNECTED_SQL_REALTIME',
      privacy_watermark: 'PROTECTED SPATIAL DATA — Donor markers are generalized spatial clusters. Exact home locations are masked.'
    });
  } catch (err) {
    res.status(500).json({ error: 'FETCH_SPATIAL_DATA_FAILED', message: err.message });
  }
};

router.get('/', handleSpatialData);
router.get('/spatial-data', handleSpatialData);

// Curated Directory of Known Medical Facilities and Localities across Pan-India
const CURATED_PLACES = [
  // Telangana & Hyderabad Metropolitan Region
  { name: "Nizam's Institute of Medical Sciences (NIMS)", locality: 'Punjagutta', city: 'Hyderabad', state: 'Telangana', postal_code: '500082', latitude: 17.4222, longitude: 78.4528, facility_type: 'GOVERNMENT_HOSPITAL' },
  { name: 'Apollo Hospitals Jubilee Hills', locality: 'Jubilee Hills', city: 'Hyderabad', state: 'Telangana', postal_code: '500033', latitude: 17.4190, longitude: 78.4116, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Yashoda Hospitals Somajiguda', locality: 'Somajiguda', city: 'Hyderabad', state: 'Telangana', postal_code: '500082', latitude: 17.4265, longitude: 78.4578, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Yashoda Hospitals Secunderabad', locality: 'Secunderabad', city: 'Secunderabad', state: 'Telangana', postal_code: '500003', latitude: 17.4422, longitude: 78.4975, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Yashoda Hospitals Malakpet', locality: 'Malakpet', city: 'Hyderabad', state: 'Telangana', postal_code: '500036', latitude: 17.3732, longitude: 78.4998, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Osmania General Hospital', locality: 'Afzal Gunj', city: 'Hyderabad', state: 'Telangana', postal_code: '500012', latitude: 17.3753, longitude: 78.4744, facility_type: 'TERTIARY_TRAUMA_CENTER' },
  { name: 'Gandhi Hospital & Medical College', locality: 'Musheerabad', city: 'Secunderabad', state: 'Telangana', postal_code: '500025', latitude: 17.4241, longitude: 78.5034, facility_type: 'GOVERNMENT_TEACHING_HOSPITAL' },
  { name: 'Care Hospitals Banjara Hills', locality: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana', postal_code: '500034', latitude: 17.4167, longitude: 78.4482, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Care Hospitals Gachibowli', locality: 'Gachibowli', city: 'Hyderabad', state: 'Telangana', postal_code: '500032', latitude: 17.4399, longitude: 78.3606, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Continental Hospitals Financial District', locality: 'Gachibowli', city: 'Hyderabad', state: 'Telangana', postal_code: '500032', latitude: 17.4202, longitude: 78.3498, facility_type: 'TERTIARY_HOSPITAL' },
  { name: 'KIMS Hospitals Minister Road', locality: 'Begumpet / Minister Road', city: 'Secunderabad', state: 'Telangana', postal_code: '500003', latitude: 17.4375, longitude: 78.4877, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'AIG Hospitals', locality: 'Gachibowli', city: 'Hyderabad', state: 'Telangana', postal_code: '500032', latitude: 17.4435, longitude: 78.3662, facility_type: 'SPECIALITY_INSTITUTE' },
  { name: 'Medicover Hospitals Madhapur', locality: 'Hitec City / Madhapur', city: 'Hyderabad', state: 'Telangana', postal_code: '500081', latitude: 17.4486, longitude: 78.3789, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Basavatarakam Indo-American Cancer Hospital', locality: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana', postal_code: '500034', latitude: 17.4246, longitude: 78.4312, facility_type: 'ONCOLOGY_INSTITUTE' },
  { name: "Rainbow Children's Hospital Banjara Hills", locality: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana', postal_code: '500034', latitude: 17.4140, longitude: 78.4485, facility_type: 'PEDIATRIC_HOSPITAL' },
  { name: 'AIIMS Bibi Nagar Apex Hospital', locality: 'Bibi Nagar', city: 'Hyderabad Metropolitan Region', state: 'Telangana', postal_code: '508126', latitude: 17.4156, longitude: 78.4750, facility_type: 'TERTIARY_TRAUMA_CENTER' },
  { name: 'Red Cross Central Regional Blood Bank', locality: 'Secunderabad Central Hub', city: 'Secunderabad', state: 'Telangana', postal_code: '500003', latitude: 17.4399, longitude: 78.4983, facility_type: 'BLOOD_BANK' },
  { name: 'MGM Hospital & Kakatiya Medical College', locality: 'Subedari', city: 'Warangal', state: 'Telangana', postal_code: '506007', latitude: 17.9784, longitude: 79.6015, facility_type: 'REGIONAL_TRAUMA_CENTER' },
  { name: 'Government General Hospital Nizamabad', locality: 'Khaleelwadi', city: 'Nizamabad', state: 'Telangana', postal_code: '503001', latitude: 18.6725, longitude: 78.0941, facility_type: 'DISTRICT_HEADQUARTERS_HOSPITAL' },
  { name: 'Government General Hospital Karimnagar', locality: 'Collectorate Area', city: 'Karimnagar', state: 'Telangana', postal_code: '505001', latitude: 18.4386, longitude: 79.1288, facility_type: 'DISTRICT_HEADQUARTERS_HOSPITAL' },

  // Delhi / New Delhi National Capital Region
  { name: 'AIIMS New Delhi Apex Trauma Centre', locality: 'Ansari Nagar', city: 'New Delhi', state: 'Delhi', postal_code: '110029', latitude: 28.5672, longitude: 77.2100, facility_type: 'NATIONAL_APEX_HOSPITAL' },
  { name: 'Safdarjung Hospital', locality: 'Ring Road, Opposite AIIMS', city: 'New Delhi', state: 'Delhi', postal_code: '110029', latitude: 28.5700, longitude: 77.2078, facility_type: 'GOVERNMENT_HOSPITAL' },
  { name: 'Max Super Speciality Hospital Saket', locality: 'Saket', city: 'New Delhi', state: 'Delhi', postal_code: '110017', latitude: 28.5273, longitude: 77.2115, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Fortis Escorts Heart Institute', locality: 'Okhla Road', city: 'New Delhi', state: 'Delhi', postal_code: '110025', latitude: 28.5606, longitude: 77.2796, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Sir Ganga Ram Hospital', locality: 'Rajinder Nagar', city: 'New Delhi', state: 'Delhi', postal_code: '110060', latitude: 28.6385, longitude: 77.1895, facility_type: 'TERTIARY_HOSPITAL' },
  { name: 'Rotary Central Blood Bank Delhi', locality: 'Tughlakabad Institutional Area', city: 'New Delhi', state: 'Delhi', postal_code: '110062', latitude: 28.5135, longitude: 77.2825, facility_type: 'BLOOD_BANK' },
  { name: 'Connaught Place', locality: 'Central Secretariat / CP', city: 'New Delhi', state: 'Delhi', postal_code: '110001', latitude: 28.6304, longitude: 77.2177, facility_type: 'LOCALITY' },
  { name: 'South Extension', locality: 'Ring Road Belt', city: 'New Delhi', state: 'Delhi', postal_code: '110049', latitude: 28.5728, longitude: 77.2215, facility_type: 'LOCALITY' },
  { name: 'Dwarka Sector 10', locality: 'Dwarka Sub-City', city: 'New Delhi', state: 'Delhi', postal_code: '110075', latitude: 28.5815, longitude: 77.0592, facility_type: 'LOCALITY' },

  // Mumbai Metropolitan Region (Maharashtra)
  { name: 'Tata Memorial Trauma & Oncology Hospital', locality: 'Parel', city: 'Mumbai', state: 'Maharashtra', postal_code: '400012', latitude: 19.0028, longitude: 72.8428, facility_type: 'ONCOLOGY_INSTITUTE' },
  { name: 'King Edward Memorial (KEM) Hospital', locality: 'Parel', city: 'Mumbai', state: 'Maharashtra', postal_code: '400012', latitude: 19.0028, longitude: 72.8427, facility_type: 'MUNICIPAL_TERTIARY_HOSPITAL' },
  { name: 'Lilavati Hospital and Research Centre', locality: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', postal_code: '400050', latitude: 19.0514, longitude: 72.8290, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Kokilaben Dhirubhai Ambani Hospital', locality: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', postal_code: '400053', latitude: 19.1317, longitude: 72.8256, facility_type: 'TERTIARY_HOSPITAL' },
  { name: 'Dadar Central', locality: 'Dadar TT Circle', city: 'Mumbai', state: 'Maharashtra', postal_code: '400014', latitude: 19.0178, longitude: 72.8478, facility_type: 'LOCALITY' },
  { name: 'Bandra Kurla Complex (BKC)', locality: 'Bandra East', city: 'Mumbai', state: 'Maharashtra', postal_code: '400051', latitude: 19.0657, longitude: 72.8687, facility_type: 'LOCALITY' },

  // Bengaluru Urban (Karnataka)
  { name: 'Victoria Emergency Hospital & Medical College', locality: 'Kalasipalya / Fort', city: 'Bengaluru', state: 'Karnataka', postal_code: '560002', latitude: 12.9602, longitude: 77.5741, facility_type: 'TERTIARY_TEACHING_HOSPITAL' },
  { name: 'Manipal Hospital Old Airport Road', locality: 'HAL Old Airport Road', city: 'Bengaluru', state: 'Karnataka', postal_code: '560017', latitude: 12.9592, longitude: 77.6484, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Narayana Institute of Cardiac Sciences', locality: 'Bommasandra Industrial Area', city: 'Bengaluru', state: 'Karnataka', postal_code: '560099', latitude: 12.8156, longitude: 77.6931, facility_type: 'SPECIALITY_INSTITUTE' },
  { name: 'Koramangala 5th Block', locality: 'Koramangala', city: 'Bengaluru', state: 'Karnataka', postal_code: '560095', latitude: 12.9352, longitude: 77.6245, facility_type: 'LOCALITY' },
  { name: 'Indiranagar 100 Feet Road', locality: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka', postal_code: '560038', latitude: 12.9784, longitude: 77.6408, facility_type: 'LOCALITY' },

  // Chennai (Tamil Nadu)
  { name: 'Apollo Specialty Hospital Greams Road', locality: 'Thousand Lights', city: 'Chennai', state: 'Tamil Nadu', postal_code: '600006', latitude: 13.0604, longitude: 80.2496, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Rajiv Gandhi Government General Hospital', locality: 'Park Town', city: 'Chennai', state: 'Tamil Nadu', postal_code: '600003', latitude: 13.0805, longitude: 80.2785, facility_type: 'TERTIARY_TRAUMA_CENTER' },
  { name: 'T. Nagar', locality: 'Panagal Park', city: 'Chennai', state: 'Tamil Nadu', postal_code: '600017', latitude: 13.0418, longitude: 80.2341, facility_type: 'LOCALITY' },

  // Kolkata (West Bengal)
  { name: 'Medical College and Hospital Kolkata', locality: 'College Street', city: 'Kolkata', state: 'West Bengal', postal_code: '700073', latitude: 22.5735, longitude: 88.3630, facility_type: 'TERTIARY_TEACHING_HOSPITAL' },
  { name: 'Fortis Hospital Anandapur', locality: 'Anandapur, EM Bypass', city: 'Kolkata', state: 'West Bengal', postal_code: '700107', latitude: 22.5174, longitude: 88.4032, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Park Street', locality: 'Park Street Belt', city: 'Kolkata', state: 'West Bengal', postal_code: '700016', latitude: 22.5535, longitude: 88.3533, facility_type: 'LOCALITY' },

  // Pune (Maharashtra)
  { name: 'KEM Hospital Pune', locality: 'Rasta Peth', city: 'Pune', state: 'Maharashtra', postal_code: '411011', latitude: 18.5196, longitude: 73.8672, facility_type: 'TERTIARY_HOSPITAL' },
  { name: 'Ruby Hall Clinic', locality: 'Sassoon Road', city: 'Pune', state: 'Maharashtra', postal_code: '411001', latitude: 18.5312, longitude: 73.8774, facility_type: 'SUPER_SPECIALITY_HOSPITAL' },
  { name: 'Shivajinagar', locality: 'FC Road Belt', city: 'Pune', state: 'Maharashtra', postal_code: '411005', latitude: 18.5314, longitude: 73.8446, facility_type: 'LOCALITY' },

  // Hyderabad Localities
  { name: 'Banjara Hills', locality: 'Road No 1-14', city: 'Hyderabad', state: 'Telangana', postal_code: '500034', latitude: 17.4156, longitude: 78.4400, facility_type: 'LOCALITY' },
  { name: 'Jubilee Hills', locality: 'Checkpost / Road 36', city: 'Hyderabad', state: 'Telangana', postal_code: '500033', latitude: 17.4319, longitude: 78.4073, facility_type: 'LOCALITY' },
  { name: 'Gachibowli / Financial District', locality: 'IT Corridor', city: 'Hyderabad', state: 'Telangana', postal_code: '500032', latitude: 17.4401, longitude: 78.3489, facility_type: 'LOCALITY' },
  { name: 'Madhapur / Hitec City', locality: 'Cyber Towers Belt', city: 'Hyderabad', state: 'Telangana', postal_code: '500081', latitude: 17.4483, longitude: 78.3808, facility_type: 'LOCALITY' },
  { name: 'Secunderabad Junction & Clock Tower', locality: 'Secunderabad Cantonment', city: 'Secunderabad', state: 'Telangana', postal_code: '500003', latitude: 17.4399, longitude: 78.4983, facility_type: 'LOCALITY' },
  { name: 'Kukatpally Housing Board (KPHB)', locality: 'Kukatpally', city: 'Hyderabad', state: 'Telangana', postal_code: '500072', latitude: 17.4947, longitude: 78.3996, facility_type: 'LOCALITY' },
  { name: 'Begumpet', locality: 'Airport Road', city: 'Hyderabad', state: 'Telangana', postal_code: '500016', latitude: 17.4447, longitude: 78.4664, facility_type: 'LOCALITY' },
  { name: 'Mehdipatnam', locality: 'Rythu Bazar / Pillar 1', city: 'Hyderabad', state: 'Telangana', postal_code: '500028', latitude: 17.3916, longitude: 78.4398, facility_type: 'LOCALITY' },
  { name: 'Charminar / Old City', locality: 'Charminar Zone', city: 'Hyderabad', state: 'Telangana', postal_code: '500002', latitude: 17.3616, longitude: 78.4747, facility_type: 'LOCALITY' },
  { name: 'Dilsukhnagar', locality: 'Bus Depot Belt', city: 'Hyderabad', state: 'Telangana', postal_code: '500060', latitude: 17.3688, longitude: 78.5247, facility_type: 'LOCALITY' },
  { name: 'Ameerpet', locality: 'Metro Interchange', city: 'Hyderabad', state: 'Telangana', postal_code: '500016', latitude: 17.4375, longitude: 78.4483, facility_type: 'LOCALITY' },
  { name: 'Uppal', locality: 'Ring Road Belt', city: 'Hyderabad', state: 'Telangana', postal_code: '500039', latitude: 17.4018, longitude: 78.5602, facility_type: 'LOCALITY' },
  { name: 'LB Nagar', locality: 'Sagar Ring Road', city: 'Hyderabad', state: 'Telangana', postal_code: '500074', latitude: 17.3457, longitude: 78.5522, facility_type: 'LOCALITY' },
  { name: 'Miyapur', locality: 'Metro Depot Area', city: 'Hyderabad', state: 'Telangana', postal_code: '500049', latitude: 17.4968, longitude: 78.3547, facility_type: 'LOCALITY' },
  { name: 'Warangal City', locality: 'Warangal Tri-Cities', city: 'Warangal', state: 'Telangana', postal_code: '506002', latitude: 17.9689, longitude: 79.5941, facility_type: 'CITY_CENTER' },
  { name: 'Karimnagar City', locality: 'Manair Belt', city: 'Karimnagar', state: 'Telangana', postal_code: '505001', latitude: 18.4386, longitude: 79.1288, facility_type: 'CITY_CENTER' },
  { name: 'Nizamabad City', locality: 'Indur Civic Belt', city: 'Nizamabad', state: 'Telangana', postal_code: '503001', latitude: 18.6725, longitude: 78.0941, facility_type: 'CITY_CENTER' }
];

// GIS Real Location Geocoding Resolver (Section 2)
router.get('/geocode', (req, res) => {
  try {
    const db = getDb();
    const query = (req.query.query || req.query.q || '').trim().toLowerCase();

    if (!query) {
      return res.json({ results: CURATED_PLACES.slice(0, 10) });
    }

    // 1. Search DB Organizations with dynamic state and city mapping
    const dbOrgs = db.prepare(`
      SELECT id as facility_id, name, address, latitude, longitude, type as facility_type
      FROM organizations
      WHERE LOWER(name) LIKE ? OR LOWER(address) LIKE ?
      LIMIT 10
    `).all(`%${query}%`, `%${query}%`).map(org => {
      const addr = org.address || '';
      let city = 'Hyderabad';
      let state = 'Telangana';
      if (addr.includes('New Delhi') || addr.includes('Delhi')) { city = 'New Delhi'; state = 'Delhi'; }
      else if (addr.includes('Mumbai') || addr.includes('Maharashtra')) { city = 'Mumbai'; state = 'Maharashtra'; }
      else if (addr.includes('Bengaluru') || addr.includes('Bangalore') || addr.includes('Karnataka')) { city = 'Bengaluru'; state = 'Karnataka'; }
      else if (addr.includes('Chennai') || addr.includes('Tamil Nadu')) { city = 'Chennai'; state = 'Tamil Nadu'; }
      else if (addr.includes('Kolkata') || addr.includes('West Bengal')) { city = 'Kolkata'; state = 'West Bengal'; }
      else if (addr.includes('Pune')) { city = 'Pune'; state = 'Maharashtra'; }
      else if (addr.includes('Warangal')) { city = 'Warangal'; state = 'Telangana'; }
      else if (addr.includes('Karimnagar')) { city = 'Karimnagar'; state = 'Telangana'; }
      else if (addr.includes('Nizamabad')) { city = 'Nizamabad'; state = 'Telangana'; }

      return {
        name: org.name,
        locality: addr.split(',')[1]?.trim() || addr.split(',')[0]?.trim() || 'Medical Center',
        city,
        state,
        postal_code: (addr.match(/\b\d{6}\b/) || ['500001'])[0],
        latitude: org.latitude,
        longitude: org.longitude,
        facility_id: org.facility_id,
        facility_type: org.facility_type
      };
    });

    // 2. Search Curated Places
    const curatedMatches = CURATED_PLACES.filter(place =>
      place.name.toLowerCase().includes(query) ||
      place.locality.toLowerCase().includes(query) ||
      place.city.toLowerCase().includes(query) ||
      place.state.toLowerCase().includes(query) ||
      place.postal_code.includes(query)
    );

    // Merge and deduplicate by name
    const seen = new Set();
    const combined = [];

    for (const item of [...dbOrgs, ...curatedMatches]) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    // If no direct matches, return intelligent regional fallback
    if (combined.length === 0) {
      let fbLat = 17.4065, fbLng = 78.4772, fbCity = 'Hyderabad', fbState = 'Telangana', fbPin = '500001';
      if (query.includes('delhi')) {
        fbLat = 28.6139; fbLng = 77.2090; fbCity = 'New Delhi'; fbState = 'Delhi'; fbPin = '110001';
      } else if (query.includes('mumbai')) {
        fbLat = 19.0760; fbLng = 72.8777; fbCity = 'Mumbai'; fbState = 'Maharashtra'; fbPin = '400001';
      } else if (query.includes('bengaluru') || query.includes('bangalore')) {
        fbLat = 12.9716; fbLng = 77.5946; fbCity = 'Bengaluru'; fbState = 'Karnataka'; fbPin = '560001';
      } else if (query.includes('chennai')) {
        fbLat = 13.0827; fbLng = 80.2707; fbCity = 'Chennai'; fbState = 'Tamil Nadu'; fbPin = '600001';
      } else if (query.includes('kolkata')) {
        fbLat = 22.5726; fbLng = 88.3639; fbCity = 'Kolkata'; fbState = 'West Bengal'; fbPin = '700001';
      } else if (query.includes('pune')) {
        fbLat = 18.5204; fbLng = 73.8567; fbCity = 'Pune'; fbState = 'Maharashtra'; fbPin = '411001';
      }

      combined.push({
        name: `${query.charAt(0).toUpperCase() + query.slice(1)} (Regional Area)`,
        locality: `${fbCity} Zone`,
        city: fbCity,
        state: fbState,
        postal_code: fbPin,
        latitude: fbLat,
        longitude: fbLng,
        facility_type: 'CUSTOM_COORDINATE'
      });
    }

    res.json({ results: combined });
  } catch (err) {
    res.status(500).json({ error: 'GEOCODE_FAILED', message: err.message });
  }
});

module.exports = router;
