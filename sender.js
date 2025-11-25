const express = require("express");
const axios = require("axios");

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 4000;

// BSMART/Latra API config
const BSMART_API_URL = process.env.BSMART_API_URL || "http://vts.latra.go.tz:8090/data-integration/integration/gps";
const BSMART_API_TOKEN = process.env.BSMART_API_TOKEN || "d2ViY29ycGx0ZDp3ZWJjMHJwQDIwMjU=";

// Middleware
app.use(express.json());

// Sequential message counters per device IMEI
const deviceCounters = new Map(); // Map<imei, counter>
const RESET_EVENT_CODES = new Set(['239', '250']);
// Function to get and increment message counter for specific device, with reset capability
function getNextMessageId(imei, eventCode) {
  // Initialize counter for new devices
  if (!deviceCounters.has(imei)) {
    deviceCounters.set(imei, 1);
    console.log(`🆕 Initialized counter for device ${imei}: 1`);
  }
  
  const currentCounter = deviceCounters.get(imei);
  
  // Reset counter if this is a reset event
  if (RESET_EVENT_CODES.has(eventCode.toString())) {
    deviceCounters.set(imei, 1);
    console.log(`🔄 Counter reset for device ${imei} to 1 due to event code: ${eventCode}`);
    return 1;
  }
  
  // Increment and return current value
  const nextCounter = currentCounter + 1;
  deviceCounters.set(imei, nextCounter);
  
  // Prevent counter from getting too large (safety measure)
  if (nextCounter > 1000000) {
    deviceCounters.set(imei, 1);
    console.log(`🔄 Counter reset for device ${imei} due to reaching limit`);
    return 1;
  }
  
  return currentCounter;
}

// Mapping Traccar event codes to Latra activity IDs with value checking
// Returns array of activity IDs to support multiple events (e.g., tampering scenarios)
const getActivityIds = (eventCode, attributes = {}, position = {}) => {
  const eventMapping = {
    '113': [9],
    '255': [4],
    '78': [24],
    '79': [17],
    '247': [12],
    '249': [7],
    '243': [15],
    '9': [8],
    '6': [13],
    '2': [8],
    '3': [13],
  };

  const code = eventCode.toString();

  // Handle external power disconnection with tampering detection
  if (code === '67' || code === '66') {
    const currentSpeed = position.speed || attributes.speed || 0;
    console.log(`🔌 External power disconnected (Event ${code}). Speed: ${currentSpeed} km/h`);
    
    if (currentSpeed >= 0) {
      console.log("⚠️ Device tampering detected: External power disconnected while moving!");
      return [10, 14]; // External Power Disconnected + Device Tampering
    } else {
      return [10]; // Just External Power Disconnected
    }
  }

  if (code === "253") {
    const alarm = attributes.alarm || attributes.position?.attributes?.alarm || "";
    console.log("🚦 Harsh Driving Alarm:", alarm);
    
    if (alarm === "hardAcceleration") return [7]; // Harsh Acceleration
    if (alarm === "hardBraking") return [5]; // Harsh Braking
    if (alarm === "hardCornering") return [6]; // Harsh Turning
    return [7]; // fallback
  }

  if (code === '252') {
    const currentSpeed = position.speed || attributes.speed || 0;
    console.log(`📡 Event 252 detected. Speed: ${currentSpeed} km/h`);
    
    if (currentSpeed > 1) {
      console.log("⚠️ Device tampering detected: Event 252 while moving!");
      return [14]; // Device Tampering only for event 252
    } else {
      return [10]; // External Power Disconnected
    }
  }

  if (code === '239') {
    const ignitionValue = attributes.ignition || 
      (attributes.position && attributes.position.attributes && attributes.position.attributes.ignition) || 
      false;
    return [ignitionValue ? 2 : 3];
  }

  if (code === '251') {
    const idlingValue = attributes.io251 || attributes.eventValue || attributes.value || false;
    const isIdling = Boolean(Number(idlingValue));
    return [isIdling ? 11 : 1];
  }

  if (code === '250') {
    const tripValue = attributes.io250 || attributes.eventValue || attributes.value || false;
    const isTripStart = Boolean(Number(tripValue));
    return [isTripStart ? 2 : 3];
  }

  if (code === '240') {
    const movementValue = attributes.io240 || attributes.eventValue || attributes.value || attributes.motion || false;
    Boolean(Number(movementValue));
    return [1];
  }

  return eventMapping[code] || [1];
};

