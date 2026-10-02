# Piedra de Toque — informe de entrega

Aplicación personal, gratuita y local para decidir si una roca o mineral merece atención. Funciona en el navegador del celular, se instala como app (PWA) y guarda todo en el teléfono.

## Qué contiene

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa (HTML, CSS y JS en un solo archivo) |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | Instalación como app y funcionamiento sin conexión |
| `tests_rocas.js` | 43 pruebas del motor. `node tests_rocas.js` junto a `index.html`, sin dependencias |
| `INFORME.md` | Este documento |

## Cómo funciona

1. **Fotos guiadas.** Tres vistas básicas (general, otra cara, macro con escala) y cuatro opcionales (superficie fresca, luz lateral, transmitida, mojada). La app revisa enfoque y luz y avisa si conviene repetir.
2. **Observar.** Eliges brillo, color, transparencia, hábito y rasgos visibles. Las fotos quedan como registro; **el análisis no las interpreta** salvo que actives la IA opcional.
3. **Análisis.** Un motor determinista compara lo registrado con una base de 99 minerales, rocas, meteoritos y materiales artificiales (escoria, vidrio, hierro corroído, que son los falsos positivos más comunes). Cada candidato tiene un puntaje relativo y siempre existe la opción «Otro / no está en la base».
4. **Pruebas.** Imán, raya, dureza por rayado, densidad (calculadora con rango de error), vinagre y maleabilidad. La app calcula cuál separa mejor a los candidatos actuales y, bajo cada respuesta posible, muestra qué candidato quedaría primero. Al registrar un resultado, los candidatos se reordenan y aparecen las variaciones (▲ ▼).
5. **Resultado.** Nivel (COMÚN, INTERESANTE, POTENCIAL ECONÓMICO, ALTO INTERÉS GEOLÓGICO, NO ALTERAR), confianza de la identificación (baja, media, alta), qué es observado, inferido y no determinado, seguridad, y por qué no botarla todavía.
6. **Ficha.** Nombre, peso, tamaño, fluorescencia, notas, ubicación (privada por defecto), estado (conservada, enviada a experto, descartada), favoritos e identificación final.
7. **Aprendizaje.** Al guardar la identificación final se compara con lo que la app proponía. Ajustes muestra aciertos y errores, y el respaldo exporta fotos más pruebas más identificación confirmada, la base de un conjunto de datos propio.

### Decisiones de diseño (y por qué)

- **La IA no identifica.** Los modelos de visión generales confunden pirita, calcopirita y oro y sus porcentajes no están calibrados. Aquí la IA, si la activas, solo propone características visibles dentro de un vocabulario cerrado; todo lo demás se descarta, y sus sugerencias pesan la mitad hasta que las confirmas.
- **Puntajes, no probabilidades.** Se muestran como «puntaje relativo». La confianza se expresa en bandas: con solo observación visual el máximo es **baja**; **alta** exige dos o más pruebas físicas, un candidato con al menos 75 % del puntaje y tres veces el del segundo.
- **Sin precios.** La app nunca muestra cifras. Dice «No es posible estimar valor todavía» o el tipo de mercado probable y los factores que cambian el valor. Hay un test que lo verifica.
- **Frecuencia como punto de partida.** El cuarzo es mucho más común que el topacio; sin eso la lista exageraría lo raro.
- **«Potencial económico» y «alto interés geológico» exigen al menos una prueba física.** Una pieza solo vista no sube de INTERESANTE. Las menas muy comunes (hematita, goethita, magnetita) no disparan «potencial económico» por sí solas.
- **NO ALTERAR** oculta las pruebas que dejan marca (raya, dureza, vinagre, maleabilidad). Puedes marcarlo a mano o mostrarlas de todos modos.
- **Seguridad.** Avisos por mineral (arsénico, mercurio, plomo, uranio, asbesto, cobre, antimonio) y siempre que marques hábito fibroso.

## Cómo probarla ahora

Abre el enlace de la app que te envié en este chat desde el celular. Guía rápida:

