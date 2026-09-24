document.querySelectorAll("[data-sls-inquiry]").forEach((form) => {
  const button = form.querySelector('[type="submit"]');
  const status = form.querySelector("[data-form-status]");
  const availability = form.querySelector("[data-form-availability]");
  const readyLabel = button.textContent;
  const showStatus = (message, success) => {
    status.hidden = false;
    status.textContent = message;
    status.classList.toggle("is-error", !success);
    status.focus();
  };

  button.disabled = true;
  fetch("/api/inquiries", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Not configured");
      button.disabled = false;
      if (availability) availability.hidden = true;
    })
    .catch(() => {
      if (availability) availability.hidden = false;
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const kind = form.dataset.slsInquiry;
    const name = kind === "valuation"
      ? [data.firstName, data.lastName].join(" ").trim()
      : data.name;
    const payload = {
      ...data,
      kind,
      name,
      propertyType: data.propertyType || data.type || "",
      city: data.city || data.place || "",
      consent: data.privacy === "on"
    };
    delete payload.privacy;
    delete payload.firstName;
    delete payload.lastName;
    delete payload.type;
    delete payload.place;

    button.disabled = true;
    button.textContent = "Wird übermittelt …";
    status.hidden = true;
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Delivery failed");
      form.reset();
      showStatus("Vielen Dank! Ihre Anfrage ist bei SLS eingegangen. Wir melden uns persönlich bei Ihnen.", true);
    } catch {
      showStatus("Ihre Anfrage konnte nicht übermittelt werden. Ihre Eingaben bleiben erhalten. Bitte versuchen Sie es erneut oder rufen Sie uns unter 02369 742 80 20 an.", false);
    } finally {
      button.disabled = false;
      button.textContent = readyLabel;
    }
  });
});