// Legacy function for backward compatibility
const getActivityId = (eventCode, attributes = {}, position = {}) => {
  const activityIds = getActivityIds(eventCode, attributes, position);
  return activityIds[0]; // Return first activity ID for backward compatibility
};

// Construct addon_info based on activity
const getAddonInfo = (activityId, attributes = {}, position = {}) => {
  // helper to reverse hex string by bytes
  const reverseHex = function(hexStr) {
    if (!hexStr || hexStr.length % 2 !== 0) {
      return hexStr || null;
    }
    return hexStr
      .match(/.{2}/g)
      .reverse()
      .join("")
      .toUpperCase(); // ensure uppercase
  };

  switch (activityId) {
    case 2: // Engine ON
    case 18: // Engine Start
      return {
        idleTime: attributes.io73 || "0",
      };

    case 3: // Engine OFF
    case 19: // Engine Stop
      return {
        distance_travelled: (attributes.odometer / 1000 || 0).toFixed(1),
        trip_duration: "0",
        avgSpeed: "0",
        maxSpeed: attributes.io19 || "0"
      };

    case 4: // Speeding
      return {
        speed: position.speed || 0
      };

    case 9: // Internal Battery Low
    case 10: // External Power Disconnected
      const extVoltage = attributes.power ?? attributes.position?.power ?? 0;
      const intVoltage = attributes.battery ?? attributes.position?.battery ?? 0;
      return {
        ext_power_voltage: (extVoltage).toFixed(2),
        int_battery_voltage: (intVoltage).toFixed(2)
      };

    case 11: // Excessive Idle
      return {
        idleTime: attributes.io173 !== undefined ? 
          (attributes.io173 / 100).toFixed(2) : 
          attributes.position?.io173 !== undefined ? 
          (attributes.position.io173 / 100).toFixed(2) : 
          "0.00",
      };

    case 14: // Device Tampering
      return {
        tampering_type: "Unplug while moving",
        speed_at_event: position.speed || 0,
      };

    // case 17: // Invalid Scan
    case 24: // Ibutton Scan Regular
      return {
        v_driver_identification_no: reverseHex(attributes.driverUniqueId)
      };

    case 20:
    case 21:
    case 22:
    case 23: // Geofence events
      return {
        geo_name: attributes.io215 || "Unknown",
        geo_id: attributes.io216 || "0"
      };

    default:
      return null;
  }
};

// Construct fuel_info for activity 16
const getFuelInfo = (attributes = {}) => ({
  validFlag: "0",
  signalLevel: attributes.io182 || "0",
  softStatus: "0",
  hardFault: attributes.io181 || "0",
  fuelLevel: attributes.io179 || "0",
  rtFuelLevel: attributes.io179 || "0",
  tankTemp: Math.round((attributes.io180 || 0) * 10),
  channel: "1"
});

