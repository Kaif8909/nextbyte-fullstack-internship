export function animate() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loader = document.getElementById("brand-loader");
  if (loader) {
    let seen = true;
    try {
      seen = sessionStorage.getItem("crescent.intro") === "1";
      sessionStorage.setItem("crescent.intro", "1");
    } catch {}
    if (seen || reduced) loader.remove();
    else {
      loader.classList.add("play");
      const close = () => {
        loader.classList.add("depart");
        setTimeout(() => loader.remove(), 650);
      };
      setTimeout(close, 1500);
      setTimeout(() => loader.remove(), 3000);
    }
  }
  if (reduced) return;
  const g = window.gsap;
  if (g) {
    if (document.querySelector(".hero h1"))
      g.from(".hero h1", {
        y: 45,
        opacity: 0,
        duration: 1.1,
        ease: "power3.out",
        delay: loader?.isConnected ? 0.9 : 0.05,
      });
    if (document.querySelector(".hero-aside"))
      g.from(".hero-aside", { y: 18, opacity: 0, duration: 0.9, delay: 0.4 });
    if (document.querySelector(".hero-photo img"))
      g.from(".hero-photo img", {
        scale: 1.08,
        duration: 1.8,
        ease: "power2.out",
      });
    if (document.querySelector(".success-mark"))
      g.from(".success-mark", {
        scale: 0.4,
        rotation: -30,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.6)",
      });
  }
  const heroImage = document.querySelector(".hero-photo > img");
  if (g && heroImage) {
    // A small amount of overscan keeps the image edges covered during parallax.
    heroImage.style.height = "calc(100% + 36px)";
    heroImage.style.top = "-18px";
    const setY = g.quickSetter(heroImage, "y", "px");
    let queued = false;
    window.addEventListener(
      "scroll",
      () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          setY(Math.min(window.scrollY, 600) * 0.025);
          queued = false;
        });
      },
      { passive: true },
    );
  }
}
