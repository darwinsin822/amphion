# Prompt maestro para Antigravity — Crear desde cero un reproductor de Spotify para Linux Mint

Copia y pega esto en la ventana de chat de Antigravity:

---

Rol: Actúa como un Ingeniero de Software Senior experto en Rust, Linux, navegadores Chromium, la Web API de Spotify y arquitecturas de plugins.

## Contexto

Estoy usando Linux Mint Cinnamon (disco de 256 GB). Las versiones oficiales de Spotify son pesadas y van con mucho lag en mi equipo. Quiero un programa propio, creado desde cero, ligero y rápido, basado en la web de Spotify, con sistema de extensiones para descargar música y con bloqueo de publicidad. Nombre provisional del proyecto: **MintPlayer** (si prefiero otro nombre, lo digo yo).

## Decisión de stack (recomendado)

- **Lenguaje: Rust.** Un solo binario, arranque rápido, bajo consumo de RAM.
- **Reproducción: Chrome oculto (headless) manejado por el protocolo DevTools (CDP)**, con la página del Web Player oficial (`open.spotify.com`) corriendo dentro. Chrome en Linux trae Widevine incluido, que es lo que permite reproducir.
- **Interfaz: GTK4 con libadwaita** (nativa en Cinnamon, se ve integrada al sistema).
- **Audio de archivos locales: GStreamer.** **Índice offline: SQLite.** **Sandbox de extensiones: QuickJS o Deno.**
- Alternativa solo si encuentras un bloqueo real con este stack: Kotlin/JVM + Compose for Desktop, con el mismo diseño (Chrome por CDP).
- **No usar:** Electron (es justo lo pesado que quiero dejar atrás) ni Tauri con WebKitGTK (en Linux no tiene Widevine y el Web Player no reproduciría nada).

## Arquitectura (regla de oro)

El programa tiene dos partes: **mi interfaz nativa** (lo que yo veo) y **el Web Player oficial escondido en Chrome** (lo que reproduce). Mi app nunca toca el audio de Spotify directamente: lo conduce actuando sobre el Web Player como lo haría un usuario.

- Los datos (biblioteca, búsqueda, playlists, artistas, álbumes) se obtienen con la **Web API de Spotify**.
- El inicio de sesión es OAuth con PKCE **en la página de Spotify**; el programa nunca ve mi contraseña. Los tokens se guardan en el llavero del sistema (libsecret), nunca en texto plano.
- Para crear la aplicación de desarrollador en Spotify (client ID y redirect a localhost), guíame paso a paso; si no tengo el client ID, no inventes uno.
- **Regla de oro:** el control de reproducción (reproducir, pausar, siguiente, anterior) se hace actuando sobre el Web Player por CDP, **nunca** con los endpoints de control de la Web API ni con el Web Playback SDK, porque esos dos exigen cuenta Premium y dejarían fuera a las cuentas gratuitas.

## Requisito explícito — Reproducción en orden, no aleatoria

Este es un requisito central, no un detalle:

- **La app es dueña de la cola.** La cola es una lista ordenada y visible que yo puedo reordenar (arrastrar canciones).
- Al iniciar una playlist, un álbum, un resultado de búsqueda o la cola, el programa reproduce **en el orden exacto, de la primera canción a la última, sin barajar**.
- El modo aleatorio existe, pero es **opcional y apagado por defecto**. Nunca se activa solo ni por ser cuenta gratuita.
- Al terminar una canción, avanza a la siguiente de la lista. Si el Web Player intenta barajar (comportamiento de cuenta gratuita), la app lo corrige seleccionando la siguiente pista en orden.
- No hay límite de saltos impuesto por la app: saltar es seleccionar la siguiente pista en orden dentro del Web Player.
- Esto aplica a playlists, álbumes, búsqueda y cola por igual, y se verifica en las pruebas de cada fase.

## Funciones de la versión 1

- Inicio, búsqueda, biblioteca, artistas, álbumes y perfiles, con el contenido de Spotify.
- Playlists: crear, editar (nombre, descripción, portada), ordenar, públicas/privadas/colaborativas, agregar canciones desde la búsqueda.
- Cola visible y reordenable, repetir (todo, una canción), crossfade, temporizador de apagado.
- Letras sincronizadas (fuente: LRCLIB u otra libre) y, si es viable, significado de canciones.
- Archivos de audio locales del equipo.
- Integración con el sistema: MPRIS (teclas multimedia, pantalla de bloqueo), icono en bandeja, notificaciones.
- Ecualizador para canciones locales y descargadas, y estadísticas de lo que suena (códec, bitrate).
- Empaquetado final en **.deb para Linux Mint** e instalador simple.

## Sistema de extensiones (requisito central)

Como en Orpheon, pero diseñado desde cero para este programa:

- Cada extensión es un `manifest.json` + un `main.js` que corre en un **sandbox** (QuickJS o Deno). Antes de instalarse, declara qué va a hacer y con qué permisos; yo lo veo y lo apruebo. Si una actualización pide más permisos, me lo muestra y yo decido.
- **API para el autor de extensiones:** `provideAudio(canción)` (de dónde sale el audio), `provideDownload(canción)` (qué archivo bajar), `provideLyrics`, `onTrackChange`, `http.get` solo a los dominios declarados, secciones de inicio y entradas de menú.
- **Tipos de extensión:** fuentes de descarga (YouTube, SoundCloud, Bandcamp, biblioteca local), fuentes de letras, secciones de inicio, temas.
- **Orden de resolución:** cuando suena o se descarga una canción, el programa pregunta a las extensiones en orden de prioridad; la primera que tenga el archivo gana, y si ninguna tiene nada, suena Spotify normal.
- **Seguridad:** la extensión no toca mi disco ni mi red salvo lo declarado. Las extensiones se instalan desde una carpeta local y, si se crea, desde un repositorio comunitario con versiones.
- Entregar una **extensión de descarga de ejemplo** funcionando y la documentación de la API para autores.

