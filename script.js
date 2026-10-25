/* =========================================================
   GÓC COMIC – script.js
   Phần 1: Hero banner tự chuyển slide sau 3 giây
   ========================================================= */

(function () {
  const slides = document.querySelectorAll(".hero__slide");
  const dots = document.querySelectorAll(".hero__dot");
  const INTERVAL = 3000; // 3 giây

  if (!slides.length) return;

  let current = 0;
  let timer = null;

  function showSlide(index) {
    current = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === current);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
      dot.setAttribute("aria-selected", i === current ? "true" : "false");
    });
  }

  function startAutoPlay() {
    stopAutoPlay();
    timer = setInterval(() => showSlide(current + 1), INTERVAL);
  }

  function stopAutoPlay() {
    if (timer) clearInterval(timer);
  }

  // Bấm chấm → chuyển slide và đếm lại 3 giây từ đầu
  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      showSlide(i);
      startAutoPlay();
    });
  });

  // Tab bị ẩn thì tạm dừng, quay lại thì chạy tiếp
  document.addEventListener("visibilitychange", () => {
    document.hidden ? stopAutoPlay() : startAutoPlay();
  });

  showSlide(0);
  startAutoPlay();
})();

/* =========================================================
   Phần 2: BXH – các quả bóng nảy tự do trong khung
   - Chỉ va chạm với thành khung, KHÔNG va chạm nhau
   - Top 1 ở layer trên cùng, top 10 ở layer dưới cùng
   ========================================================= */
(function () {
  const arena = document.querySelector(".bxh__balls");
  if (!arena) return;

  // Đường kính mỗi quả theo tỉ lệ bề rộng khung (từ top 1 → top 10)
  const SIZE_RATIO = [0.30, 0.28, 0.26, 0.25, 0.24, 0.23, 0.22, 0.21, 0.20, 0.19];
  // Tốc độ theo bề rộng khung mỗi giây: nhỏ nhất → lớn nhất (đổi 2 số này để nảy nhanh/chậm)
  const SPEED_MIN = 0.16;
  const SPEED_MAX = 0.28;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = Array.from(arena.querySelectorAll(".ball"));

  const balls = els.map((el, i) => {
    el.style.zIndex = String(els.length - i); // top 1 → z-index lớn nhất
    return { el, ratio: SIZE_RATIO[i] || 0.2, d: 0, x: 0, y: 0, vx: 0, vy: 0 };
  });

  let w = 0;
  let h = 0;
  let rafId = null;
  let last = 0;

  function layout() {
    const nw = arena.clientWidth;
    const nh = arena.clientHeight;
    if (!nw || !nh) return;

    if (!w) {
      // Lần đầu: đặt vị trí và hướng bay ngẫu nhiên
      w = nw;
      h = nh;
      balls.forEach((b) => {
        b.d = b.ratio * w;
        b.x = Math.random() * (w - b.d);
        b.y = Math.random() * (h - b.d);

        const speed = w * (SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN));
        let angle;
        do {
          angle = Math.random() * Math.PI * 2;
        } while (Math.abs(Math.cos(angle)) < 0.3 || Math.abs(Math.sin(angle)) < 0.3);
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;

        b.el.style.width = b.el.style.height = b.d + "px";
      });
      return;
    }

    // Khi khung đổi kích thước: co giãn vị trí, tốc độ và kích thước theo tỉ lệ
    const sx = nw / w;
    const sy = nh / h;
    balls.forEach((b) => {
      b.d = b.ratio * nw;
      b.x = Math.min(b.x * sx, nw - b.d);
      b.y = Math.min(b.y * sy, nh - b.d);
      b.vx *= sx;
      b.vy *= sx;
      b.el.style.width = b.el.style.height = b.d + "px";
    });
    w = nw;
    h = nh;
  }

  function render() {
    balls.forEach((b) => {
      b.el.style.transform = "translate3d(" + b.x + "px," + b.y + "px,0)";
    });
  }

  function step(dt) {
    balls.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Chạm thành trái/phải
      if (b.x <= 0) {
        b.x = 0;
        b.vx = Math.abs(b.vx);
      } else if (b.x >= w - b.d) {
        b.x = w - b.d;
        b.vx = -Math.abs(b.vx);
      }

      // Chạm thành trên/dưới
      if (b.y <= 0) {
        b.y = 0;
        b.vy = Math.abs(b.vy);
      } else if (b.y >= h - b.d) {
        b.y = h - b.d;
        b.vy = -Math.abs(b.vy);
      }
    });
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05); // tránh nhảy vọt khi quay lại tab
    last = now;
    step(dt);
    render();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId || reduceMotion) return;
    last = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  layout();
  render();

  new ResizeObserver(() => {
    layout();
    render();
  }).observe(arena);

  // Chỉ chạy khi khung BXH đang hiện trên màn hình để đỡ tốn máy
  new IntersectionObserver((entries) => {
    entries[0].isIntersecting ? start() : stop();
  }).observe(arena);
})();

/* =========================================================
   Phần 3: Tab chuyên mục + carousel bài viết
   - Bấm tab → đổi màu khung và nội dung
   - Nút ← → lướt từng thẻ, đến thẻ cuối thì quay lại thẻ đầu
   - Menu chuyên mục trên header → cuộn tới và mở đúng tab
   ========================================================= */
