/**
 * Service Worker — Agenda Escolar Inteligente
 * Estratégia: Network-First (navegação) · Stale-While-Revalidate (assets locais)
 * · Cache-First (fontes/CDN)
 * Versão do cache deve ser incrementada a cada deploy
 */

'use strict';

const SW_VERSION = 'v6.2.0';
const CACHE_STATIC  = `agenda-static-${SW_VERSION}`;
const CACHE_DYNAMIC = `agenda-dynamic-${SW_VERSION}`;
const CACHE_FONTS   = `agenda-fonts-${SW_VERSION}`;

// Assets críticos — sempre em cache (precache)
const PRECACHE_ASSETS = [
  'index.html',
  'manifest.json',
  'offline.html',

  // CSS modular
  'css/variables.css',
  'css/themes.css',
  'css/theme-picker.css',
  'css/style.css',
  'css/header.css',
  'css/footer.css',
  'css/components.css',
  'css/animations.css',
  'css/responsive.css',
  'css/views/inicio.css',
  'css/views/agenda.css',
  'css/views/material.css',
  'css/views/configuracoes.css',

  // JS modular
  'js/app.js',
  'js/router.js',
  'js/storage.js',
  'js/themes.js',
  'js/utils.js',
  'js/ui.js',
  'js/views/inicio.js',
  'js/views/agenda.js',
  'js/views/material.js',
  'js/views/configuracoes.js',

  // Views (HTML)
  'views/view-inicio.html',
  'views/view-agenda.html',
  'views/view-material.html',
  'views/view-configuracoes.html',

  // Ícones
  'assets/icons/favicon.ico',
  'assets/icons/icon-192.png',
  'assets/icons/icon-192-maskable.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-512-maskable.png',
];

// Origens de fontes (cache separado, longa duração)
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

// CDNs externos permitidos no cache dinâmico
const CDN_ORIGINS = [
  'https://cdnjs.cloudflare.com'
];

/* ============================================================
   INSTALL — Precache de assets críticos
   ============================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
    // Sem skipWaiting aqui: em atualizações, o app mostra o banner
    // "Nova versão disponível" e só então envia SKIP_WAITING (ver 'message').
    // Na primeira instalação não há SW anterior, então ativa direto.
  );
});

/* ============================================================
   ACTIVATE — Limpa caches antigos
   ============================================================ */
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_FONTS];

  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim()) // Assume controle imediato de todas as abas abertas
  );
});

/* ============================================================
   FETCH — Roteamento inteligente por estratégia
   ============================================================ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET e chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // 1. Fontes — Cache-First com fallback de rede (longa duração)
  if (FONT_ORIGINS.some((o) => request.url.startsWith(o))) {
    event.respondWith(cacheFirst(request, CACHE_FONTS));
    return;
  }

  // 2. CDNs estáticos — Cache-First
  if (CDN_ORIGINS.some((o) => request.url.startsWith(o))) {
    event.respondWith(cacheFirst(request, CACHE_DYNAMIC));
    return;
  }

  // 3. Assets da própria origem
  if (url.origin === self.location.origin) {
    // Navegação de página: o app é uma SPA, então toda navegação é o app shell
    if (request.mode === 'navigate') {
      event.respondWith(navegacao(request));
      return;
    }
    // CSS, JS e views — Rede primeiro (sempre a versão mais nova; offline usa o cache)
    if (/\.(?:css|js|html)$/.test(url.pathname)) {
      event.respondWith(redePrimeiro(request, CACHE_STATIC));
      return;
    }
    // Imagens e demais arquivos — Stale-While-Revalidate
    event.respondWith(staleWhileRevalidate(event, request, CACHE_STATIC));
    return;
  }
});

/* ============================================================
   ESTRATÉGIAS DE CACHE
   ============================================================ */

/** Respostas que valem a pena guardar (inclui opacas de CDNs sem CORS) */
function cacheavel(response) {
  return response && (response.ok || response.type === 'opaque');
}

/** URL absoluta do app shell, resolvida a partir do escopo do SW */
function urlShell() {
  return new URL('index.html', self.registration.scope).href;
}

/**
 * Navegação: rede primeiro (sempre a versão mais nova do app);
 * offline cai no app shell em cache — ignorando a query string
 * (o start_url do manifest tem ?utm_source=pwa) — e, em último caso,
 * na página offline.
 */
async function navegacao(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(urlShell(), response.clone());
    }
    return response;
  } catch {
    const shell = await caches.match(urlShell(), { ignoreSearch: true });
    if (shell) return shell;
    const offline = await caches.match(new URL('offline.html', self.registration.scope).href);
    return offline || new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/** Cache-First: Serve do cache; busca rede apenas se não encontrar */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (cacheavel(response)) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso indisponível offline.', { status: 503 });
  }
}

/** Rede primeiro: tenta a rede, guarda a cópia e cai no cache só se estiver offline */
async function redePrimeiro(request, cacheName) {
  try {
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/** Stale-While-Revalidate: Serve cache imediatamente e atualiza em background */
async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const rede = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(rede); // mantém o SW vivo até a revalidação terminar
    return cached;
  }
  return (await rede) || new Response('Offline', { status: 503 });
}

/* ============================================================
   PUSH NOTIFICATIONS — Lembretes de aula
   ============================================================ */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Agenda Escolar', {
      body: data.body || 'Você tem uma aula em breve!',
      icon: 'assets/icons/icon-192.png',
      badge: 'assets/icons/icon-192.png',
      tag: data.tag || 'agenda-notif',
      renotify: true,
      data: { url: data.url || 'index.html' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const alvo = new URL(event.notification.data?.url || 'index.html', self.registration.scope).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      // Reaproveita qualquer janela do app já aberta
      const aberta = lista.find((c) => c.url.startsWith(self.registration.scope));
      if (aberta && 'focus' in aberta) return aberta.focus();
      return clients.openWindow ? clients.openWindow(alvo) : undefined;
    })
  );
});

/* ============================================================
   MENSAGENS — Comunicação com o app (ex: forçar update)
   ============================================================ */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
});
