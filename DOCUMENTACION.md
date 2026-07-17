# Kharo Studio — Documentación técnica

> Mapa del proyecto para poder trabajar sobre él sin releer las 2.674 líneas del HTML.
> Última revisión: 2026-07-16, sobre `kharo_studio_claude_2.1.html`.

## 1. Qué es

Aplicación de escritorio-en-navegador para **crear diagramas de acordes, escalas y arpegios de
guitarra**, escucharlos, y exportarlos como PNG o SVG. Está pensada para creadores de contenido
musical y educadores: el diagrama es el producto final, y el sonido es la verificación.

## 2. Estructura de archivos

```
Kharo Chords/
├── kharo_studio_claude_2.1.html   ← toda la aplicación (HTML + CSS + React en un archivo)
├── DOCUMENTACION.md               ← este archivo
└── vendor/                        ← dependencias locales, la app funciona sin internet
    ├── tailwind.js                   Tailwind (build de navegador)
    ├── react.production.min.js
    ├── react-dom.production.min.js
    ├── babel.min.js                  compila el JSX en tiempo de carga
    └── fonts/FjallaOne-Regular.ttf   tipografía de títulos de la marca Kharo
```

No hay build step, ni `package.json`, ni repositorio git. Se abre el HTML y corre.

## 3. Cómo arranca la app (importante y poco obvio)

El código de la aplicación **no está en un `<script>` normal**. Está en:

```html
<script type="text/plain" id="app-source"> ... todo el JSX ... </script>
```

y al final del archivo un segundo `<script>` lo lee, lo compila con Babel forzando
`runtime: "classic"`, y lo ejecuta con `new Function(compiled)`.

El comentario en el código explica el porqué: el runtime `automatic` de Babel inyecta un
`import` de ES Modules que un `<script>` clásico no puede ejecutar → pantalla en blanco.
**Si tocas esa parte y ves la app en blanco, el motivo es ese.**

Consecuencia práctica: el JSX se compila en cada carga (arranque algo lento) y los errores de
sintaxis aparecen en consola como errores de Babel, no como errores de línea del HTML.

## 4. Mapa del archivo por líneas

| Líneas | Bloque | Qué hace |
|---|---|---|
| 1–97 | `<head>` y CSS | Variables de marca Kharo, `@font-face`, scrollbar, animación `audioPulse`, y un bloque de *overrides* que repinta las clases de Tailwind (slate/indigo) a los colores Kharo con `!important` |
| 106–146 | Constantes musicales | `NOTE_NAMES`, `INTERVAL_DEGREES`, `NOTE_TO_SEMITONE`, `DEFAULT_STYLE`, `DEFAULT_INTERVAL_COLORS` |
| 148–184 | Utilidades y afinación | `parseNoteToSemi`, `arraysEqual`, `getStringBaseMIDI` ← **aquí viven los bugs de afinación** |
| 186–259 | `InstrumentSynth` | Sintetizador de cuerda pulsada con Web Audio API |
| 261–381 | Presets | Escalas, arpegios, acordes rápidos y afinaciones (`TUNING_PRESETS`) |
| 383–464 | `App()` — estado | Todos los `useState` de la aplicación |
| 466–519 | Efectos | Reajuste al cambiar nº de cuerdas; título automático |
| 521–693 | `analyzeCurrentChord` | Motor de reconocimiento de acordes (≈60 fórmulas) |
| 708–834 | Interacción | Audio al tocar, gesto de arrastre para cejillas, toque móvil, estados de cuerda |
| 871–1016 | Escalas y arpegios | Generación de las notas mapeadas por todo el mástil |
| 1018–1119 | Motor de reproducción | `triggerStrumOrSequence` — rasgueo/secuencia + destellos |
| 1122–1190 | Leyenda de intervalos | Panel lateral de grados |
| 1192–1228 | Geometría | Cálculo logarítmico del mástil y del lienzo SVG |
| 1230–1285 | Exportación | `exportPNG`, `exportSVG`, `exportSVGForIllustrator` |
| 1290–1320 | Header | Logo (PNG en base64, línea 1293 — 76.849 caracteres) y selector de modo |
| 1322–1704 | Toolbar + panel izquierdo | Barra flotante de 5 herramientas; paneles Teoría e Instrumento |
| 1705–2335 | Lienzo central | Todo el dibujo SVG del mástil |
| 2336–2642 | Panel derecho | Estilo, Intervalos, Exportar |
| 2643–2674 | Toast, footer, arranque | Notificaciones y el bootstrap de Babel |

## 5. Los tres modos

El estado `appMode` (`"chord"` / `"scale"` / `"arpeggio"`) gobierna toda la app.

- **Acordes** — mástil editable a mano. Click coloca una nota; arrastrar horizontalmente crea
  cejilla; click sobre la cejilla la borra. El nombre del acorde se **detecta solo** desde las
  notas puestas (checkbox "Auto").
- **Escalas** — eliges tónica + escala (12 presets, o fórmula personalizada de 12 botones) y la
  app pinta cada nota de la escala en todo el mástil. No es editable a mano.
