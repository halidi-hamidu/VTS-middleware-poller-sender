const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 2000;

// ---------------- CONFIG ----------------
// const TRACCAR_BASE = 'http://93.127.139.107:8082/api'; //production
const TRACCAR_BASE = 'http://69.197.176.231:8082/api'; //deve 
const POSITIONS_API = `${TRACCAR_BASE}/positions`;
const DEVICES_API = `${TRACCAR_BASE}/devices`;
// const TUNNEL_URL = 'http://demo.tunnel.ictpack.net/traccar/'; //local tunnel
// const TUNNEL_URL = 'http://69.197.176.231:4000/traccar/';
// const TUNNEL_URL = 'http://93.217.139.107:4000/traccar/';// product 
const TUNNEL_URL = 'http://localhost:4000/traccar/';

const AUTH = { username: 'admin', password: 'admin' };
const PERSIST_FILE = path.join(__dirname, 'lastSentPositions.json');

// ---------------- STATE ----------------
let devicesMap = {};
let lastSentPositionId = {};

// ---------------- LOAD PERSISTED STATE ----------------
function loadPersistedState() {
  if (fs.existsSync(PERSIST_FILE)) {
    try {
      const data = fs.readFileSync(PERSIST_FILE, 'utf-8');
      lastSentPositionId = JSON.parse(data);
      console.log('✅ Loaded persisted lastSentPositionId');
    } catch (err) {
      console.error('❌ Failed to load persisted state:', err.message);
    }
  }
}

function persistState() {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(lastSentPositionId, null, 2));
  } catch (err) {
    console.error('❌ Failed to persist state:', err.message);
  }
}

// ---------------- EVENT MAP ----------------
const eventMap = {
  0: "Ignition Off",
  1: "Ignition On",
  2: "Driver Panic",
  3: "Passenger Panic",
  4: "Movement Start",
  5: "Movement Stop",
  6: "SOS Button Pressed",
  7: "Geofence Enter",
  8: "Geofence Exit",
  9: "Fuel Event",
  10: "Low Battery",
  11: "Fuel Drop",
  12: "Fuel Fill",
  13: "Door Open",
  14: "Door Close",
  15: "Tamper Alarm",
  16: "Temperature Alarm",
  17: "Shock Alarm",
  18: "Maintenance Reminder",
  66: "External Voltage",
  78: "iButton",
  113: "Battery Low",
  180: "Digital Output 2",
  239: "Ignition On/Off",
  243: "Green Driving Duration",
  247: "Crash",
  251: "Idle",
  252: "External Power",
  253: "Green Driving",
  255: "Overspeed"
};

// ---------------- HELPERS ----------------
function knotsToKmh(knots) { return knots ? knots * 1.852 : 0; }

function extractNumericValue(attributes, keys, defaultValue = null) {
  for (const key of keys) {
    if (attributes && attributes[key] !== undefined && attributes[key] !== null) {
      const val = parseFloat(attributes[key]);
      if (!isNaN(val)) return val;
    }
  }
  return defaultValue;
}

function extractStringValue(attributes, keys, defaultValue = null) {
  for (const key of keys) {
    if (attributes && attributes[key] !== undefined && attributes[key] !== null) {
      return String(attributes[key]);
    }
  }
  return defaultValue;
}

function getEventName(pos) {
  const code = pos.attributes?.eventCode;
  if (pos.attributes?.event) return pos.attributes.event;
  if (code !== undefined && eventMap[code]) return eventMap[code];
  return pos.type || "Unknown";
}

// ---------------- LOAD DEVICES ----------------
async function loadDevices() {
  try {
    const resp = await axios.get(DEVICES_API, { auth: AUTH });
    devicesMap = {};
    resp.data.forEach(d => {
      devicesMap[d.id] = {
        name: d.name,
        imei: d.uniqueId,
        model: d.model || null,
        category: d.category || null
      };
    });
    console.log('✅ Devices loaded:', Object.keys(devicesMap).length);
  } catch (err) {
    console.error('❌ Failed to load devices:', err.message);
  }
}

