# Constitución del Proyecto MintPlayer

## Principios Inmutables
1. **Rendimiento y Ligereza:** Construido en Rust nativo con GTK4/libadwaita. Un solo binario, bajo consumo de RAM, arranque instantáneo (<1s).
2. **Arquitectura Desacoplada (Regla de Oro):** 
   - Interfaz nativa GTK4 para visualización y control.
   - Motor de reproducción en Google Chrome oculto (headless) con Widevine mediante CDP (Chrome DevTools Protocol) en `open.spotify.com`.
   - Control de reproducción puramente vía CDP sobre el Web Player (nunca mediante Web Playback SDK ni endpoints restrictivos de Web API que exigen Premium).
3. **Reproducción Estricta en Orden:** La aplicación es dueña de la cola. Reproducción secuencial de la primera a la última pista, sin barajar ni forzar modo aleatorio por ser cuenta gratuita.
4. **Seguridad y Credenciales:** OAuth PKCE oficial en el navegador; nunca manejar contraseñas de Spotify. Tokens almacenados de forma segura en `libsecret` (llavero del sistema de Linux).
5. **Ecosistema de Extensiones Seguro:** Sandboxed (QuickJS/Deno), permisos explícitos aprobados por el usuario, sin descargas directas desde servidores de Spotify (las descargas offline provienen exclusivamente de fuentes de extensiones: YouTube, SoundCloud, Bandcamp, local).
6. **Entregable Canónico:** Paquete `.deb` nativo para Linux Mint Cinnamon (amd64) con `.desktop`, iconos y dependencias del sistema resueltas vía APT.
7. **Metodología PERA & ODD:** Planificación → Ejecución → Revisión → Aplicación, supervisado por compuertas deterministas (Gate 1 a Gate 6).
