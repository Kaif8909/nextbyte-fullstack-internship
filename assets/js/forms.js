// Shared, progressively enhanced form validation. Native constraints remain the
// source of truth; inline feedback and a linked summary add accessible recovery.
const initialized = new WeakSet();

function fieldName(field) {
  const label = field.labels?.[0];
  const text =
    label &&
    [...label.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(" ")
      .trim();
  return text || field.name || "This field";
}

function messageFor(field) {
  const value = field.value.trim();
  const name = fieldName(field);
  if (field.type === "checkbox") {
    return field.required && !field.checked
      ? "Confirm that you understand this is a demo booking."
      : "";
  }
  if (field.validity.badInput) return `Enter a valid ${name.toLowerCase()}.`;
  if (field.required && !value) return `${name} is required.`;
  if (!value) return "";
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    return "Enter a valid email address, such as you@example.com.";
  if (
    field.type === "tel" &&
    (!/^[+\d().\s-]+$/.test(value) || value.replace(/\D/g, "").length < 7)
  )
    return "Enter a phone number with at least 7 digits, including your country code.";
  const minimum = Number(field.getAttribute("minlength"));
  if (minimum && value.length < minimum)
    return `${name} must contain at least ${minimum} characters.`;
  if (field.validity.rangeUnderflow)
    return field.type === "date"
      ? "Choose today or a future date."
      : `${name} must be at least ${field.min}.`;
  if (field.validity.rangeOverflow)
    return `${name} must be no more than ${field.max}.`;
  if (field.validity.stepMismatch)
    return `Enter a whole number for ${name.toLowerCase()}.`;
  if (!field.validity.valid)
    return `Check ${name.toLowerCase()} and try again.`;
  return "";
}

function setFeedback(field, message) {
  field.setAttribute("aria-invalid", String(Boolean(message)));
  document.getElementById(`${field.id}-error`).textContent = message;
}

export function initFormValidation(form) {
  if (!form || initialized.has(form)) return;
  initialized.add(form);
  const fields = [...form.querySelectorAll("input, textarea, select")].filter(
    (field) =>
      !["radio", "submit", "button", "hidden", "file"].includes(field.type),
  );
  const hints = {
    "customer-email":
      "Saved with your demo ticket in this browser. No email is sent.",
    "customer-phone": "Include your country code, for example +92 300 1234567.",
    "event-date": "The experience starts at 7:00 PM Pakistan time.",
    "event-capacity": "The total number of demo tickets available.",
    "event-price": "Enter 0 for free admission. Prices are in PKR.",
  };
  const touched = new Set();
  const summary = document.createElement("div");
  summary.className = "error-summary";
  summary.id = `${form.id}-summary`;
  summary.tabIndex = -1;
  summary.hidden = true;
  summary.setAttribute("role", "alert");
  summary.setAttribute("aria-labelledby", `${form.id}-summary-heading`);
  form.prepend(summary);

  fields.forEach((field, index) => {
    field.id ||= `${form.id}-${field.name || index}`;
    const error = document.createElement("span");
    error.id = `${field.id}-error`;
    error.className = "field-error";
    (field.type === "checkbox"
      ? field.closest("label")
      : field
    ).insertAdjacentElement("afterend", error);
    const description = [
      field.getAttribute("aria-describedby"),
      error.id,
    ].filter(Boolean);
    if (hints[field.id]) {
      const hint = document.createElement("span");
      hint.className = "field-help";
      hint.id = `${field.id}-hint`;
      hint.textContent = hints[field.id];
      error.insertAdjacentElement("beforebegin", hint);
      description.push(hint.id);
    }
    field.setAttribute("aria-describedby", description.join(" "));
    field.addEventListener("blur", () => {
      touched.add(field);
      setFeedback(field, messageFor(field));
    });
    field.addEventListener("input", () => {
      if (touched.has(field)) setFeedback(field, messageFor(field));
      if (!summary.hidden) updateSummary();
    });
  });

  function updateSummary() {
    const errors = fields.filter((field) => messageFor(field));
    summary.replaceChildren();
    summary.hidden = !errors.length;
    if (!errors.length) return;
    const heading = document.createElement("h2");
    heading.id = `${form.id}-summary-heading`;
    heading.textContent = "A few details need your attention";
    const list = document.createElement("ul");
    errors.forEach((field) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `#${field.id}`;
      link.textContent = messageFor(field);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        field.focus();
      });
      item.append(link);
      list.append(item);
    });
    summary.append(heading, list);
  }

  form.noValidate = true;
  form.addEventListener(
    "submit",
    (event) => {
      fields.forEach((field) => {
        touched.add(field);
        setFeedback(field, messageFor(field));
      });
      updateSummary();
      if (!summary.hidden) {
        event.preventDefault();
        event.stopImmediatePropagation();
        summary.focus();
      }
    },
    true,
  );
  form.addEventListener("reset", () => {
    touched.clear();
    summary.hidden = true;
    fields.forEach((field) => {
      field.removeAttribute("aria-invalid");
      document.getElementById(`${field.id}-error`).textContent = "";
    });
  });
}