// Endpoint to receive Traccar events
app.post("/traccar", async (req, res) => {
  let bsmartPayload;
  
  try {
    const traccarData = req.body;
    const attrs = {
      ...(traccarData.attributes || {}),
      ...(traccarData.position?.attributes || {}),
      ...(traccarData.raw_attributes || {})
    };

    const eventCode = parseInt(attrs.event || traccarData.event || 0);
    const dryRun = req.query.dryRun === '1' || String(req.headers['x-dry-run']).toLowerCase() === 'true';

    console.log("📡 Payload received from Traccar:", JSON.stringify(traccarData, null, 2));

    const deviceInfo = traccarData.deviceInfo || {};
    const position = traccarData.position || {};
    const activityIds = getActivityIds(eventCode, { ...attrs, position }, position);

    console.log(`🎯 Activity IDs for event ${eventCode}:`, activityIds);

    const vehicleRegNo = deviceInfo.name || "UNKNOWN";
    const imei = deviceInfo.imei || "UNKNOWN";
    const latitude = Number(position.latitude || traccarData.latitude || 0);
    const longitude = Number(position.longitude || traccarData.longitude || 0);
    const altitude = Number(position.altitude || traccarData.altitude || 0);
    const satCount = attrs.sat || attrs.satellites || 0;
    const hdop = attrs.hdop || 0;
    //const rssi = attrs.rssi || 0;
    const  rssi = 20
    const lac = attrs.io206;
    const cid = attrs.io205;
    
    let mcc = null;
    if (attrs.operator) {
      const op = String(attrs.operator);
      if (op.length >= 3) mcc = op.slice(0, 3);
    }
    mcc = mcc || "640";

    const bearing = position.course || traccarData.course || 0;
    
    // Use sequential message ID for this specific device IMEI
    const baseMessageId = getNextMessageId(imei, eventCode.toString());
    console.log(`🔢 Using sequential message ID for device ${imei}: ${baseMessageId} for event ${eventCode}`);
    
    const tsMillis = new Date(traccarData.deviceTime).getTime();
    const speedKmh = position.speed || 0;

    // Create base item structure
    const baseItem = {
      latitude: latitude,
      longitude: longitude,
      altitude: altitude,
      timestamp: tsMillis,
      horizontal_speed: speedKmh,
      vertical_speed: 0,
      bearing: bearing,
      satellite_count: satCount,
      HDOP: hdop,
      d2d3: "3",
      RSSI: rssi,
      LAC: lac,
      Cell_ID: cid,
      MCC: String(mcc),
    };

    // Create items for each activity ID
    const items = activityIds.map((activityId, index) => {
      const addonInfo = getAddonInfo(activityId, attrs, position);
      const fuelInfo = activityId === 16 ? getFuelInfo(attrs) : null;
      
      // Use baseMessageId + index for multiple activities from same event
      const messageIdForItem = baseMessageId + index;
      
      return {
        ...baseItem,
        MGS_ID: messageIdForItem.toString(),
        activity_id: String(activityId),
        ...(addonInfo && { addon_info: addonInfo }),
        ...(fuelInfo && { fuel_info: fuelInfo })
      };
    });

    bsmartPayload = {
      vehicle_reg_no: vehicleRegNo,
      type: "poi",
      imei: imei,
      items: items
    };

    console.log("🚀 Payload generated to be sent to BSMART/Latra:", JSON.stringify(bsmartPayload, null, 2));

    if (dryRun) {
      return res.status(200).json({
        status: "dry-run",
        message: "Constructed payload only; not forwarded",
        received_from_traccar: traccarData,
        outgoing_to_latra: bsmartPayload,
        device_counters: Object.fromEntries(deviceCounters)
      });
    }

    const response = await axios.post(BSMART_API_URL, bsmartPayload, {
      headers: {
        Authorization: `Basic ${BSMART_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      timeout: 60000 // Increased from 100000ms to 60000ms (1 minute)
    });

    console.log("✅ Sent to Latra successfully");
    
    res.status(200).json({
      status: "success",
      message: "Event forwarded to Latra",
      received_from_traccar: traccarData,
      outgoing_to_latra: bsmartPayload,
      latra_response: response.data,
      device_counters: Object.fromEntries(deviceCounters)
    });

  } catch (error) {
    console.error("❌ Error sending to Latra:", error.message);
    
    res.status(500).json({
      status: "error",
      message: "Error forwarding event",
      error: error.message,
      received_from_traccar: req.body,
      outgoing_to_latra: bsmartPayload || null,
      device_counters: Object.fromEntries(deviceCounters)
    });
  }
});

// Health check endpoint with counters status
app.get("/", (_, res) => 
  res.json({
    status: "running",
    message: "Node.js server ready for Traccar events",
    endpoint: "POST /traccar",
    total_devices_tracked: deviceCounters.size,
    reset_events: Array.from(RESET_EVENT_CODES)
  })
);

// Health endpoint for Docker health checks
app.get("/health", (_, res) => 
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    total_devices_tracked: deviceCounters.size
  })
);

// Endpoint to check all device counters
app.get("/counters", (_, res) => 
  res.json({
    total_devices: deviceCounters.size,
    device_counters: Object.fromEntries(deviceCounters)
  })
);

// Endpoint to check specific device counter
app.get("/counters/:imei", (req, res) => {
  const imei = req.params.imei;
  const counter = deviceCounters.get(imei);
  
  if (counter === undefined) {
    return res.status(404).json({
      status: "not_found",
      message: `No counter found for device IMEI: ${imei}`
    });
  }
  
  res.json({
    imei: imei,
    current_counter: counter
  });
});

// Endpoint to manually reset counter for specific device
app.post("/counters/:imei/reset", (req, res) => {
  const imei = req.params.imei;
  deviceCounters.set(imei, 1);
  
  res.json({
    status: "success",
    message: `Message counter reset to 1 for device ${imei}`,
    imei: imei,
    current_counter: 1
  });
});

// Endpoint to reset all counters
app.post("/counters/reset", (_, res) => {
  deviceCounters.clear();
  res.json({
    status: "success",
    message: "All device counters reset",
    total_devices: 0
  });
});

app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
