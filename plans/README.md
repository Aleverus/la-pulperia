# Planes de implementación — auditoría previa al visual (cerrada)

Generados por la skill `improve` el 2026-08-30 sobre el commit `9e25ce7` y el
working tree local existente. La fuente productiva no fue modificada por esta
auditoría. El orden conserva las dependencias históricas usadas para cerrar R0;
no se vuelve a ejecutar salvo una regresión reproducida o un cambio autorizado
del contrato. Ante esa reapertura, leer el plan entero, preservar cambios no
relacionados y detenerse ante una condición de STOP.

Los planes 001–005 ya fueron ejecutados y están `DONE`. Las cifras y referencias
al shell sin estilos de este archivo pertenecen al snapshot previo a su
implementación; no son estado actual. `../README.md` resume el recibo técnico
vigente y `../../Obra/Current Context.md` gobierna estado y próximo trabajo.

## Orden y estado

| Plan | Resultado | Prioridad | Esfuerzo | Depende de | Estado |
|---|---|---:|---:|---|---|
| 001 | Restaurar unidad, cantidad y comparación honesta | P1 | L | — | DONE |
| 002 | Hacer efectiva la vigencia temporal y la ventana solicitada | P1 | L | 001 | DONE |
| 003 | Volver atómica y completa la revisión de contexto | P1 | L | 001, 002 | DONE |
| 004 | Soportar todas las presencias que puede poseer un vendedor | P1 | M | 003 | DONE |
| 005 | Cerrar fallos de frontera y endurecer el piloto | P1 | L | 001–004 | DONE |

Estados: `TODO`, `IN PROGRESS`, `DONE`, `BLOCKED: razón`, `REJECTED: razón`.

## Mapa de hallazgos

### P0 — contrato incorrecto; debe cerrarse antes de decidir visual

1. **Unidad perdida de extremo a extremo.** El catálogo y el detalle muestran
   una cifra sin `/ libra`, `/ bolsa`, etc.; el carrito la convierte en
   “unidad” y el mensaje de WhatsApp también la omite. La base sí conserva
   `unit_snapshot`, por lo que la pérdida ocurre en la capa de aplicación.
   Cubierto por 001.
2. **Orden por precio no comparable.** SQL ordena sólo `price_cents`, mezclando
   clases, unidades y precios `fixed`/`from`; la advertencia textual no vuelve
   equivalentes esas cifras. Cubierto por 001.
3. **Cantidad entera universal.** UI, tipos y validación SQL impiden 0.5 libra,
   1.25 kg u otras cantidades legítimas. Cubierto por 001.
4. **Ventanas vencidas siguen disponibles.** La búsqueda sólo excluye
   `availability_state = unavailable`; no evalúa `ends_at` ni `cutoff_at`.
   Contradice el caso límite explícito del modelo de producto. Cubierto por 002.
5. **La ventana pedida no la elige la persona.** La UI promete indicar ventana,
   pero copia automáticamente toda la ventana publicada al payload. Cubierto
   por 002.
6. **Agenda incompleta en servicios y digital.** El render ignora
   `next_available_at`; en oferta digital con modelo `schedule` también omite
   `schedule_note`. Cubierto por 002.
7. **La revisión de contexto no cubre todo el contexto.** El carrito compara
   precio, modo, estado y `confirmed_at`; la transacción sólo vuelve a verificar
   `confirmed_at`. Cambios de WhatsApp, cobertura, territorio o modo de presencia
   pueden cambiar destino y significado después de la revisión. Cubierto por
   003.
8. **El dominio permite varias presencias y la UI administra sólo la primera.**
   `get_my_presences()` devuelve todas; `getOwnedPresence()` usa `data[0]`. El
   fixture actual reproduce dos presencias para la misma dueña. Cubierto por 004.

### P1 — confiabilidad y seguridad antes de piloto público

9. **Paginación extrema produce HTTP 500.** `pagina=2147483647` supera el entero
   del RPC al calcular el offset. Reproducido localmente. Cubierto por 005.