- **Arpegios** — igual que escalas pero con 9 fórmulas de tríadas y séptimas.

## 6. Sistema de coordenadas (clave para tocar el dibujo)

- `s` = índice de cuerda, **0 = la más grave** (E grave en guitarra), dibujada a la izquierda.
  Ojo: la etiqueta que ve el usuario es `C.{numStrings - idx}`, o sea invertida.
- `f` = traste **relativo** a la ventana visible (empieza en 1). El traste absoluto es
  `startingFret + f - 1`. Esa distinción aparece en todos los cálculos musicales.
- `dots` = `[{ s, f, finger }]` — notas individuales.
- `barres` = `[{ fromString, toString, fret, finger }]` — cejillas.
- `stringStates` = `["none" | "open" | "muted", ...]`, una por cuerda.

Regla de negocio implementada a propósito: al poner una nota se borran las demás de esa cuerda,
**pero las cejillas son inmunes** — no se borran ni al poner notas ni al cambiar el estado de la
cuerda.

## 7. Detección de acordes (`analyzeCurrentChord`, línea 521)

1. Recorre las cuerdas y arma la lista de notas que suenan (dot > cejilla > cuerda al aire).
   Las `muted` se saltan.
2. La nota de la cuerda más grave que suena se guarda como **bajo** (para acordes con inversión,
   tipo `C/G`).
3. Reduce a clases de altura únicas (módulo 12) y prueba **cada nota como posible tónica** contra
   una tabla de ≈60 fórmulas (tríadas, séptimas, sextas, novenas, oncenas, trecenas, add, sus).
4. Devuelve el primer match. Si no hay ninguno: `Desconocido (C, E, G#...)`.

Limitación conocida: gana el primer match del bucle, sin criterio de preferencia. Con acordes
ambiguos puede elegir una tónica que no es la que un músico nombraría.

## 8. Audio (`InstrumentSynth`, línea 186)

Modelo de cuerda pulsada hecho a mano con tres osciladores sumados a un filtro paso-bajo:

| Capa | Onda | Papel | Envolvente |
|---|---|---|---|
| `oscWood` | triangle | cuerpo | ataque 10 ms, cae en `duration` |
| `oscCore` | sine | fundamental | ataque 15 ms, cae en `duration * 0.85` |
| `oscClick` | sawtooth (×2 freq) | ataque de la púa | ataque 2 ms, muere en 70 ms |

El paso-bajo se abre en `freq * 4` y baja a `freq * 1.2` en 400 ms — eso es lo que da la sensación
de cuerda que se apaga. La frecuencia sale de MIDI con `440 * 2^((midi-69)/12)`.

No hay samples: **todo es síntesis**. Esto importa para la funcionalidad de piano que quieres
(ver §11).

## 9. Geometría y dibujo (línea 1192)

El mástil es **logarítmico**, como uno real: cada traste pesa `0.955^(trasteAbsoluto - 1)`, con un
alto mínimo para que las notas quepan. El lienzo (`width` fijo en 340, `height` calculado) se
recalcula en cada render, y de ahí salen las dimensiones que muestra el panel de exportación.

El SVG lleva `id="chord-diagram-svg"` y es la **única fuente de verdad de la exportación**: lo que
ves es literalmente lo que se descarga.

## 10. Exportación (línea 1230)

- **PNG** — serializa el SVG, lo pinta en un canvas a **escala 3×** y descarga el dataURL.
- **SVG web** — serializa y descarga tal cual.
- **SVG Illustrator** — clona el nodo, le añade `xmlns`, `xmlns:xlink`, `version="1.1"` y la
  cabecera `<?xml ...?>`. Es el mismo dibujo con el envoltorio que Illustrator espera.

⚠️ Ninguna de las tres incrusta la tipografía. Si el usuario elige una fuente que la máquina que
abre el archivo no tiene, el texto se sustituye. En el PNG el riesgo es menor pero existe.

---

# 11. Estado de las funcionalidades pedidas

## Bug A — Ukelele y bajo comparten opción, y ambos suenan mal

Está en `getStringBaseMIDI`, líneas 163–184:

```js
if (numStrings === 4) {
    if (noteStr === 'g' || noteStr === 'G' || noteStr === 'A' || noteStr === 'a') {
        return standard4Uke[idx];   // Ukelele
    }
    return standard4Bass[idx];      // Bajo de 4 cuerdas
}
```

La decisión "¿ukelele o bajo?" se toma **cuerda por cuerda, mirando la letra de esa cuerda**. Pero
esa pregunta es del instrumento entero, no de una cuerda. Resultado: cada instrumento se afina
mezclando las dos tablas.

**Bajo en E A D G:**

| Cuerda | Debería sonar | Suena | |
|---|---|---|---|
| 0 · E | E1 (28) | E1 (28) | ✅ |
| 1 · A | A1 (33) | **C4 (60)** | ❌ letra "A" → rama ukelele |
| 2 · D | D2 (38) | D2 (38) | ✅ |
| 3 · G | G2 (43) | **A4 (69)** | ❌ letra "G" → rama ukelele |

