# Kharo Studio — Documentación técnica

> Mapa del proyecto para poder trabajar sobre él sin releer el HTML entero.
> Última revisión: 2026-07-16, tras corregir los bugs de afinación y extraer `theory-core.js`.

## 1. Qué es

Aplicación de escritorio-en-navegador para **crear diagramas de acordes, escalas y arpegios de
guitarra**, escucharlos, y exportarlos como PNG o SVG. Está pensada para creadores de contenido
musical y educadores: el diagrama es el producto final, y el sonido es la verificación.

## 2. Estructura de archivos

```
Kharo Chords/
├── index.html                     ← la interfaz (HTML + CSS + React). Única fuente de verdad.
├── theory-core.js                 ← núcleo de teoría musical: funciones puras, sin JSX
├── render-core.js                 ← geometría del diagrama: funciones puras, sin JSX
├── DOCUMENTACION.md               ← este archivo
└── vendor/                        ← dependencias locales, la app funciona sin internet
    ├── tailwind.js                   Tailwind (build de navegador)
    ├── react.production.min.js
    ├── react-dom.production.min.js
    ├── babel.min.js                  compila el JSX en tiempo de carga
    └── fonts/FjallaOne-Regular.ttf   tipografía de títulos de la marca Kharo
```

No hay build step ni `package.json`. Se abre el HTML y corre.

**El reparto es deliberado:** `theory-core.js` sabe de música y no sabe de interfaz;
`index.html` sabe de interfaz y no calcula música. El núcleo se carga con un `<script>`
normal porque no contiene JSX, así que no pasa por Babel. Cuando llegue el módulo de piano,
consumirá ese mismo núcleo — la teoría no sabe si el instrumento tiene cuerdas o teclas.

El repo se despliega en vivo a https://kharomusicchordsgenerator.vercel.app, y `vendor/`
debe acompañar siempre a `index.html` (lo referencia por ruta relativa).

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

### `theory-core.js`

| Bloque | Qué hace |
|---|---|
| Constantes | `NOTE_NAMES`, `INTERVAL_DEGREES`, `NOTE_TO_SEMITONE`, `COMMON_FRETS` |
| `INSTRUMENTS` | Los 6 instrumentos, cada uno con su nº de cuerdas y su afinación de fábrica en MIDI real |
| `TUNING_PRESETS` | Afinaciones, **indexadas por instrumento** (no por nº de cuerdas) |
| `nearestMidiWithPitchClass`, `getStringBaseMIDI`, `resolveTuningMIDI` | Resolución de afinación a MIDI real ← el corazón del arreglo |
| `SCALE_PRESETS`, `ARPEGGIO_PRESETS`, `CHORD_FORMULAS` | Datos de teoría |
| `identifyChord` | Reconocimiento de acordes, agnóstico del instrumento |

### `render-core.js`

| Bloque | Qué hace |
|---|---|
| `computeDiagramGeometry` | Todas las medidas del mástil desde `{numStrings, numFrets, startingFret, dotRadius}` |
| `computeTitleFontSize` | El título encoge para que un nombre largo no se salga |
| `clampStartingFret`, `clampNumFrets` | Límites del instrumento (1–24 y 4–24) |

**Por qué está fuera de `theory-core.js`:** la geometría de un mástil dibujado no es teoría
musical. El módulo de piano compartirá la teoría, pero no esta geometría.

**Por qué no vive dentro del componente que dibuja:** dos consumidores necesitan las medidas
*sin renderizar nada* — la exportación a PNG (dimensiona el lienzo antes de pintar) y el montaje
de la hoja de progresión (necesita el alto de cada diagrama para colocarlos, y cada uno puede
tener distinto número de trastes). Medir renderizando y leyendo el DOM sería un doble pase
frágil.

### `index.html`

