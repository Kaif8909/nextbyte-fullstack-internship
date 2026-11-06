// Run before styles load so saved and system themes apply without a light flash.
(() => {
  const key = "crescent.theme.v1";
  const options = ["light", "dark", "system"];
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = "system";

  function readPreference() {
    try {
      const saved = localStorage.getItem(key);
      return options.includes(saved) ? saved : "system";
    } catch {
      return "system";
    }
  }

  function apply() {
    const theme =
      preference === "system"
        ? system.matches
          ? "dark"
          : "light"
        : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#161815" : "#f7f6f2");
    const select = document.getElementById("theme-select");
    if (select) select.value = preference;
  }

  preference = readPreference();
  apply();
  system.addEventListener("change", () => {
    if (preference === "system") apply();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      preference = readPreference();
      apply();
    }
  });

  window.CrescentTheme = {
    init() {
      const select = document.getElementById("theme-select");
      if (!select) return;
      apply();
      select.addEventListener("change", () => {
        if (!options.includes(select.value)) return;
        preference = select.value;
        try {
          localStorage.setItem(key, preference);
        } catch {
          // The selection still works for this page if storage is restricted.
        }
        apply();
      });
    },
  };
})();
