# Mapa regional de Siguatepeque

`pnpm map:refresh` extrae de forma reproducible el recorte `public/maps/siguatepeque.pmtiles` con zoom 0–15. El binario es generado y queda fuera de Git; la aplicación lo sirve por HTTP con solicitudes de rango.

Fuente predeterminada: build diario v4 de Protomaps/OpenStreetMap en Source Cooperative. Puede reemplazarse sólo de forma explícita con `PULPERIA_PMTILES_SOURCE_URL`.

La interfaz conserva la lista de negocios y muestra un estado honesto si el archivo no está disponible. La atribución visible a Protomaps y OpenStreetMap es parte del mapa y no debe retirarse.
