// =======================================
// CONFIG
// =======================================

/* LOCAL TESTING
const ws = new WebSocket(
  `ws://${window.location.host}`
);
*/


//FOR RENDER DEPLOYMENT LATER:

const ws = new WebSocket(
  "wss://barcode-backend-cegj.onrender.com"
);


// =======================================
// ELEMENTS
// =======================================

const occBox =
  document.getElementById("occ-box");

const currentStat =
  document.getElementById("current-stat");

const peakStat =
  document.getElementById("peak-stat");

const scanStat =
  document.getElementById("scan-stat");

const statusText =
  document.getElementById("status-text");

const lastUpdated =
  document.getElementById("last-updated");

const lastCode =
  document.getElementById("last-code");

const lastAction =
  document.getElementById("last-action");

const lastScanTime =
  document.getElementById("last-scan-time");

const scannerStatus =
  document.getElementById("scanner-status");

const activityFeed =
  document.getElementById("activity-feed");

const connectionStatus =
  document.getElementById(
    "connection-status"
  );

const themeSelector =
  document.getElementById(
    "themeSelector"
  );

// =======================================
// THEME SWITCHER
// =======================================

const savedTheme =
  localStorage.getItem("theme");

if (savedTheme) {
  document.body.className =
    savedTheme;

  themeSelector.value =
    savedTheme;
}

themeSelector.addEventListener(
  "change",
  (e) => {
    document.body.className =
      e.target.value;

    localStorage.setItem(
      "theme",
      e.target.value
    );
  }
);

// =======================================
// CONNECTION STATUS
// =======================================

ws.onopen = () => {
  connectionStatus.innerHTML = `
    <span class="status-dot"></span>
    Connected
  `;
};

ws.onclose = () => {
  connectionStatus.innerHTML = `
    <span class="status-dot"
      style="background:#ef4444">
    </span>
    Disconnected
  `;
};

ws.onerror = () => {
  connectionStatus.innerHTML = `
    <span class="status-dot"
      style="background:#ef4444">
    </span>
    Error
  `;
};

// =======================================
// HELPERS
// =======================================

function updateCrowdStatus(
  occupancy
) {
  statusText.classList.remove(
    "status-high",
    "status-medium",
    "status-low"
  );

  if (occupancy > 3) {
    statusText.textContent =
      "🔴 Highly Crowded";

    statusText.classList.add(
      "status-high"
    );
  } else if (occupancy > 2) {
    statusText.textContent =
      "🟠 Moderately Crowded";

    statusText.classList.add(
      "status-medium"
    );
  } else {
    statusText.textContent =
      "🟢 Less Crowded";

    statusText.classList.add(
      "status-low"
    );
  }
}

function formatTime(ts) {
  return new Date(
    ts
  ).toLocaleString();
}

function renderActivity(
  activity
) {
  if (
    !activity ||
    activity.length === 0
  ) {
    activityFeed.innerHTML = `
      <div class="empty-state">
        No scans yet
      </div>
    `;

    return;
  }

  activityFeed.innerHTML = "";

  activity.forEach((scan) => {
    const item =
      document.createElement(
        "div"
      );

    item.className =
      "activity-item";

    item.innerHTML = `
      <div>
        <strong>
          ${scan.code}
        </strong>
      </div>

      <div class="${
        scan.action === "enter"
          ? "activity-enter"
          : "activity-exit"
      }">

        ${
          scan.action === "enter"
            ? "ENTER"
            : "EXIT"
        }

      </div>
    `;

    activityFeed.appendChild(
      item
    );
  });
}

function updateLastScan(
  scan
) {
  if (!scan) return;

  lastCode.textContent =
    scan.code;

  lastAction.textContent =
    scan.action.toUpperCase();

  lastScanTime.textContent =
    formatTime(scan.ts);

  scannerStatus.textContent =
    `Last scan received (${scan.action})`;
}

function updateStats(
  stats
) {
  currentStat.textContent =
    stats.occupancy;

  occBox.textContent =
    stats.occupancy;

  peakStat.textContent =
    stats.peakOccupancy;

  scanStat.textContent =
    stats.totalScans;

  updateCrowdStatus(
    stats.occupancy
  );

  if (stats.lastScan) {
    updateLastScan(
      stats.lastScan
    );

    lastUpdated.textContent =
      "Last Updated: " +
      formatTime(
        stats.lastScan.ts
      );
  }

  renderActivity(
    stats.recentActivity
  );
}

// =======================================
// WEBSOCKET EVENTS
// =======================================

ws.onmessage = (
  event
) => {
  let data;

  try {
    data = JSON.parse(
      event.data
    );
  } catch (err) {
    console.error(
      "Invalid WS message",
      err
    );

    return;
  }

  // ===================
  // INIT
  // ===================

  if (
    data.type === "init"
  ) {
    updateStats(
      data.payload
    );

    return;
  }

  // ===================
  // STATS
  // ===================

  if (
    data.type === "stats"
  ) {
    updateStats(
      data.payload
    );

    return;
  }

  // ===================
  // OCCUPANCY EVENT
  // ===================

  if (
    data.type ===
    "occupancy"
  ) {
    const scan =
      data.payload;

    updateLastScan(
      scan
    );

    lastUpdated.textContent =
      "Last Updated: " +
      formatTime(
        scan.ts
      );
  }
};

// =======================================
// BARCODE SCANNER INPUT
// =======================================

let buffer = "";

let lastTime =
  Date.now();

let lastScanTimestamp = 0;

const SCAN_COOLDOWN = 350;

window.addEventListener(
  "keydown",
  (e) => {
    const now =
      Date.now();

    if (
      now - lastTime >
      200
    ) {
      buffer = "";
    }

    lastTime = now;

    if (
      e.key === "Enter"
    ) {
      if (
        now -
          lastScanTimestamp <
        SCAN_COOLDOWN
      ) {
        buffer = "";

        return;
      }

      lastScanTimestamp =
        now;

      if (
        buffer.length > 0
      ) {
        fetch(
          "/scan",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  code: buffer,
                }
              ),
          }
        ).catch(
          (err) => {
            console.error(
              err
            );
          }
        );
      }

      buffer = "";
    }

    else if (
      e.key.length ===
      1
    ) {
      buffer += e.key;
    }
  }
);