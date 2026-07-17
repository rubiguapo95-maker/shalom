// Cambia este número cada vez que subas cambios - fuerza actualización en todos los dispositivos
const VERSION = "shalom-v10";

self.addEventListener("install", function(e){
    self.skipWaiting();
});

self.addEventListener("activate", function(e){
    e.waitUntil(
        caches.keys().then(function(keys){
            return Promise.all(
                keys.map(function(k){ return caches.delete(k); })
            );
        }).then(function(){
            return self.clients.claim();
        })
    );
});

// Sin caché - siempre ir a la red para tener la versión más reciente
self.addEventListener("fetch", function(e){
    e.respondWith(fetch(e.request).catch(function(){
        return caches.match(e.request);
    }));
});
