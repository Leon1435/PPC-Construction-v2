(() => {
  const ensureVideoSourcesLoaded = (video) => {
    if (!(video instanceof HTMLVideoElement)) return false;
    const sources = Array.from(video.querySelectorAll("source")).filter((s) => s instanceof HTMLSourceElement);
    let changed = false;
    sources.forEach((s) => {
      const ds = s.getAttribute("data-src");
      if (!ds) return;
      s.setAttribute("src", ds);
      s.removeAttribute("data-src");
      changed = true;
    });
    if (changed) {
      try {
        video.load();
      } catch {}
    }
    return changed;
  };

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
    document.addEventListener(
      "click",
      (e) => {
        const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;

        const href = a.getAttribute("href");
        if (!href || href === "#") return;

        const target = document.querySelector(href);
        if (!(target instanceof HTMLElement)) return;

        e.preventDefault();

        // Unlock fade/reveal state before measuring + scrolling.
        const id = href.slice(1);
        const sec = document.getElementById(id);
        if (sec instanceof HTMLElement) sec.classList.add("is-inview");

        // Keep nav highlighting responsive immediately on click.
        setActiveNavLink(href);

        const doScroll = (behavior) => {
          syncNavbarHeightVar();
          const navEl = document.getElementById("mainNav");
          const navH = navEl instanceof HTMLElement ? navEl.offsetHeight : 72;

          const run = () => {
            const top = target.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: Math.max(0, top - navH), behavior });
          };

          // Two frames: layout stable after navbar class changes / collapse / font load.
          window.requestAnimationFrame(() => window.requestAnimationFrame(run));
        };

        // Mobile fix: if the navbar is expanded, collapse it instantly,
        // then scroll with `auto` to avoid fighting Bootstrap animations.
        const nav = document.getElementById("navbarContent");
        if (nav instanceof HTMLElement && nav.classList.contains("show")) {
          nav.classList.add("is-instant");
          // eslint-disable-next-line no-unused-expressions
          nav.offsetHeight;

          const bs = window.bootstrap;
          const inst =
            bs && typeof bs.Collapse?.getOrCreateInstance === "function"
              ? bs.Collapse.getOrCreateInstance(nav, { toggle: false })
              : null;

          const afterHide = () => {
            window.requestAnimationFrame(() => {
              doScroll("auto");
              window.setTimeout(() => nav.classList.remove("is-instant"), 0);
            });
          };

          nav.addEventListener("hidden.bs.collapse", afterHide, { once: true });

          if (inst && typeof inst.hide === "function") {
            inst.hide();
          } else {
            const toggler = document.querySelector(".navbar-toggler");
            if (toggler instanceof HTMLElement) toggler.click();
          }
        } else {
          // Desktop/normal: smooth scroll.
          doScroll("smooth");
        }
      },
      true
    );
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
          ensureVideoSourcesLoaded(v);
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

      // Preload the NEXT slide's video in the background so the first swipe
      // doesn't wait for a cold network fetch.
      if (type === "video") {
        const nextVideo = videos[(idx + 1) % videos.length];
        if (nextVideo instanceof HTMLVideoElement) {
          // Load sources (data-src -> src) and trigger a fetch, but do not play.
          // Run after paint to keep the transition snappy.
          window.setTimeout(() => {
            ensureVideoSourcesLoaded(nextVideo);
          }, 0);
        }
      }

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
    const singleSlide = slides.length <= 1;

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

      // If the page provides static HTML copy for the paragraphs, don't overwrite it.
      const hasStaticCopy =
        (p1 instanceof HTMLElement && p1.textContent?.trim()) ||
        (p2 instanceof HTMLElement && p2.textContent?.trim()) ||
        (p3 instanceof HTMLElement && p3.textContent?.trim());
      if (hasStaticCopy) return;

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
      ensureVideoSourcesLoaded(v);
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

      if (!singleSlide) {
        animateOverlaySwap();
        resetAll();
      }
      playActive();
      if (!singleSlide) scheduleFallbackAdvance();
    };

    const go = (nextIdx) => setActive(nextIdx);
    // No swipe navigation for Who section.

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
      if (singleSlide) {
        v.loop = true;
        return;
      }
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
      timer = window.setTimeout(() => go(idx + 1), 3000);
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

      // Lazy-load sources when Who enters viewport.
      ensureVideoSourcesLoaded(activeVideo);

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

  const wireFixedCarouselHeight = (carouselId, opts = {}) => {
    const carousel = document.getElementById(carouselId);
    if (!(carousel instanceof HTMLElement)) return;
    const inner = carousel.querySelector(".carousel-inner");
    if (!(inner instanceof HTMLElement)) return;

    const { capToCarouselHeight = true } = opts;

    const recompute = () => {
      // If this carousel sits inside a viewport-fitted section that has switched to
      // "auto-expand" mode, do NOT force a fixed inner height. Let content define it.
      const hostSection = carousel.closest(".section-pad");
      if (
        hostSection instanceof HTMLElement &&
        (hostSection.classList.contains("is-overflowing") || hostSection.classList.contains("is-measuring"))
      ) {
        inner.style.removeProperty("height");
        return;
      }

      const items = Array.from(inner.querySelectorAll(".carousel-item")).filter((el) => el instanceof HTMLElement);
      if (!items.length) return;

      // IMPORTANT: clear any previously-locked inner height before measuring.
      // The carousel-items use `height:100%` in CSS, so a stale locked inner
      // height would force each item's scrollHeight to that value, producing
      // an inflated maxH that never shrinks (e.g. when DOM is rebuilt for
      // mobile single-item layout, or when a slide simply has less content).
      const prevInnerHeight = inner.style.height;
      inner.style.height = "";

      // Measure each item at natural height.
      const prev = items.map((it) => ({
        el: it,
        display: it.style.display,
        position: it.style.position,
        visibility: it.style.visibility,
        pointerEvents: it.style.pointerEvents,
        width: it.style.width,
        height: it.style.height,
      }));

      items.forEach((it) => {
        it.style.display = "block";
        it.style.position = "relative";
        it.style.visibility = "hidden";
        it.style.pointerEvents = "none";
        it.style.width = "100%";
        // Defensive: neutralise CSS `height:100%` during measurement so the
        // item resolves to its own content height regardless of ancestor sizing.
        it.style.height = "auto";
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
        p.el.style.height = p.height;
      });

      // If we somehow couldn't measure, restore the previous lock so we don't
      // accidentally collapse the carousel.
      if (!(maxH > 0) && prevInnerHeight) {
        inner.style.height = prevInnerHeight;
      }

      if (maxH > 0) {
        if (!capToCarouselHeight) {
          inner.style.height = `${maxH}px`;
          return;
        }

        // IMPORTANT: cap the fixed height to what's actually available in the layout.
        // This prevents viewport-fitted sections (e.g. Services) from overflowing on short screens.
        const cap = Math.round(carousel.getBoundingClientRect().height || 0);
        inner.style.height = `${cap > 0 ? Math.min(maxH, cap) : maxH}px`;
      }
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

    // The mobile/desktop rebuild swaps the carousel-inner DOM. Recompute when
    // that happens so the locked height matches the new slide structure.
    if (typeof MutationObserver !== "undefined") {
      let pending = false;
      const mo = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          recompute();
          carousel.querySelectorAll("img").forEach((img) => {
            if (!(img instanceof HTMLImageElement)) return;
            if (img.complete) return;
            img.addEventListener("load", recompute, { once: true });
          });
        });
      });
      mo.observe(inner, { childList: true, subtree: true });
    }
  };

  // Viewport-fitted sections: keep "fit to viewport" layout by default,
  // but if the content overflows, allow the section to expand to auto height.
  const wireViewportOverflowAutoExpand = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!(section instanceof HTMLElement)) return;

    let raf = 0;
    const recompute = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;

        const nav = document.getElementById("mainNav");
        const navH = nav instanceof HTMLElement ? nav.getBoundingClientRect().height : 0;
        const available = Math.max(0, window.innerHeight - navH);

        // Measure REQUIRED height in auto mode (hidden to avoid flicker),
        // then compare it to the viewport-fitted available height.
        const prevVisibility = section.style.visibility;
        section.style.visibility = "hidden";
        section.classList.add("is-measuring");
        section.classList.remove("is-overflowing");

        // Force layout
        // eslint-disable-next-line no-unused-expressions
        section.offsetHeight;

        const required = section.scrollHeight;

        section.classList.remove("is-measuring");
        section.style.visibility = prevVisibility;

        // SECOND PASS: in fitted mode, the carousel/cards can be height-constrained.
        // Detect "internal" clipping inside the active tiles as well.
        section.classList.remove("is-overflowing");
        // eslint-disable-next-line no-unused-expressions
        section.offsetHeight;

        const activeTiles = section.querySelectorAll("#servicesCarousel .carousel-item.active .service-tile");
        let internalOverflow = false;
        activeTiles.forEach((tile) => {
          if (!(tile instanceof HTMLElement)) return;
          if (tile.scrollHeight > tile.clientHeight + 1) internalOverflow = true;
        });

        const overflows = required > available + 1 || internalOverflow;
        section.classList.toggle("is-overflowing", overflows);
      });
    };

    recompute();
    window.addEventListener("load", recompute, { once: true });
    window.addEventListener("resize", recompute);

    // Services uses a carousel; changing slides can change height needs.
    const carousel = section.querySelector(".carousel");
    if (carousel instanceof HTMLElement) {
      carousel.addEventListener("slid.bs.carousel", recompute);
    }

    // Images may load after layout.
    section.querySelectorAll("img").forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (img.complete) return;
      img.addEventListener("load", recompute, { once: true });
    });

    // Content size can change after responsive rebuilds (e.g. mobile single-item carousel).
    // ResizeObserver makes overflow detection robust without manual event wiring.
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => recompute());
      ro.observe(section);
      const inner = section.querySelector(".container");
      if (inner instanceof HTMLElement) ro.observe(inner);
      if (carousel instanceof HTMLElement) ro.observe(carousel);
    }

    // Expose a hook for other layout code to call if needed.
    section.dataset.recomputeOverflow = "1";
    section.__recomputeOverflow = recompute;
  };

  // Add touch swipe to Bootstrap carousels (Services/Reviews).
  // Bootstrap swipe support can vary by build/version; this makes it consistent.
  const wireBootstrapCarouselSwipe = (carouselId) => {
    const el = document.getElementById(carouselId);
    if (!(el instanceof HTMLElement)) return;
    if (el.dataset.swipeWired === "1") return;
    el.dataset.swipeWired = "1";

    addSwipeNavigation(el, {
      onNext: () => {
        const bs = window.bootstrap;
        const Carousel = bs && bs.Carousel;
        if (!Carousel) return;
        const inst =
          typeof Carousel.getOrCreateInstance === "function"
            ? Carousel.getOrCreateInstance(el)
            : typeof Carousel.getInstance === "function"
              ? Carousel.getInstance(el)
              : null;
        inst?.next?.();
      },
      onPrev: () => {
        const bs = window.bootstrap;
        const Carousel = bs && bs.Carousel;
        if (!Carousel) return;
        const inst =
          typeof Carousel.getOrCreateInstance === "function"
            ? Carousel.getOrCreateInstance(el)
            : typeof Carousel.getInstance === "function"
              ? Carousel.getInstance(el)
              : null;
        inst?.prev?.();
      },
    });
  };

  // Mobile: position Reviews arrows beside avatar row.
  const wireMobileReviewsArrowAnchor = () => {
    const bp = window.matchMedia("(max-width: 767.98px)");
    const carousel = document.getElementById("reviewsCarousel");
    if (!(carousel instanceof HTMLElement)) return;

    const compute = () => {
      if (!bp.matches) {
        carousel.style.removeProperty("--reviews-arrow-top");
        return;
      }
      const topRow = carousel.querySelector(".carousel-item.active .review-tile__top");
      if (!(topRow instanceof HTMLElement)) return;

      const cRect = carousel.getBoundingClientRect();
      const tRect = topRow.getBoundingClientRect();
      const y = Math.round(tRect.top - cRect.top + tRect.height / 2);
      carousel.style.setProperty("--reviews-arrow-top", `${y}px`);
    };

    compute();
    window.setTimeout(compute, 0);
    carousel.addEventListener("slid.bs.carousel", compute);
    window.addEventListener("resize", compute);
    carousel.querySelectorAll("img").forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (img.complete) return;
      img.addEventListener("load", compute, { once: true });
    });

    if (typeof bp.addEventListener === "function") bp.addEventListener("change", compute);
    else if (typeof bp.addListener === "function") bp.addListener(compute);
  };

  // Mobile: position Services arrows inside the active image dynamically.
  const wireMobileServicesArrowAnchor = () => {
    const bp = window.matchMedia("(max-width: 767.98px)");
    const carousel = document.getElementById("servicesCarousel");
    if (!(carousel instanceof HTMLElement)) return;

    const compute = () => {
      if (!bp.matches) {
        carousel.style.removeProperty("--services-arrow-top");
        carousel.style.removeProperty("--services-arrow-left");
        carousel.style.removeProperty("--services-arrow-right");
        return;
      }

      const media = carousel.querySelector(".carousel-item.active .service-tile__media");
      if (!(media instanceof HTMLElement)) return;

      const cRect = carousel.getBoundingClientRect();
      const mRect = media.getBoundingClientRect();

      const top = Math.round(mRect.top - cRect.top + mRect.height / 2);
      // Inset a bit from the image edge so the circle stays fully inside.
      const inset = 10;
      const left = Math.round(mRect.left - cRect.left + inset);
      const right = Math.round(cRect.right - mRect.right + inset);

      carousel.style.setProperty("--services-arrow-top", `${top}px`);
      carousel.style.setProperty("--services-arrow-left", `${left}px`);
      carousel.style.setProperty("--services-arrow-right", `${right}px`);
    };

    compute();
    window.setTimeout(compute, 0);
    carousel.addEventListener("slid.bs.carousel", compute);
    window.addEventListener("resize", compute);
    carousel.querySelectorAll("img").forEach((img) => {
      if (!(img instanceof HTMLImageElement)) return;
      if (img.complete) return;
      img.addEventListener("load", compute, { once: true });
    });

    if (typeof bp.addEventListener === "function") bp.addEventListener("change", compute);
    else if (typeof bp.addListener === "function") bp.addListener(compute);
  };

  // Mobile: turn multi-card slides into single-card slides (Services + Reviews)
  // so each swipe shows 1 item at a time.
  const wireMobileSingleItemCarousels = () => {
    const bp = window.matchMedia("(max-width: 767.98px)");

    const rebuild = (carouselId, opts) => {
      const carousel = document.getElementById(carouselId);
      if (!(carousel instanceof HTMLElement)) return;
      const inner = carousel.querySelector(".carousel-inner");
      if (!(inner instanceof HTMLElement)) return;
      const indicators = carousel.querySelector(".carousel-indicators");

      if (!carousel.dataset.originalInnerHtml) {
        carousel.dataset.originalInnerHtml = inner.innerHTML;
      }
      if (indicators instanceof HTMLElement && !carousel.dataset.originalIndicatorsHtml) {
        carousel.dataset.originalIndicatorsHtml = indicators.innerHTML;
      }

      const isMobile = bp.matches;
      const isApplied = carousel.dataset.singleItemMobile === "1";
      if (isMobile === isApplied) return;

      // If Bootstrap carousel is already instantiated, dispose before DOM surgery.
      const bs = window.bootstrap;
      const Carousel = bs && bs.Carousel;
      const existing = Carousel && typeof Carousel.getInstance === "function" ? Carousel.getInstance(carousel) : null;
      if (existing && typeof existing.dispose === "function") existing.dispose();

      if (!isMobile) {
        inner.innerHTML = carousel.dataset.originalInnerHtml || "";
        delete carousel.dataset.singleItemMobile;

        if (indicators instanceof HTMLElement && carousel.dataset.originalIndicatorsHtml != null) {
          indicators.innerHTML = carousel.dataset.originalIndicatorsHtml;
        }
      } else {
        const temp = document.createElement("div");
        temp.innerHTML = carousel.dataset.originalInnerHtml || "";

        const cols = Array.from(temp.querySelectorAll(opts.itemColSelector)).filter((el) => el instanceof HTMLElement);
        if (!cols.length) {
          // Safety: if we couldn't find any cards, do not blank the carousel.
          inner.innerHTML = carousel.dataset.originalInnerHtml || inner.innerHTML;
          delete carousel.dataset.singleItemMobile;
          return;
        }
        const frag = document.createDocumentFragment();

        cols.forEach((col, i) => {
          const item = document.createElement("div");
          item.className = `carousel-item${i === 0 ? " active" : ""}`;

          const row = document.createElement("div");
          row.className = opts.rowClass;

          const colClone = col.cloneNode(true);
          if (colClone instanceof HTMLElement) {
            colClone.classList.remove("col-md-4", "col-lg-4", "col-sm-4");
            colClone.classList.add("col-12");
          }

          row.appendChild(colClone);
          item.appendChild(row);
          frag.appendChild(item);
        });

        inner.replaceChildren(frag);
        carousel.dataset.singleItemMobile = "1";

        // Bootstrap expects indicators length to match items length,
        // even if we visually hide the dots. Rebuild them for mobile.
        if (indicators instanceof HTMLElement) {
          indicators.replaceChildren();
          cols.forEach((_, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("data-bs-target", `#${carouselId}`);
            b.setAttribute("data-bs-slide-to", String(i));
            b.setAttribute("aria-label", `Slide ${i + 1}`);
            if (i === 0) {
              b.classList.add("active");
              b.setAttribute("aria-current", "true");
            }
            indicators.appendChild(b);
          });
        }
      }

      // Re-initialize Bootstrap carousel with current data attributes.
      if (Carousel) {
        const intervalAttr = carousel.getAttribute("data-bs-interval");
        const interval = intervalAttr ? Number(intervalAttr) : undefined;
        // eslint-disable-next-line no-new
        new Carousel(carousel, {
          // Disable auto cycling (manual only)
          interval: false,
          ride: false,
          touch: carousel.getAttribute("data-bs-touch") !== "false",
        });
      }
      // Clear any previously-set arrow positioning var.
      carousel.style.removeProperty("--carousel-arrow-top");
    };

    const applyAll = () => {
      rebuild("servicesCarousel", {
        // Note: we rebuild from `carousel.dataset.originalInnerHtml` which is the INNER html,
        // so selectors must NOT depend on `#servicesCarousel` existing in that temp DOM.
        itemColSelector: ".carousel-item .col-md-4",
        rowClass: "row g-4 g-lg-5 justify-content-center",
      });
      rebuild("reviewsCarousel", {
        itemColSelector: ".carousel-item .col-md-4",
        rowClass: "row g-4 justify-content-center",
        // Keep reviews stable; no arrow-top syncing.
      });
    };

    applyAll();
    if (typeof bp.addEventListener === "function") bp.addEventListener("change", applyAll);
    else if (typeof bp.addListener === "function") bp.addListener(applyAll);
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
    const MAX_PHONE_DIGITS = 10; // fits e.g. 011xxxxxxxx (without +60 prefix)

    const cleanPhone = (value) => String(value || "").replace(/\D+/g, "").slice(0, MAX_PHONE_DIGITS);

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

    // Mobile field: digits only, max 10 characters (e.g. 011xxxxxxxx).
    if (phoneEl instanceof HTMLInputElement) {
      phoneEl.addEventListener("input", () => {
        const next = cleanPhone(phoneEl.value);
        if (phoneEl.value !== next) phoneEl.value = next;
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = nameEl instanceof HTMLInputElement ? nameEl.value.trim() : "";
      const phoneRaw = phoneEl instanceof HTMLInputElement ? cleanPhone(phoneEl.value) : "";
      const phone = phoneRaw ? `+60${phoneRaw}` : "";
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

      if (status) status.textContent = "Opening WhatsApp…";

      // More reliable than `window.open` on mobile / strict popup blockers.
      try {
        window.location.href = waUrl;
      } catch {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
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
    wireMobileSingleItemCarousels();
    wireBootstrapCarouselSwipe("servicesCarousel");
    wireBootstrapCarouselSwipe("reviewsCarousel");
    wireMobileServicesArrowAnchor();
    wireMobileReviewsArrowAnchor();
    // Lock services carousel height to the tallest slide so switching slides
    // doesn't make the section "jump". `capToCarouselHeight:false` because the
    // default cap = active item's height (which differs per slide), which would
    // re-introduce the jump.
    wireFixedCarouselHeight("servicesCarousel", { capToCarouselHeight: false });
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