(function () {
  const root = document.querySelector(".tabs");
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll(".tabs__tab"));
  const panes = Array.from(root.querySelectorAll(".tabs__pane"));

  /* ----- Tab ----- */
  function activate(index) {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    panes.forEach((pane, i) => {
      pane.hidden = i !== index;
    });
    root.dataset.active = index; // CSS đổi màu khung theo giá trị này
  }

  // Ghi tab đang xem vào địa chỉ trang (#tên-chuyên-mục) mà KHÔNG tạo thêm mục lịch sử.
  // Nhờ vậy bấm vào bài viết rồi quay lại, trang mở lại đúng tab đang xem.
  function rememberTab(index) {
    try {
      history.replaceState(null, "", "#" + tabs[index].id);
    } catch (err) {
      /* một số trình duyệt chặn khi mở file trực tiếp, bỏ qua */
    }
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => {
      activate(i);
      rememberTab(i);
    });

    // Phím ← → chuyển tab khi đang focus trên tab
    tab.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      activate(next);
      rememberTab(next);
      tabs[next].focus();
    });
  });

  function indexFromHash(hash) {
    const id = hash.replace("#", "");
    return tabs.findIndex((t) => t.id === id);
  }

  // Mọi link trong trang trỏ tới một tab (menu header, nút "Link bình chọn"...):
  // mở đúng tab rồi cuộn tới
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const hash = link.getAttribute("href");
      const index = indexFromHash(hash);
      if (index === -1) return;
      e.preventDefault();
      activate(index);
      rememberTab(index);
      tabs[index].scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Mở trang (hoặc quay lại từ bài viết) với #tên-chuyên-mục → mở đúng tab.
  // Chỉ đổi tab, không tự cuộn: trình duyệt tự khôi phục vị trí cuộn cũ khi quay lại.
  if (location.hash) {
    const index = indexFromHash(location.hash);
    if (index !== -1) activate(index);
  }

  /* ----- Carousel của từng tab ----- */
  panes.forEach((pane) => {
    const track = pane.querySelector(".carousel__track");
    if (!track) return; // tab chưa có bài (Phòng tám truyện)

    const nav = pane.querySelector(".carousel-nav");
    const prev = pane.querySelector(".carousel-btn--prev");
    const next = pane.querySelector(".carousel-btn--next");
    const total = track.children.length;
    let index = 0;

    // Số thẻ hiện cùng lúc lấy từ biến CSS --visible (3 / 2 / 1 theo màn hình)
    function visible() {
      return parseInt(getComputedStyle(pane).getPropertyValue("--visible"), 10) || 3;
    }

    function maxIndex() {
      return Math.max(0, total - visible());
    }

    function update() {
      index = Math.min(index, maxIndex());
      track.style.setProperty("--i", index);
      nav.hidden = maxIndex() === 0; // ít thẻ hơn số hiện cùng lúc thì ẩn nút
    }

    next.addEventListener("click", () => {
      index = index >= maxIndex() ? 0 : index + 1; // hết thẻ cuối → về thẻ đầu
      update();
    });

    prev.addEventListener("click", () => {
      index = index <= 0 ? maxIndex() : index - 1; // đang ở thẻ đầu → nhảy tới thẻ cuối
      update();
    });

    window.addEventListener("resize", update);
    update();
  });
})();

/* =========================================================
   Phần 4: Phòng tám truyện – bình chọn + đề xuất truyện
   (dán vào CUỐI file script.js)
   - Chọn tối đa 3 truyện, đủ 3 thì các bìa còn lại bị khóa
   - Nút ← → lướt từng trang bìa, hết thì quay về đầu
   - Bình chọn xong hiện hộp cảm ơn, khóa form 7 ngày (lưu trên trình duyệt)
   ========================================================= */
(function () {
  const form = document.getElementById("poll-form");
  if (!form) return;

  const MAX = 3;
  const LOCK_DAYS = 7;
  const STORE_KEY = "goccomic-poll";

  const track = form.querySelector(".poll__track");
  const inputs = Array.from(form.querySelectorAll(".pick__input"));
  const submit = form.querySelector(".poll__submit");
  const status = form.querySelector(".poll__status"); // chỉ dành cho trình đọc màn hình
  const thanks = document.getElementById("poll-thanks");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ----- Gửi kết quả -----
     Hiện chỉ lưu trên trình duyệt của người xem. Muốn tính phiếu thật,
     gửi `ids` tới Google Form / Formspree / máy chủ riêng tại đây. */
  function sendVote(ids) {
    // ví dụ: fetch("https://.../vote", { method: "POST", body: JSON.stringify({ ids }) });
  }

  function sendSuggestion(text) {
    // ví dụ: fetch("https://.../suggest", { method: "POST", body: JSON.stringify({ text }) });
  }

  /* ----- Chọn tối đa 3 ----- */
  function refresh() {
    const n = inputs.filter((i) => i.checked).length;
    inputs.forEach((i) => {
      i.disabled = !i.checked && n >= MAX;
    });
    submit.disabled = n === 0;
    status.textContent = n === 0 ? "" : "Đã chọn " + n + "/" + MAX + " truyện";
  }

  inputs.forEach((i) => i.addEventListener("change", refresh));

  /* ----- Khóa form sau khi bình chọn ----- */
  function lock() {
    inputs.forEach((i) => (i.disabled = true));
    submit.disabled = true;
    submit.textContent = "Đã bình chọn";
  }

  function showThanks() {
    if (!thanks) return;
    if (typeof thanks.showModal === "function") thanks.showModal();
    else thanks.setAttribute("open", "");
  }

  if (thanks) {
    thanks.querySelector(".thanks__close").addEventListener("click", () => thanks.close());
    // bấm ra ngoài hộp thì đóng
    thanks.addEventListener("click", (e) => {
      if (e.target === thanks) thanks.close();
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const ids = inputs.filter((i) => i.checked).map((i) => i.value);
    if (!ids.length) return;
    sendVote(ids);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ time: Date.now(), ids }));
    } catch (err) {
      /* trình duyệt chặn lưu trữ, bỏ qua */
    }
    lock();
    showThanks();
  });

  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && Date.now() - saved.time < LOCK_DAYS * 86400000) {
      inputs.forEach((i) => (i.checked = saved.ids.includes(i.value)));
      lock();
    } else {
      refresh();
    }
  } catch (err) {
    refresh();
  }

  /* ----- Nút ← → ----- */
  function pageStep() {
    const items = track.children;
    const visible = Math.max(
      1,
      Math.floor(parseFloat(getComputedStyle(track).getPropertyValue("--poll-visible")) || 4)
    );
    if (items.length < 2) return track.clientWidth;
    return (items[1].offsetLeft - items[0].offsetLeft) * visible; // bề rộng 1 bìa + khoảng cách
  }

  function slide(dir) {
    const max = track.scrollWidth - track.clientWidth;
    let target = track.scrollLeft + dir * pageStep();
    if (dir > 0 && track.scrollLeft >= max - 2) target = 0; // hết → về đầu
    if (dir < 0 && track.scrollLeft <= 2) target = max;     // đầu → nhảy tới cuối
    track.scrollTo({ left: target, behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  form.querySelectorAll(".poll__arrow").forEach((btn) => {
    btn.addEventListener("click", () => slide(Number(btn.dataset.dir)));
  });

  /* ----- Đề xuất thêm truyện ----- */
  const suggestForm = document.getElementById("suggest-form");
  if (!suggestForm) return;
  const suggestInput = suggestForm.querySelector(".suggest__input");
  const suggestStatus = suggestForm.querySelector(".suggest__status");

  suggestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = suggestInput.value.trim();
    if (!text) {
      suggestStatus.textContent = "Hãy nhập tên truyện bạn muốn đề xuất.";
      suggestInput.focus();
      return;
    }
    sendSuggestion(text);
    suggestStatus.textContent = "Đã nhận đề xuất “" + text + "”. Cảm ơn bạn!";
    suggestInput.value = "";
  });
})();

/* =========================================================
   Phần 5: Chân trang – đăng ký nhận tin
   (dán vào CUỐI file script.js)
   ========================================================= */