**Ukelele en G C E A:**

| Cuerda | Debería sonar | Suena | |
|---|---|---|---|
| 0 · G | G4 (67) | G4 (67) | ✅ |
| 1 · C | C4 (60) | **A1 (33)** | ❌ letra "C" → rama bajo |
| 2 · E | E4 (64) | **D2 (38)** | ❌ letra "E" → rama bajo |
| 3 · A | A4 (69) | A4 (69) | ✅ |

O sea: en ambos casos suenan dos cuerdas correctas y dos disparatadas, con saltos de más de dos
octavas. Eso es exactamente el "no suena como ninguno de los dos" que describes.

La corrección tiene dos partes:
1. Separar en la UI (línea 1605) `4 (Ukelele)` de `4 (Bajo)` — hoy es una sola opción,
   `4 (Ukelele/Bajo)`.
2. Que la app lleve un estado de **instrumento** explícito y que `getStringBaseMIDI` lo consulte,
   en vez de adivinar por la letra de la cuerda.

Nota musical: `standard4Uke = [67, 60, 64, 69]` es afinación reentrante de sol agudo (la
estándar), y está bien. Solo hay que decidir si quieres ofrecer también sol grave (G3 = 55).

## Bug B — La afinación no afecta al sonido (no lo habías mencionado, pero es grave)

Mira el resto de `getStringBaseMIDI`: para 5, 6, 7 y 8 cuerdas **el argumento `noteStr` se ignora
por completo**; devuelve siempre la tabla estándar.

Efecto: eliges **Drop D** o **DADGAD**, el diagrama se redibuja, el nombre del acorde se
recalcula bien… y el audio sigue tocando afinación estándar. Lo mismo con cualquier afinación
libre que escriba el usuario en el "Afinador de Cuerdas".

La causa de fondo es la misma que el Bug A: hay **dos sistemas de afinación paralelos que no se
hablan**. El análisis de acordes usa `tuning[]` (clases de altura, línea 528) y el audio usa las
tablas fijas de `getStringBaseMIDI`. Arreglar los dos bugs de raíz es unificarlos: una sola
función que derive el MIDI real desde `tuning[] + instrumento`, y que todo consuma eso.

Recomiendo arreglar A y B juntos. Por separado es tocar el mismo código dos veces.

## Funcionalidad nueva — Módulo de piano

Lo que pides: la misma idea (crear acordes, exportar PNG y vector) pero con **diagrama de teclado
y sonido de piano**. Arpegios en piano, poco o nada.

Lo que ya sirve tal cual, sin tocarlo:
- El motor de detección de acordes (§7) trabaja con clases de altura, no sabe qué es una cuerda.
  Le das las notas del teclado y funciona igual.
- Las tres exportaciones (§10) serializan `#chord-diagram-svg`. Si el piano se dibuja en un SVG con
  ese mismo contrato, exporta gratis.
- Todo el sistema de colores por intervalo, la leyenda, los presets de escalas y el toast.

Lo que hay que construir:
- **Dibujo del teclado.** Es geometría nueva y no se parece a la del mástil: teclas blancas
  uniformes, negras superpuestas en patrón 2-3, y la nota se marca sobre la tecla en vez de en una
  intersección de rejilla.
- **Interacción.** Click en tecla = alternar nota. Más simple que el mástil: no hay cejillas, no
  hay estados `open`/`muted`, y no hay el problema de "una nota por cuerda".
- **Sonido de piano.** Esto es lo que quiero conversar contigo. El sintetizador actual (§8) está
  modelado para cuerda pulsada; un piano creíble con síntesis pura es dificultoso, y suele pedir
  samples. Pero samples significa archivos de audio en `vendor/`, y hoy el proyecto pesa 250 KB y
  arranca desde un solo HTML. Ese es un intercambio que deberías decidir tú, no yo.

También hay una decisión de arquitectura antes de escribir código: el archivo ya tiene 2.674
líneas con toda la app dentro de un componente `App()`. Meterle un modo piano encima es viable,
pero lo va a hacer bastante más difícil de mantener.

## 12. Deuda técnica que noté de paso

- `App()` es un único componente gigante (líneas 383–2672). Todo el estado y todo el JSX juntos.
- El JSX usa `class` en vez de `className`. Funciona porque React lo tolera, pero llena la consola
  de advertencias.
- El logo va como base64 en una sola línea de 76.849 caracteres (línea 1293). Hace el archivo
  incómodo de leer con herramientas de texto y no aporta nada frente a un archivo en `vendor/`.
- El bloque de overrides CSS (líneas 65–95) repinta Tailwind con `!important`. Cualquier clase
  nueva de color puede salir con el color equivocado sin motivo aparente.
- Los presets de acordes (`PRESETS`, línea 288) son solo 5 y traen `tuning` fijo de 6 cuerdas.
- El proyecto **no está en git**. Antes de meter mano a los bugs y al módulo de piano, vale la pena
  inicializarlo — es una red de seguridad barata.
