const CACHE_NAME = "shalom-v1";
const ARCHIVOS = [
    "/shalom/",
    "/shalom/index.html",
    "/shalom/script.js",
    "/shalom/style.css",
    "/shalom/manifest.json",
    "/shalom/icon-192.png",
    "/shalom/icon-512.png"
];

// Instalar y cachear archivos
self.addEventListener("install", function(e){
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache){
            return cache.addAll(ARCHIVOS);
        })
    );
    self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener("activate", function(e){
    e.waitUntil(
        caches.keys().then(function(keys){
            return Promise.all(
                keys.filter(function(k){ return k !== CACHE_NAME; })
                    .map(function(k){ return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

// Responder con cache si no hay internet
self.addEventListener("fetch", function(e){
    e.respondWith(
        caches.match(e.request).then(function(cached){
            return cached || fetch(e.request).catch(function(){
                return caches.match("/shalom/index.html");
            });
        })
    );
});