(function () {
  const form = document.getElementById("subscribe-form");
  if (!form) return;

  const input = form.querySelector(".footer__input");
  const status = form.querySelector(".footer__news-status");

  // Hiện chỉ báo "Cảm ơn" trên trang. Muốn lưu email thật, gửi `email`
  // tới Mailchimp / Google Form / máy chủ riêng tại đây.
  function sendSubscribe(email) {
    // ví dụ: fetch("https://.../subscribe", { method: "POST", body: JSON.stringify({ email }) });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email || !input.checkValidity()) {
      status.textContent = "Vui lòng nhập email hợp lệ.";
      input.focus();
      return;
    }
    sendSubscribe(email);
    status.textContent = "Cảm ơn bạn đã đăng ký!";
    input.value = "";
  });
})();

/* =========================================================
   Phần 6: Hiện dần từng khối khi cuộn trang từ trên xuống
   (dán vào CUỐI file script.js, sau các phần khác)
   - Mỗi nhóm hiện khi cuộn tới, các phần tử trong nhóm hiện lần lượt
   - Muốn thêm/bớt khối nào: sửa danh sách GROUPS bên dưới
   ========================================================= */
(function () {
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const STEP = 110; // ms giữa hai phần tử liền nhau trong một nhóm
  const MAX_STEPS = 4; // nhóm dài thì các phần tử sau hiện cùng lúc, tránh chờ lâu

  /* [phần tử gốc để canh thời điểm, các phần tử sẽ hiện (tính từ gốc, bỏ trống = chính gốc)] */
  const GROUPS = [
    // Giới thiệu
    [".intro__inner", ":scope > *"],
    // Bảng xếp hạng + Đọc nhiều
    [".bxh-card", null],
    [".popular", ".popular__heading, .popular__list > li"],
    // Hàng tab
    [".tabs__list", null],
    // Phòng tám truyện: phần bình chọn
    [".poll", ":scope > .poll__title, :scope > .poll__note, :scope > .poll__form, :scope > .suggest"],
    // Thẻ bài viết của từng tab (hiện lại mỗi khi mở tab)
    [".carousel", ".card"],
    [".carousel-nav", null],
    // Chân trang
    [".footer__inner", ":scope > *"],
    [".footer__bottom", null],
  ];

  const itemsByRoot = new Map();

  GROUPS.forEach(([rootSel, itemSel]) => {
    document.querySelectorAll(rootSel).forEach((root) => {
      const items = itemSel ? Array.from(root.querySelectorAll(itemSel)) : [root];
      if (!items.length) return;
      items.forEach((el, i) => {
        el.classList.add("reveal");
        el.style.setProperty("--reveal-delay", Math.min(i, MAX_STEPS) * STEP + "ms");
      });
      itemsByRoot.set(root, items);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        itemsByRoot.get(entry.target).forEach((el) => el.classList.add("is-visible"));
        observer.unobserve(entry.target);
      });
    },
    // Hiện khi khối nhô lên khỏi mép dưới màn hình một đoạn nhỏ
    { rootMargin: "0px 0px -10% 0px", threshold: 0 }
  );

  itemsByRoot.forEach((_, root) => observer.observe(root));

  // Bật hiệu ứng sau cùng, khi mọi thứ đã sẵn sàng
  document.documentElement.classList.add("js-reveal");
})();


/* =========================================================
   Phần 5: Trang bài viết – carousel "Bài liên quan"
   - Nút ← → lướt từng thẻ, hết thì quay lại (giống carousel trang chủ)
   - Số thẻ hiện cùng lúc lấy từ biến CSS --visible (3 / 2 / 1 theo màn hình)
   ========================================================= */
(function () {
  const root = document.querySelector(".related");
  if (!root) return;

  const track = root.querySelector(".related__track");
  const nav = root.querySelector(".related__nav");
  const prev = root.querySelector(".related__prev");
  const next = root.querySelector(".related__next");
  const total = track.children.length;
  let index = 0;

  function visible() {
    return parseInt(getComputedStyle(root).getPropertyValue("--visible"), 10) || 3;
  }

  function maxIndex() {
    return Math.max(0, total - visible());
  }

  function update() {
    index = Math.min(index, maxIndex());
    track.style.setProperty("--i", index);
    nav.hidden = maxIndex() === 0; // ít thẻ hơn số hiện cùng lúc thì ẩn nút
  }

  next.addEventListener("click", () => {
    index = index >= maxIndex() ? 0 : index + 1;
    update();
  });

  prev.addEventListener("click", () => {
    index = index <= 0 ? maxIndex() : index - 1;
    update();
  });

  window.addEventListener("resize", update);
  update();
})();

/* =========================================================
   Phần 7: Đổi ngôn ngữ VIE ⇄ ENG + Tìm kiếm bài viết
   (dán vào CUỐI file script.js – KHÔNG cần sửa file HTML nào)

   - Bấm "VIE" → hiện thêm "ENG" ngay bên dưới; chọn để đổi ngôn ngữ
   - Bấm icon kính lúp → hiện khung tìm kiếm ngay bên dưới icon
   - Ngôn ngữ được nhớ trên trình duyệt (localStorage), chuyển trang vẫn giữ

   Cách dịch: script quét toàn bộ chữ trên trang và thay theo từ điển
   VI → EN bên dưới. Chữ nào chưa có trong từ điển thì giữ nguyên tiếng Việt.

   KHI THÊM BÀI MỚI: thêm 1 dòng vào mảng ARTICLES (để tìm kiếm được và
   có tiêu đề tiếng Anh).
   ========================================================= */