// ---------------- FORWARD POSITION ----------------
async function forwardPosition(pos) {
  const device = devicesMap[pos.deviceId] || {};
  const attributes = pos.attributes || {};

  const speedKnots = pos.speed || attributes.speed || attributes.velocity || 0;
  const speedKmh = knotsToKmh(speedKnots);

  const satelliteCount = extractNumericValue(attributes, ['satelliteCount','satellites'], pos.satellites || 0);
  const hdop = extractNumericValue(attributes, ['hdop','HDOP'], pos.hdop || 0);
  const rssi = extractNumericValue(attributes, ['rssi','signalStrength'], pos.rssi || 0);
  const lac = extractNumericValue(attributes, ['lac','areaCode'], null);
  const cellId = extractNumericValue(attributes, ['cellId','cid'], null);
  const mcc = extractNumericValue(attributes, ['mcc','mobileCountryCode'], null);
  const mnc = extractNumericValue(attributes, ['mnc','mobileNetworkCode'], null);

  let d2d3 = extractStringValue(attributes, ['mode','gpsMode','fixType']);
  if (!d2d3) d2d3 = (satelliteCount >=4 && pos.altitude) ? '3' : (satelliteCount >=3) ? '2' : null;

  const eventCode = attributes.eventCode || attributes.event || null;
  const eventName = getEventName(pos);

  const payload = {
    id: pos.id,
    type: pos.type || 'position',
    deviceId: pos.deviceId,
    positionId: pos.id,
    serverTime: pos.serverTime,
    deviceTime: pos.deviceTime,
    attributes: attributes,
    eventCode: eventCode,
    eventName: eventName,
    position: {
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude,
      speed: speedKmh,
      course: pos.course,
      attributes: {
        hdop: hdop,
        rssi: rssi,
        cellId: cellId,
        lac: lac,
        mcc: mcc,
        mnc: mnc,
        din1: attributes.digitalInput1 || null,
        din2: attributes.digitalInput2 || null,
        ignition: attributes.ignition || null,
        batteryLevel: attributes.batteryLevel || null,

        // Extra attributes (IOs and Events)
        priority: attributes.priority || null,
        sat: attributes.sat || null,
        motion: attributes.motion || null,
        pdop: attributes.pdop || null,
        power: attributes.power || null,
        battery: attributes.battery || null,
        tripOdometer: attributes.tripOdometer || null,
        odometer: attributes.odometer || null,
        distance: attributes.distance || null,
        totalDistance: attributes.totalDistance || null,
        hours: attributes.hours || null,

        // IO & Event attributes
        io6: attributes.io6 || null,
        io9: attributes.io9 || null,       // Fuel
        io11: attributes.io11 || null,
        io14: attributes.io14 || null,
        io24: attributes.io24 || null,
        io66: attributes.io66 || null,     // External Voltage
        io68: attributes.io68 || null,
        io69: attributes.io69 || null,
        io78: attributes.io78 || null,     // iButton
        io113: attributes.io113 || null,   // Battery Low
        io180: attributes.io180 || null,   // Digital Output 2
        io200: attributes.io200 || null,
        io205: attributes.io205 || null,
        io206: attributes.io206 || null,
        io239: attributes.io239 || null,   // Ignition
        io243: attributes.io243 || null,   // Green Driving Duration
        io247: attributes.io247 || null,   // Crash
        io251: attributes.io251 || null,   // Idle
        io252: attributes.io252 || null,   // External Power
        io253: attributes.io253 || null,   // Green Driving
        io255: attributes.io255 || null    // Overspeed
      }
    },
    deviceInfo: {
      imei: device.imei,
      name: device.name,
      model: device.model,
      category: device.category
    }
  };

  try {
    await axios.post(TUNNEL_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    console.log(`📡 Forwarded: ${payload.eventName} | Device: ${device.name} | PositionId: ${pos.id}`);
  } catch (err) {
    console.error(`❌ Forwarding error for PositionId ${pos.id}:`, err.message);
  }
}

// ---------------- FETCH & FORWARD ----------------
async function fetchAndForward() {
  try {
    const resp = await axios.get(POSITIONS_API, { auth: AUTH, timeout: 10000 });
    const positions = resp.data;

    for (const pos of positions) {
      const lastId = lastSentPositionId[pos.deviceId] || 0;
      
      // ✅ Forward ALL records from Traccar - no skipping
      if (pos.id > lastId) {
        lastSentPositionId[pos.deviceId] = pos.id; 
        await forwardPosition(pos);
      }
    }
  } catch (err) {
    console.error('❌ Error fetching positions:', err.message);
  }
}

// ---------------- EXPRESS ENDPOINTS ----------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    devices: Object.keys(devicesMap).length,
    lastUpdate: new Date().toISOString(),
    positionsTracked: Object.keys(lastSentPositionId).length
  });
});

app.get('/devices', (req, res) => res.json(devicesMap));

// ---------------- START SERVER ----------------
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  loadPersistedState();
  await loadDevices();
  console.log('🔄 Starting real-time position polling every second...');
  setInterval(fetchAndForward, 10);
  setTimeout(fetchAndForward, 20);
});

// ---------------- ERROR HANDLING ----------------
process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught exception:', err));

// ---------------- LOGGING ----------------
const logStream = fs.createWriteStream(path.join(__dirname, 'logs/app.log'), { flags: 'a' });
console.log = (...args) => logStream.write(new Date().toISOString() + " " + args.join(" ") + "\n");
