(() => {
  const addSwipeNavigation = (root, { onNext, onPrev }) => {
    if (!(root instanceof HTMLElement)) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const THRESH_X = 45;
    const THRESH_Y = 55;

    const onStart = (x, y) => {
      startX = x;
      startY = y;
      tracking = true;
    };

    const onEnd = (x, y) => {
      if (!tracking) return;
      tracking = false;

      const dx = x - startX;
      const dy = y - startY;

      // Ignore mostly-vertical gestures (scroll).
      if (Math.abs(dy) > THRESH_Y && Math.abs(dy) > Math.abs(dx)) return;
      if (Math.abs(dx) < THRESH_X) return;

      if (dx < 0) onNext?.();
      else onPrev?.();
    };

    root.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        onStart(t.clientX, t.clientY);
      },
      { passive: true }
    );

    root.addEventListener(
      "touchend",
      (e) => {
        const t = e.changedTouches?.[0];
        if (!t) return;
        onEnd(t.clientX, t.clientY);
      },
      { passive: true }
    );
  };

  const setYear = () => {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  };

  const syncNavbarHeightVar = () => {
    const nav = document.getElementById("mainNav");
    if (!(nav instanceof HTMLElement)) return;
    document.documentElement.style.setProperty("--nav-h", `${nav.offsetHeight}px`);
  };

  const wireVideoDiagnostics = () => {
    const video = document.getElementById("videoTest");
    const status = document.getElementById("videoTestStatus");
    if (!(video instanceof HTMLVideoElement) || !(status instanceof HTMLElement)) return;

    const canH264 = video.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
    const canMp4 = video.canPlayType("video/mp4");
    status.textContent = `canPlayType(mp4)=${canMp4 || "''"} | canPlayType(h264/aac)=${canH264 || "''"}`;

    const renderErr = (label) => {
      const err = video.error;
      status.textContent =
        `${label}. ` +
        `src=${video.currentSrc || "(none)"} | ` +
        `networkState=${video.networkState} | readyState=${video.readyState} | ` +
        `errorCode=${err ? err.code : "n/a"}`;
    };

    video.addEventListener("loadeddata", () => {
      status.textContent = `loadeddata ✓ src=${video.currentSrc}`;
    });
    video.addEventListener("canplay", () => {
      status.textContent = `canplay ✓ src=${video.currentSrc}`;
    });
    video.addEventListener("error", () => renderErr("error"));
    video.addEventListener("stalled", () => renderErr("stalled"));
  };

  const setActiveNavLink = (hash) => {
    const nav = document.getElementById("mainNav");
    if (!nav) return;

    const links = nav.querySelectorAll('a.nav-link[href^="#"]');
    links.forEach((a) => {
      if (!(a instanceof HTMLAnchorElement)) return;
      const isActive = a.getAttribute("href") === hash;
      a.classList.toggle("active", isActive);
      a.setAttribute("aria-current", isActive ? "page" : "false");
    });
  };

  const wireSmoothScroll = () => {
    document.addEventListener("click", (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      // Special-case: "Our Works" should scroll to the slide viewport anchor,
      // but nav highlighting should remain tied to the real #works section.
      const target =
        href === "#works" ? document.getElementById("works-view") : document.querySelector(href);
      if (!(target instanceof HTMLElement)) return;
      e.preventDefault();

      const navEl = document.getElementById("mainNav");
      const navH = navEl instanceof HTMLElement ? navEl.getBoundingClientRect().height : 72;
      const y = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top: y, behavior: "smooth" });

      const nav = document.getElementById("navbarContent");
      if (nav && nav.classList.contains("show")) {
        const toggler = document.querySelector(".navbar-toggler");
        if (toggler instanceof HTMLElement) toggler.click();
      }

      // Keep nav highlighting responsive immediately on click.
      setActiveNavLink(href);
    });
  };

  const wireSectionObservers = () => {
    const nav = document.getElementById("mainNav");
    if (!(nav instanceof HTMLElement)) return;

    const links = Array.from(nav.querySelectorAll('a.nav-link[href^="#"]')).filter(
      (a) => a instanceof HTMLAnchorElement
    );
    const ids = links
      .map((a) => (a instanceof HTMLAnchorElement ? a.getAttribute("href") : null))
      .filter((h) => typeof h === "string" && h.startsWith("#") && h.length > 1)
      .map((h) => h.slice(1));

    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el) => el instanceof HTMLElement);

    if (!sections.length) return;

    let currentActiveId = null;
    let ticking = false;

    const computeActive = () => {
      ticking = false;

      const navH = nav.getBoundingClientRect().height || 0;
      const y = window.scrollY + navH + 8; // small buffer below the navbar

      // Pick the last section whose top is above the navbar line.
      let best = sections[0];
      for (const s of sections) {
        if (!(s instanceof HTMLElement)) continue;
        if (s.offsetTop <= y) best = s;
      }

      const id = best?.id ? `#${best.id}` : null;
      if (!id || id === currentActiveId) return;
      currentActiveId = id;
      setActiveNavLink(id);
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(computeActive);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    // Initial highlight on load.
    const initial = window.location.hash && document.getElementById(window.location.hash.slice(1))
      ? window.location.hash
      : `#${sections[0].id}`;
    setActiveNavLink(initial);

    // Ensure correct state even without hash.
    computeActive();
  };

  const wireServicesNavbarTheme = () => {
    const nav = document.getElementById("mainNav");
    const services = document.getElementById("services");
    if (!(nav instanceof HTMLElement) || !(services instanceof HTMLElement)) return;

    const setDark = (isDark) => {
      // White first, then black from Services onwards.
      nav.classList.toggle("nav-solid", isDark);
      nav.classList.toggle("navbar-dark", isDark);
      nav.classList.toggle("navbar--light", !isDark);
      nav.classList.toggle("navbar-light", !isDark);
      // Trigger SVG fill animation via CSS (dark text on white navbar).
      nav.classList.toggle("nav-scrolled", !isDark);
    };

    let last = null;
    let ticking = false;

    const compute = () => {
      ticking = false;

      const navHeight = nav.getBoundingClientRect().height || 0;
      const servicesTop = services.getBoundingClientRect().top + window.scrollY;

      // Black navbar from the Services section onwards.
      const isDark = window.scrollY + navHeight >= servicesTop - 2;
      if (isDark === last) return;
      last = isDark;
      setDark(isDark);
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    compute();
  };

  const wireInlineNavbarLogo = () => {
    const target = document.getElementById("navLogo");
    if (!(target instanceof SVGElement)) return;

    const src = target.getAttribute("data-src");
    if (!src) return;

    // Load external SVG and inject its contents inline so CSS can animate fills.
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load logo: ${r.status}`);
        return r.text();
      })
      .then((svgText) => {
        const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!(svg instanceof SVGElement)) return;

        // Start with the source viewBox, then crop to content bounds so the logo fills the box.
        const vb = svg.getAttribute("viewBox");
        if (vb) target.setAttribute("viewBox", vb);

        // Clear placeholder and import children.
        while (target.firstChild) target.removeChild(target.firstChild);
        Array.from(svg.childNodes).forEach((node) => {
          target.appendChild(document.importNode(node, true));
        });

        // Tag elements based on their fill color so CSS can control them:
        // - red stays red
        // - everything else becomes "dynamic" (animates white -> #191919)
        const paintEls = target.querySelectorAll("path, rect, circle, ellipse, polygon, polyline");
        paintEls.forEach((el) => {
          if (!(el instanceof SVGElement)) return;

          const styleFill = (el.getAttribute("style") || "").match(/fill:\s*([^;]+)/i)?.[1] || "";
          const attrFill = el.getAttribute("fill") || "";
          const fill = String((styleFill || attrFill || "")).trim().toLowerCase();

          // Inkscape traces sometimes include extra "edge/AA" shapes in greys that
          // can show up as faint outlines once we force fills. Remove them.
          const isTraceEdge =
            fill === "#c2c2c2" || fill === "#9e9e9e" || fill === "#575757" || fill === "rgb(194,194,194)" || fill === "rgb(158,158,158)";
          if (isTraceEdge) {
            el.remove();
            return;
          }

          // Normalize common reds used in your assets.
          const isRed = fill === "#ea1f25" || fill === "#e71f25" || fill === "#e81f24";
          if (isRed) {
            el.classList.add("logo-red");
          } else {
            el.classList.add("logo-dynamic");
          }

          // Remove traced strokes that can appear as thin edge lines.
          el.setAttribute("stroke", "none");
        });

        // Crop the viewBox to the actual drawn content so it scales up cleanly.
        requestAnimationFrame(() => {
          try {
            const bbox = target.getBBox();
            if (!bbox || !isFinite(bbox.width) || bbox.width <= 0 || bbox.height <= 0) return;

            const pad = Math.max(2, Math.min(bbox.width, bbox.height) * 0.03); // ~3% padding
            const x = bbox.x - pad;
            const y = bbox.y - pad;
            const w = bbox.width + pad * 2;
            const h = bbox.height + pad * 2;
            target.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
            target.setAttribute("preserveAspectRatio", "xMinYMid meet");
          } catch {
            // getBBox can fail in some edge cases; ignore and keep original viewBox.
          }
        });
      })
      .catch(() => {
        // If load fails, leave the placeholder SVG empty (navbar still works).
      });
  };

  const showVideoWhenReady = (root) => {
    const video = root.querySelector("video.hero-video");
    if (!(video instanceof HTMLVideoElement)) return;

    const fallbackImg = root.querySelector("img.hero-img");

    const enableVideo = () => {
      // Ensure video is visible; fallback fades out.
      video.style.display = "block";
      if (fallbackImg instanceof HTMLImageElement) fallbackImg.style.opacity = "0";
    };

    const disableVideo = () => {
      // Keep fallback visible if video can't load/play.
      if (fallbackImg instanceof HTMLImageElement) fallbackImg.style.opacity = "1";

      // Helpful debug info in DevTools console.
      // Common cause: MP4 encoded with an unsupported codec (e.g. HEVC) for the browser.
      try {
        // eslint-disable-next-line no-console
        console.warn("Hero video failed to load/play.", {
          src: video.currentSrc || video.getAttribute("src"),
          networkState: video.networkState,
          readyState: video.readyState,
          error: video.error ? { code: video.error.code, message: video.error.message } : null,
        });
      } catch {}
    };

    // Some browsers fire loadeddata reliably even when canplay is delayed.
    video.addEventListener("loadeddata", enableVideo, { once: true });
    video.addEventListener("canplay", enableVideo, { once: true });
    video.addEventListener("error", disableVideo, { once: true });

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => disableVideo());
    }
  };

  const pauseOffscreenHeroVideos = () => {
    const carousels = document.querySelectorAll(".hero-carousel");
    carousels.forEach((carousel) => {
      carousel.addEventListener("slide.bs.carousel", (event) => {
        const current = carousel.querySelector(".carousel-item.active video.hero-video");
        if (current instanceof HTMLVideoElement) current.pause();

        const nextItem = event.relatedTarget;
        if (nextItem instanceof HTMLElement) {
          const nextVideo = nextItem.querySelector("video.hero-video");
          if (nextVideo instanceof HTMLVideoElement) {
            const attempt = nextVideo.play();
            if (attempt && typeof attempt.catch === "function") attempt.catch(() => {});
          }
        }
      });
    });
  };

  const wireHomeSlideshow = () => {
    const root = document.getElementById("homeSlideshow");
    if (!(root instanceof HTMLElement)) return;

    const slides = Array.from(root.querySelectorAll(".slide")).filter((el) => el instanceof HTMLElement);
    const nav = root.querySelector(".progress-nav");
    const navItems = Array.from(root.querySelectorAll(".progress-nav__item")).filter((el) => el instanceof HTMLButtonElement);
    const videos = slides.map((s) => s.querySelector("video.hero-video")).map((v) => (v instanceof HTMLVideoElement ? v : null));
    const heroVideo = document.getElementById("homeHeroVideo");
    const labelRoot = document.getElementById("homeLabel");
    const labelText = document.getElementById("homeLabelText");

    if (!slides.length) return;

    let idx = 0;
    let timer = null;
    let leaveTimer = null;
    let paused = false;
    let labelTimer = null;
    let isSwitching = false;
    let remainingMs = 0;
    let nextDueAt = 0;
    const pauseReasons = new Set();

    const FADE_MS = 350; // keep in sync with CSS opacity transition

    const getSlideDurationSeconds = () => {
      const v = videos[idx];
      if (v) {
        const d = v.duration;
        if (Number.isFinite(d) && d > 0.25) return d;
      }
      const active = slides[idx];
      const ms = Number(active?.dataset?.interval);
      if (Number.isFinite(ms) && ms > 0) return ms / 1000;
      return 10;
    };

    const setNavDurationVar = () => {
      if (!(nav instanceof HTMLElement)) return;
      nav.style.setProperty("--slide-duration", `${getSlideDurationSeconds()}s`);
    };

    const resetActiveProgressFill = () => {
      const activeItem = navItems[idx];
      if (!(activeItem instanceof HTMLElement)) return;
      const fill = activeItem.querySelector(".progress-nav__fill");
      if (!(fill instanceof HTMLElement)) return;

      fill.style.animation = "none";
      // eslint-disable-next-line no-unused-expressions
      fill.offsetHeight;
      fill.style.animation = "";
    };

    const setActiveNav = (opts = {}) => {
      const { resetFill = true } = opts;
      navItems.forEach((b, i) => b.classList.toggle("is-active", i === idx));
      setNavDurationVar();
      if (resetFill) resetActiveProgressFill();
    };

    const setHomeLabel = () => {
      if (!(labelRoot instanceof HTMLElement) || !(labelText instanceof HTMLElement)) return;
      const active = slides[idx];
      const mode = active?.dataset?.overlay;
      const title = active?.dataset?.title || "";
      const subtitle = active?.dataset?.subtitle || "";
      const show = mode === "label" && Boolean(title);
      if (labelTimer) window.clearTimeout(labelTimer);

      const currentTitle = (labelText.querySelector(".home-label__title")?.textContent || labelText.textContent || "").trim();
      const currentSubtitle = (labelText.querySelector(".home-label__subtitle")?.textContent || "").trim();

      if (!show) {
        if (!labelRoot.classList.contains("is-visible")) {
          labelText.replaceChildren();
          return;
        }
        labelRoot.classList.add("is-changing");
        labelTimer = window.setTimeout(() => {
          labelRoot.classList.remove("is-visible");
          labelText.replaceChildren();
        }, 110);
        return;
      }

      const apply = () => {
        labelText.replaceChildren();
        if (subtitle) {
          const t = document.createElement("span");
          t.className = "home-label__title";
          t.textContent = title;
          labelText.appendChild(t);

          const s = document.createElement("span");
          s.className = "home-label__subtitle";
          s.textContent = subtitle;
          labelText.appendChild(s);
          return;
        }
        labelText.textContent = title;
      };

      labelRoot.classList.add("is-visible");
      if (currentTitle === String(title).trim() && currentSubtitle === String(subtitle).trim() && !labelRoot.classList.contains("is-changing")) return;

      // Smooth cross-fade: fade out -> swap text -> fade in.
      labelRoot.classList.add("is-changing");
      labelTimer = window.setTimeout(() => {
        apply();
        requestAnimationFrame(() => labelRoot.classList.remove("is-changing"));
      }, 140);
    };

    const scheduleNextForActive = () => {
      const active = slides[idx];
      const type = active?.dataset?.type;

      if (timer) window.clearTimeout(timer);
      if (paused) return;

      let ms = 0;
      if (type === "video") {
        ms = Math.round(getSlideDurationSeconds() * 1000);
      } else {
        const raw = Number(active?.dataset?.interval || 4500);
        ms = Number.isFinite(raw) ? raw : 4500;
      }

      remainingMs = ms;
      nextDueAt = performance.now() + ms;
      timer = window.setTimeout(() => go(idx + 1), ms);
    };

    const setActive = (nextIdx) => {
      if (isSwitching) return;
      isSwitching = true;
      window.setTimeout(() => {
        isSwitching = false;
      }, Math.max(0, FADE_MS - 60));

      const prevIdx = idx;
      idx = (nextIdx + slides.length) % slides.length;

      // Keep the outgoing slide from snapping its zoom back while it fades out.
      const prev = slides[prevIdx];
      if (prev instanceof HTMLElement && prevIdx !== idx) {
        prev.classList.add("is-leaving");
        if (leaveTimer) window.clearTimeout(leaveTimer);
        leaveTimer = window.setTimeout(() => {
          prev.classList.remove("is-leaving");
        }, FADE_MS + 40);
      }

      slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      setActiveNav();
      setHomeLabel();

      const active = slides[idx];
      const type = active?.dataset?.type;

      // Pause all videos; play only the active slide's video.
      videos.forEach((v, i) => {
        if (!v) return;
        if (i === idx && type === "video" && !paused) {
          // If the video was at the end, restart so it doesn't instantly end and skip.
          try {
            const dur = v.duration;
            if (v.ended || (Number.isFinite(dur) && dur > 0 && v.currentTime >= dur - 0.05)) {
              v.currentTime = 0;
            }
          } catch {}
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          v.pause();
        }
      });

      scheduleNextForActive();
    };

    const go = (nextIdx) => {
      if (isSwitching) return;
      setActive(nextIdx);
    };
    addSwipeNavigation(root, { onNext: () => go(idx + 1), onPrev: () => go(idx - 1) });

    // Progress navigation
    navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = Number(btn.dataset.slide);
        if (Number.isFinite(target)) go(target);
      });
    });

    // When metadata loads, update duration var if this is the active slide.
    videos.forEach((v, i) => {
      if (!v) return;
      v.loop = false;
      v.addEventListener("loadedmetadata", () => {
        if (i !== idx) return;
        setNavDurationVar();
        resetActiveProgressFill();
        // Resync timer to real duration for the active slide.
        scheduleNextForActive();
      });
      v.addEventListener("ended", () => {
        // Only advance if the ended video is still the active slide.
        if (i !== idx) return;
        go(idx + 1);
      });
    });

    // Start
    setActive(0);

    // Expose pause/resume so we can stop Home when Who is in view.
    root.dataset.slideshow = "home";
    window.__pccHomeSlideshow = {
      pause(reason = "external") {
        pauseReasons.add(String(reason));
        if (paused) return;
        paused = true;
        root.classList.add("is-paused");
        if (timer) window.clearTimeout(timer);
        // keep remaining time for progress bar + timeout
        const now = performance.now();
        if (nextDueAt && remainingMs) remainingMs = Math.max(0, Math.round(nextDueAt - now));
        videos.forEach((v) => v?.pause());
      },
      resume(reason = "external") {
        pauseReasons.delete(String(reason));
        if (pauseReasons.size) return;
        if (!paused) return;
        paused = false;
        root.classList.remove("is-paused");
        // Resume video only if we're on the video slide.
        const active = slides[idx];
        const v = videos[idx];
        if (v && active?.dataset?.type === "video") {
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
        // resume timer from remaining time (if any)
        if (timer) window.clearTimeout(timer);
        const ms = Number.isFinite(remainingMs) && remainingMs > 50 ? remainingMs : Math.round(getSlideDurationSeconds() * 1000);
        remainingMs = ms;
        nextDueAt = performance.now() + ms;
        timer = window.setTimeout(() => go(idx + 1), ms);
        // Don't reset fill on resume; CSS animation continues from paused state.
        setActiveNav({ resetFill: false });
      },
    };

    // If autoplay is blocked, let user click slideshow to start the video.
    root.addEventListener(
      "click",
      () => {
        if (idx !== 0) return;
        if (!(heroVideo instanceof HTMLVideoElement)) return;
        const p = heroVideo.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      },
      { passive: true }
    );
  };

  const wireWhoSlideshow = () => {
    const root = document.getElementById("whoSlideshow");
    if (!(root instanceof HTMLElement)) return;

    const slides = Array.from(root.querySelectorAll(".slide")).filter((el) => el instanceof HTMLElement);
    const nav = root.querySelector(".progress-nav");
    const navItems = Array.from(root.querySelectorAll(".progress-nav__item")).filter((el) => el instanceof HTMLButtonElement);
    const videos = slides.map((s) => s.querySelector("video.hero-video")).map((v) => (v instanceof HTMLVideoElement ? v : null));

    const overlay = document.getElementById("whoOverlay");
    const titleEl = document.getElementById("whoOverlayTitle");
    const p1 = document.getElementById("whoOverlayP1");
    const p2 = document.getElementById("whoOverlayP2");
    const p3 = document.getElementById("whoOverlayP3");

    if (!slides.length) return;

    let idx = 0;
    let timer = null;
    let overlayTimer = null;
    let paused = false;
    let remainingMs = 0;
    let nextDueAt = 0;

    const renderSoftLines = (target, lines) => {
      if (!(target instanceof HTMLElement)) return;
      target.replaceChildren();
      lines
        .map((s) => String(s || "").trim())
        .filter(Boolean)
        .forEach((text) => {
          const span = document.createElement("span");
          span.className = "who-overlay__softline";
          span.textContent = text;
          target.appendChild(span);
        });
    };

    const setOverlay = () => {
      if (!(overlay instanceof HTMLElement) || !(titleEl instanceof HTMLElement)) return;

      const active = slides[idx];
      const mode = active?.dataset?.overlay || "label";
      const title = active?.dataset?.title || "";

      overlay.classList.toggle("is-label", mode !== "intro");

      titleEl.textContent = title;
      if (mode === "intro") {
        renderSoftLines(p1, [active?.dataset?.line1]);
        renderSoftLines(p2, [active?.dataset?.line2a || active?.dataset?.line2, active?.dataset?.line2b, active?.dataset?.line2c]);
        renderSoftLines(p3, [active?.dataset?.line3a || active?.dataset?.line3, active?.dataset?.line3b, active?.dataset?.line3c]);
      } else {
        renderSoftLines(p1, []);
        renderSoftLines(p2, []);
        renderSoftLines(p3, []);
      }
    };

    const animateOverlaySwap = () => {
      if (!(overlay instanceof HTMLElement)) return;
      overlay.classList.add("is-changing");
      if (overlayTimer) window.clearTimeout(overlayTimer);
      overlayTimer = window.setTimeout(() => {
        setOverlay();
        // allow paint, then fade back in
        requestAnimationFrame(() => overlay.classList.remove("is-changing"));
      }, 140);
    };

    const getSlideDurationSeconds = () => {
      const v = videos[idx];
      if (v) {
        const d = v.duration;
        if (Number.isFinite(d) && d > 0.25) return d;
      }
      const active = slides[idx];
      const ms = Number(active?.dataset?.interval);
      if (Number.isFinite(ms) && ms > 0) return ms / 1000;
      return 10;
    };

    const setNavDurationVar = () => {
      if (!(nav instanceof HTMLElement)) return;
      nav.style.setProperty("--slide-duration", `${getSlideDurationSeconds()}s`);
    };

    const resetActiveProgressFill = () => {
      const activeItem = navItems[idx];
      if (!(activeItem instanceof HTMLElement)) return;
      const fill = activeItem.querySelector(".progress-nav__fill");
      if (!(fill instanceof HTMLElement)) return;

      // Restart animation reliably.
      fill.style.animation = "none";
      // Force reflow
      // eslint-disable-next-line no-unused-expressions
      fill.offsetHeight;
      fill.style.animation = "";
    };

    const setActiveNav = (opts = {}) => {
      const { resetFill = true } = opts;
      navItems.forEach((b, i) => b.classList.toggle("is-active", i === idx));
      setNavDurationVar();
      if (resetFill) resetActiveProgressFill();
    };

    const pauseAll = () => {
      videos.forEach((v) => {
        if (!v) return;
        v.pause();
      });
    };

    const resetAll = () => {
      videos.forEach((v) => {
        if (!v) return;
        v.pause();
        try {
          v.currentTime = 0;
        } catch {}
      });
    };

    const playActive = () => {
      const v = videos[idx];
      if (!v) return;
      if (paused) return;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const scheduleFallbackAdvance = () => {
      if (timer) window.clearTimeout(timer);
      if (paused) return;
      // Advance using real duration (fallback to 10s if unknown).
      const ms = Math.round(getSlideDurationSeconds() * 1000);
      remainingMs = ms;
      nextDueAt = performance.now() + ms;
      timer = window.setTimeout(() => go(idx + 1), ms);
    };

    const setActive = (nextIdx) => {
      idx = (nextIdx + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      setActiveNav();

      animateOverlaySwap();
      resetAll();
      playActive();
      scheduleFallbackAdvance();
    };

    const go = (nextIdx) => setActive(nextIdx);
    addSwipeNavigation(root, { onNext: () => go(idx + 1), onPrev: () => go(idx - 1) });

    // Progress navigation
    navItems.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = Number(btn.dataset.slide);
        if (Number.isFinite(target)) go(target);
      });
    });

    // When metadata loads, update duration var if this is the active slide.
    videos.forEach((v, i) => {
      if (!v) return;
      v.addEventListener("loadedmetadata", () => {
        if (i !== idx) return;
        setNavDurationVar();
        resetActiveProgressFill();
        // Resync timer to real duration for the active slide.
        scheduleFallbackAdvance();
      });
    });

    // Ended -> advance
    videos.forEach((v) => {
      if (!v) return;
      v.loop = false;
      v.addEventListener("ended", () => {
        if (paused) return;
        go(idx + 1);
      });
    });

    setOverlay();
    setActive(0);

    // Expose pause/resume so we can stop Who when it's out of view.
    window.__pccWhoSlideshow = {
      pause() {
        paused = true;
        root.classList.add("is-paused");
        if (timer) window.clearTimeout(timer);
        const now = performance.now();
        if (nextDueAt && remainingMs) remainingMs = Math.max(0, Math.round(nextDueAt - now));
        pauseAll();
      },
      resume() {
        if (!paused) return;
        paused = false;
        root.classList.remove("is-paused");
        // Ensure overlay matches current active slide.
        setOverlay();
        playActive();
        if (timer) window.clearTimeout(timer);
        const ms = Number.isFinite(remainingMs) && remainingMs > 50 ? remainingMs : Math.round(getSlideDurationSeconds() * 1000);
        remainingMs = ms;
        nextDueAt = performance.now() + ms;
        timer = window.setTimeout(() => go(idx + 1), ms);
        // Don't reset fill on resume; CSS animation continues from paused state.
        setActiveNav({ resetFill: false });
      },
    };
  };

  const wireWorksCarousel = () => {
    const root = document.getElementById("worksCarousel");
    if (!(root instanceof HTMLElement)) return;

    const slides = Array.from(root.querySelectorAll(".works-slide")).filter((el) => el instanceof HTMLElement);
    if (!slides.length) return;

    const prevBtn = root.querySelector(".works-arrow--prev");
    const nextBtn = root.querySelector(".works-arrow--next");
    const captionEl = document.getElementById("worksCaption");

    let idx = 0;
    let timer = null;
    let paused = false;
    let captionTimer = null;

    const setCaption = () => {
      if (!(captionEl instanceof HTMLElement)) return;
      const active = slides[idx];
      const raw = String(active?.dataset?.caption || "").trim();
      if (captionTimer) window.clearTimeout(captionTimer);

      const apply = () => {
        captionEl.style.opacity = raw ? "1" : "0";
        if (!raw) {
          captionEl.replaceChildren();
          return;
        }

        // Supports "Project | Location" format (like reference).
        // If location isn't provided, default to Kuala Lumpur (or data-location).
        const parts = raw.split("|").map((s) => s.trim()).filter(Boolean);
        captionEl.replaceChildren();

        const name = document.createElement("span");
        name.className = "works-caption__name";
        name.textContent = parts[0] || raw;
        captionEl.appendChild(name);

        const locText =
          parts.length > 1
            ? parts.slice(1).join(" | ")
            : String(active?.dataset?.location || "Kuala Lumpur").trim();

        const sep = document.createElement("span");
        sep.className = "works-caption__sep";
        sep.textContent = "|";
        captionEl.appendChild(sep);

        const loc = document.createElement("span");
        loc.className = "works-caption__loc";
        loc.textContent = locText;
        captionEl.appendChild(loc);
      };

      // Smooth cross-fade (same idea as Home label): fade out -> swap -> fade in.
      if (!captionEl.classList.contains("is-changing")) {
        captionEl.classList.add("is-changing");
        captionTimer = window.setTimeout(() => {
          apply();
          requestAnimationFrame(() => captionEl.classList.remove("is-changing"));
        }, 140);
        return;
      }

      apply();
    };

    const setClasses = () => {
      const prev = (idx - 1 + slides.length) % slides.length;
      const next = (idx + 1) % slides.length;
      slides.forEach((s, i) => {
        s.classList.toggle("is-active", i === idx);
        s.classList.toggle("is-prev", i === prev);
        s.classList.toggle("is-next", i === next);
      });
      setCaption();
    };

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      if (paused) return;
      timer = window.setTimeout(() => go(idx + 1), 4500);
    };

    const go = (nextIdx) => {
      idx = (nextIdx + slides.length) % slides.length;
      setClasses();
      schedule();
    };

    prevBtn?.addEventListener("click", () => go(idx - 1));
    nextBtn?.addEventListener("click", () => go(idx + 1));
    addSwipeNavigation(root, { onNext: () => go(idx + 1), onPrev: () => go(idx - 1) });

    // Pause autoplay when not visible (and resume smoothly)
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        paused = !inView;
        if (paused) {
          if (timer) window.clearTimeout(timer);
        } else {
          schedule();
        }
      },
      { root: null, threshold: [0, 0.25, 0.5] }
    );
    observer.observe(root);

    setClasses();
    schedule();
  };

  const wireHomeRevealOnScroll = () => {
    const home = document.getElementById("home");
    if (!(home instanceof HTMLElement)) return;
    const api = () => window.__pccHomeSlideshow;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        const h = api();
        if (!h) return;
        if (inView) h.resume("offscreen");
        else h.pause("offscreen");
      },
      { root: null, threshold: [0, 0.15, 0.25], rootMargin: "-10% 0px -10% 0px" }
    );

    observer.observe(home);
  };

  // Fade in/out with single-active behavior (Home/Works/Who only):
  // when the next section starts to show, the previous fades out.
  const wirePrimarySectionInViewFades = () => {
    const ids = ["home", "works", "who"];
    const els = ids.map((id) => document.getElementById(id)).filter((el) => el instanceof HTMLElement);
    if (!els.length) return;

    const ratios = new Map();
    let activeEl = null;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (!(el instanceof HTMLElement)) return;
          ratios.set(el, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        const servicesHalf = Boolean(window.__pccServicesHalfInView);

        // Pick the most-visible section as the only active one.
        let best = null;
        let bestRatio = 0;
        els.forEach((el) => {
          if (servicesHalf && el.id === "who") return; // force Who to disappear when Services is half in view
          const r = Number(ratios.get(el) || 0);
          if (r > bestRatio) {
            bestRatio = r;
            best = el;
          }
        });

        // Require "some" visibility before activating any section.
        const nextActive = bestRatio >= 0.18 ? best : null;
        if (nextActive !== activeEl) activeEl = nextActive;

        els.forEach((el) => el.classList.toggle("is-inview", el === activeEl));
      },
      {
        root: null,
        threshold: [0, 0.12, 0.18, 0.25, 0.35, 0.5, 0.65, 0.8],
        rootMargin: "0px",
      }
    );

    els.forEach((el) => observer.observe(el));
  };

  // When Services is >= 50% in view, force Who to fade out + pause.
  const wireHideWhoWhenServicesHalfVisible = () => {
    const services = document.getElementById("services");
    const who = document.getElementById("who");
    if (!(services instanceof HTMLElement) || !(who instanceof HTMLElement)) return;

    const pauseWho = () => {
      who.querySelectorAll("video.hero-video").forEach((v) => {
        if (v instanceof HTMLVideoElement) v.pause();
      });
      const api = window.__pccWhoSlideshow;
      if (api) api.pause();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        const half = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        window.__pccServicesHalfInView = half;
        if (half) {
          who.classList.remove("is-inview");
          pauseWho();
        }
      },
      { root: null, threshold: [0, 0.5, 0.6, 0.75], rootMargin: "0px" }
    );

    observer.observe(services);
  };

  const wireWhoRevealOnScroll = () => {
    const who = document.getElementById("who");
    if (!(who instanceof HTMLElement)) return;

    let inited = false;
    let revealed = false;

    const resumeActiveWhoVideo = () => {
      const activeVideo = who.querySelector(".slide.is-active video.hero-video");
      if (!(activeVideo instanceof HTMLVideoElement)) return;

      // If it ended (or is essentially at the end), restart so it doesn't "stick" on the last frame.
      try {
        const dur = activeVideo.duration;
        if (activeVideo.ended || (Number.isFinite(dur) && dur > 0 && activeVideo.currentTime >= dur - 0.05)) {
          activeVideo.currentTime = 0;
        }
      } catch {}

      const p = activeVideo.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const pauseWhoVideos = () => {
      who.querySelectorAll("video.hero-video").forEach((v) => {
        if (!(v instanceof HTMLVideoElement)) return;
        v.pause();
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // Consider Who "visible" only when a decent portion is in view.
        // This prevents videos from continuing when you've scrolled past to the next section.
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;

        if (isVisible) {
          who.classList.add("is-video-visible");
          who.classList.add("is-inview");
          revealed = true;
          if (!inited) {
            inited = true;
            wireWhoSlideshow();
          }
          // Re-entering viewport: resume playback so it doesn't stay frozen on a frame.
          resumeActiveWhoVideo();
          const api = window.__pccWhoSlideshow;
          if (api) api.resume();
        } else {
          // Always fade out when out of view, but still keep init state.
          who.classList.remove("is-inview");
          pauseWhoVideos();
          const api = window.__pccWhoSlideshow;
          if (api) api.pause();
        }
      },
      {
        root: null,
        threshold: [0, 0.25, 0.5, 0.65, 0.8],
        // Shrink the effective viewport a bit so we pause earlier near edges.
        rootMargin: "0px",
      }
    );

    observer.observe(who);
  };

  const wirePauseHomeWhenWhoVisible = () => {
    const home = document.getElementById("home");
    const who = document.getElementById("who");
    if (!(home instanceof HTMLElement) || !(who instanceof HTMLElement)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const api = window.__pccHomeSlideshow;
        if (!api) return;

        if (entry.isIntersecting) api.pause("who");
        else api.resume("who");
      },
      { root: null, threshold: 0.15 }
    );

    observer.observe(who);
  };

  const wireServicesReveal = () => {
    const services = document.getElementById("services");
    const carousel = document.getElementById("servicesCarousel");
    if (!(services instanceof HTMLElement) || !(carousel instanceof HTMLElement)) return;

    const animateActive = () => {
      const active = carousel.querySelector(".carousel-item.active");
      if (!(active instanceof HTMLElement)) return;

      // Restart animation by toggling the class.
      active.classList.remove("services-animate");
      requestAnimationFrame(() => active.classList.add("services-animate"));
    };

    let revealTimer = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const inView = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        services.classList.toggle("is-inview", inView);

        if (!inView) return;

        // Only animate the very first time Services enters view.
        if (services.classList.contains("services-revealed")) return;

        animateActive();
        if (revealTimer) window.clearTimeout(revealTimer);
        // 0.35s duration + 0.16s max delay + small buffer.
        revealTimer = window.setTimeout(() => {
          services.classList.add("services-revealed");
        }, 650);
      },
      { root: null, threshold: [0, 0.2, 0.35, 0.5] }
    );

    observer.observe(services);
  };

  const wireFixedCarouselHeight = (carouselId) => {
    const carousel = document.getElementById(carouselId);
    if (!(carousel instanceof HTMLElement)) return;
    const inner = carousel.querySelector(".carousel-inner");
    if (!(inner instanceof HTMLElement)) return;

    const recompute = () => {
      const items = Array.from(inner.querySelectorAll(".carousel-item")).filter((el) => el instanceof HTMLElement);
      if (!items.length) return;

      // Measure each item at natural height.
      const prev = items.map((it) => ({
        el: it,
        display: it.style.display,
        position: it.style.position,
        visibility: it.style.visibility,
        pointerEvents: it.style.pointerEvents,
        width: it.style.width,
      }));

      items.forEach((it) => {
        it.style.display = "block";
        it.style.position = "relative";
        it.style.visibility = "hidden";
        it.style.pointerEvents = "none";
        it.style.width = "100%";
      });

      // Force layout
      // eslint-disable-next-line no-unused-expressions
      inner.offsetHeight;

      let maxH = 0;
      items.forEach((it) => {
        const h = it.scrollHeight;
        if (h > maxH) maxH = h;
      });

      prev.forEach((p) => {
        p.el.style.display = p.display;
        p.el.style.position = p.position;
        p.el.style.visibility = p.visibility;
        p.el.style.pointerEvents = p.pointerEvents;
        p.el.style.width = p.width;
      });

      if (maxH > 0) inner.style.height = `${maxH}px`;
    };

    recompute();
    window.addEventListener("load", recompute, { once: true });
    window.addEventListener("resize", recompute);
    carousel.addEventListener("slid.bs.carousel", recompute);
    carousel.querySelectorAll("img").forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (img.complete) return;
      img.addEventListener("load", recompute, { once: true });
    });
  };

  const wireSimpleSectionFadeIns = () => {
    const ids = ["works", "purpose", "why", "reviews"];
    const targets = ids.map((id) => document.getElementById(id)).filter((el) => el instanceof HTMLElement);
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!(entry.target instanceof HTMLElement)) return;
          if (!entry.isIntersecting || entry.intersectionRatio < 0.2) return;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        });
      },
      { root: null, threshold: [0, 0.2, 0.35] }
    );

    targets.forEach((t) => observer.observe(t));
  };

  const wireContactForm = () => {
    const form = document.getElementById("contactForm");
    const status = document.getElementById("contactStatus");
    if (!(form instanceof HTMLFormElement)) return;

    const nameEl = document.getElementById("name");
    const phoneEl = document.getElementById("phone");
    const locationEl = document.getElementById("location");
    const typeEl = document.getElementById("type");
    const budgetEl = document.getElementById("budget");
    const message = document.getElementById("message");
    const messageHelp = document.getElementById("messageHelp");
    const MAX_WORDS = 50;

    const getWords = (value) =>
      String(value || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const syncMessageCount = () => {
      if (!(message instanceof HTMLTextAreaElement) || !(messageHelp instanceof HTMLElement)) return;
      const words = getWords(message.value);

      if (words.length > MAX_WORDS) {
        message.value = words.slice(0, MAX_WORDS).join(" ");
      }

      const finalCount = getWords(message.value).length;
      messageHelp.textContent = `${finalCount} / ${MAX_WORDS} words`;
    };

    if (message instanceof HTMLTextAreaElement && messageHelp instanceof HTMLElement) {
      message.addEventListener("input", syncMessageCount);
      syncMessageCount();
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = nameEl instanceof HTMLInputElement ? nameEl.value.trim() : "";
      const phoneRaw = phoneEl instanceof HTMLInputElement ? phoneEl.value.trim() : "";
      const phone = phoneRaw ? `+60 ${phoneRaw}` : "";
      const location = locationEl instanceof HTMLInputElement ? locationEl.value.trim() : "";
      const type = typeEl instanceof HTMLSelectElement ? typeEl.value.trim() : "";
      const budget = budgetEl instanceof HTMLSelectElement ? budgetEl.value.trim() : "";
      const msg = message instanceof HTMLTextAreaElement ? message.value.trim() : "";

      const lines = [
        "Hello, I would like to discuss a project with PPC Construction. Please connect me with the project manager.",
        "",
        `Name: ${name || "-"}`,
        `Phone: ${phone || "-"}`,
        `Location: ${location || "-"}`,
        `Type: ${type || "-"}`,
        `Budget: ${budget || "-"}`,
        `Message: ${msg || "-"}`,
      ];

      const waNumber = "60102502525";
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`;

      if (status) status.textContent = "Redirecting to WhatsApp…";
      window.open(waUrl, "_blank", "noopener,noreferrer");
    });
  };

  const addImageFallbacks = () => {
    const imgs = document.querySelectorAll('img[src$=".jpg"], img[src$=".png"], img[src$=".webp"]');
    imgs.forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      img.addEventListener(
        "error",
        () => {
          img.src = "assets/media/placeholder.svg";
          img.alt = img.alt || "Placeholder";
        },
        { once: true }
      );
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    setYear();
    syncNavbarHeightVar();
    wireSmoothScroll();
    wireSectionObservers();
    wireServicesNavbarTheme();
    wireInlineNavbarLogo();
    // wireVideoDiagnostics(); // removed from Home section
    wireHomeSlideshow();
    wireHomeRevealOnScroll();
    wireWorksCarousel();
    wireWhoRevealOnScroll();
    wirePrimarySectionInViewFades();
    wireHideWhoWhenServicesHalfVisible();
    wirePauseHomeWhenWhoVisible();
    wireServicesReveal();
    wireFixedCarouselHeight("servicesCarousel");
    wireFixedCarouselHeight("reviewsCarousel");
    wireSimpleSectionFadeIns();
    pauseOffscreenHeroVideos();
    wireContactForm();
    addImageFallbacks();

    document.querySelectorAll(".hero-media").forEach((root) => {
      if (!(root instanceof HTMLElement)) return;
      // If this media is inside a non-active traditional slide, don't autoplay it.
      const slide = root.closest(".slide");
      if (slide && slide instanceof HTMLElement && !slide.classList.contains("is-active")) return;
      showVideoWhenReady(root);
    });

    window.addEventListener("resize", syncNavbarHeightVar);
  });
})();
