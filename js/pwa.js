/* Biến website thành ứng dụng: đăng ký service worker, nút "Cài ứng dụng", thanh điều hướng dưới cùng trên điện thoại */
(function () {
  "use strict";
  const root = document.documentElement;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) root.classList.add("is-app");
  const ua = navigator.userAgent || "";
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  const I = window.ChamIcons ? window.ChamIcons.icon : function () { return ""; };

  // ----- service worker
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }

  // ----- cài ứng dụng
  let deferred = null;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function showInstallUI(on) { document.querySelectorAll("[data-install]").forEach(function (el) { el.hidden = !on; }); }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault(); deferred = e;
    showInstallUI(true);
    maybeBanner();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null; showInstallUI(false); hideBanner();
    if (window.Cham) window.Cham.toast("Đã cài ứng dụng Chạm lên máy.");
  });
  function iosHelp() {
    const box = document.createElement("div");
    box.className = "ios-help"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Cách cài ứng dụng trên iPhone");
    box.innerHTML = '<div class="ios-card"><b>Cài Chạm lên iPhone / iPad</b><ol>' +
      "<li>Bấm nút <b>Chia sẻ</b> " + I("arrow") + " ở thanh dưới của Safari.</li>" +
      "<li>Chọn <b>Thêm vào MH chính</b> (Add to Home Screen).</li>" +
      "<li>Bấm <b>Thêm</b>. Biểu tượng Chạm sẽ xuất hiện trên màn hình chính.</li></ol>" +
      '<button class="btn" type="button">Đã hiểu</button></div>';
    box.querySelector("button").onclick = function () { box.remove(); };
    box.addEventListener("click", function (ev) { if (ev.target === box) box.remove(); });
    document.body.appendChild(box);
  }
  function install() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; showInstallUI(false); hideBanner(); });
    } else if (isIOS) {
      iosHelp();
    } else if (window.Cham) {
      window.Cham.toast("Mở menu ⋮ của trình duyệt và chọn \"Cài đặt ứng dụng\" hoặc \"Thêm vào màn hình chính\".");
    }
  }
  document.addEventListener("click", function (ev) {
    const b = ev.target.closest("[data-install]");
    if (b) { ev.preventDefault(); install(); }
  });

  // Dải gợi ý cài đặt trên điện thoại (chỉ hiện khi chưa cài và chưa bị tắt)
  function hideBanner() { const b = document.getElementById("install-banner"); if (b) b.remove(); }
  function maybeBanner() {
    if (isStandalone || document.getElementById("install-banner") || store("cham_install_dismissed")) return;
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    if (!deferred && !isSafari) return;
    const bar = document.createElement("div");
    bar.id = "install-banner"; bar.className = "install-banner";
    bar.innerHTML = '<img src="img/icon-96.png" alt="" width="40" height="40"><span><b>Cài ứng dụng Chạm</b><small>Mở nhanh từ màn hình chính, không cần tìm trang web.</small></span>' +
      '<button class="btn small sun" type="button" data-install>Cài đặt</button><button class="ib-close" type="button" aria-label="Đóng">×</button>';
    bar.querySelector(".ib-close").onclick = function () { store("cham_install_dismissed", "1"); hideBanner(); };
    document.body.appendChild(bar);
  }
  if (isSafari && !isStandalone) {
    showInstallUI(true);
    window.addEventListener("load", function () { setTimeout(maybeBanner, 1500); });
  }

  // ----- thanh điều hướng dưới cùng (trang học sinh, trên điện thoại)
  function bottomNav() {
    if (!document.getElementById("app") || !document.getElementById("nav-list")) return;
    const items = [
      ["#/", "home", "Trang chủ", function (h) { return h === "" || h === "#/" || h === "#/trang-chu"; }],
      ["#/tu-van", "chatHeart", "Tư vấn", function (h) { return /^#\/(tu-van|dat-lich|tam-su|dass21)/.test(h); }],
      ["#/nhan-tin", "inbox", "Hộp thư", function (h) { return /^#\/nhan-tin/.test(h); }],
      ["#/ky-nang-song/thu-gian", "bubble", "Thư giãn", function (h) { return /^#\/ky-nang-song\/thu-gian/.test(h); }],
      ["#menu", "menu", "Menu", function () { return false; }],
    ];
    const nav = document.createElement("nav");
    nav.className = "bottom-nav"; nav.setAttribute("aria-label", "Điều hướng nhanh");
    nav.innerHTML = items.map(function (it, i) {
      return '<a href="' + it[0] + '" data-i="' + i + '">' + I(it[1]) + "<span>" + it[2] + "</span>" + (it[1] === "inbox" ? '<i class="bn-badge" id="bn-badge" hidden></i>' : "") + "</a>";
    }).join("");
    nav.querySelector('[href="#menu"]').addEventListener("click", function (ev) {
      ev.preventDefault();
      const t = document.getElementById("menu-toggle");
      if (t) { window.scrollTo({ top: 0, behavior: "smooth" }); if (!document.getElementById("mainnav").classList.contains("open")) t.click(); }
    });
    document.body.appendChild(nav);
    function mark() {
      const h = location.hash;
      nav.querySelectorAll("a").forEach(function (a) {
        const on = items[Number(a.dataset.i)][3](h);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
    }
    window.addEventListener("hashchange", mark); mark();
    // chép số tin chưa đọc từ nút nổi sang thanh dưới
    const fabBadge = document.getElementById("fab-badge");
    if (fabBadge) {
      const sync = function () { const b = document.getElementById("bn-badge"); b.hidden = fabBadge.hidden; b.textContent = fabBadge.textContent; };
      new MutationObserver(sync).observe(fabBadge, { attributes: true, childList: true, characterData: true, subtree: true }); sync();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bottomNav); else bottomNav();
})();
