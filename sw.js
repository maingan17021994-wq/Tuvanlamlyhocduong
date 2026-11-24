/* Service worker của ứng dụng Chạm: cho phép cài đặt như ứng dụng và mở được khi mạng yếu.
   Đổi số phiên bản mỗi khi cập nhật website để điện thoại tải bản mới. */
const VERSION = "cham-v1";
const SHELL = [
  "./", "./index.html", "./giao-vien.html", "./manifest.webmanifest",
  "./css/style.css", "./css/teacher.css",
  "./js/config.js", "./js/meta.js", "./js/seed.js", "./js/store.js", "./js/icons.js", "./js/common.js",
  "./js/quizzes.js", "./js/bubbles.js", "./js/site.js", "./js/teacher.js", "./js/pwa.js",
  "./img/logo.svg", "./img/app-icon.svg", "./img/icon-192.png", "./img/icon-512.png", "./img/apple-touch-icon.png",
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Dữ liệu Firebase (Firestore, đăng nhập, video) luôn đi thẳng lên mạng, không lưu tạm
  if (/(^|\.)googleapis\.com$/.test(url.hostname) && url.hostname !== "fonts.googleapis.com") return;
  if (/firebaseio\.com$|firebaseapp\.com$|identitytoolkit|securetoken/.test(url.hostname)) return;

  // Thư viện Firebase và phông chữ: dùng bản đã lưu, cập nhật ngầm
  if (url.hostname === "www.gstatic.com" || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    e.respondWith(caches.open(VERSION + "-cdn").then(function (c) {
      return c.match(req).then(function (hit) {
        const net = fetch(req).then(function (res) { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(function () { return hit; });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Trang và mã nguồn của website: ưu tiên bản mới trên mạng, mất mạng thì dùng bản đã lưu
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error());
    });
  }));
});