| Líneas | Bloque | Qué hace |
|---|---|---|
| 1–101 | `<head>` y CSS | Variables de marca Kharo, `@font-face`, scrollbar, animación `audioPulse`, y un bloque de *overrides* que repinta Tailwind (slate/indigo) a los colores Kharo con `!important` |
| 110–128 | Enlace con el núcleo | Desestructura `window.KharoTheory` |
| 162–235 | `InstrumentSynth` | Sintetizador de cuerda pulsada con Web Audio API |
| 237–309 | `PRESETS` | Los 5 acordes rápidos |
| 311–360 | `App()` — estado | Todos los `useState`, más `stringBaseMIDI()`: el punto único de afinación |
| 400–462 | Efectos | Cambio de instrumento; título automático |
| 464–513 | `analyzeCurrentChord` | Recoge lo que suena en el mástil y delega en `identifyChord` |
| 529–655 | Interacción | Audio al tocar, arrastre para cejillas, toque móvil, estados de cuerda |
| 695–840 | Escalas y arpegios | Notas mapeadas por todo el mástil |
| 842–943 | Motor de reproducción | `triggerStrumOrSequence` — rasgueo/secuencia + destellos |
| 945–1014 | Leyenda de intervalos | Panel lateral de grados |
| 1016–1052 | Geometría | Cálculo logarítmico del mástil y del lienzo SVG |
| 1054–1110 | Exportación | `exportPNG`, `exportSVG`, `exportSVGForIllustrator` |
| 1114–1148 | Header | Logo (PNG en base64, línea 1117 — 76.849 caracteres) y selector de modo |
| 1150–1526 | Toolbar + panel izquierdo | Barra flotante de 5 herramientas; paneles Teoría e Instrumento |
| 1528–2157 | Lienzo central | Todo el dibujo SVG del mástil |
| 2159–2463 | Panel derecho | Estilo, Intervalos, Exportar |
| 2465–2496 | Toast, footer, arranque | Notificaciones y el bootstrap de Babel |

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

## 7. Detección de acordes (`identifyChord`, en `theory-core.js`)

`analyzeCurrentChord` (en `index.html`) recoge lo que suena y delega el reconocimiento en el
núcleo:

1. Recorre las cuerdas y arma la lista de notas que suenan (dot > cejilla > cuerda al aire).
   Las `muted` se saltan.
2. La nota de la cuerda más grave que suena se guarda como **bajo** (para acordes con inversión,
   tipo `C/G`).
3. Reduce a clases de altura únicas (módulo 12) y prueba **cada nota como posible tónica** contra
   una tabla de ≈60 fórmulas (tríadas, séptimas, sextas, novenas, oncenas, trecenas, add, sus).
4. Devuelve el primer match. Si no hay ninguno: `Desconocido (C, E, G#...)`.

Limitación conocida: gana el primer match del bucle, sin criterio de preferencia. Con acordes
ambiguos puede elegir una tónica que no es la que un músico nombraría.

## 8. Audio (`InstrumentSynth`, `index.html` línea 162)

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

## 9. Geometría y dibujo (`index.html` línea 1016)

El mástil es **logarítmico**, como uno real: cada traste pesa `0.955^(trasteAbsoluto - 1)`, con un
alto mínimo para que las notas quepan. El lienzo (`width` fijo en 340, `height` calculado) se
recalcula en cada render, y de ahí salen las dimensiones que muestra el panel de exportación.

El SVG lleva `id="chord-diagram-svg"` y es la **única fuente de verdad de la exportación**: lo que
ves es literalmente lo que se descarga.

## 10. Exportación (`index.html` línea 1054)

- **PNG** — serializa el SVG, lo pinta en un canvas a **escala 3×** y descarga el dataURL.
- **SVG web** — serializa y descarga tal cual.
- **SVG Illustrator** — clona el nodo, le añade `xmlns`, `xmlns:xlink`, `version="1.1"` y la
  cabecera `<?xml ...?>`. Es el mismo dibujo con el envoltorio que Illustrator espera.

⚠️ Ninguna de las tres incrusta la tipografía. Si el usuario elige una fuente que la máquina que
abre el archivo no tiene, el texto se sustituye. En el PNG el riesgo es menor pero existe.

