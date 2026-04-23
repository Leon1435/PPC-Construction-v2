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
      const target = document.querySelector(href);
      if (!(target instanceof HTMLElement)) return;
      e.preventDefault();

      const y = target.getBoundingClientRect().top + window.scrollY - 72;
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
    const dots = Array.from(root.querySelectorAll(".dot")).filter((el) => el instanceof HTMLButtonElement);
    const video = root.querySelector("#homeHeroVideo");
    const heroVideo = video instanceof HTMLVideoElement ? video : null;

    if (!slides.length) return;

    let idx = 0;
    let timer = null;
    let leaveTimer = null;
    let paused = false;

    const FADE_MS = 350; // keep in sync with CSS opacity transition

    const scheduleNextForActive = () => {
      const active = slides[idx];
      const type = active?.dataset?.type;

      if (timer) window.clearTimeout(timer);
      if (paused) return;

      if (type === "video") {
        timer = window.setTimeout(() => go(idx + 1), 10000);
      } else {
        const ms = Number(active?.dataset?.interval || 4500);
        timer = window.setTimeout(() => go(idx + 1), Number.isFinite(ms) ? ms : 4500);
      }
    };

    const setActive = (nextIdx) => {
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
      dots.forEach((d, i) => d.classList.toggle("is-active", i === idx));

      const active = slides[idx];
      const type = active?.dataset?.type;

      // Pause video when leaving video slide; play when entering.
      if (heroVideo) {
        if (type === "video") {
          if (!paused) {
            const p = heroVideo.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }
        } else {
          heroVideo.pause();
        }
      }

      scheduleNextForActive();
    };

    const go = (nextIdx) => setActive(nextIdx);
    addSwipeNavigation(root, { onNext: () => go(idx + 1), onPrev: () => go(idx - 1) });

    // Dots navigation
    dots.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = Number(btn.dataset.slide);
        if (Number.isFinite(target)) go(target);
      });
    });

    // Video ended -> advance
    if (heroVideo) {
      heroVideo.addEventListener("ended", () => go(idx + 1));
      // Ensure it can end.
      heroVideo.loop = false;
    }

    // Start
    setActive(0);

    // Expose pause/resume so we can stop Home when Who is in view.
    root.dataset.slideshow = "home";
    window.__pccHomeSlideshow = {
      pause() {
        paused = true;
        if (timer) window.clearTimeout(timer);
        if (heroVideo) heroVideo.pause();
      },
      resume() {
        if (!paused) return;
        paused = false;
        // Resume video only if we're on the video slide.
        const active = slides[idx];
        if (heroVideo && active?.dataset?.type === "video") {
          const p = heroVideo.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
        scheduleNextForActive();
      },
    };

    // If autoplay is blocked, let user click slideshow to start the video.
    root.addEventListener(
      "click",
      () => {
        if (idx === 0 && heroVideo) {
          const p = heroVideo.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        }
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

    const setActiveNav = () => {
      navItems.forEach((b, i) => b.classList.toggle("is-active", i === idx));
      setNavDurationVar();
      resetActiveProgressFill();
    };

    const stopAll = () => {
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
      // If video "ended" doesn't fire (bad metadata), advance after 10s.
      timer = window.setTimeout(() => go(idx + 1), 10000);
    };

    const setActive = (nextIdx) => {
      idx = (nextIdx + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === idx));
      setActiveNav();

      animateOverlaySwap();
      stopAll();
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
        if (timer) window.clearTimeout(timer);
        stopAll();
      },
      resume() {
        if (!paused) return;
        paused = false;
        // Ensure overlay matches current active slide.
        setOverlay();
        playActive();
        scheduleFallbackAdvance();
        setActiveNav();
      },
    };
  };

  const wireWhoRevealOnScroll = () => {
    const who = document.getElementById("who");
    if (!(who instanceof HTMLElement)) return;

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

    let inited = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        // Consider Who "visible" only when a decent portion is in view.
        // This prevents videos from continuing when you've scrolled past to the next section.
        const isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;

        if (isVisible) {
          who.classList.add("is-video-visible");
          if (!inited) {
            inited = true;
            wireWhoSlideshow();
            // wireWhoSlideshow() will start the first slide; nothing else needed here.
          } else {
            // Re-entering viewport: resume playback so it doesn't stay frozen on a frame.
            resumeActiveWhoVideo();
            const api = window.__pccWhoSlideshow;
            if (api) api.resume();
          }
        } else {
          who.classList.remove("is-video-visible");
          pauseWhoVideos();
          const api = window.__pccWhoSlideshow;
          if (api) api.pause();
        }
      },
      {
        root: null,
        threshold: [0, 0.1, 0.2, 0.3, 0.5],
        // Shrink the effective viewport a bit so we pause earlier near edges.
        rootMargin: "-10% 0px -10% 0px",
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

        if (entry.isIntersecting) api.pause();
        else api.resume();
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

  const wireSimpleSectionFadeIns = () => {
    const ids = ["purpose", "why", "reviews"];
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

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (status) status.textContent = "Thanks! Your message is ready to send. (Hook this up to email/backend later.)";
      form.reset();
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
    wireWhoRevealOnScroll();
    wirePauseHomeWhenWhoVisible();
    wireServicesReveal();
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
