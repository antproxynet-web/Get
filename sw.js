/**
 * Service Worker — Agenda Escolar Inteligente
 * Estratégia: Cache-First para assets estáticos + Network-First para dados
 * Versão do cache deve ser incrementada a cada deploy
 */

'use strict';

const SW_VERSION = 'v5.0.0';
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
      .then(() => self.skipWaiting()) // Ativa imediatamente sem esperar fechar abas
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
    // Navegação HTML (requisições de página)
    if (request.mode === 'navigate' || (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))) {
      event.respondWith(
        networkFirst(request, CACHE_STATIC).catch(() => caches.match('index.html'))
      );
      return;
    }
    // JS, CSS, imagens — Stale-While-Revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_STATIC));
    return;
  }
});

/* ============================================================
   ESTRATÉGIAS DE CACHE
   ============================================================ */

/** Cache-First: Serve do cache; busca rede apenas se não encontrar */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso indisponível offline.', { status: 503 });
  }
}

/** Network-First: Tenta rede; cai pro cache se offline */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback para página offline
    const offline = await caches.match('offline.html');
    return offline || new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/** Stale-While-Revalidate: Serve cache imediatamente e atualiza em background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || (await networkFetch) || new Response('Offline', { status: 503 });
}

/* ============================================================
   BACKGROUND SYNC — Sincronização quando voltar online
   ============================================================ */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-anotacoes') {
    event.waitUntil(syncAnotacoes());
  }
});

async function syncAnotacoes() {
  // Placeholder: sincronizar dados pendentes quando voltar online
  console.log('[SW] Background sync: anotações sincronizadas');
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
      const target = event.notification.data?.url || 'index.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === target && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(target);
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