---

# 11. Estado de las funcionalidades pedidas

## Bugs de afinación — CORREGIDOS (2026-07-16)

Los tres eran la misma familia: **el diagrama y el audio no calculaban la misma nota.** El
diagrama siempre se vio bien; el sonido no le correspondía.

### Bug C — El audio ignoraba el traste de inicio

La app dibuja una VENTANA del mástil, así que hay dos numeraciones de traste y es fácil
confundirlas:

```
relFret 1 = el primer traste DIBUJADO      absFret 1 = el primer traste REAL
absFret = startingFret + relFret - 1
```

`analyzeCurrentChord` usaba el absoluto; las dos rutas de audio usaban el **relativo**. Con
`startingFret = 5`, un acorde sonaba como si estuviera en el traste 1. No era ni siquiera una
transposición: las cuerdas al aire sonaban bien y las pisadas no, así que el resultado era un
acorde distinto. En modo escala, el diagrama mostraba Do mayor y sonaban A#, C#, D# y G#.

Ahora toda conversión de traste a MIDI pasa por `fretToMidi(baseMidi, startingFret, relFret)`
en el núcleo, que además trata `relFret = 0` como cuerda al aire (no se desplaza).

### Bugs A y B — Dos sistemas de afinación en paralelo

El análisis de acordes leía el array `tuning[]` (las letras), y el audio usaba unas tablas
fijas dentro de `getStringBaseMIDI` que ignoraban ese array.

**Bug A — Ukelele y bajo compartían opción y ambos sonaban mal.** La decisión "¿ukelele o
bajo?" se tomaba cuerda por cuerda, mirando la letra de esa cuerda (`if (noteStr === 'g' ...)`),
cuando es una pregunta del instrumento entero. Cada instrumento acababa mezclando las dos
tablas: en el bajo, las cuerdas A y G sonaban C4 y A4; en el ukelele, C y E sonaban A1 y D2.

**Bug B — La afinación no afectaba al sonido.** Para 5, 6, 7 y 8 cuerdas el argumento con la
nota se ignoraba por completo. Drop D y DADGAD se dibujaban y se nombraban bien, pero sonaban
en afinación estándar.

### Cómo quedó

1. **El instrumento es un estado explícito** (`instrument`), no algo que se deduce del número
   de cuerdas. `numStrings` ahora se deriva del instrumento, no al revés. En la interfaz,
   `4 (Ukelele)` y `4 (Bajo)` son opciones separadas, y cada instrumento ofrece sólo sus
   propias afinaciones.
2. **Un único punto de afinación.** Todo el audio pasa por `stringBaseMIDI(stringIndex)`, que
   resuelve el MIDI real desde `tuning[] + instrument`. Los dos sistemas paralelos ya no
   existen.
3. **La regla de octava:** al reafinar, el músico mueve la cuerda lo mínimo posible. Así que
   cada cuerda suena en la octava más cercana a su afinación de fábrica
   (`nearestMidiWithPitchClass`). Drop D sobre E2 baja a D2, no sube a D3. Esto hace que
   funcione cualquier afinación libre que escriba el usuario, no sólo los presets.
4. El ukelele de **sol grave** necesita octava explícita (por cercanía se resolvería al sol
   agudo), así que un preset puede fijar `midi` y saltarse la deducción. Es la única excepción.

### Verificado

Interceptando el sintetizador en el navegador y leyendo las frecuencias que toca de verdad:

