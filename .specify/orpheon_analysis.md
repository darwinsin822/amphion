# Análisis Técnico: Mecanismo de Login y Verificación de Spotify en Orpheon (MySpoti)

## 1. Resumen Ejecutivo
Orpheon (anteriormente MySpoti) es un cliente nativo open-source para Spotify desarrollado por `kota-zo`. Su gran innovación radica en cómo resuelve la autenticación y el control de reproducción sin exigir cuentas Premium ni credenciales en texto plano:

1. **Autenticación Delegada (Zero Credentials Storage):**
   - La aplicación jamás solicita, intercepta ni almacena contraseñas de Spotify.
   - Se carga la página oficial de Spotify (`accounts.spotify.com` / `open.spotify.com`) en un entorno Chromium / WebView.
   - El usuario inicia sesión de forma interactiva (usuario/contraseña, Google, Facebook o Apple). Las credenciales y cookies de sesión (`sp_dc`, etc.) quedan en el almacén de cookies nativo de Chromium.

2. **Inyección de Puente CDP (`player-bridge.js`) y `Runtime.addBinding`:**
   - A través de Chrome DevTools Protocol (CDP), la app host se conecta por WebSocket (`/json/list` y `webSocketDebuggerUrl`).
   - Habilita los dominios CDP: `Runtime.enable`, `Page.enable`, `Network.enable`.
   - Registra un binding bidireccional: `Runtime.addBinding({ name: "__mspHostPost" })`.

3. **Extracción Automática de Tokens (`TokenProvider`):**
   - En lugar de obligar al usuario a crear una Spotify Developer App con un Client ID manual, el puente inspecciona el árbol React de `open.spotify.com`:
     - Localiza el contenedor React (`__reactContainer$` en `#main` o `body`).
     - Extrae el registro de servicios de la plataforma (`platform.getRegistry()`).
     - Resuelve el servicio oficial `TokenProvider`:
       ```javascript
       const tokenProvider = registry.resolve('TokenProvider');
       const token = await tokenProvider.getToken();
       // Retorna:
       // {
       //   accessToken: string,
       //   accessTokenExpirationTimestampMs: number,
       //   clientId: string,
       //   isAnonymous: boolean
       // }
       ```
   - Este token tiene permisos completos sobre la Web API de Spotify y endpoints GraphQL de la plataforma web.

4. **Control de Reproducción sin Restricción Premium:**
   - La API oficial de Spotify (`/v1/me/player/...`) y el Web Playback SDK rechazan comandos de reproducción en cuentas Free (403 Forbidden).
   - Orpheon sortea esto interactuando directamente con los servicios del Web Player oficial cargado en Chrome:
     - `registry.resolve('PlayerAPI')`: `.play()`, `.pause()`, `.resume()`, `.skipToNext()`, `.skipToPrevious()`, `.getState()`.
     - Debido a que se ejecuta en el reproductor web oficial con Widevine activo, funciona para cuentas gratuitas y de pago.

5. **Cookies de Sesión:**
   - Lee las cookies mediante el comando CDP `Network.getCookies` sobre `https://open.spotify.com` y `https://accounts.spotify.com`.
   - Guarda el estado en el llavero seguro del sistema.