(function () {
  "use strict";

  const LANG_KEY = "goccomic-lang";
  const SITE_NAME = "Góc Comic";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const CODE = { vi: "VIE", en: "ENG" };

  const actions = document.querySelector(".header__actions");
  if (!actions) return;

  const langBtn = actions.querySelector(".lang-btn");
  const searchBtn = actions.querySelector(".icon-btn:not(.icon-btn--menu)");
  if (!langBtn || !searchBtn) return;

  /* ===================================================
     1. DỮ LIỆU BÀI VIẾT (dùng cho tìm kiếm + dịch tiêu đề)
     =================================================== */

  // Chỉ số chuyên mục: 0..4 theo thứ tự tab ở trang chủ
  const CATS = [
    { vi: "Truyện động", en: "Comic News" },
    { vi: "Người vẽ truyện", en: "Creators" },
    { vi: "Gợi ý đọc", en: "Reading Picks" },
    { vi: "Giải mã truyện", en: "Story Decoded" },
    { vi: "Phòng tám truyện", en: "Chat Room" },
  ];

  // [tên file (không có .html), chuyên mục, tác giả, ngày yyyy-mm-dd, tiêu đề VI, tiêu đề EN]
  const ARTICLES = [
    // ----- Truyện động -----
    ["tougen_anki_2_tro_lai_voi_arc_thac_kegon_cuoc_chien_oni_va_momotaro_tiep_tuc_len_song", 0, "Bùi Thúy", "2026-10-22",
      "TOUGEN ANKI 2 trở lại với arc thác Kegon: Cuộc chiến Oni và Momotaro tiếp tục lên sóng!",
      "TOUGEN ANKI 2 returns with the Kegon Falls arc: the Oni vs. Momotaro war goes on air!"],
    ["5_anime_he_2026_de_lai_dau_an_o_nhung_tap_cuoi", 0, "Định Lương", "2026-10-16",
      "5 anime hè 2026 để lại dấu ấn ở những tập cuối",
      "5 summer 2026 anime that left their mark in the final episodes"],
    ["truyen_tranh_viet_sap_gop_mat_tai_frankfurt_2026_dua_sang_tao_cua_tac_gia_viet_ra_the_gioi", 0, "Nguyễn Lan", "2026-10-15",
      "Truyện tranh Việt sắp góp mặt tại Frankfurt 2026, đưa sáng tạo của tác giả Việt ra thế giới",
      "Vietnamese comics set to appear at Frankfurt 2026, taking Vietnamese creativity to the world"],
    ["tu_webtoon_den_man_anh_rong_guardians_of_the_video_game_mo_duong_cho_phim_hoat_hinh_han_quoc", 0, "Linh Anh", "2026-10-12",
      "Từ webtoon đến màn ảnh rộng: “Guardians of the Video Game” mở đường cho phim hoạt hình Hàn Quốc",
      "From webtoon to the big screen: “Guardians of the Video Game” paves the way for Korean animated films"],
    ["doc_manga_bang_100_ngon_ngu_shueisha_mo_rong_the_gioi_truyen_tranh_voi_manga_million", 0, "Bình An", "2026-10-07",
      "Đọc manga bằng 100 ngôn ngữ? Shueisha mở rộng thế giới truyện tranh với MANGA MILLION!",
      "Reading manga in 100 languages? Shueisha expands the world of comics with MANGA MILLION!"],
    ["khong_can_la_mangaka_chuyen_nghiep_canh_cua_xuat_ban_manga_dang_mo_rong_cho_nha_sang_tao_moi", 0, "Hồng Nhung", "2026-09-30",
      "Không cần là mangaka chuyên nghiệp: Cánh cửa xuất bản manga đang mở rộng cho nhà sáng tạo mới",
      "You don’t have to be a professional mangaka: the door to manga publishing is opening wider for new creators"],
    ["here_u_are_chinh_thuc_duoc_chuyen_the_anime_chuyen_tinh_thanh_xuan_khien_fan_manhua_mong_cho", 0, "Kiều Trinh", "2026-09-14",
      "“Here U Are” chính thức được chuyển thể anime: Chuyện tình thanh xuân khiến fan manhua mong chờ",
      "“Here U Are” gets an official anime adaptation: the youth romance manhua fans have been waiting for"],

    // ----- Người vẽ truyện -----
    ["eiichiro_oda_hanh_trinh_tu_cau_be_me_hai_tac_den_cha_de_cua_one_piece", 1, "Lam Giang", "2026-10-20",
      "EIICHIRO ODA - Hành trình từ cậu bé mê hải tặc đến cha đẻ của One Piece",
      "EIICHIRO ODA - From a pirate-obsessed kid to the creator of One Piece"],
    ["nguyen_thanh_phong_cung_hanh_trinh_dua_chat_lieu_viet_vao_truyen_tranh", 1, "Minh Long", "2026-10-14",
      "Nguyễn Thành Phong cùng hành trình đưa chất liệu Việt vào truyện tranh",
      "Nguyễn Thành Phong and his journey of bringing Vietnamese elements into comics"],
    ["hanh_trinh_tao_nen_nhung_tuong_dai_manga_cua_rumiko_takahashi", 1, "Kim Ngân", "2026-10-10",
      "Hành trình tạo nên những tượng đài manga của RUMIKO TAKAHASHI",
      "The journey behind RUMIKO TAKAHASHI’s manga landmarks"],
    ["naoki_urasawa_va_nhung_cau_chuyen_manga_di_sau_vao_tam_ly_con_nguoi", 1, "Thu Phương", "2026-09-24",
      "Naoki Urasawa và những câu chuyện manga đi sâu vào tâm lý con người",
      "Naoki Urasawa and manga stories that dive deep into the human psyche"],
    ["siu_va_the_gioi_khong_lo_duoc_kien_tao_trong_tower_of_god", 1, "Hải Anh", "2026-09-18",
      "SIU và thế giới khổng lồ được kiến tạo trong Tower of God",
      "SIU and the enormous world built in Tower of God"],
    ["carnby_kim_cung_hanh_trinh_tao_nen_hien_tuong_sweet_home_tu_nhung_cau_chuyen_kinh_di", 1, "Mỹ Linh", "2026-09-09",
      "Carnby Kim cùng hành trình tạo nên hiện tượng Sweet Home từ những câu chuyện kinh dị",
      "Carnby Kim and the journey of creating the Sweet Home phenomenon from horror stories"],
    ["one_tu_webcomic_net_ve_don_gian_den_nhung_tac_pham_vuon_ra_toan_cau", 1, "Thuỳ Dương", "2026-09-01",
      "ONE từ webcomic nét vẽ đơn giản đến những tác phẩm vươn ra toàn cầu",
      "ONE: from a simply drawn webcomic to works that reached the world"],
    ["le_linh_va_nhung_nhan_vat_gan_lien_voi_tuoi_tho_qua_than_dong_dat_viet", 1, "Hoàng Tùng", "2026-08-26",
      "Lê Linh và những nhân vật gắn liền với tuổi thơ qua Thần Đồng Đất Việt",
      "Lê Linh and the childhood characters of Thần Đồng Đất Việt"],

    // ----- Gợi ý đọc -----
    ["top_5_truyen_tranh_viet_nam_dang_duoc_doc_gia_chu_y", 2, "An Đặng", "2026-10-15",
      "Top 5 truyện tranh Việt Nam đang được độc giả chú ý",
      "Top 5 Vietnamese comics catching readers’ attention"],
    ["top_5_manga_dang_duoc_san_don_tren_bilibili_manga", 2, "Đông Anh", "2026-10-03",
      "Top 5 manga đang được săn đón trên Bilibili Manga",
      "Top 5 manga in high demand on Bilibili Manga"],
    ["top_5_manhua_trung_quoc_dang_duoc_yeu_thich_tren_bilibili_manga", 2, "Quỳnh Nguyên", "2026-09-21",
      "Top 5 manhua Trung Quốc đang được yêu thích trên Bilibili Manga",
      "Top 5 Chinese manhua loved on Bilibili Manga"],
    ["top_5_webtoon_han_quoc_dang_noi_bat_tren_webtoon", 2, "Kim Ngân", "2026-09-17",
      "Top 5 webtoon Hàn Quốc đang nổi bật trên WEBTOON",
      "Top 5 Korean webtoons standing out on WEBTOON"],
    ["10_bo_truyen_tranh_duoi_18_tuoi_nen_doc_it_nhat_mot_lan", 2, "Duy Bình", "2026-09-05",
      "10 bộ truyện tranh dưới 18 tuổi nên đọc ít nhất một lần",
      "10 comics under-18s should read at least once"],
    ["5_dieu_thu_vi_ve_thoi_quen_doc_manga_va_webtoon_cua_gen_z_nam_2026", 2, "Khánh Vân", "2026-09-03",
      "5 điều thú vị về thói quen đọc manga và webtoon của Gen Z năm 2026",
      "5 interesting facts about Gen Z’s manga and webtoon reading habits in 2026"],
    ["top_5_manga_va_tac_pham_truyen_minh_hoa_giup_kham_pha_van_hoa_nhat_ban", 2, "Xuân Lan", "2026-08-26",
      "Top 5 manga và tác phẩm truyện minh họa giúp khám phá văn hóa Nhật Bản",
      "Top 5 manga and illustrated works that help you explore Japanese culture"],

    // ----- Giải mã truyện -----
    ["frieren_beyond_journeys_end_va_hanh_trinh_gia_tuong_cham_rai_nhung_day_cam_xuc", 3, "Lê Bích", "2026-10-24",
      "Frieren: Beyond Journey’s End và hành trình giả tưởng chậm rãi nhưng đầy cảm xúc",
      "Frieren: Beyond Journey’s End and a slow-paced yet deeply emotional fantasy journey"],
    ["nhat_nhan_chi_ha_khi_van_hoa_truyen_thong_tro_thanh_chat_lieu_xay_dung_the_gioi_truyen", 3, "Hải Yến", "2026-10-20",
      "Nhất Nhân Chi Hạ - Khi văn hóa truyền thống trở thành chất liệu xây dựng thế giới truyện",
      "Nhất Nhân Chi Hạ - When traditional culture becomes the building material of a story world"],
    ["long_than_tuong_ke_lich_su_viet_nam_bang_ngon_ngu_truyen_tranh", 3, "Thuỳ Linh", "2026-10-13",
      "Long Thần Tướng kể lịch sử Việt Nam bằng ngôn ngữ truyện tranh",
      "Long Thần Tướng tells Vietnamese history in the language of comics"],
    ["the_gioi_rong_lon_qua_doi_mat_co_be_5_tuoi_yotsuba", 3, "Phan Anh", "2026-10-09",
      "Thế giới rộng lớn qua đôi mắt cô bé 5 tuổi Yotsuba",
      "A vast world through the eyes of 5-year-old Yotsuba"],
    ["co_di_ma_lay_chong_toi_khi_co_hoi_thu_hai_tro_thanh_cuoc_tra_thu", 3, "Thuỳ Chi", "2026-10-06",
      "Cô đi mà lấy chồng tôi: Khi cơ hội thứ hai trở thành cuộc trả thù",
      "“Cô đi mà lấy chồng tôi”: when a second chance turns into revenge"],
    ["haikyuu_hanh_trinh_truong_thanh_sau_moi_tran_dau", 3, "Minh An", "2026-10-02",
      "Haikyuu!! - Hành trình trưởng thành sau mỗi trận đấu",
      "Haikyuu!! - A journey of growing up after every match"],
    ["conan_va_nghe_thuat_tao_nen_mot_vu_an_trinh_tham", 3, "Anh Thư", "2026-10-02",
      "Conan và nghệ thuật tạo nên một vụ án trinh thám",
      "Conan and the art of building a detective case"],
    ["tu_doremon_den_doraemon_hanh_trinh_hon_30_nam_cua_chu_meo_may_tai_viet_nam", 3, "Đình Khoa", "2026-09-29",
      "Từ Đôrêmon đến Doraemon: Hành trình hơn 30 năm của chú mèo máy tại Việt Nam",
      "From Đôrêmon to Doraemon: over 30 years of the robot cat in Vietnam"],
    ["luffy_va_quan_niem_ve_tu_do_trong_one_piece", 3, "Mộc Miên", "2026-09-04",
      "Luffy và quan niệm về tự do trong One Piece",
      "Luffy and the idea of freedom in One Piece"],
    ["death_note_va_ranh_gioi_mong_manh_giua_cong_ly_voi_quyen_luc", 3, "Minh Khang", "2026-08-07",
      "Death Note và ranh giới mong manh giữa công lý với quyền lực",
      "Death Note and the thin line between justice and power"],

    // ----- Phòng tám truyện -----
    ["loid_x_yor_khi_vo_chong_gia_bat_dau_co_nhung_cam_xuc_that", 4, "Anh Nguyễn", "2026-10-22",
      "Loid × Yor: Khi “vợ chồng giả” bắt đầu có những cảm xúc thật",
      "Loid × Yor: when the “fake couple” starts to have real feelings"],
    ["long_than_tuong_khi_khung_tranh_ke_nhieu_hon_loi_thoai", 4, "Thu Linh", "2026-10-18",
      "Long Thần Tướng: Khi khung tranh kể nhiều hơn lời thoại",
      "Long Thần Tướng: when the panels say more than the dialogue"],
    ["maomao_khong_chi_giai_an_bang_kien_thuc_hay_nhin_vao_thu_moi_nguoi_bo_qua", 4, "Trang Anh", "2026-10-11",
      "Maomao không chỉ giải án bằng kiến thức: Hãy nhìn vào thứ mọi người bỏ qua",
      "Maomao doesn’t solve cases with knowledge alone: look at what everyone else overlooks"],
    ["khi_tac_gia_giau_mot_loi_giai_trong_canh_truyen_binh_thuong_hoc_cach_soi_hint_tu_witch_watch", 4, "Thảo Lê", "2026-10-05",
      "Khi tác giả giấu một lời giải trong cảnh truyện bình thường: Học cách soi hint từ Witch Watch",
      "When an author hides a solution in an ordinary scene: learning to spot hints from Witch Watch"],
    ["kim_dokja_biet_truoc_tuong_lai_nhung_co_that_su_hieu_cau_chuyen", 4, "Đào Hà", "2026-09-25",
      "Kim Dokja biết trước tương lai, nhưng có thật sự hiểu câu chuyện?",
      "Kim Dokja knows the future, but does he truly understand the story?"],
    ["tac_gia_lo_he_lo_nhung_hint_ngoai_doi_khien_fan_attack_on_titan_phai_doc_lai_tu_dau", 4, "Bích Trần", "2026-09-20",
      "Tác giả lỡ hé lộ? Những hint ngoài đời khiến fan Attack on Titan phải đọc lại từ đầu",
      "Did the author let it slip? Real-life hints that make Attack on Titan fans reread from the start"],
    ["vi_sao_hoi_me_manhua_ngay_cang_bi_cuon_vao_kieu_nhan_vat_phan_dien_chinh", 4, "Đức Vũ", "2026-09-07",
      "Vì sao hội mê manhua ngày càng bị cuốn vào kiểu nhân vật “phản diện chính”? Gu Changge của I Am the Fated Villain có gì đặc biệt?",
      "Why are manhua fans increasingly drawn to the “main villain” type? What makes Gu Changge of I Am the Fated Villain special?"],
  ].map((a) => ({ slug: a[0], cat: a[1], author: a[2], date: a[3], vi: a[4], en: a[5] }));

  /* ===================================================
     2. TỪ ĐIỂN GIAO DIỆN VI → EN
        (tiêu đề bài viết và tên chuyên mục tự thêm từ phần 1)
     =================================================== */
  const UI = [
    // Header / chung
    ["Góc Comic - Trang chủ", "Góc Comic - Home"],
    ["Chuyên mục", "Categories"],
    ["Mở menu", "Open menu"],
    ["Đọc nhiều", "Most read"],
    ["Bài trước", "Previous article"],
    ["Bài sau", "Next article"],

    // Tiêu đề trang + giới thiệu
    ["Góc Comic – Không gian truyện tranh thế hệ mới", "Góc Comic – A new generation of comics"],
    ["Được xây dựng từ tình yêu với nghệ thuật kể chuyện bằng hình ảnh, Góc Comic là nền tảng tin tức, đánh giá và thảo luận chuyên sâu về Manga, Manhua, Webtoon và Truyện tranh Việt Nam. Tụi mình mang đến nguồn nội dung chọn lọc, góc nhìn mới mẻ và sân chơi mở cho cộng đồng.",
      "Built on a love for visual storytelling, Góc Comic is a platform for news, reviews and in-depth discussion of Manga, Manhua, Webtoon and Vietnamese comics. We bring you curated content, fresh perspectives and an open playground for the community."],
    ["Tuyệt đối không spoil, đánh giá khách quan và luôn tôn trọng trọn vẹn cảm xúc đọc của bạn!",
      "Absolutely no spoilers, objective reviews, and full respect for your reading experience!"],

    // Hero banner
    ["Bài viết nổi bật", "Featured articles"],
    ["Chọn bài nổi bật", "Choose a featured article"],
    ["Đọc ngay", "Read now"],
    ["Không bắt đầu bằng một cuộc chiến hay hành trình tiêu diệt Ma Vương, Frieren - Pháp sư tiễn táng lại mở ra khi cuộc phiêu lưu đã kết thúc.",
      "Instead of opening with a war or a quest to defeat the Demon King, Frieren begins after the adventure has already ended."],
    ["Không kể lịch sử theo lối khô cứng, Long Thần Tướng đưa độc giả trở về thời Trần bằng một câu chuyện dã sử giàu bí ẩn",
      "Rather than telling history in a dry way, Long Thần Tướng takes readers back to the Trần dynasty through a mystery-rich historical tale."],
    ["Trong The Apothecary Diaries, Maomao không phải kiểu thám tử chờ hung thủ tự lộ diện.",
      "In The Apothecary Diaries, Maomao isn’t the kind of detective who waits for the culprit to reveal themselves."],

    // Bảng xếp hạng
    ["Link bình chọn", "Voting link"],
    ["Truyện được", "Most-loved"],
    ["yêu thích nhất", "comics"],
    ["tuần trước", "last week"],
    ["Dược Sư Tự Sự", "The Apothecary Diaries"],

    // Tab
    ["Bài viết theo chuyên mục", "Articles by category"],

    // Phòng tám truyện – bình chọn
    ["Bình chọn truyện yêu thích", "Vote for your favorite comics"],
    ["Bình chọn cho top 3 truyện yêu thích của bạn. Góc Comic sẽ cập nhật top các tác phẩm được yêu thích nhất vào thứ 2 hàng tuần.",
      "Vote for your top 3 favorite comics. Góc Comic updates the most-loved list every Monday."],
    ["Bình chọn", "Vote"],
    ["Đã bình chọn", "Voted"],
    ["Các truyện trước", "Previous comics"],
    ["Các truyện sau", "Next comics"],
    ["Đề xuất thêm truyện", "Suggest a comic"],
    ["Nhập tên truyện bạn muốn đề xuất...", "Enter the title you’d like to suggest..."],
    ["Gửi đề xuất", "Send suggestion"],
    ["Hãy nhập tên truyện bạn muốn đề xuất.", "Please enter the title you want to suggest."],
    ["Cảm ơn bạn đã bình chọn!", "Thanks for voting!"],
    ["Top truyện được yêu thích sẽ cập nhật vào thứ 2 hàng tuần.", "The most-loved list is updated every Monday."],
    ["Đóng", "Close"],

    // Trang bài viết
    ["Bài liên quan", "Related articles"],

    // Chân trang
    ["Mạng xã hội", "Social media"],
    ["CHÍNH SÁCH & HỖ TRỢ", "POLICIES & SUPPORT"],
    ["Điều khoản dịch vụ", "Terms of Service"],
    ["Chính sách bảo mật", "Privacy Policy"],
    ["Bản quyền & DMCA", "Copyright & DMCA"],
    ["Liên hệ:", "Contact:"],
    ["Cùng cập nhật", "Stay in the loop"],
    ["Đăng ký nhận những thông tin mới nhất.", "Sign up for the latest updates."],
    ["Email của bạn", "Your email"],
    ["Đăng ký nhận tin", "Subscribe"],
    ["Vui lòng nhập email hợp lệ.", "Please enter a valid email."],
    ["Cảm ơn bạn đã đăng ký!", "Thanks for subscribing!"],
  ];

  // Chuỗi có số / chữ thay đổi: dịch bằng quy tắc
  const RULES = [
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (m) => MONTHS[Number(m[2]) - 1] + " " + Number(m[1]) + ", " + m[3]],
    [/^Bài (\d+)$/, (m) => "Article " + m[1]],
    [/^Đã chọn (\d+)\/(\d+) truyện$/, (m) => m[1] + "/" + m[2] + " selected"],
    [/^Đã nhận đề xuất “(.+)”\. Cảm ơn bạn!$/, (m) => "Suggestion “" + m[1] + "” received. Thank you!"],
  ];

  // Chữ của chính khung tìm kiếm / nút ngôn ngữ
  const STR = {
    vi: {
      changeLang: "Chuyển ngôn ngữ",
      switchTo: "Chuyển sang tiếng Việt",
      search: "Tìm kiếm",
      placeholder: "Tìm bài viết, tác giả, chuyên mục...",
      none: "Không tìm thấy bài viết phù hợp.",
      note: "",
    },
    en: {
      changeLang: "Change language",
      switchTo: "Switch to English",
      search: "Search",
      placeholder: "Search articles, authors, categories...",
      none: "No matching articles found.",
      note: "This article is currently available in Vietnamese only.",
    },
  };

  /* ===================================================
     3. HÀM DÙNG CHUNG
     =================================================== */

  // Chuẩn hóa để so khớp từ điển: gộp khoảng trắng, đưa ngoặc/gạch ngang về dạng thường
  function norm(s) {
    return s
      .normalize("NFC")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Bỏ dấu tiếng Việt, đổi về chữ thường (độ dài giữ nguyên để tô sáng đúng chỗ)
  function fold(s) {
    let out = "";
    for (const ch of s.normalize("NFC").toLowerCase()) {
      const f = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
      out += f.length === ch.length ? f : ch;
    }
    return out;
  }

  function esc(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function fmtDate(iso, l) {
    const p = iso.split("-").map(Number);
    if (l === "en") return MONTHS[p[1] - 1] + " " + p[2] + ", " + p[0];
    return String(p[2]).padStart(2, "0") + "/" + String(p[1]).padStart(2, "0") + "/" + p[0];
  }

  const DICT = new Map();
  UI.forEach((p) => DICT.set(norm(p[0]), p[1]));
  CATS.forEach((c) => DICT.set(norm(c.vi), c.en));
  ARTICLES.forEach((a) => DICT.set(norm(a.vi), a.en));

  // Dịch một chuỗi, giữ nguyên khoảng trắng đầu/cuối. Trả về null nếu không có bản dịch.
  function translateString(text) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
    const core = m[2].replace(/\s+/g, " ");
    if (!core) return null;
    let out = DICT.get(norm(core));
    if (out === undefined) {
      for (let i = 0; i < RULES.length; i++) {
        const r = RULES[i][0].exec(core);
        if (r) {
          out = RULES[i][1](r);
          break;
        }
      }
    }
    return out === undefined ? null : m[1] + out + m[3];
  }

  /* ===================================================
     4. DỰNG GIAO DIỆN: dropdown ngôn ngữ + khung tìm kiếm
     =================================================== */
  const searchIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="10.5" cy="10.5" r="7"/><line x1="15.8" y1="15.8" x2="21" y2="21"/></svg>';

  // --- Ngôn ngữ ---
  const langWrap = document.createElement("div");
  langWrap.className = "lang";
  langWrap.setAttribute("data-no-i18n", "");
  langBtn.parentNode.insertBefore(langWrap, langBtn);
  langWrap.appendChild(langBtn);

  const langMenu = document.createElement("div");
  langMenu.className = "lang__menu";
  langMenu.id = "lang-menu";
  langMenu.hidden = true;
  langMenu.innerHTML =
    '<button class="lang__option" type="button"><span class="lang-btn__dot"></span><span></span></button>';
  langWrap.appendChild(langMenu);
  const langOption = langMenu.querySelector(".lang__option");

  langBtn.setAttribute("aria-haspopup", "true");
  langBtn.setAttribute("aria-expanded", "false");
  langBtn.setAttribute("aria-controls", "lang-menu");

  // --- Tìm kiếm ---
  const searchWrap = document.createElement("div");
  searchWrap.className = "search";
  searchWrap.setAttribute("data-no-i18n", "");
  searchBtn.parentNode.insertBefore(searchWrap, searchBtn);
  searchWrap.appendChild(searchBtn);

  const panel = document.createElement("div");
  panel.className = "search__panel";
  panel.id = "search-panel";
  panel.hidden = true;
  panel.innerHTML =
    '<form class="search__form" role="search" novalidate>' +
    '<input class="search__input" type="search" autocomplete="off" spellcheck="false">' +
    '<button class="search__go" type="submit">' + searchIcon + "</button>" +
    "</form>" +
    '<ul class="search__results"></ul>' +
    '<p class="search__empty" role="status" hidden></p>';
  searchWrap.appendChild(panel);

  const form = panel.querySelector(".search__form");
  const input = panel.querySelector(".search__input");
  const goBtn = panel.querySelector(".search__go");
  const list = panel.querySelector(".search__results");
  const empty = panel.querySelector(".search__empty");

  searchBtn.setAttribute("aria-expanded", "false");
  searchBtn.setAttribute("aria-controls", "search-panel");

  /* ===================================================
     5. TRẠNG THÁI + DỊCH TRANG
     =================================================== */
  let lang = "vi";
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "vi") lang = saved;
  } catch (err) {
    /* trình duyệt chặn lưu trữ, bỏ qua */
  }

  const titleVi = document.title;
  const textStore = new WeakMap(); // text node → { orig: chữ tiếng Việt gốc, shown: chữ đang hiển thị }
  const ATTRS = ["aria-label", "placeholder", "title", "alt"];

  function skip(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return true;
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(el.tagName)) return true;
    return !!el.closest("[data-no-i18n]");
  }

  function translateTextNode(node) {
    const rec = textStore.get(node);
    const cur = node.nodeValue;
    // Nếu trang (script khác) vừa đổi chữ này thì coi chữ mới là bản gốc tiếng Việt
    const orig = rec && rec.shown === cur ? rec.orig : cur;
    if (lang === "en") {
      const out = translateString(orig);
      if (out !== null && out !== orig) {
        textStore.set(node, { orig: orig, shown: out });
        if (cur !== out) node.nodeValue = out;
        return;
      }
    }
    if (rec) textStore.delete(node);
    if (cur !== orig) node.nodeValue = orig;
  }

  function translateAttrs(el) {
    ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      const key = "data-vi-" + a;
      const orig = el.hasAttribute(key) ? el.getAttribute(key) : el.getAttribute(a);
      if (lang === "en") {
        const out = translateString(orig);
        if (out !== null) {
          if (!el.hasAttribute(key)) el.setAttribute(key, orig);
          if (el.getAttribute(a) !== out) el.setAttribute(a, out);
        }
      } else if (el.hasAttribute(key)) {
        el.setAttribute(a, orig);
        el.removeAttribute(key);
      }
    });
  }

  function translateTree(root) {
    if (root.nodeType === 3) {
      if (!skip(root)) translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1 || skip(root)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      if (!skip(n)) translateTextNode(n);
    });
    translateAttrs(root);
    root.querySelectorAll("*").forEach((el) => {
      if (!skip(el)) translateAttrs(el);
    });
  }

  function translateTitle() {
    let t = titleVi;
    if (lang === "en") {
      let out = translateString(titleVi);
      if (out === null) {
        const suffix = " – " + SITE_NAME;
        if (titleVi.endsWith(suffix)) {
          const head = translateString(titleVi.slice(0, -suffix.length));
          if (head !== null) out = head + suffix;
        }
      }
      if (out !== null) t = out;
    }
    document.title = t;
  }

  // Bài viết chưa có bản tiếng Anh: báo nhẹ ở đầu bài khi đang ở chế độ ENG
  function updateArticleNote() {
    const art = document.querySelector("article.article");
    if (!art) return;
    let note = art.querySelector(".lang-note");
    if (lang === "en") {
      if (!note) {
        note = document.createElement("p");
        note.className = "lang-note";
        note.setAttribute("data-no-i18n", "");
        art.insertBefore(note, art.firstChild);
      }
      note.textContent = STR.en.note;
    } else if (note) {
      note.remove();
    }
  }

  // Khi script khác đổi chữ trên trang (vd. "Đã chọn 2/3 truyện") → dịch ngay
  const observer = new MutationObserver((records) => {
    if (lang === "en") {
      records.forEach((r) => {
        if (r.type === "characterData") {
          if (!skip(r.target)) translateTextNode(r.target);
        } else {
          r.addedNodes.forEach(translateTree);
        }
      });
    }
    observer.takeRecords(); // bỏ qua các thay đổi do chính script này gây ra
  });

  function renderChrome() {
    const s = STR[lang];
    const other = lang === "vi" ? "en" : "vi";
    langBtn.querySelector("span:last-child").textContent = CODE[lang];
    langBtn.setAttribute("aria-label", s.changeLang);
    langOption.dataset.lang = other;
    langOption.lang = other;
    langOption.querySelector("span:last-child").textContent = CODE[other];
    langOption.setAttribute("aria-label", STR[other].switchTo);
    searchBtn.setAttribute("aria-label", s.search);
    input.placeholder = s.placeholder;
    input.setAttribute("aria-label", s.search);
    goBtn.setAttribute("aria-label", s.search);
    empty.textContent = s.none;
  }

  function setLang(next, persist) {
    lang = next;
    document.documentElement.lang = next;
    translateTree(document.body);
    translateTitle();
    renderChrome();
    updateArticleNote();
    observer.takeRecords();
    if (persist) {
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch (err) {
        /* bỏ qua */
      }
    }
    if (!panel.hidden) renderResults();
  }

  /* ===================================================
     6. TÌM KIẾM
     =================================================== */
  ARTICLES.forEach((a) => {
    a.t = fold(a.vi + " " + a.en);
    a.m = fold(a.author + " " + CATS[a.cat].vi + " " + CATS[a.cat].en);
  });

  function search(q) {
    const tokens = fold(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const phrase = tokens.join(" ");
    const found = [];
    ARTICLES.forEach((a) => {
      let score = a.t.indexOf(phrase) !== -1 ? 5 : 0;
      for (let i = 0; i < tokens.length; i++) {
        if (a.t.indexOf(tokens[i]) !== -1) score += 3;
        else if (a.m.indexOf(tokens[i]) !== -1) score += 1;
        else return; // thiếu một từ khóa → loại
      }
      found.push({ a: a, score: score });
    });
    found.sort((x, y) => y.score - x.score || (y.a.date > x.a.date ? 1 : -1));
    return found.slice(0, 6).map((f) => f.a);
  }

  // Tô sáng từ khóa trong tiêu đề (không phân biệt dấu)
  function highlight(title, tokens) {
    const t = title.normalize("NFC");
    const f = fold(t);
    if (f.length !== t.length) return esc(t);
    const on = new Array(t.length).fill(false);
    tokens.forEach((tok) => {
      let i = f.indexOf(tok);
      while (i !== -1) {
        for (let k = i; k < i + tok.length; k++) on[k] = true;
        i = f.indexOf(tok, i + tok.length);
      }
    });
    let out = "";
    let open = false;
    for (let i = 0; i < t.length; i++) {
      if (on[i] && !open) { out += "<mark>"; open = true; }
      if (!on[i] && open) { out += "</mark>"; open = false; }
      out += esc(t[i]);
    }
    return open ? out + "</mark>" : out;
  }

  let results = [];
  let items = [];
  let active = -1;

  function setActive(i) {
    active = i;
    items.forEach((el, k) => el.classList.toggle("is-active", k === i));
    if (items[i] && items[i].scrollIntoView) items[i].scrollIntoView({ block: "nearest" });
  }

  function renderResults() {
    const q = input.value.trim();
    results = q ? search(q) : [];
    const tokens = fold(q).split(/\s+/).filter(Boolean);
    list.innerHTML = "";
    results.forEach((a) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "search__item";
      link.href = a.slug + ".html";
      link.innerHTML =
        '<span class="search__thumb"><img src="assets/articles/' + a.slug + '.jpg" alt="" loading="lazy"></span>' +
        '<span class="search__text"><span class="search__title">' + highlight(lang === "en" ? a.en : a.vi, tokens) + "</span>" +
        '<span class="search__meta">' + esc(CATS[a.cat][lang]) + " · " + fmtDate(a.date, lang) + "</span></span>";
      const img = link.querySelector("img");
      img.addEventListener("error", () => img.remove());
      li.appendChild(link);
      list.appendChild(li);
    });
    items = Array.from(list.querySelectorAll(".search__item"));
    empty.hidden = !q || results.length > 0;
    setActive(results.length ? 0 : -1);
  }

  /* ===================================================
     7. MỞ / ĐÓNG
     =================================================== */
  function openLang() {
    closeSearch();
    langMenu.hidden = false;
    langBtn.setAttribute("aria-expanded", "true");
  }

  function closeLang() {
    langMenu.hidden = true;
    langBtn.setAttribute("aria-expanded", "false");
  }

  function openSearch() {
    closeLang();
    panel.hidden = false;
    searchBtn.setAttribute("aria-expanded", "true");
    input.focus();
    renderResults();
  }

  function closeSearch() {
    panel.hidden = true;
    searchBtn.setAttribute("aria-expanded", "false");
  }

  langBtn.addEventListener("click", () => (langMenu.hidden ? openLang() : closeLang()));

  langOption.addEventListener("click", () => {
    setLang(langOption.dataset.lang, true);
    closeLang();
    langBtn.focus();
  });

  searchBtn.addEventListener("click", () => (panel.hidden ? openSearch() : closeSearch()));

  input.addEventListener("input", renderResults);

  input.addEventListener("keydown", (e) => {
    if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || !results.length) return;
    e.preventDefault();
    setActive((active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (active >= 0 && results[active]) location.href = results[active].slug + ".html";
  });

  // Bấm ra ngoài thì đóng; Esc cũng đóng
  document.addEventListener("click", (e) => {
    if (!langWrap.contains(e.target)) closeLang();
    if (!searchWrap.contains(e.target)) closeSearch();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!panel.hidden) {
      closeSearch();
      searchBtn.focus();
    } else if (!langMenu.hidden) {
      closeLang();
      langBtn.focus();
    }
  });

  /* ===================================================
     8. KHỞI ĐỘNG
     =================================================== */
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  renderChrome();
  if (lang === "en") setLang("en", false);
})();