## Descargas offline

- Gestor de descargas con cola, pausa y reanudación.
- Flujo: la extensión entrega el archivo (o un enlace) → se descarga → se verifica que dure lo mismo que la canción (para no guardar un archivo equivocado) → se guarda (cifrado opcional) y se indexa en SQLite.
- Las playlists descargadas se mantienen al día solas: si agrego una canción en Spotify, se descarga sola.
- Sin internet, el programa reproduce desde su índice local. Formatos según la fuente (FLAC, MP3, AAC) o conversión a AAC con ffmpeg.
- **Regla:** ninguna extensión puede descargar el audio de Spotify mismo, porque Spotify no ofrece esa descarga. Las descargas siempre vienen de las fuentes de la extensión, no de Spotify.

## Bloqueo de publicidad (módulo opcional, apagado por defecto)

- **Dos capas técnicas:** (1) detección: el estado del reproductor indica `currently_playing_type == "ad"` cuando suena un anuncio; en ese momento el programa silencia y salta a la siguiente canción. (2) red: interceptando las peticiones del Chrome oculto por CDP se bloquean los dominios de anuncios y rastreo, y el Web Player ni siquiera carga la creatividad del anuncio.
- **Advertencia obligatoria y visible en el programa:** bloquear anuncios **viola los Términos de Uso de Spotify** y Spotify puede detectar ese comportamiento y suspender o cerrar la cuenta. La cuenta gratuita tiene anuncios porque así se financia; con Premium no hay anuncios de forma oficial.
- Por eso el módulo es **opcional y apagado por defecto**, con la advertencia mostrada antes de activarlo. Nunca se activa escondido ni por defecto.

## Fases de construcción (una a la vez, con verificación)

- **Fase 0 — Núcleo:** login OAuth PKCE, Chrome oculto por CDP con el Web Player, reproducir/pausar/siguiente y mostrar qué suena. Criterio: suena una canción elegida por mí, en orden, con cuenta gratuita.
- **Fase 1 — Interfaz completa:** inicio, búsqueda, biblioteca, playlists (crear/editar) y cola reordenable vía Web API. Criterio: recorro mi biblioteca y reproduzco una playlist entera en orden, sin aleatorio.
- **Fase 2 — Extensiones:** sandbox, manifiesto, permisos y API; una extensión de ejemplo. Criterio: instalo la extensión de ejemplo y aparece su aporte (letras o fuente) en el programa.
- **Fase 3 — Descargas y anuncios:** gestor de descargas, índice SQLite, sincronización de playlists y módulo de bloqueo de anuncios (apagado por defecto, con advertencia). Criterio: descargo una playlist, apago el internet y suena completa desde local.
- **Fase 4 — Pulido y empaquetado:** MPRIS, bandeja, ecualizador, temas, pruebas de rendimiento y empaquetado en .deb (ver sección "Entregable final"). Criterio: arranque en menos de 1 segundo, consumo de RAM claramente menor que el cliente oficial, y el .deb instala y abre sin errores (verificación final obligatoria de esa sección).

## Entregable final — el programa en .deb

Al final del proyecto, el entregable es un **archivo .deb instalable en Linux Mint Cinnamon (amd64)**, no solo el código fuente:

- Empaquetado Debian correcto: archivo `control` con nombre, versión (semántica: 0.1.0, 0.2.0, 1.0.0), descripción y **dependencias declaradas** (Chrome con Widevine, GTK4/libadwaita, GStreamer y sus plugins, SQLite, ffmpeg y lo que el programa necesite).
- Entrada de escritorio (`.desktop`) con icono, para que el programa aparezca en el menú de Cinnamon.
- El .deb debe instalar con doble clic o con `sudo apt install ./mintplayer_x.y.z_amd64.deb`, resolver sus dependencias con apt, y **abrir el programa sin errores ni pasos manuales extra**.
- El código fuente queda en un repositorio (GitHub) con su changelog, pero el entregable usable es el .deb.
- Verificación final obligatoria: instalar el .deb en un Mint limpio (o en mi equipo tras desinstalar la versión de desarrollo) y comprobar que abre, inicia sesión, reproduce en orden, y que extensiones y descargas funcionan. Si el .deb no instala o no abre, la fase no está terminada.

## Método de trabajo (PERA, ciclo corto)

- **Planificación:** antes de codificar cada fase, muéstrame el plan y los comandos propuestos y espera mi confirmación (Modo Plan). Nada de instalar o descargar sin mi visto bueno.
- **Ejecución:** una fase a la vez, en orden, con pruebas ejecutadas de verdad (nada terminado sin ejecutar). Commit por tarea.
- **Revisión:** al final de cada fase verifica contra sus criterios, muéstrame qué cambió y qué queda pendiente, y decidimos el siguiente paso.
- **Aplicación:** al final instalo el .deb en mi Mint y lo uso a diario con mi cuenta real; los hallazgos vuelven a Planificación.

## Reglas

- No inventar funciones, precios ni datos. No tocar mis credenciales: el login siempre en la página de Spotify.
- Código propio desde cero, licencia **MIT** (si en algún punto se copiara código de Orpheon, ahí sí aplicaría su GPL-3.0 con crédito obligatorio, pero este proyecto es desde cero).
- Si algo no se puede hacer como está pedido (por ejemplo, un límite de la Web API o de Widevine), dímelo claro con la alternativa, no lo disimules.
- Al final de cada fase, entrégame un resumen de sesión: qué cambió, qué falta y qué sigue.

---
