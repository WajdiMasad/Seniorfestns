const SCALE_KEY = "senior_fest_scale";
const STORAGE_KEY = "senior_fest_2027_rsvps";

document.addEventListener("DOMContentLoaded", () => {
  initScaleToggle();
  initScheduleFilter();
  initRsvpForm();
});

function initScaleToggle() {
  const html = document.documentElement;
  const btn = document.getElementById("scale-toggle");
  const steps = [
    { key: "normal", label: "Text 100%" },
    { key: "large", label: "Text 112%" },
    { key: "xlarge", label: "Text 125%" }
  ];

  let idx = 0;
  try {
    const saved = localStorage.getItem(SCALE_KEY);
    const found = steps.findIndex((s) => s.key === saved);
    if (found >= 0) idx = found;
  } catch (_) {}

  apply(idx);

  if (btn) {
    btn.addEventListener("click", () => {
      idx = (idx + 1) % steps.length;
      apply(idx);
      try {
        localStorage.setItem(SCALE_KEY, steps[idx].key);
      } catch (_) {}
    });
  }

  function apply(i) {
    html.setAttribute("data-scale", steps[i].key);
    if (btn) btn.textContent = steps[i].label;
  }
}

function initScheduleFilter() {
  const radios = document.querySelectorAll('input[name="bill-filter"]');
  const rows = document.querySelectorAll("#bill-rows tr");

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const val = radio.value;
      rows.forEach((row) => {
        row.hidden = !(val === "all" || row.dataset.kind === val);
      });
    });
  });
}

function initRsvpForm() {
  const form = document.querySelector("form[data-endpoint]");
  if (!form) return;

  const nameInput = document.getElementById("guest-name");
  const phoneInput = document.getElementById("guest-phone");
  const emailInput = document.getElementById("guest-email");
  const statusEl = document.getElementById("rsvp-status");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();

    nameInput.removeAttribute("aria-invalid");
    phoneInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");

    if (!name) {
      nameInput.setAttribute("aria-invalid", "true");
      nameInput.setAttribute("aria-describedby", "rsvp-status");
      statusEl.textContent = "Enter your full name or your residence group name.";
      nameInput.focus();
      return;
    }

    if (!phone && !email) {
      phoneInput.setAttribute("aria-invalid", "true");
      phoneInput.setAttribute("aria-describedby", "rsvp-status");
      statusEl.textContent = "Include either a phone number or an email address so we can reach you with event updates.";
      phoneInput.focus();
      return;
    }

    if (email && !emailInput.checkValidity()) {
      emailInput.setAttribute("aria-invalid", "true");
      emailInput.setAttribute("aria-describedby", "rsvp-status");
      statusEl.textContent = "That email address looks incomplete. Write it as name@example.ca.";
      emailInput.focus();
      return;
    }

    const endpoint = form.dataset.endpoint;
    if (!endpoint) {
      try {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const fd = new FormData(form);
        list.push({
          savedAt: new Date().toISOString(),
          name,
          phone,
          email,
          guests: fd.get("guests"),
          wave: fd.get("wave"),
          shuttle: fd.get("shuttle") ? "yes" : "no",
          bus: fd.get("bus") ? "yes" : "no",
          wheelchair: fd.get("wheelchair") ? "yes" : "no",
          song: (fd.get("song") || "").toString().trim()
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch (_) {}
      statusEl.textContent = "Nothing was sent over the network yet because no form endpoint is connected.";
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.setAttribute("aria-busy", "true");

    fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
      .then((r) => {
        if (submitBtn) submitBtn.removeAttribute("aria-busy");
        statusEl.textContent = r.ok
          ? "Recorded for " + name + ". Mention your name at the welcome desk on May 8."
          : "That request did not go through. Try again in a minute.";
        if (r.ok) form.reset();
      })
      .catch(() => {
        if (submitBtn) submitBtn.removeAttribute("aria-busy");
        statusEl.textContent = "That request did not go through. Try again in a minute.";
      });
  });
}