10. **Fallo al refrescar el carrito puede quedar en carga infinita.** La promesa
    de `refreshSelectionAction()` no tiene `catch` ni estado de reintento.
    Cubierto por 005.
11. **No hay cabeceras de endurecimiento globales.** La respuesta observada
    expone `X-Powered-By` y no declara CSP, `nosniff`, referrer, permissions ni
    política de framing. Cubierto por 005.
12. **Los límites de imágenes se contradicen.** Server Actions acepta 3 MB,
    `lib/image.ts` anuncia 5 MB y Sharp no impone un presupuesto explícito de
    píxeles antes de decodificar. Cubierto por 005.
13. **Borrado de media y cuenta no es atómico ni veraz ante fallos parciales.**
    Una operación borra Storage antes que DB; otra ignora ambos errores. Puede
    dejar registros u objetos huérfanos o una cuenta viva sin sus imágenes.
    Cubierto por 005.
14. **La pantalla de ingreso publica credenciales y alta de fixtures.** Es
    apropiada para local, pero no tiene un gate visible que impida llegar así a
    un entorno público. Cubierto por 005.
15. **El número de WhatsApp sólo se prueba, no se verifica.** Antes de un piloto
    abierto hace falta prueba de control/consentimiento o una marca explícita de
    número no verificado. Cubierto por 005.
16. **Métricas públicas vulnerables a ruido.** Los eventos agregados no deben
    decidir producto sin deduplicación/rate limit y evidencia de campo. Cubierto
    parcialmente por 005; la decisión sigue siendo humana y de piloto.

### P2 — ventaja de producto, sólo después de reparar P0 y obtener evidencia

17. **Identidad comparable insuficiente.** Título y descripción no definen que
    dos ofertas sean el mismo producto/variante/calidad. Diseñar una identidad
    canónica liviana con unidad normalizada, variante y procedencia; no declarar
    “más barato” o “mejor” sin cobertura comparable.
18. **Vigencia uniforme.** Los umbrales 7/30 días son transparentes, pero stock,
    comida, agenda y digital envejecen distinto. Ajustarlos por clase sólo con
    evidencia del piloto.
19. **Ingreso de catálogo todavía costoso.** Priorizar importación asistida y
    reconfirmación de un toque, siempre con consentimiento y atribución del
    vendedor; no scraping autónomo.
20. **Demanda no resuelta sin semántica.** Clasificar consultas vacías de forma
    agregada y privada antes de crear alertas o inteligencia comercial.
21. **Proveniencia futura.** Separar declaración del vendedor, observación de
    campo y fuente externa; conservar fecha, territorio, confianza y derecho de
    corrección.
22. **API futura de sólo lectura.** Exponer coincidencias, atribución, vigencia e
    incertidumbre; diferir escritura, negociación, pagos y agentes autónomos.

## Dirección descartada o diferida

- No reescribir Next.js/Supabase/Postgres: el stack actual pasó lint, tipos, 50
  unitarias, build, reconstrucción local, 145 pgTAP y advisors sin advertencias.
- No agregar pagos, escrow, delivery coordinado, comisión, inventario garantizado,
  ranking pagado, reputación absoluta ni agentes con escritura.
- No diseñar otra piel antes de cerrar 001–005. El shell sin estilos es
  deliberado y las direcciones Mostrador/Tabula fueron rechazadas.
- No tratar apertura de WhatsApp como mensaje, pedido, pago, venta o cumplimiento.
- No usar métricas sintéticas como sustituto del piloto en Siguatepeque.

## Dependencias

- 002 depende de 001 porque la ventana y la cantidad deben serializarse junto a
  la unidad correcta.
- 003 depende de 001–002 porque el token/contexto atómico debe cubrir el contrato
  final de unidad, cantidad y vigencia efectiva.
- 004 depende de 003 porque cada selección debe quedar ligada sin ambigüedad a la
  presencia y destino revisados.
- 005 se ejecuta al final para endurecer el flujo ya estabilizado y evitar
  duplicar migraciones o pruebas.
