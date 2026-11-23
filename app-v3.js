const RSVP_WEBHOOK_URL = "";
const STORAGE_KEY = "senior_fest_2027_rsvps";
const PREFS_KEY = "senior_fest_2027_scale";

document.addEventListener("DOMContentLoaded", () => {
  initTextSizeCycle();
  initCountdown();
  initTabs();
  initRsvpForm();
  initOrganizerModal();
});

function initTextSizeCycle() {
  const html = document.documentElement;
  const btn = document.getElementById("text-size-btn");
  const steps = [
    { key: "standard", label: "Aa 100%" },
    { key: "large", label: "Aa 115%" },
    { key: "xlarge", label: "Aa 130%" }
  ];

  let idx = 0;
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    const found = steps.findIndex((s) => s.key === saved);
    if (found >= 0) idx = found;
  } catch (_) {}

  applyStep(idx);

  if (btn) {
    btn.addEventListener("click", () => {
      idx = (idx + 1) % steps.length;
      applyStep(idx);
      try {
        localStorage.setItem(PREFS_KEY, steps[idx].key);
      } catch (_) {}
    });
  }

  function applyStep(i) {
    html.setAttribute("data-font-scale", steps[i].key);
    if (btn) btn.textContent = steps[i].label;
  }
}

function initCountdown() {
  const display = document.getElementById("countdown-display");
  if (!display) return;

  const eventDate = new Date("2027-05-08T11:00:00-03:00").getTime();

  function update() {
    const diff = eventDate - Date.now();
    if (diff <= 0) {
      display.innerHTML = "<span>LIVE TODAY · 11 AM – 7 PM</span>";
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);

    display.innerHTML = `
      <span>${days}<small>D</small></span>
      <span>${hours}<small>H</small></span>
      <span>${mins}<small>M</small></span>
    `;
  }

  update();
  setInterval(update, 60000);
}

function initTabs() {
  const btns = document.querySelectorAll(".tab-btn");
  const rows = document.querySelectorAll(".set-row");

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const filter = btn.dataset.filter;
      btns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      rows.forEach((row) => {
        row.hidden = !(filter === "all" || row.dataset.category === filter);
      });
    });
  });
}

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
      errorBox.textContent = "Enter your name or group name.";
      errorBox.hidden = false;
      document.getElementById("guest-name").focus();
      return;
    }

    if (!phone && !email) {
      errorBox.textContent = "Enter a phone number or email address.";
      errorBox.hidden = false;
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
      window: formData.get("window") || "All Day",
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
      } catch (_) {}
    }

    confName.textContent = record.name;
    confCode.textContent = record.code;
    form.hidden = true;
    confirmation.hidden = false;
  });

  if (printBtn) printBtn.addEventListener("click", () => window.print());

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      form.reset();
      confirmation.hidden = true;
      form.hidden = false;
      document.getElementById("guest-name").focus();
    });
  }
}

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

    const headers = ["Code", "SubmittedAt", "Name", "Phone", "Email", "Guests", "Window", "Shuttle", "Wheelchair", "Bus", "Song"];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = rsvps.map((r) =>
      [r.code, r.submittedAt, r.name, r.phone, r.email, r.guests, r.window, r.shuttleInterest, r.loanerWheelchair, r.groupBus, r.songRequest]
        .map(esc)
        .join(",")
    );

    const blob = new Blob([[headers.join(","), ...rows].join("\r\n")], { type: "text/csv;charset=utf-8;" });
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
      tableContainer.innerHTML = "<p>No RSVPs saved on this device yet.</p>";
      return;
    }

    const esc = (s) => {
      const d = document.createElement("div");
      d.textContent = String(s ?? "");
      return d.innerHTML;
    };

    tableContainer.innerHTML = `
      <table class="rsvp-table">
        <thead><tr><th>Code</th><th>Name</th><th>Contact</th><th>Guests</th><th>Wave</th></tr></thead>
        <tbody>${rsvps.map((r) => `<tr><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td>${esc(r.phone || r.email)}</td><td>${esc(r.guests)}</td><td>${esc(r.window)}</td></tr>`).join("")}</tbody>
      </table>
    `;
  }
}