1. Hallazgos → **Cargar un ejemplo** (registro ficticio). Ve a Análisis, abre «Magnetismo» y elige *Ninguna*: mira cómo cambian los candidatos.
2. **Analizar → Empezar.** Toma una foto con *Cámara* y comprueba el aviso de calidad.
3. En Observar marca lo que ves; en Análisis haz la prueba recomendada.
4. Cierra con una identificación en Ficha y revisa Ajustes → Mis aciertos.
5. Prueba el modo claro y oscuro desde Ajustes.

Esa versión es solo para probar: el visor de la página no permite instalar la app ni usar el modo sin conexión. Los datos que guardes ahí quedan en ese visor.

## Cómo instalarla gratis en tu S24 Ultra

Necesita estar en una dirección `https` para que Android la deje instalar y use el modo sin conexión. Dos opciones gratuitas:

**GitHub Pages** (cuenta gratuita)
1. Crea un repositorio y sube estos archivos: `index.html`, `manifest.webmanifest`, `sw.js` y los tres `icon-*.png`.
2. Settings → Pages → rama `main`, carpeta raíz.
3. Abre la dirección que te da en Chrome del celular → menú ⋮ → **Instalar app**.

**Cloudflare Pages** (cuenta gratuita): arrastra la carpeta en «Direct Upload» y abre la dirección en Chrome.

Después de instalarla, funciona sin conexión. Si publicas una versión nueva, cambia el nombre de `CACHE` en `sw.js` (por ejemplo `piedra-de-toque-v2`) para que se actualice.

Tus datos quedan en el teléfono. **Haz un respaldo de vez en cuando** (Ajustes → Exportar): si borras los datos del navegador, se pierden.

## Qué se verificó y qué no

Verificado:
- 43 pruebas del motor pasan, y fallan cuando rompo datos a propósito (probé tres mutaciones).
- Recorrido completo en un Chromium real a 400 px de ancho: ejemplo, prueba de imán, deltas, ficha, aciertos, subida de fotos con aviso de enfoque, calculadora de densidad, persistencia tras recargar, sin desbordes horizontales, modo oscuro.
- Servicio sin conexión: tras la primera carga, recarga correcta con la red cortada.

**No verificado**, y conviene que lo sepas:
- **Los valores de la base mineralógica** están escritos de memoria. No pude contrastarlos con RRUFF, USGS ni Mindat desde aquí. Son rangos razonables para las especies comunes, pero un dato mal puesto hará que el motor se equivoque con seguridad. Revisarlos contra RRUFF (propiedades y lista IMA) y USGS es el siguiente paso más valioso. Revisa antes la licencia de cualquier fuente que redistribuyas.
- **Los umbrales de enfoque y luz** de las fotos no están calibrados con fotos reales del S24; pueden avisar de más o de menos en superficies lisas.
- **La IA opcional** no se probó: el entorno no tiene acceso a la API. La conexión a Google AI Studio, el nombre del modelo y las condiciones del plan gratuito pueden haber cambiado; el modelo se puede editar en Ajustes. Con la IA activa, las fotos se envían a Google.
- **Cámara, ubicación y descarga del respaldo** en el teléfono real. Se usan los mecanismos estándar del navegador, pero no los pude probar en un Android.
- **Los porcentajes del motor** son heurísticos (verosimilitudes fijadas a mano). Sirven para ordenar y reaccionar a las pruebas, no están calibrados contra muestras reales. Medirlo es el trabajo de tus primeras muestras.

## Qué no incluye (a propósito)

Fluorescencia UV en el cálculo (solo se anota), comparables de mercado, modo «Explorar zona», qué minerales aparecen por región, asociaciones minerales y distribución geográfica en la base, entrenamiento de un modelo propio, y la reacción con ácido clorhídrico (solo vinagre, por seguridad).

## Siguientes pasos sugeridos

1. Probar 10 a 20 muestras que ya conozcas y mirar Ajustes → Mis aciertos.
2. Revisar contra RRUFF/USGS los minerales que más recojas y corregir rangos en `MINERALES` (dentro de `index.html`).
3. Con ese registro, ajustar las verosimilitudes y valorar un clasificador de fotos propio.
