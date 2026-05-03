# Cash Empire Web Sync

Este repositorio nuevo es la base para:

- ejecutar `Cash Empire` desde la web
- compartir la misma app con la APK
- publicar actualizaciones OTA gratuitas para el APK
- sincronizar partidas entre navegador y celular usando un backend simple

## Estructura

- raiz del repo: app compartida web + APK
- [`server/`](C:/Users/chval/OneDrive/Escritorio/Cash%20Empire/CashEmpire-WebSync/server): API minima de sincronizacion
- `updates/`: manifest y bundle OTA que consulta el APK instalado

## Estado actual

- La raiz ya contiene la app publicada desde `Juego/` con controles WebSync.
- `server/` esta listo para desplegarse en Node: guarda slots por `handle` + clave y no reemplaza el guardado local.
- El bundle OTA vigente es `1.0.0-20260503T014050Z`.
- Para que el APK instalado se actualice sin reinstalar, este repo debe existir como `Floovuai/CashEmpire-WebSync` con GitHub Pages activo, porque esa URL ya esta grabada en `Juego/js/ota-config.js`.

## Flujo recomendado

1. Levantar la app web desde la raiz
2. Levantar la API de sync desde `server/`
3. Conectar la cuenta nube desde la UI del juego
4. Guardar local y subir el slot a nube
5. En la APK, usar el mismo `handle`, clave y URL del servidor

## Actualizaciones OTA

La raiz del repo incluye `updates/manifest.json` y un zip `updates/cash-empire-*.zip`. El APK base consulta ese manifest por HTTPS y descarga cambios web sin instalar otro APK.

Para publicar una nueva version desde el repo principal:

```powershell
cd ..\Juego
npm run publish:webrepo
```

Luego haz commit/push de este repo web. El dominio del manifest debe coincidir con `manifestUrl` en `Juego/js/ota-config.js` antes de compilar el APK base.

## Comandos

Desde la raiz de este repo:

```powershell
npm run start:sync
npm start
```

Checks de balance:

```powershell
npm run test:balance
npm run test:balance:long
```

## Estado del MVP

- El juego sigue funcionando offline con `localStorage`.
- La nube es una capa adicional, no reemplaza el guardado local.
- La sincronizacion actual es manual con auto-push suave al guardar si la cuenta ya esta conectada.
- La API crea la cuenta en el primer `connect` y luego valida la misma clave.
- `server/data/*.json` queda fuera de Git; solo `server/data/.gitkeep` se versiona.
- Las actualizaciones OTA cubren HTML, CSS, JS e imagenes web; cambios nativos requieren APK nuevo.

## Siguiente paso natural

- desplegar `server/` en un host publico
- apuntar web y APK a esa URL
- volver a agregar `android/` via Capacitor en este repo cuando quieras empaquetar la nueva app sincronizada