| Caso | Suena | Antes |
|---|---|---|
| Guitarra estándar, acorde C | `C3 E3 G3 C4 E4` | igual (correcto ya) |
| Drop D, cuerdas al aire | `D2 A2 D3 G3 B3 E4` | `E2 A2 D3 G3 B3 E4` ❌ |
| DADGAD | `D2 A2 D3 G3 A3 D4` | `E2 A2 D3 G3 B3 E4` ❌ |
| Bajo 4c, al aire | `E1 A1 D2 G2` | `E1 C4 D2 A4` ❌ |
| Ukelele, al aire | `G4 C4 E4 A4` | `G4 A1 D2 A4` ❌ |
| Acorde C con `startingFret=5` | `E3 G#3 G3 E4 E4` (lo que dice el análisis) | `C3 E3 G3 C4 E4`, idéntico al traste 1 ❌ |
| Escala de Do mayor en el traste 5 | solo notas de Do mayor | sonaban A#, C#, D#, G# ❌ |

Los modos de escalas y arpegios siguen funcionando, la exportación sigue intacta, y no hay
errores en consola.

**Nota sobre cómo probarlo a oído:** la digitación de C tiene la 6ª cuerda muteada, que es
justo la que Drop D reafina — con ese acorde no se nota diferencia, y es correcto. Para oírlo,
vacía el mástil (las cuerdas al aire suenan todas) o usa una digitación que pise la 6ª.

## Funcionalidad nueva — Módulo de piano (pendiente)

Lo que se busca: la misma idea (crear acordes, exportar PNG y vector) pero con **diagrama de
teclado y sonido de piano**. Arpegios en piano, poco o nada.

**El terreno ya está preparado.** Al extraer `theory-core.js` para arreglar los bugs de
afinación, el piano heredó gratis:

- `identifyChord` — sólo mira clases de altura y cuál es la nota más grave. Le das las notas
  del teclado y funciona igual, sin tocarlo.
- Los presets de escalas y arpegios, los nombres de notas y los grados.
- Las tres exportaciones, que serializan `#chord-diagram-svg`. Si el piano se dibuja en un SVG
  con ese mismo `id`, exporta sin escribir una línea de exportación.
- El sistema de colores por intervalo, la leyenda y el toast.

Lo que hay que construir:

- **Dibujo del teclado.** Geometría nueva; no se parece a la del mástil. Teclas blancas
  uniformes, negras superpuestas en patrón 2-3, y la nota se marca sobre la tecla en vez de en
  una intersección de rejilla.
- **Interacción.** Click en tecla = alternar nota. Más simple que el mástil: no hay cejillas,
  ni estados `open`/`muted`, ni la regla de "una nota por cuerda".
- **Voz de piano** en el sintetizador. Decisión tomada: empezar **sin samples**, con una voz
  dedicada (ataque rápido, sin el sostenido de la cuerda pulsada, parciales inarmónicos, ruido
  de martillo). No engañará a un pianista, pero conserva lo que hace especial al proyecto: un
  archivo, 250 KB, cero internet. Samples sólo si al oírlo no convence — y sabiendo que
  significan megas de audio en `vendor/`.

Nota de diseño: el piano NO debería ser un cuarto `appMode`. `appMode` distingue qué se dibuja
(acorde / escala / arpegio), y eso es ortogonal a con qué instrumento. Lo natural es que el
piano sea otra opción del selector de instrumento, con `INSTRUMENTS` declarando si se dibuja
como mástil o como teclado.

## 12. Deuda técnica que noté de paso

- `App()` sigue siendo un único componente gigante (líneas 311–2494). Todo el estado y todo el JSX juntos. El núcleo de teoría ya salió; la interfaz no.
- El JSX usa `class` en vez de `className`. Funciona porque React lo tolera, pero llena la consola
  de advertencias.
- El logo va como base64 en una sola línea de 76.849 caracteres (línea 1117). Hace el archivo
  incómodo de leer con herramientas de texto y no aporta nada frente a un archivo en `vendor/`.
- El bloque de overrides CSS (líneas 65–99) repinta Tailwind con `!important`. Cualquier clase
  nueva de color puede salir con el color equivocado sin motivo aparente.
- Los presets de acordes (`PRESETS`, línea 237) son solo 5 y todos son de guitarra.
- El **reconocimiento de acordes gana con el primer match** del bucle, sin criterio de preferencia
  (ver §7). Es la deuda más musical que queda.
