/**
 * Senior Fest 2027 — Landing Page & Optional RSVP Script
 * Optional: Paste a Formspree, Make, or Google Apps Script URL below when deploying online.
 */
const RSVP_WEBHOOK_URL = "";
const STORAGE_KEY = "senior_fest_2027_rsvps";
const PREFS_KEY = "senior_fest_2027_a11y";

document.addEventListener("DOMContentLoaded", () => {
  initAccessibilityControls();
  initCountdown();
  initScheduleFilters();
  initRsvpForm();
  initOrganizerModal();
});

/* 1. Text Size & High Contrast Controls */
function initAccessibilityControls() {
  const html = document.documentElement;
  const scaleButtons = document.querySelectorAll(".a11y-btn[data-scale]");
  const contrastBtn = document.getElementById("contrast-toggle");

  let savedPrefs = { scale: "standard", contrast: "standard" };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) savedPrefs = { ...savedPrefs, ...JSON.parse(raw) };
  } catch (_) {}

  applyPrefs(savedPrefs);

  scaleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      savedPrefs.scale = btn.dataset.scale;
      applyPrefs(savedPrefs);
      savePrefs(savedPrefs);
    });
  });

  if (contrastBtn) {
    contrastBtn.addEventListener("click", () => {
      savedPrefs.contrast = savedPrefs.contrast === "high" ? "standard" : "high";
      applyPrefs(savedPrefs);
      savePrefs(savedPrefs);
    });
  }

  function applyPrefs(prefs) {
    html.setAttribute("data-font-scale", prefs.scale);
    html.setAttribute("data-contrast", prefs.contrast);
    scaleButtons.forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.scale === prefs.scale));
    });
    if (contrastBtn) {
      contrastBtn.setAttribute("aria-pressed", String(prefs.contrast === "high"));
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_) {}
  }
}

/* 2. Countdown to May 8, 2027 11:00 AM ADT (Halifax) */
function initCountdown() {
  const display = document.getElementById("countdown-display");
  if (!display) return;

  const eventDate = new Date("2027-05-08T11:00:00-03:00").getTime();

  function update() {
    const now = Date.now();
    const diff = eventDate - now;

    if (diff <= 0) {
      display.innerHTML = "<span><strong>Today!</strong><small>11 AM – 7 PM</small></span>";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    display.innerHTML = `
      <span><strong>${days}</strong><small>Days</small></span>
      <span><strong>${hours}</strong><small>Hours</small></span>
      <span><strong>${mins}</strong><small>Mins</small></span>
    `;
  }

  update();
  setInterval(update, 60000);
}

/* 3. Interactive Schedule Filter */
function initScheduleFilters() {
  const filterBtns = document.querySelectorAll(".filter-btn");
  const items = document.querySelectorAll(".schedule-item");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));

      items.forEach((item) => {
        if (filter === "all" || item.dataset.category === filter) {
          item.hidden = false;
        } else {
          item.hidden = true;
        }
      });
    });
  });
}

/* 4. Optional Free RSVP Handling */
function getStoredRsvps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (_) {
    return [];
  }
}

function saveRsvpRecord(record) {
  const list = getStoredRsvps();
  list.push(record);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
  updateBadgeCount();
}

function updateBadgeCount() {
  const badge = document.getElementById("rsvp-count-badge");
  if (badge) badge.textContent = String(getStoredRsvps().length);
}

function initRsvpForm() {
  const form = document.getElementById("rsvp-form");
  const errorBox = document.getElementById("form-error");
  const confirmation = document.getElementById("rsvp-confirmation");
  const confName = document.getElementById("conf-name");
  const confCode = document.getElementById("conf-code");
  const printBtn = document.getElementById("print-pass-btn");
  const resetBtn = document.getElementById("reset-rsvp-btn");

  updateBadgeCount();
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    const formData = new FormData(form);
    const name = (formData.get("name") || "").toString().trim();
    const phone = (formData.get("phone") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();

    if (!name) {
      showError("Please enter your name (or your group's name) so we can welcome you at the door.");
      document.getElementById("guest-name").focus();
      return;
    }

    if (!phone && !email) {
      showError("Please include either a phone number or an email address in case of event updates.");
      document.getElementById("guest-phone").focus();
      return;
    }

    const code = "SF27-" + Math.floor(1000 + Math.random() * 9000);
    const record = {
      code,
      submittedAt: new Date().toISOString(),
      name,
      phone,
      email,
      guests: formData.get("guests") || "1",
      window: formData.get("window") || "All Day / Flexible",
      shuttleInterest: formData.get("shuttleInterest") ? "Yes" : "No",
      loanerWheelchair: formData.get("loanerWheelchair") ? "Yes" : "No",
      groupBus: formData.get("groupBus") ? "Yes" : "No",
      songRequest: (formData.get("songRequest") || "").toString().trim()
    };

    saveRsvpRecord(record);

    if (RSVP_WEBHOOK_URL) {
      try {
        await fetch(RSVP_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(record)
        });
      } catch (_) {
        // Keep local confirmation resilient even if offline
      }
    }

    confName.textContent = record.name;
    confCode.textContent = record.code;
    form.hidden = true;
    confirmation.hidden = false;
  });

  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form.reset();
      confirmation.hidden = true;
      form.hidden = false;
      document.getElementById("guest-name").focus();
    });
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }
}

/* 5. Organizer RSVP Check-In & CSV Export Modal */
function initOrganizerModal() {
  const modal = document.getElementById("organizer-modal");
  const openBtn = document.getElementById("open-organizer-modal");
  const closeBtn = document.getElementById("close-organizer-modal");
  const exportBtn = document.getElementById("export-csv-btn");
  const tableContainer = document.getElementById("organizer-table-container");

  if (!modal || !openBtn) return;

  openBtn.addEventListener("click", () => {
    renderTable();
    modal.hidden = false;
  });

  closeBtn.addEventListener("click", () => {
    modal.hidden = true;
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  exportBtn.addEventListener("click", () => {
    const rsvps = getStoredRsvps();
    if (!rsvps.length) return;

    const headers = [
      "Code",
      "SubmittedAt",
      "Name",
      "Phone",
      "Email",
      "Guests",
      "ArrivalWindow",
      "ShuttleInterest",
      "LoanerWheelchair",
      "GroupBus",
      "SongRequest"
    ];

    const escapeCsv = (val) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = rsvps.map((r) =>
      [
        r.code,
        r.submittedAt,
        r.name,
        r.phone,
        r.email,
        r.guests,
        r.window,
        r.shuttleInterest,
        r.loanerWheelchair,
        r.groupBus,
        r.songRequest
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "senior-fest-2027-rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
  });

  function renderTable() {
    const rsvps = getStoredRsvps();
    if (!rsvps.length) {
      tableContainer.innerHTML = "<p><em>No RSVPs saved on this device yet.</em></p>";
      return;
    }

    const rowsHtml = rsvps
      .map(
        (r) => `
        <tr>
          <td><strong>${escapeHtml(r.code)}</strong></td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.phone || r.email)}</td>
          <td>${escapeHtml(r.guests)}</td>
          <td>${escapeHtml(r.window)}</td>
          <td>${escapeHtml(r.songRequest || "—")}</td>
        </tr>`
      )
      .join("");

    tableContainer.innerHTML = `
      <table class="rsvp-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Contact</th>
            <th>Guests</th>
            <th>Window</th>
            <th>Prom Song</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }
}
