# Kharo Studio — Documentación técnica

> Mapa del proyecto para poder trabajar sobre él sin releer el HTML entero.
> Última revisión: 2026-09-06 — v4: portada de entrada, pestañas en dos grupos, **Libre** como
> apartado propio, gestor de canciones y ejercicios (varias, por fin), biblioteca de acordes que
> se ve entera y con destino al mandar, tríadas al lado del mástil, papeleras en vez de ×, menú
> de clic derecho unificado y repartido, percusión al escribir un rasgueo, y el control de tempo
> arreglado.
>
> Anterior: 2026-09-06 — v3: tríadas de la tonalidad sobre la escala, recorridos con tope
> por cuerda, flechas por arrastre y menú contextual, tapping arreglado a fondo, análisis armónico
> de la canción y modo libre en Ejercicios.
>
> Anterior: 2026-09-03 — v2: editor de rasgueo, recorridos de notas, arpegios agrupados con
> sweep, apartado Ejercicios y teoría de la tonalidad.

## 1. Qué es

Aplicación de navegador con tres apartados que comparten el mismo núcleo:

1. **El estudio de diagramas** — crear acordes, escalas y arpegios de instrumentos de cuerda,
   marcar en qué orden se tocan, escucharlos y exportarlos como PNG o SVG.
2. **Canción** — encadenar los acordes que has creado en una progresión con duración y ritmo
   —incluido un rasgueo escrito por ti—, colocar los acordes sobre la letra arrastrándolos,
   escucharlo todo seguido y sacar una hoja A4 en PNG, SVG o PDF, con una página opcional que
   explica la tonalidad.
3. **Ejercicios** — fichas de técnica: digitaciones con su recorrido, a la velocidad que
   elijas, para practicar y exportar.

Está pensada para creadores de contenido musical y educadores, y para estudiar.

Aparte, y **todavía sin integrar**, hay un tercer generador para piano (§15).

## 2. Estructura de archivos

```
Kharo strings/
├── index.html                     ← la app. Estructura y comportamiento
├── theme.css                      ← tokens de diseño: los colores y medidas, y nada más
├── ui.css                         ← capa de componentes .k-*, construida con esos tokens
├── theory-core.js                 ← núcleo de teoría musical: funciones puras, sin JSX
├── render-core.js                 ← geometría del diagrama: funciones puras, sin JSX
├── song-core.js                   ← núcleo de canción y ejercicios: modelo, letra, tiempos, ritmos
├── DOCUMENTACION.md               ← este archivo
├── README.md
├── Piano/
│   └── piano_chord_diagram_generator.tsx   ← prototipo aparte, NO conectado (ver §15)
└── vendor/                        ← dependencias locales, la app funciona sin internet
    ├── tailwind.js                   Tailwind (build de navegador)
    ├── react.production.min.js
    ├── react-dom.production.min.js
    ├── babel.min.js                  compila el JSX en tiempo de carga
    ├── jspdf.umd.min.js              PDF de la hoja de canción
    └── fonts/FjallaOne-Regular.ttf   tipografía de títulos de la marca Kharo
```

No hay build step ni `package.json`. Se abre `index.html` y corre.

**El reparto es deliberado:** `theory-core.js` sabe de música y no sabe de interfaz;
`index.html` sabe de interfaz y no calcula música; `theme.css` y `ui.css` deciden el
aspecto y no saben de nada más. El núcleo se carga con un `<script>` normal porque no
contiene JSX, así que no pasa por Babel.

El repo se despliega en vivo a https://kharomusicchordsgenerator.vercel.app, y `vendor/`
debe acompañar siempre a `index.html` (lo referencia por ruta relativa).

## 3. Cómo arranca la app (importante y poco obvio)

El código de la aplicación **no está en un `<script>` normal**. Está repartido en tres
bloques de texto plano que el arranque concatena y compila de una vez:

```html
<script type="text/plain" id="app-source-core">   ... constantes, sintetizador, componentes
<script type="text/plain" id="app-source-song">   ... el apartado Canción
<script type="text/plain" id="app-source-studio"> ... App() y el montaje
```

Al final del archivo, un `<script>` normal los junta en ese orden, los compila con Babel
forzando `runtime: "classic"`, y los ejecuta con `new Function(compiled)`.

**Por qué en bloques y no en archivos:** un `fetch` a un `.jsx` local falla por CORS al abrir
`index.html` con doble clic, y la app tiene que seguir arrancando así. Se parten para que
encontrar algo siga siendo posible: todo junto pasaba de las 3.500 líneas.

**Comparten un único ámbito** — al concatenarse son un solo archivo para el compilador, así que
lo del bloque de canción ve lo del núcleo sin importar ni exportar nada. El orden importa: el
núcleo define lo que usan los otros dos, y el estudio termina montando la aplicación.

El comentario en el código explica el porqué: el runtime `automatic` de Babel inyecta un
`import` de ES Modules que un `<script>` clásico no puede ejecutar → pantalla en blanco.
**Si tocas esa parte y ves la app en blanco, el motivo es ese.**

Consecuencia práctica: el JSX se compila en cada carga (arranque algo lento) y los errores de
sintaxis aparecen en consola como errores de Babel, no como errores de línea del HTML.

## 4. Mapa del código

### `theory-core.js` (445 líneas)

| Bloque | Qué hace |
|---|---|
| Constantes | `NOTE_NAMES`, `INTERVAL_DEGREES`, `NOTE_TO_SEMITONE`, `COMMON_FRETS` |
| `INSTRUMENTS` | Los 6 instrumentos, cada uno con su nº de cuerdas y su afinación de fábrica en MIDI real |
| `TUNING_PRESETS` | Afinaciones, **indexadas por instrumento** (no por nº de cuerdas) |
| `nearestMidiWithPitchClass`, `getStringBaseMIDI`, `resolveTuningMIDI` | Resolución de afinación a MIDI real ← el corazón del arreglo de §21 |
| `toAbsoluteFret`, `fretToMidi`, `midiToNoteName`, `midiToFrequency` | Conversión traste ↔ MIDI ↔ Hz |
| `SCALE_PRESETS` (12), `ARPEGGIO_PRESETS` (9), `CHORD_FORMULAS` (≈60) | Datos de teoría |
| `identifyChord` | Reconocimiento de acordes, agnóstico del instrumento. Devuelve también `type` e `intervals` |
| `identifyChordFromVoicing`, `analyzeChordInKey` | Qué acorde es una digitación guardada, y si es de la tonalidad o viene de fuera (§19 bis) |
| `funcionDelGrado` | Tónica, subdominante o dominante, y sensible frente a subtónica |
| `diatonicChords` | Los siete grados de una tonalidad, apilando terceras. Devuelve nombres **y** números (`raizPitch`, `tipoTriada`, `relativos`, `triadaPitches`) |
| `diatonicTriadPositions`, `presetArpegioParaTriada` | Qué posiciones del mapa dibujado son de cada grado, y con qué preset de arpegio se abre (§15 bis) |
| `chordVoicingToMidi` | De una foto del mástil a las notas que suenan. **La regla de qué suena vive aquí y sólo aquí** |

Todo se publica en `window.KharoTheory`.

### `render-core.js` (129 líneas)

| Bloque | Qué hace |
|---|---|
| `computeDiagramGeometry` | Todas las medidas del mástil desde `{numStrings, numFrets, startingFret, dotRadius}` |
| `computeTitleFontSize` | El título encoge para que un nombre largo no se salga |
| `clampStartingFret`, `clampNumFrets` | Límites del instrumento (1–24 y 4–24) |
| `DEFAULT_STYLE`, `LIMITES_ESTILO`, `normalizeStyle` | El aspecto de la obra y su saneado. Vive aquí porque `dotRadius` alimenta la geometría (§12) |
| `loadStyleState`, `saveStyleState` | `kharo.style.v1`: el estilo activo y los presets |

Constantes de dibujo: ancho fijo 340, padding 130/60/70/70, traste base 60 px y factor de
encogimiento 0,955 por traste.

**Por qué está fuera de `theory-core.js`:** la geometría de un mástil dibujado no es teoría
musical. El módulo de piano compartirá la teoría, pero no esta geometría.

**Por qué no vive dentro del componente que dibuja:** dos consumidores necesitan las medidas
*sin renderizar nada* — la exportación a PNG (dimensiona el lienzo antes de pintar) y el montaje
de la hoja de canción (necesita saber cuánto ocupa cada cosa para repartirla en páginas). Medir
renderizando y leyendo el DOM sería un doble pase frágil.

### `song-core.js`

| Bloque | Qué hace |
|---|---|
| `TIME_SIGNATURES`, `beatsPerBar` | 4/4, 3/4, 2/4 y 6/8. Todo se mide en **pulsos**, no en compases: así un acorde puede durar medio compás o tres |
| `RHYTHM_PATTERNS` | Los 6 ritmos, como datos. Añadir uno es añadir una entrada |
| `createSong`, `createSection`, `createChordSnapshot`, `normalizeSong` | El modelo y su saneamiento |
| `parseChordLine`, `buildChordLine`, `insertChordAtColumn`, `alignLyricBlock` | La letra con acordes, alineada por columna |
| `reescalarRejilla` | Cambiar un rasgueo de corcheas a semicorcheas y al revés sin perder lo escrito (§17) |
| `sectionBeats`, `songSeconds`, `formatDuration` | Cuentas de tiempo |
| `expandSong` | Despliega repeticiones y devuelve los compases con su momento exacto en segundos |
| `rhythmEventsForBar`, `notesForEvent` | El patrón rítmico convertido en golpes concretos |
| `paginateSong` | Reparte la canción en páginas A4 sin tocar el DOM |
| `loadSongs`, `saveSongs`, `loadChordLibrary`, `saveChordLibrary` | `localStorage`, envuelto para que no tumbe la sesión. Las listas son plurales **y ahora la interfaz las usa** (§14) |
| `CICLO_CELDA` | Los seis estados de una casilla de rasgueo. Exportado para que el ciclo y su menú no puedan discrepar (§17) |

Todo se publica en `window.KharoSong`. Mismo criterio que sus hermanos: no sabe qué notas suena
un acorde (eso es `theory-core`), ni de qué color se pinta nada (eso son las hojas de estilo).

### `index.html`

Los números bailan en cuanto se toca el archivo; sirven de orientación, no de referencia
exacta. Para encontrar un bloque, mejor buscar su comentario que fiarse de la línea.

| Bloque | Qué hace |
|---|---|
| `<head>` | Carga Tailwind, React, Babel, jsPDF, los tres núcleos y las dos hojas de estilo. Lo único que queda en un `<style>` propio es la animación del halo de nota pulsada, que es del diagrama y no de la piel |
| Enlace con los núcleos | Desestructura `KharoTheory` y `KharoRender`; `KharoSong` se usa con prefijo (`Song.`) para que se vea de un vistazo qué línea es del apartado de canción |
| Constantes de estilo | `FONTS_LIST` (5 tipografías) y los alias de `DEFAULT_STYLE`, que ahora vive en `render-core.js` (§12). Aquí sólo quedan `StyleContext` y `useDiagramStyle`, que lo reparten por los tres bloques |
| `InstrumentSynth` | Sintetizador de cuerda pulsada, más `playPercussion` para el rasgueo escrito (§8) |
| `PRESETS` | Los 5 acordes rápidos (C, A, G, E, D — todos de guitarra) |
| `MODE_TABS` + `ModeTabs` | El selector de apartado, guiado por datos y repartido en dos grupos (§5) |
| `Landing` + `SECCIONES_LANDING` | La portada: una ficha por apartado, con lo que hace cada uno (§5) |
| `MenuContextual` | El menú de clic derecho, vertical u horizontal. Antes eran dos copias literales (§11) |
| `BotonBorrar` / `BotonCerrar` / `IconoPapelera` | Papelera para borrar, × para cerrar. Antes todo era × (§11) |
| `FretStepper` | Los dos controles del mástil. **El botón de arriba RESTA en los dos modos**: el mástil se dibuja con la cejuela arriba y crece hacia abajo. `modo: "direccion"` usa ▲▼ (mueve la ventana), `modo: "cantidad"` usa −/+ (cuántos trastes se ven). Antes el de cantidad tenía el + arriba y al pulsarlo el mástil crecía hacia abajo: el botón y el movimiento apuntaban a lados contrarios |
| `piezaLeyendaYRecorrido` | «Mostrar Leyenda» + «Flechas del recorrido». Estaba **copiado palabra por palabra** en el panel de escalas y en el de arpegios: 82 líneas por duplicado, y cada control nuevo había que escribirlo dos veces |
| `piezaSweep` | El interruptor de sweep, en la barra de estado. Vivía dentro de Arpegios → Por cuerdas, y lo que dice no es de la agrupación sino del recorrido: cruzar de cuerda es la misma pasada de púa. Por eso ahora también sirve en Escalas (economy picking), y sólo aparece con las flechas encendidas |
| `App()` — estado | Todos los `useState`, más `stringBaseMIDI()`: el punto único de afinación |
| Efectos | Cambio de instrumento; título automático y análisis del acorde |
| `analyzeCurrentChord` | Recoge lo que suena en el mástil y delega en `identifyChord` |
| Interacción | Arrastre para cejillas, toque móvil, estados de cuerda |
| Escalas y arpegios | Notas mapeadas por todo el mástil |
| `triggerStrumOrSequence` | Motor de reproducción. Un acorde se rasguea (las cuerdas casi a la vez) y una escala se recorre a tempo: son dos gestos distintos, así que el paso entre notas no es el mismo |
| `buildNotePath` y compañía | El recorrido: `notasDelMapa`, `recorridoActual`, `opcionesDelRecorrido`, `alternarEnRecorrido`, `renderNotePath` (§15) |
| Tríadas de la tonalidad | `triadasDiatonicas`, `zonasDeUnGrado`, `cascoConvexo`, `renderEnvolventesDeTriadas`, `opacidadPorTriada`, `piezaTriadas` (+ `gradoFijado` y `menuTriada`), `abrirTriadaComoArpegio`, `pasoDeTriada`, `nombreDeZona`, `mandarTriadaAEjercicio`, `mandarCadaAgrupacion` (§15 bis) |
| `formaDeTriadaActual`, `notaDeTapping`, `generateTriadShapeDots`, `nombreDeInversion` | Las tríadas por juego de cuerdas, con sweep y tapping (§16) |
| `crearPasoDeEjercicio` / `cargarPasoEnMastil` | El atajo de ida y vuelta entre el mástil y Ejercicios |
| `getLegendItems` + `renderIntervalLegend` + `renderLegendStrip` | Los grados, en columna (xl+) o en tira (móvil) |
| Geometría | Llamada a `computeDiagramGeometry` y tamaño del título |
| Exportación | `svgParaExportar` (quita lo `data-transient`) y sobre él `exportPNG`, `exportSVG`, `exportSVGForIllustrator` |
| Piezas móviles | `piezaTempo`, `piezaModosVista`, `piezaVaciar`, `piezaGuardarAcorde`, `propsPaso*`: lo que cambia de sitio según la pantalla, declarado una sola vez |
| **Bloque de canción** | `MiniFretboard`, `ChordLibrary`, `GestorArchivos`, `BarStrip`, `useCharWidth`, `ChordLane`, `LyricEditor`, `StrumEditor`, `SheetLyricBlock`, `SheetBars`, `SheetTheoryPage`, `SongSheet`, `SectionCard`, `SongEditor`, `ExerciseFretboard`, `ExerciseEditor`, `ExerciseSheet` |
| Canción, en `App()` | La biblioteca y la canción en estado, el guardado automático, `playSong`/`stopSong` y las exportaciones de la hoja |
| Header | Logo (PNG en base64, en una línea de 76.849 caracteres) y las pestañas |
| Toolbar flotante | Las 5 herramientas + el backdrop que cierra el panel abierto |
| Popover izquierdo | Paneles **Teoría & Modo** e **Instrumento** |
| Lienzo central | Barra de estado, la tira de leyenda, los `FretStepper` y todo el dibujo SVG |
| Popover derecho | Paneles **Estilo**, **Intervalos** y **Exportar** |
| Toast y footer | Notificaciones y pie |
| Arranque | `createRoot` y el bootstrap de Babel |

## 5. Los cuatro modos del estudio, y la portada

El estado `appMode` (`"chord"` / `"scale"` / `"arpeggio"` / `"free"`) gobierna **qué se dibuja**
en el mástil. `appView` (`"welcome"` / `"studio"` / `"song"` / `"exercise"`) gobierna **en qué
apartado estás**. Son ejes distintos, y por eso al volver de Canción o de Ejercicios el mástil
aparece como se dejó.

### La portada

`appView` arranca en `"welcome"`. Antes arrancaba en el estudio, así que quien abría la app por
primera vez veía un mástil con un Do puesto y cinco palabras en una fila, sin nada que dijera qué
hace cada una ni que Canción y Ejercicios existen para otra cosa.

`Landing` pinta una ficha por apartado, agrupadas igual que las pestañas, porque **el
agrupamiento es la explicación**: son dos maneras de usar la app —dibujar en el mástil, montar un
documento—, no seis funciones sueltas. Los textos viven en `SECCIONES_LANDING`, junto al
componente, y el grupo de cada ficha se lee de `MODE_TABS`: así no hay dos listas que puedan
decir cosas distintas.

Se pinta en **cada carga**, y no se guarda ningún «ya la vio». Volver es gratis —el logo del
header es el botón de inicio— y una portada que aparece unas veces sí y otras no desconcierta más
que una que aparece siempre. En la portada el header pinta sólo el logo: sin pestañas, para que
se lea como portada y no como una sección más.

### Las pestañas, en dos grupos

`MODE_TABS` lleva un campo `grupo` y `ModeTabs` pinta un `<nav class="k-tabs">` por grupo. Dos
`.k-tabs` seguidos ya se leen como dos bloques, porque la clase trae su propio fondo y su propio
borde: la separación no necesitó CSS nuevo.

El agrupamiento va **dentro del componente** y no en el header a propósito: `ModeTabs` se monta
dos veces —escritorio y móvil— y hacerlo fuera obligaba a escribirlo dos veces. En `stretch`
(móvil) cada nav recibe un `flex` proporcional a cuántas pestañas lleva, para que todas midan lo
mismo; `.k-tabs--stretch` por sí sola asume un único nav a ancho completo.

- **Acordes** — mástil editable a mano. Click coloca una nota; arrastrar horizontalmente crea
  cejilla; click sobre la cejilla la borra. El nombre del acorde se **detecta solo** desde las
  notas puestas (checkbox "Auto"). `chordDisplayMode` decide si cada nota muestra el dedo
  (`diagram`), el nombre de la nota (`note`) o el grado (`degree`).
- **Escalas** — eliges tónica + escala (12 presets, o fórmula personalizada de 12 botones) y la
  app pinta cada nota de la escala en todo el mástil. No es editable a mano.
- **Arpegios** — igual que escalas pero con 9 fórmulas de tríadas y séptimas.
- **Libre** — el mástil en blanco y editable a mano, **sin el tope de una nota por cuerda**. Ver
  «§5 bis».

En escalas y arpegios aparece la leyenda de intervalos, que se puede ocultar y recuperar con un
botón flotante. En Acordes y en Libre no: sin fórmula no hay tónica declarada, y una leyenda de
grados ahí sería una lectura inventada.

## 5 bis. Libre

Era un interruptor —«Modo libre»— escondido a tres niveles: toolbar → panel de Escala →
encender las flechas → el toggle. La parte más libre de la app era la que no se veía. Ahora es una
pestaña al lado de Acordes.

**Cómo está montado.** Libre se edita con los MISMOS manejadores que Acordes (`handleMouseDown`,
`handleMouseEnter`, `handleMouseUp`, los de toque y `toggleStringState`), que antes empezaban
todos con `if (appMode !== "chord") return`. Ahora preguntan por `modoEditable`.

**La regla que los separa es una sola línea.** En `handleMouseUp`:

```js
const cleanDots = appMode === "chord" ? dots.filter(d => d.s !== sIdx) : dots;
```

Un acorde es lo que puede sonar a la vez y un dedo por cuerda es todo lo que hay: colocar la
segunda cancela la primera. En Libre esa regla no vale, porque lo que se escribe es un recorrido,
no una posición de la mano, y tres notas en la misma cuerda es exactamente lo que se practica.

**Libre tiene su propio mástil** (`dotsLibre`, `stringStatesLibre`). Con un solo juego de notas,
entrar en Libre a probar algo y volver dejaba el acorde con cuatro notas en una cuerda: destruido
sin haberlo tocado. La afinación, el instrumento y la ventana de trastes **sí** se comparten: eso
es el instrumento, no el dibujo. Los manejadores escriben en el par activo
(`dotsActivos` / `setDotsActivos`) para no repetir el `if` en cada línea.

**Y las flechas funcionan sin código nuevo.** `notasDelMapa()` devuelve, en Libre, las notas
colocadas a mano. Como todo el recorrido —`buildNotePath`, el arrastre, `renderNotePath`, el
sweep, la reproducción en orden y «→ Crear ejercicio»— ya estaba escrito contra ese resultado y
no contra una escala, no hubo que tocar nada más.

**Poner una nota la mete ya en el recorrido.** Separarlo en dos gestos —ponerla y luego volver a
tocarla para ordenarla— es pedir el doble de toques para lo que casi siempre se hace en un orden:
el de ponerlas. Para reordenar se arrastra de una a otra; para quitar, el menú de la flecha o el
de la nota.

**La escala de guía** (`guiaEscala`, apagada por defecto) dibuja una escala apagada por debajo,
sin manejadores y marcada `data-transient`: es una referencia para colocar la mano, no parte del
dibujo, así que tampoco viaja en el archivo exportado. Cubre lo que se perdió al retirar el
toggle de Escalas —añadir notas de fuera de la escala mientras la miras—, y al revés que antes: el
papel en blanco es lo normal y la guía se pide.

**Lo que Libre no tiene, y por qué.** No detecta el nombre del acorde (con varias notas por cuerda
sería basura; el título dice «Digitación libre»), no ofrece Diagrama/Notas/Grados (el nombre de la
nota va siempre puesto) y no ofrece «+ Guardar acorde», que sigue siendo cosa de Acordes.

**Las cuerdas al aire sólo se dibujan si se ve el traste 1.** Una cuerda al aire es el traste 0, y
el 0 está justo antes del 1: si la ventana empieza en el 4, ese traste no está en el dibujo y la
línea de arriba ya no es la cejuela, es la frontera con el 3. Se dibujaban igual, encima de esa
línea, diciendo «al aire» de unas notas que en esa ventana no se tocan — y de ahí pasaban al
recorrido, y del recorrido al ejercicio.

La regla vale en **escala y arpegio**, donde una cuerda al aire es literal. En **modo Acorde es al
revés**: ahí el aire es la cejuela de la digitación y sube con la ventana (§21), así que sigue
contando. Lo que no sigue es dibujarse como «○» en el mini diagrama de Canción cuando la foto no
empieza en el traste 1: esa cuerda no suena al aire, suena en `startingFret - 1`, y poner un
círculo ahí es decir algo que no es. La × de muteada sí se queda: eso es cierto se mire desde
donde se mire.

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
cuerda. Esa regla vale **sólo en modo Acorde**: en Libre no hay tope por cuerda (§5 bis), y Libre
lleva además su propio `dotsLibre` / `stringStatesLibre`.

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

## 8. Audio (`InstrumentSynth`)

Modelo de cuerda pulsada hecho a mano con tres osciladores sumados a un filtro paso-bajo:

| Capa | Onda | Papel | Envolvente |
|---|---|---|---|
| `oscWood` | triangle | cuerpo | ataque 10 ms, cae en `duration` |
| `oscCore` | sine | fundamental | ataque 15 ms, cae en `duration * 0.85` |
| `oscClick` | sawtooth (×2 freq) | ataque de la púa | ataque 2 ms, muere en 70 ms |

El paso-bajo se abre en `freq * 4` y baja a `freq * 1.2` en 400 ms — eso es lo que da la sensación
de cuerda que se apaga. La frecuencia sale de MIDI con `440 * 2^((midi-69)/12)`.

No hay samples: **todo es síntesis**. Es lo que permite que la app funcione sin internet.

### La percusión (`playPercussion`)

Un golpe de mano sobre las cuerdas apagadas: **ruido filtrado, sin altura**, así que no lleva
MIDI. El `AudioBuffer` de ruido blanco se genera **una vez** en `init()` y se reutiliza — rellenar
medio segundo de muestras aleatorias en cada golpe cuesta más que el propio sonido, y a dieciséis
golpes por compás eso se oye como tirones.

Tres timbres, que son los tres gestos que la rejilla del rasgueo distingue:

| Timbre | Gesto | Cómo suena |
|---|---|---|
| `golpe` | ↓ | la mano baja entera: más cuerpo y más cola |
| `alto` | ↑ | sólo roza las agudas: más fino y más corto |
| `seco` | × | apagado: un chasquido, sin cola |

Un `bandpass` da el color y un `highpass` quita el retumbe — sin él, ruido blanco a volumen de
golpe suena a soplo y no a mano.

**Dónde suena, y dónde no.** Sólo en el ▶ del editor de rasgueo. Escribiendo un ritmo no se está
escuchando armonía: se está contando, y un acorde sostenido encima de cada golpe es justamente lo
que impide oír dónde cae cada uno. Antes ese ▶ buscaba «el primer acorde que aparezca en la
canción» —uno que no había elegido nadie— y tocaba sus notas. **La canción entera sigue sonando
con sus acordes**: ahí sí se quiere oír la armonía.

Para que el reproductor sepa cuál es un apagado, `gridToEvents` emite `muted` y `accent`, y
`rhythmEventsForBar` los copia. Ese `forEach` copia campo a campo: **lo que no esté escrito ahí no
llega al reproductor** por mucho que lo ponga el patrón.

El motor de reproducción (`triggerStrumOrSequence`) arma la lista de notas según el modo y las
programa con el destello visual `notePulse` sincronizado.

**El tempo está en BPM (negras)**, y las escalas y arpegios suenan en **corcheas**. Antes el
control guardaba milisegundos entre notas, así que subirlo retrasaba: al revés de lo que hace
cualquier metrónomo.

El rasgueo de un acorde no es cuestión de tempo —es un gesto de la mano—, así que su separación
entre cuerdas se deriva del tempo, `corchea / 6`, apretada entre 15 y 110 ms.

**Era un techo plano de 45 ms, y se comía medio control.** `corchea / 6` es `5 / bpm`, que sólo
baja de 0,045 cuando el tempo pasa de **111 bpm**: mover el control de 30 a 111 devolvía siempre
el mismo número y sonaba exactamente igual, mientras la etiqueta seguía diciendo «Tempo». El
techo estaba puesto por una razón buena —sin él, a tempos muy bajos un acorde tarda casi dos
segundos en sonar entero—, pero un techo plano no es la forma de ponerlo: hay que apretar el
recorrido dentro de un margen audible, no aplastarle la mitad. Con 110 ms el techo empieza a
morder por debajo de 45 bpm, donde ya nadie rasguea.

Y el control **dice lo que hace**: en modo Acorde muestra, junto a los bpm, los milisegundos
reales entre cuerda y cuerda. Decir sólo «bpm» ahí era prometer un metrónomo donde lo que hay es
un gesto de la mano.

## 9. Geometría y dibujo

El mástil es **logarítmico**, como uno real: cada traste pesa `0.955^(trasteAbsoluto - 1)`, con un
alto mínimo (`max(25, dotRadius*2 + 6)`) para que las notas quepan. El lienzo (`width` fijo en
340, `height` calculado) se recalcula en cada render, y de ahí salen las dimensiones que muestra
el panel de exportación.

El SVG lleva `id="chord-diagram-svg"` y es la **única fuente de verdad de la exportación**: lo que
ves es literalmente lo que se descarga.

## 10. Exportación

- **PNG** — serializa el SVG, lo pinta en un canvas a **escala 3×** y descarga el dataURL.
- **SVG web** — serializa y descarga tal cual.
- **SVG Illustrator** — clona el nodo, le añade `xmlns`, `xmlns:xlink`, `version="1.1"` y la
  cabecera `<?xml ...?>`. Es el mismo dibujo con el envoltorio que Illustrator espera.

⚠️ Ninguna de las tres incrusta la tipografía. Si el usuario elige una fuente que la máquina que
abre el archivo no tiene, el texto se sustituye. En el PNG el riesgo es menor pero existe.

## 11. La interfaz: toolbar flotante y paneles

En el estudio de diagramas no hay barras laterales fijas: el lienzo ocupa la pantalla y todo lo
demás vive en popovers que abre una **toolbar flotante de 5 herramientas** (`openPanel`, un solo panel abierto
a la vez; el backdrop cierra al hacer clic fuera):

| Herramienta | Lado | Contenido |
|---|---|---|
| ♪ Acorde / Escala / Arpegio | izquierda | Configurador armónico del modo activo, presets, instrucciones rápidas |
| 🎸 Instrumento | izquierda | Instrumento, afinación (preset o libre, cuerda por cuerda), nº de trastes y traste de inicio |
| 🎨 Estilo | derecha | Colores de fondo/rejilla/texto, tipografía, radio de nota, grosor de línea |
| 🎯 Intervalos | derecha | Color de cada grado (1–7) y color base de los dedos |
| ⬇ Exportar | derecha | Los tres botones de descarga + atributos del SVG (medidas reales del lienzo) |

La etiqueta de la primera herramienta cambia con `appMode`; el icono no.

Además, pegados al mástil hay dos `FretStepper` (traste de inicio y número de trastes): son las
dos medidas que más se retocan y antes obligaban a abrir el panel Instrumento. `onStep` recibe el
**incremento** (+1/−1), no el valor final, para que la actualización de React sea funcional — si
el botón calculase `value + 1` desde su closure, varios clics rápidos dentro del mismo ciclo
partirían del mismo valor y se perderían.

**El botón de arriba resta, en los dos.** El de posición ya lo hacía; el de cantidad no, y era
justo el que se usaba al revés: tenía el `+` arriba y al pulsarlo el mástil crecía hacia abajo,
así que el botón y el movimiento apuntaban a lados contrarios. Ahora los dos comparten la misma
regla —arriba encoge por arriba, abajo estira por abajo— y lo único que los distingue es el
glifo: flecha cuando mueve la ventana, signo cuando cuenta trastes. El de cantidad se llama
**Trastes**, no «Ventana», porque eso es lo que cuenta.

En la barra de estado, junto a Diagrama/Notas/Grados, vive **Sweep**. Antes estaba dentro de
Arpegios → Por cuerdas, a tres clics, y sólo existía ahí. Pero lo que dice no es de la agrupación
—es del recorrido: cruzar de cuerda es parte del mismo movimiento de púa, así que las flechas van
enteras en vez de a trazos—, y eso vale igual en una escala tocada con economy picking. Aparece
sólo con las flechas encendidas: sin recorrido dibujado no gobierna nada que se vea.

Y a su lado vive ahora **Tríadas** (`piezaTriadasToggle`), por el mismo motivo y con la misma
solución. La tira de tríadas (`piezaTriadas`) ya estaba pegada al mástil; el interruptor que la
enciende estaba a tres clics dentro del panel de Escala, así que había que abrir el panel,
encenderla, cerrar el panel para ver el mástil, y repetirlo entero para apagarla. Se desactiva
—diciéndolo— cuando la escala no llega a siete notas: sin siete grados no hay terceras que
apilar, y un botón que no puede hacer nada tiene que decirlo, no fallar en silencio.

### Los menús de clic derecho

Había dos, `menuFlecha` y `menuTriada`, **escritos dos veces palabra por palabra**: cuarenta
líneas cada uno, idénticas salvo la lista de opciones y la forma de adivinar su propio alto para
no salirse de la pantalla —una con un `190` a pelo, la otra con una fórmula—. Ahora hay un
`MenuContextual`, y esa altura **se mide** con la caja real después de pintar en vez de
estimarse.

Acepta `orientacion: "horizontal"`, que pone las opciones en fila. Es para elegir **entre
estados** —los seis de una casilla de rasgueo—, donde una lista vertical obliga a leer seis
renglones para algo que se reconoce de un vistazo por su flecha.

Con el componente, el clic derecho dejó de ser cosa de dos sitios. Hoy lo tienen: una flecha del
recorrido, una nota del mástil, una ficha de tríada, una casilla del rasgueo, una tarjeta de la
biblioteca, un compás de la progresión, una pestaña de sección, un paso de ejercicio y una fila
del gestor.

**La regla, que se cumplía ya y ahora está escrita:** toda acción que viva en un menú contextual
tiene que existir también con un clic normal en algún sitio. En un teléfono no hay botón derecho,
y un menú contextual es lo único que no se puede descubrir tocando.

Los tres menús del estudio se cierran con Escape, con el backdrop y **al cambiar de apartado o de
modo**: se pintan fuera de la rama del estudio, así que uno abierto sobrevivía al salto a Canción
y se quedaba flotando con su backdrop tragándose los clics.

### Borrar y cerrar no son lo mismo

Toda la app usaba una **×** para las dos cosas, y encima con `k-btn--ghost` en los dos casos:
quitar un acorde de la biblioteca —que lo saca también de todos los compases donde estuviera— se
veía exactamente igual que cerrar un panel. Y estaban copiados a mano en nueve sitios, así que
cada retoque había que hacerlo nueve veces.

Ahora hay dos componentes: `BotonBorrar` (papelera, `k-btn--danger`) y `BotonCerrar` (la ×).

Las × que **no son botones** se quedan como estaban, porque no son interfaz: la de una cuerda
muteada en el mástil es notación musical, la de una casilla apagada del rasgueo también, y el
«×3» de las repeticiones es el signo «por».

## 12. El sistema de diseño (`theme.css` + `ui.css`)

Ninguna decisión de estilo vive ya en `index.html`. Están repartidas en dos archivos que se
cargan con `<link>` — funcionan desde `file://`, no hay `fetch` de por medio:

| Archivo | Qué decide |
|---|---|
| `theme.css` | **Qué** colores, medidas y tipografías hay. Sólo tokens `--k-*` |
| `ui.css` | **Cómo** se combinan en un botón, un panel, una pestaña. Las clases `.k-*` |

**La regla dura: la piel no es la obra.**

| | Qué es | Quién manda |
|---|---|---|
| **Piel** (chrome) | Header, toolbar, paneles, botones, y el papel y el texto de las hojas A4 | El sistema de diseño |
| **Obra** (artwork) | Todos los diagramas: el mástil, las miniaturas, el mástil de la hoja de tonalidad y la ficha de ejercicio | El usuario: el **estilo del diagrama** |

Un tema **no puede tocar la obra**. Si repintara el diagrama, el PNG descargado cambiaría
según el tema activo y lo que ves dejaría de ser lo que te llevas. Por eso el SVG exportado
no contiene ni un `var(--k-*)`: está verificado, y es la prueba a repetir si alguien mete
mano aquí.

### Tema y estilo son dos cosas, y hasta 2026-09-06 se trataban como una

Había una confusión de fondo. «Estilo» se usaba para dos cosas que no lo son:

| | Qué es | ¿Manda en lo que se exporta? |
|---|---|---|
| **Tema de la app** (`theme.css`, los `var(--k-*)`) | claro/oscuro, el chrome | **No, nunca** |
| **Estilo del diagrama** (el panel de Estilo) | colores, grosores, radios y tipografía de la obra | **Sí: es la obra** |

De esa confusión salían dos cosas mal:

- **Las miniaturas de la biblioteca seguían al tema.** Se las consideraba piel porque están
  dentro de la app, así que se pintaban con `var(--k-*)`. Pero una miniatura es el mismo
  diagrama que vas a exportar; verla de un color y descargarla de otro es justo lo que la
  regla quería evitar. Ahora es una **vista previa de la obra** y se ve igual en los dos sitios.
- **La hoja y la ficha llevaban tinta fija propia** —`MINI_COLORES_APP`, `EJ_TINTA`— que eran
  **copias literales** de los colores del estudio: el mismo azul, el mismo rojo, el mismo gris,
  escritos otra vez. Cambiar el color de las notas en el panel no llegaba hasta ahí.

Lo que **no** cambia: el papel, el texto, los rótulos y la letra de la hoja A4 siguen en blanco
y negro, gobernados por `HOJA`. Una hoja tiene que poder imprimirse, y un fondo negro elegido
para la pantalla no es una decisión sobre el papel.

### Dónde vive el estilo

`DEFAULT_STYLE`, `LIMITES_ESTILO`, `normalizeStyle` y el guardado están en **`render-core.js`**,
no en `index.html`. Van ahí porque `computeDiagramGeometry` ya consume `dotRadius`: el validador
tiene que estar al lado de quien lo consume.

**El fallo que `normalizeStyle` evita es silencioso, no ruidoso.** `parseInt("")` es `NaN`; ese
NaN entra en la altura mínima de traste, se propaga a todas las posiciones, cada atributo `y` del
SVG sale `NaN` y **el diagrama desaparece sin un solo error en consola**. Por eso `Number.isFinite`
y clamp, nunca un `parseInt` suelto. Y por eso `saveStyleState` normaliza **antes** de escribir:
para que un bug futuro no deje un radio corrupto en disco esperando a la próxima carga.

Baja al árbol por un **Context** (`StyleContext` / `useDiagramStyle`), no por props: los
consumidores están repartidos por los tres bloques y bajarlo a mano serían seis props cruzando
ocho componentes que no pintan nada con ellas.

Dentro de `App()` el estilo es **un solo objeto**, pero los ocho nombres de antes
—`bgStyleColor`, `dotRadiusStyle`…— siguen existiendo como constantes derivadas. No es pereza:
tienen unas ciento nueve apariciones repartidas por el componente, y un solo olvido al
renombrarlas es un `ReferenceError` en tiempo de ejecución que deja la app en blanco.

### Presets

Clave `kharo.style.v1`, con el estilo activo **y** la lista de presets en el mismo registro: se
escriben juntos, así que no pueden desincronizarse. Guardar con un nombre que ya existe
**sobrescribe** en vez de duplicar, y la lista se indexa por `id` para que renombrar no rompa la
selección. El estilo activo se restaura al recargar; «Reiniciar» es la salida de emergencia.

Del mismo lado está `.k-fretboard-fit`, que encaja el diagrama en pantalla. Vive en una
clase y no en el `style` del SVG porque **el atributo `style` se serializa dentro del archivo
exportado**: un `max-height: 100%` viajando dentro de un SVG suelto se resuelve contra la
ventana de quien lo abra y le cambia el tamaño.

**Cómo meter otro sistema de diseño:** reescribir los valores de `theme.css`. Si además
cambia la forma de los componentes, `ui.css`. Para varios temas, duplicar el bloque bajo
`[data-theme="..."]` y poner el atributo en el `<html>` — el gancho ya está puesto.

Los nombres son **semánticos** a propósito: `--k-accent`, nunca `--k-azul`.

**Deuda conocida:** al final de `ui.css` hay un bloque de compatibilidad que repinta la
paleta de Tailwind (slate, indigo…) con `!important`, porque el JSX todavía la usa en muchos
sitios. Está aislado y marcado *en retirada*: cada componente que pasa a `.k-*` deja su regla
sin uso y se borra. El objetivo es que el bloque quede vacío.

## 13. Diseño responsive (móvil)

El punto de quiebre es `md` de Tailwind (768px). El problema de fondo era de **presupuesto de
alto**: en un teléfono de 390×844 los elementos fijos sumaban ≈470 px y el lienzo pedía
`66vh` ≈557 más. Como el padre lleva `overflow-hidden`, el mástil quedaba cortado por abajo.
Además el SVG se escalaba **sólo por ancho**, así que con muchos trastes no cabía en ninguna
pantalla.

Cómo quedó:

- **El mástil se escala al hueco, por ancho y por alto** (`.k-fretboard-fit`). Con los
  atributos `width`/`height` puestos el navegador conoce la proporción y respeta el límite
  que más apriete. Cabe entero con 5 trastes y con 24 — a costa de verse estrecho, que es
  mejor que verse cortado. Ya no hay scroll dentro del lienzo.
- **`100dvh` en lugar de `100vh`** (`#root`), más `viewport-fit=cover`. En móvil `100vh`
  cuenta la barra del navegador que luego se retira, y sobra pantalla.
- **Header compacto**: el logo baja a 36 px (`h-9 md:h-16`) y las pestañas de modo, que en
  375 px no caben al lado, bajan a su propia fila a ancho completo (`ModeTabs` con
  `stretch`). El componente va guiado por datos: añadir un apartado es una entrada más en
  `MODE_TABS`.
- **Barra de estado a una sola fila**: sólo qué suena y el botón de sonar. Tempo, modos de
  vista y Vaciar se despliegan con el **⋯**. Las piezas se declaran una vez
  (`piezaTempo`, `piezaModosVista`, `piezaVaciar`) y se colocan en los dos sitios: duplicar
  el JSX es garantizar que se desincronicen.
- **Los ± del mástil** salen del lado y bajan a una fila propia debajo (`FretStepper` gira a
  `flex-row-reverse` en móvil y a `md:flex-col` en escritorio). Flotando sobre los bordes
  taparían las cuerdas de fuera, que es justo donde se pisan las notas.
- **Los paneles son hojas que suben desde abajo**, con asa (`.k-sheet-handle`), hasta 62vh y
  ancladas encima de la toolbar para no taparla.
- **La leyenda de intervalos** pasa a tira horizontal de fichas (`renderLegendStrip`); la
  columna lateral sólo aparece en `xl+`. Los datos se calculan aparte (`getLegendItems`)
  porque hay dos presentaciones del mismo contenido.
- **Fuera en móvil**: el pie y el aviso "Haz clic en cualquier nota…".
- **Todas las áreas táctiles son ≥ 44px** (`--k-touch`, `.k-btn--touch`). Ojo con `scale-90`:
  encoge el área táctil real.
- **Trampa de iOS**: un `input` con letra menor de 16 px hace que Safari haga zoom al
  enfocarlo. `ui.css` los fuerza a 16 px por debajo de 768.
- **Trampa de flexbox**: un hijo `flex-1` necesita `min-h-0` o no se deja encoger, y desborda
  al padre en vez de repartirse el alto. Está en toda la cadena del lienzo.

---

# 14. El apartado Canción

Encadena los acordes que has creado en una canción con letra, ritmo y hoja imprimible.

## Por qué es una vista y no un cuarto modo

`appMode` dice **qué se dibuja** en el mástil (acorde / escala / arpegio). Canción no dibuja un
mástil: monta una canción. Son cosas ortogonales, así que hay un estado aparte, `appView`
(`"studio" | "song"`). Ventaja práctica: al volver de Canción, el mástil aparece exactamente
como se dejó.

Es la misma regla que ya estaba escrita para el piano — el instrumento y lo que se dibuja son
ejes distintos, y meterlo todo en `appMode` los mezcla.

## El puente: la biblioteca de acordes

En modo Acorde hay un botón **«+ Guardar acorde»** que hace una **foto del mástil**: instrumento,
afinación, traste de inicio, notas, cejillas y estados de cuerda. No guarda el nombre, guarda la
digitación.

Es la decisión de fondo del apartado: con el nombre solo, la hoja no podría dibujar el diagrama y
el reproductor no sabría qué suena, porque hay muchas formas de tocar el mismo acorde.

Al borrar un acorde de la biblioteca se quita también de las progresiones que lo usaban. Si no,
quedarían compases apuntando a un acorde que ya no existe: ni se dibujan ni suenan.

### Por qué no se veían todos

La biblioteca era **una fila** de tarjetas de 108 px con `.k-strip`, y `.k-strip` esconde la barra
de scroll a propósito (`scrollbar-width: none`). Con seis acordes se veían seis; con veinte seguía
habiendo una fila y nada que dijera que continuaba. Y como al guardar uno nuevo se añade **al
final**, el acorde recién hecho aparecía justo en la parte que no se veía.

Estaban todos en la página: lo que faltaba era poder mirarlos. Ahora `ChordLibrary` trae contador,
buscador (a partir de ocho acordes) y dos vistas —**Tira** y **Rejilla**—, y la tira lleva un
degradado en el borde derecho, que era lo único que faltaba para que el scroll escondido dejara
de parecer el final de la lista.

### Elegir a qué canción va

Con una sola canción, «Añadir a la sección activa» era todo lo que hacía falta. Con varias hay que
poder decir a cuál va, y el momento de decirlo es **cuando lo mandas**, que es cuando se sabe: el
clic derecho sobre la tarjeta lista todas las canciones con sus secciones (`mandarAcordeA`).

La biblioteca sigue siendo **global, de todas las canciones**. Es la misma decisión que ya estaba
escrita para `harmony`: un Am es vi en Do y ii en Sol, así que la lectura es de la canción, pero
la digitación no. Guardar el mismo Do otra vez en cada canción nueva sería el precio de separarlas,
y no compensa.

## El modelo

```js
Chord = { id, name, instrument, tuning, tuningMidi,
          numFrets, startingFret, dots, barres, stringStates }

Song = { version, id, title, key, keyRoot, keyScale, bpm, timeSignature, rhythmId,
         chordLabels,   // "dedos" | "notas" | "grados"
         degreeBasis,   // "acorde" | "tonalidad"  — respecto a qué se cuenta el grado
         harmony,       // { [chordId]: { funcion, nota } } — cómo se lee cada acorde de fuera
         customRhythms, notes, sections: [Section] }

Section = { id, name,          // "Intro", "Verso 1", "Coro"
            repeats,
            bpm,               // null = hereda el de la canción
            rhythmId,          // null = hereda el de la canción
            bars:  [{ chordId, beats }],
            lines: [{ chordLine, lyric }],
            notes }
```

`bpm` y `rhythmId` en `null` significan *lo que diga la canción*, y es distinto de copiar el
valor: al cambiar el tempo general, las secciones que no lo habían tocado lo siguen.

Todo se mide en **pulsos**, no en compases. Un acorde de 2 pulsos y otro de 6 son normales en
cuanto una canción sale del manual, y con compases como unidad no se pueden escribir.

## La letra: dos líneas alineadas por columna

```
chordLine   "        C            G        A"
lyric       "Cuando me voy de aqui todo se queda igual"
```

Lo que se guarda es la **columna** —el índice de carácter donde empieza el nombre del acorde—, no
una posición en píxeles. Por eso el editor y la hoja usan **monoespaciada**: es lo único que hace
que columna × ancho-de-carácter sea exacto. Con una proporcional, la "i" y la "m" miden distinto
y el acorde se despega de su sílaba.

En la hoja, `x = columna × 8,4` (8,4 px es el ancho real de un carácter de 14 px monoespaciado).

### Se arrastran, no se cuentan espacios

El modo normal es **arrastrar**: cada acorde es una ficha en un carril sobre el verso, se coge y
se suelta encima de la sílaba. El modo **texto** queda como secundario, para pegar desde fuera o
arreglar algo a mano. Las dos caras editan la MISMA cadena `chordLine`, así que no pueden
desincronizarse: arrastrar es `insertChordAtColumn`, ni más ni menos.

El carril sigue el desplazamiento horizontal de la caja de la letra con un `transform`, no con un
scroll propio: así las dos líneas nunca se despegan.

### El ancho de carácter se mide, no se calcula

Era la constante `8,4` (14 px × 0,6). Ahora se mide un `<span>` de cien caracteres **en cada
render**, con las mismas clases que la caja de la letra.

No es exceso de celo: el ancho cambia por más motivos de los que parece —Tailwind se carga en el
navegador y aplica el tamaño de letra *después* del primer pintado, la monoespaciada termina de
cargar más tarde, en móvil los campos saltan a 16 px para que iOS no haga zoom, y el usuario
puede cambiar el zoom—. Con una sola medida al montar, cada acorde se desplaza un poco más cuanto
más avanza el verso, que es de los fallos más difíciles de ver y de explicar.

Un `ResizeObserver` parece la herramienta obvia y **no sirve aquí**: observa un nodo concreto, y
si React recrea el medidor se queda mirando un nodo que ya no está en la página. Además no observa
cajas en línea. Un `getBoundingClientRect` por render es barato, y comparando antes de guardar no
hay bucle.

Los acordes que caen más allá del final de la letra se marcan en gris y se avisa debajo. Pasa al
acortar un verso, y dibujarlos igual deja acordes flotando sobre nada.

## Los ritmos

`RHYTHM_PATTERNS` en `song-core.js` son **datos**: cada patrón describe un compás y el motor lo
repite mientras dure el acorde. Si el acorde dura menos que el patrón, se corta. Así un mismo
ritmo vale para un acorde de dos pulsos y para uno de ocho.

Cada evento es un rasgueo o un punteo:

| | Campos | Qué significa |
|---|---|---|
| **Rasgueo** | `at, dir, zone, spread` | En qué pulso cae, hacia abajo o hacia arriba, qué cuerdas (`all`/`bass`/`treble`) y cuántos milisegundos separan una cuerda de la siguiente |
| **Punteo** | `at, pick` | La nota número `pick` del acorde, 0 = la más grave |

`spread` es lo que separa un rasgueo de un acorde de piano: las cuerdas no suenan a la vez.
`dir: "up"` invierte el orden, que es lo que da el vaivén. La frontera entre graves y agudas se
pone a un tercio de las notas, de forma que el mismo patrón funciona en guitarra, en bajo y en
ukelele sin configurar nada.

Los seis de partida: redonda, negras, pop (D · D U · U D U), balada (arpegio), vals y reggae.

## La reproducción

**Planificador con horizonte.** Cada 25 ms se programan los golpes de los próximos 250 ms contra
el reloj de Web Audio, que es exacto.

Lo contrario —encadenar esperas con `setTimeout`, un acorde detrás de otro, como hace el
prototipo de piano— acumula error en cada salto, y a los treinta segundos la canción va con
retraso audible.

Consecuencias que conviene saber:

- Al parar, lo ya programado sigue sonando hasta agotar el horizonte: **como mucho un cuarto de
  segundo de cola**. Es el precio de programar por delante, y es lo que evita que se oigan huecos.
- El **cabezal** se repinta sólo cuando cambia de compás. El bucle corre 40 veces por segundo y
  repintar en cada vuelta no lo aguanta ningún teléfono.
- El bucle y demás se leen con `useRef`, no del estado: el intervalo se crea una vez y, sin refs,
  leería el estado del render en que nació — activar el bucle a mitad de canción no haría nada.

## La hoja

`SongSheet` dibuja páginas A4 de 840×1188 con `id="song-sheet-page-N"`. En orden: cabecera,
diccionario de los acordes usados (con sus mini-diagramas), y por cada sección su nombre,
ritmo, repeticiones, la rejilla de compases y los bloques de letra.

**Es la vista previa y el archivo a la vez.** Se serializan los mismos nodos que se ven en
pantalla, igual que hace el diagrama del mástil: lo que ves es lo que se descarga, sin un segundo
camino de dibujo que se pueda desincronizar.

El ancho de cada compás lo marca su duración —un acorde que dura el doble ocupa el doble—, y una
barra vertical marca dónde se cierra el compás. Se lee una progresión sin tener que contar.

`paginateSong` reparte el contenido midiendo con números, no con el DOM, porque la exportación
necesita saber cuántas páginas hay antes de dibujarlas. Una sección se parte entre páginas si no
cabe entera: cortar por una línea de letra es normal en un cancionero, dejar media página en
blanco no.

### Exportar

- **SVG** — una página por archivo, con el envoltorio `xmlns`/`version` que espera Illustrator.
- **PNG** — cada página a canvas a escala 3×, con el papel pintado antes (si el SVG tuviera zonas
  transparentes, en un PNG saldrían negras al imprimir).
- **PDF** — `vendor/jspdf.umd.min.js`, una página por página. Si el archivo falta, el botón avisa
  y PNG y SVG siguen funcionando: la app no puede depender de internet.
- **JSON** — copia de seguridad. Lleva **la canción y los acordes que usa**, porque los compases
  apuntan a acordes por id y esos ids sólo significan algo en ese navegador. Sin los acordes
  dentro, el archivo abierto en otro sitio sería una lista de compases vacíos.

Varias descargas seguidas van espaciadas 350 ms: algunos navegadores descartan las que llegan de
golpe.

## Guardado

`localStorage`, con medio segundo de respiro: escribir en cada tecla de la letra sería serializar
la canción entera decenas de veces por frase.

Puede fallar sin que haya nada roto —ventana privada, cuota llena, cookies bloqueadas—, así que
todo va envuelto y como mucho se pierde el guardado, nunca la sesión. Para eso existe la
exportación a JSON: es la copia que no depende del navegador.

## El gestor: varias canciones, y varios ejercicios

`loadSongs`/`saveSongs` siempre fueron plurales y aceptaron una lista. **La interfaz nunca la
usó**: escribía `[song]` y leía `guardadas[0]`, así que sólo existía UNA canción y «Nueva» la
reemplazaba con un aviso de que no había vuelta atrás. Para conservar dos había que exportar una
a JSON y volver a importarla. Lo mismo con los ejercicios.

Y ese aviso sólo saltaba si había compases o letra, así que cambiar tonalidad, tempo y título y
pulsar «Nueva» borraba todo eso **sin preguntar**.

Lo que hizo falta:

- **`createSong` genera `id`.** Una canción no tenía identidad, que da igual mientras sólo haya
  una. `normalizeSong` se lo inventa si falta, y esa es toda la migración de lo ya guardado.
- **La lista es el estado** (`songs`, `exercises`) y la abierta es un elemento de ella. La abierta
  se guarda por separado y `fundirEnLista` la mezcla justo antes de escribir — sin eso, guardar la
  activa borraría las demás, que es literalmente lo que hacía el `[song]` de antes.
- **`GestorArchivos`** es un solo componente para las dos listas: se manejan igual, y dos copias se
  habrían desincronizado al primer botón nuevo. Sólo se le pasa el género de la palabra, porque
  «+ Nueva ejercicio» está mal escrito.

Reglas del gestor:

- **Crear es crear.** «Nueva» añade; no reemplaza nada y no pide confirmación, porque no destruye.
- **Nunca cero.** Al borrar la última queda una vacía: sin ninguna, el editor no tendría qué pintar
  y habría que inventarse una al vuelo en mitad del render.
- **Borrar sí avisa**, y dice qué se pierde y cuántos son. «Borrar todo» está por lista —canciones,
  ejercicios y biblioteca de acordes por separado—: vaciar la biblioteca de refilón al borrar una
  canción sería la peor sorpresa posible, porque es de todas.
- **Duplicar copia en profundidad** (`JSON.parse(JSON.stringify(...))`). Una canción son datos
  puros —sin funciones ni fechas—, y una copia superficial dejaría las secciones compartidas entre
  las dos: editar una cambiaría la otra.


---

# 15. Recorridos: en qué orden se tocan las notas

Una escala dibujada en el mástil es una nube de puntos. El **recorrido** es lo que la convierte
en algo que se practica: el orden en que se tocan.

Manda sobre el **dibujo** y sobre el **sonido** a la vez. Antes la reproducción ordenaba por
altura y descartaba las alturas repetidas, así que la misma nota en dos cuerdas sonaba una sola
vez y el oído no seguía al dibujo. Ahora lo que ves es lo que suena — incluida esa repetición,
que es real: son dos posiciones distintas de la mano.

## Cómo se calcula (`buildNotePath`, en `theory-core.js`)

| Criterio | Qué hace |
|---|---|
| `"digitacion"` (por defecto) | Cuerda por cuerda de la más grave a la más aguda, y dentro de cada cuerda del traste menor al mayor. Es como se practica, y es lo que se puede tocar |
| `"altura"` | Por nota, de la más grave a la más aguda. Musicalmente impecable y a menudo intocable: obliga a saltos que la digitación no tiene |

Los dos desempatan igual, así que el recorrido de un mismo dibujo sale siempre idéntico. Un
ejercicio que cambia de orden entre dos cargas no sirve para estudiar.

## Cuántas notas por cuerda

Un tercer parámetro, `opciones`, con dos ajustes que sólo mandan sobre el recorrido automático:

| | Qué hace |
|---|---|
| `notasPorCuerda` | Tope por cuerda: 1, 2, 3 o sin tope. **Por defecto 3** |
| `retorno` | Añade la vuelta: sube y baja por el mismo camino |

Sin tope, en un mástil de 20 trastes el recorrido baja veinte notas por la misma cuerda antes de
cambiarse, y eso no lo toca nadie: una escala se practica bajando tres notas, saltando de cuerda
y siguiendo. El tope es estricto y vale en cualquier mástil.

**El límite es un filtro y el criterio es un orden**, y por eso se poda ANTES de ordenar. Podando
después, `"altura"` —que mezcla cuerdas— dejaría notas de más en unas y de menos en otras, y el
selector rotulado «notas por cuerda» estaría mintiendo.

De las notas de cada cuerda se cogen **las más graves**, no las centradas en la ventana. La
ventana ya *es* la posición de la mano —`f` es relativo a ella—, así que son lo mismo; y
centrarlas haría que mover el número de trastes cambiara qué notas se practican sin que nadie lo
pida.

**La vuelta va dentro de la lista, no es una marca de dibujo.** `crearPasoDeEjercicio` congela
`recorridoActual()` dentro del paso; si el retorno fuera un `flag` de render, un ejercicio
guardado lo perdería. Metido en la lista (`A,B,C,B,A`), ni el sonido, ni las flechas, ni la ficha
de ejercicio tienen que enterarse de que existe.

Lo que sí hubo que tocar es el dibujo: la ida y la vuelta pasan por el mismo sitio, así que los
tramos repetidos se apartan de su eje por la perpendicular. **Ojo con esa perpendicular**: sale de
la dirección del segmento, y la vuelta va al revés, así que desplazando con ella las dos pasadas
se apartan al *mismo* lado y vuelven a solaparse exactamente. El desvío se mide contra un sentido
canónico, que es igual para las dos.

## A mano

`pathManual` en `null` significa «lo calcula la app», y **no es lo mismo que guardar el
automático**: mientras esté en null, cambiar de escala o de posición recalcula el recorrido solo.
En cuanto tocas una nota en modo «A mano», se congela y pasa a ser tuyo.

Tocar una nota que ya está en el recorrido la saca; una que no está entra al final. Con eso se
escriben los patrones que el automático no adivina: tres notas por cuerda, secuencias de cuatro,
saltos.

## Cómo se dibuja

Las flechas van **dentro del SVG del diagrama**, no en una capa encima: son obra, así que salen
en el PNG y el SVG exportados.

- **Movimiento dentro de una cuerda**: línea sólida. Lo hacen los dedos.
- **Salto a otra cuerda**: a trazos y más flojo. Lo hace la mano entera. Sin esa distinción una
  escala es una maraña de diagonales.
- En **sweep** no hay salto: cruzar de cuerda es parte del mismo movimiento de púa, así que todas
  las líneas van enteras.
- Un círculo a trazos marca **dónde empieza**. En un recorrido que sube y baja, sin esa marca no
  se sabe por qué punta empezar.

Las puntas de flecha son polígonos dibujados a mano y no `<marker>`: los marcadores necesitan un
`id`, y dos SVG en la misma página con el mismo id se pisan.

---

## Trazar flechas arrastrando, y el menú de una flecha

Tocar las notas una a una escribe un recorrido, pero no deja decir «de ESTA a ESTA»: hay que
acertar el orden de los toques. **Arrastrando de una nota a otra** se dice directamente, y **el
clic derecho sobre una flecha** abre su menú.

### Lo que había que resolver primero

`renderNotePath` se pinta ENCIMA de las notas —si no, las flechas quedan debajo y no se leen—, y
sus `<line>`/`<polygon>` **se comían cualquier gesto sobre las notas**. Sin arreglar eso no se
podía ni pulsar una nota tapada por una línea.

La capa entera lleva ahora `pointerEvents="none"`, y cada segmento añade una **zona de agarre**:
una línea invisible, de 12 px de grosor, con `pointerEvents="stroke"`, que es la única del
recorrido que recibe eventos. Así se puede apuntar a UNA flecha sin que la capa tape nada.

> `stroke="transparent"` es obligatorio en esa línea. Con `stroke="none"` no hay trazo que
> golpear y `pointerEvents="stroke"` no engancha nada.

### El arrastre

`setPointerCapture`, como ya hacía `ChordLane` en el apartado de canción. Dos trampas:

- **El `pointerup` cae en la nota de ORIGEN**, aunque hayas soltado sobre otra, y dispara también
  su `onClick`. Sin la marca `arrastroRef`, conectar dos notas terminaría llamando a
  `alternarEnRecorrido` sobre la primera y sacándola del recorrido justo después de conectarla.
- **El destino se resuelve por geometría**, no por `e.target`, por lo mismo. Y las coordenadas se
  convierten a mano: `.k-fretboard-fit` escala el SVG, así que `offsetX` miente.

`conectarEnRecorrido(A, B)` sobre una LISTA —no un grafo— sólo puede querer decir «que B vaya
justo detrás de A»:

| Situación | Qué hace |
|---|---|
| Ninguna está en el recorrido | añade A y luego B al final |
| A está, B no | inserta B justo detrás de A |
| B está, A no | inserta A justo delante de B |
| Ya van seguidas | no hace nada, y lo dice |
| Las dos están, separadas | **mueve B** detrás de A |

La última es la que sorprende, y es la única que es un solo `splice`: conserva el resto del orden
y se deshace arrastrando otra vez.

### La línea fantasma no se exporta

Mientras arrastras se dibuja una línea a trazos DENTRO del SVG —mismo sistema de coordenadas,
cero matemáticas extra— marcada con `data-transient`.

Dos de las tres exportaciones serializaban el nodo **vivo**, así que un PNG sacado a media edición
se habría llevado el garabato. Ahora las tres pasan por `svgParaExportar()`, que clona y quita lo
marcado. Sigue valiendo que lo que ves es lo que te llevas: lo único que se cae son los nodos que
no son del dibujo sino del gesto que lo está editando.

### El menú

Va **fuera del SVG**: es piel, no obra, así que usa el sistema de diseño y no viaja en el archivo.
Se posiciona en píxeles de pantalla, con ancho fijo —un `fixed` sin ancho se ajusta al contenido y
las opciones largas lo estiraban media pantalla— y se cierra con clic fuera o con `Escape`.

«Eliminar esta flecha» sobre una lista admite dos lecturas útiles, y se ofrecen las dos en vez de
elegir por el usuario: **quitar la nota de destino** (reconecta `i → i+2`) o **cortar el recorrido
aquí**. Además: invertir ese salto, invertir el recorrido entero y volver al automático.

**`onContextMenu` no existe en iOS.** El menú es de escritorio hasta que se añada pulsación larga;
en el teléfono el recorrido se sigue editando a toques, que es como estaba antes.

---

# 15 bis. Las tríadas de la tonalidad, sobre la escala

Una escala dibujada dice qué notas hay. No dice de dónde salen los acordes. El interruptor
**Tríadas de la tonalidad** (panel de Escalas) pone encima los siete grados y una tira de fichas
pegada al mástil: `I C · ii Dm · iii Em · IV F · V G · vi Am · vii° Bdim`.

## Tres gestos, tres cosas distintas

| Gesto | Qué hace |
|---|---|
| **Pasar por encima** de una ficha | la enseña mientras el ratón esté ahí |
| **Clic** | la **fija**: se queda puesta al apartar el ratón |
| **Clic derecho** (o el `⋯` de la fijada) | abre el menú: *Abrir en Arpegios*, las formas de mandarla a Ejercicios, y *Quitar la selección* |

**Fijar y actuar son cosas distintas, y por eso son gestos distintos.** Antes el clic saltaba
directamente a Arpegios, y eso hacía imposible con el dedo lo que esto sirve para hacer: mirar una
tríada con calma. El primer toque la enseñaba y el segundo te sacaba de la pantalla.

Por dentro son **dos estados**: `gradoTriada` es lo que se ve AHORA —cambia con el ratón— y
`gradoFijado` es lo que has dejado puesto. Al salir de la tira se vuelve a lo fijado, no a nada:
si no, fijar una y apartar el ratón la apagaría.

- **Abrir en Arpegios** la pone en el mástil con su tónica y su tipo, y **sin tocar la ventana**:
  todo el sentido es que el arpegio aparezca donde estaba la tríada.
- **Mandar a Ejercicios** tiene dos lecturas, y el menú ofrece las dos porque no son la misma cosa:

  | Qué se manda | Qué es | Para qué |
  |---|---|---|
  | **Sólo la agrupación (trastes X-Y)** | una mancha: las tres o cuatro notas que caben en la mano | tocarla |
  | **Cada agrupación, un paso** | una entrada por mancha, en orden | estudiar el acorde por todo el mástil, posición por posición |
  | **Todo el grado (N notas)** | el mapa entero de ese grado en la ventana | recorrer el mástil |

  Mandando siempre el grado entero salía **el dibujo de la escala**, que no es lo que se ve cuando
  miras una envolvente. Las agrupaciones se nombran por los trastes reales que ocupan, que es como
  se busca una posición.

  En los tres casos el recorrido se ordena con el mismo criterio y el mismo tope de notas por
  cuerda que el de la pantalla, así que **el paso suena como se estaba viendo**. Y se ve igual: el
  paso se lleva el color del grado y la ficha lo dibuja **envuelto en su mancha y sin flechas**,
  como estaba en el mástil (§18).

El `⋯` no es un adorno: `onContextMenu` no existe en iOS, y sin él las dos acciones no existirían
en un teléfono. Sale sólo en la ficha fijada, para no repetir siete veces el mismo botón.

## Una envolvente por zona, no un aro por nota

`diatonicTriadPositions` (en `theory-core.js`) no construye formas —eso es
`triadShapeForStringSet`, que da UNA forma de tres cuerdas para tocarla de una pasada—. Hace lo
contrario: mira los puntos que ya hay dibujados y dice a qué grado pertenece cada uno.

**La tríada se dibuja como una cosa, porque es una cosa.** La primera versión marcaba cada nota
del grado con un anillo, y eso contestaba «esta nota es de vi», que no es la pregunta: la pregunta
es *dónde está la tríada en el mástil*.

Así que las notas de cada grado se agrupan en **zonas** y se envuelve cada zona con una mancha
translúcida de su color. Un grado suele dar dos o tres manchas en la ventana: las posiciones donde
ese acorde se toca.

### El tope de la mano, y por qué hace falta

Pidiendo sólo que las notas se toquen entre sí —cuerdas contiguas, dos trastes— **la cadena no
para**: en Do mayor las notas de La menor van saltando de cuerda en cuerda hasta cubrir el mástil
entero, y sale UNA mancha que envuelve todo el dibujo. Eso no dice dónde se toca nada.

Por eso hay un tope duro además de la cercanía: una zona no puede pasar de **tres cuerdas** ni de
**cuatro trastes**. Es lo que abarca la mano sin desplazarse.

- No se exige una nota por cuerda. Esa es la condición del *sweep* y vive en Arpegios (§16); aquí
  se trata de ver la zona, y una zona puede llevar cuatro o cinco notas.
- Se crece desde la nota más grave y más baja, para que el reparto salga igual en cada render: una
  zona que cambia de sitio entre dos dibujos no sirve para estudiar (§15).
- **Una nota suelta no se envuelve.** Envolver una sola nota es volver al aro por nota, que es
  justo lo que esto sustituye. La nota se sigue viendo, pero sin mancha.
- **Las cuerdas al aire quedan fuera.** Se dibujan encima de la cejuela, en su propia fila, así que
  meterlas estiraba la mancha hasta allí. Y tiene sentido musical: la envolvente marca dónde va la
  mano, y una cuerda al aire no lleva dedo.

### Cómo se dibuja

Casco convexo de la zona (cadena monótona de Andrew) y una sola `<path>` con **trazo redondeado de
grosor `2 × margen`** más relleno del mismo color. Ese truco da la goma elástica alrededor de los
puntos sin tener que desplazar aristas ni calcular normales, y el mismo código sirve para una zona
de dos notas (cápsula) y para una de cinco (polígono redondeado).

`cascoConvexo` y `trazoDeMancha` viven **fuera de todo componente**, arriba del todo: las usan dos
—el mástil del estudio y la ficha de ejercicio—, y una forma tiene que verse igual en los dos
sitios.

En reposo se ven las siete a la vez pero muy flojas (`opacity 0.09`): catorce manchas a plena tinta
serían una sopa de colores. Ahí valen para decir «aquí hay tríadas»; la lectura llega al señalar
una, que sube a `0.36` y apaga las demás.

Los siete colores viven en `DEFAULT_STYLE.triadRingColors`, **hex literales**. No son los colores
de intervalo del usuario porque esos ya pintan el relleno del punto; y son literales y no tokens
del tema por lo mismo que `pathColor`: esto se exporta (§12).

## Escalas de menos de siete notas

`diatonicChords` devuelve `[]` con menos de siete grados (`theory-core.js`), así que con
pentatónicas y blues no hay terceras que apilar. El interruptor se **deshabilita con el motivo al
lado** en vez de encenderse y no hacer nada.

---

# 16. Arpegios agrupados, sweep y tapping

Un arpegio repartido por 24 trastes es un mapa: sirve para ver dónde está, no para tocarlo. El
selector **Cómo agruparlo** lo convierte en formas concretas.

## Por juegos de cuerdas

Las tríadas en cada grupo de tres cuerdas contiguas (6-5-4, 5-4-3, 4-3-2, 3-2-1 en guitarra) con
sus tres inversiones. **Una nota por cuerda**, y eso no es un detalle estético: es exactamente la
condición que hace falta para tocarlo con sweep picking. La agrupación y la técnica son la misma
cosa vista desde dos sitios.

`triadShapeForStringSet` elige para la primera cuerda el traste más grave que sirva, y para las
otras dos el **más cercano a ese**. Buscando siempre hacia arriba salían formas de seis trastes
de ancho que ninguna mano alcanza; así salen de cero a dos.

En este modo las cuerdas al aire del mapa completo **no se dibujan**: si se quedaran, la forma
dejaría de tener una nota por cuerda.

### La ventana enmarca la forma, no al revés

La forma se busca **desde el traste 1**, un sitio fijo, y es la ventana la que va a buscarla:
cambiar de juego o de inversión coloca el mástil solo.

Antes se buscaba a partir de donde empezaba la ventana, y eso daba dos problemas encadenados:

- Con la ventana en el traste 1, la tríada de Do cae en el 5-8, así que **se dibujaba una de las
  tres notas**. En una agrupación cuya única promesa es «una nota por cuerda», eso parece roto.
- Y no se podía arreglar moviendo la ventana, porque al moverla se movía también la forma: el
  remedio se perseguía a sí mismo.

Se busca desde 1 y no desde 0 porque el traste 0 es la cuerda al aire y esta capa del dibujo no
la sabe pintar. El código pasaba `startingFret - 1`, así que la forma podía colocar una nota ahí
y el filtro del final la tiraba: **la forma perdía una nota en silencio**.

Consecuencia asumida: las formas que necesitan una cuerda al aire (C/E en 6-5-4 en primera
posición) salen una octava más arriba. Es correcto —es la más grave que se toca sin aire— pero
conviene saberlo.

### Las inversiones se nombran por lo que sale

`C`, `C/E`, `C/G`, no «Fundamental / 1ª / 2ª». Lo segundo nombra el concepto, no lo que estás
eligiendo: con tres botones así hay que probarlos para saber cuál quieres.

Con arpegios de séptima la agrupación se queda con la tríada —tres cuerdas con una nota cada una
no dan para cuatro notas— y ahora **lo dice**. Antes faltaba una nota y parecía un fallo.

## Por posiciones

Ventanas de cinco trastes ancladas donde aparece la tónica, que son los sitios donde la mano se
coloca sola. Elegir una mueve la ventana del mástil.

**No llevan letras CAGED, y es deliberado.** Las cinco formas CAGED sólo significan algo en
guitarra de seis cuerdas en afinación estándar y sobre tríadas mayores; esta app admite seis
instrumentos, afinaciones libres y nueve tipos de arpegio, incluidos m7♭5 y disminuidos. Poner
esas letras donde no aplican sería enseñar algo falso, así que cada ventana dice lo que es: en
qué trastes está.

## Sweep y tapping

**Sweep** dibuja el recorrido como un solo movimiento continuo. Su interruptor ya no vive aquí:
está en la barra de estado, junto al mástil, y vale también en Escalas (§11).

**Tapping** añade una nota en la cuerda más aguda del juego, marcada con un **aro a trazos**.

Lo que hacía mal, y por qué:

| Fallo | Qué pasaba | Cómo quedó |
|---|---|---|
| No era la octava de lo que decía | Sumaba 12 o 14 semitonos a **lo que cayera** en la cuerda aguda, y esa cuerda sólo lleva la fundamental en la primera inversión. Con la fundamental abajo, la «octava» era la de la quinta | Se calcula sobre la **fundamental**, y se busca esa clase de altura por encima de lo que esa misma cuerda ya toca |
| Trastes que no existen | `absFret + 12` podía dar del 25 al 38, y nadie lo comprobaba | Se topa en 24; si no cabe, no se enciende y se dice |
| El aviso mentía | `clampNumFrets` topa en 24, así que decía «se abre la ventana para verla» aunque la nota se quedara fuera | La ventana enmarca la forma y el tapping, así que el aviso sobra |
| Desaparecía en silencio | `setArpStringSet` y `setArpInversion` eran setters pelados: la forma se movía, la T se salía de la ventana y el botón se quedaba encendido sin nada dibujado | Un efecto lo recalcula al cambiar juego, inversión, tónica, tipo de arpegio, afinación o instrumento |
| Apagarlo no encogía la ventana | Salía por un `return` antes de tocarla | La ventana se recoloca sola al apagarlo |
| La etiqueta escondía la nota | Ponía «T» y punto, así que en modo Notas tapaba justo lo que se había pedido | Dice qué nota es, como todas; que es de tapping se ve por el aro |
| `tap: true` no lo leía nadie | Se dibujaba igual que una nota pisada: no había forma de saber cuál era de la mano derecha | Aro a trazos, en el mástil **y** en la ficha de ejercicio |
| Se perdía al crear el ejercicio | `createExerciseStep` reducía cada posición a `{s, f}` | `tap` viaja **por nota** dentro del `path`, así que sobrevive incluso a editar el recorrido a mano |

Y quince líneas que estaban escritas **dos veces** —en el dibujo y en el aviso— viven ahora en
`formaDeTriadaActual`. Duplicadas, el dibujo y el aviso podían acabar diciendo cosas distintas.

---

# 17. El editor de rasgueo

La rejilla con la que se escribe un rasgueo: **dos casillas por pulso (corcheas)** y en cada una la
flecha que toca, con la regla de pulsos debajo (`1 · 2 · 3 · 4 ·`).

**Antes eran cuatro (semicorcheas), y era demasiado.** Un compás de 4/4 son dieciséis casillas de
treinta píxeles: medio metro de rejilla para escribir algo que casi siempre va en corcheas. Ahora
son ocho, y las semicorcheas se encienden con un interruptor cuando hacen falta.
`gridToEvents` ya leía `subdivision` del patrón, así que **el motor de sonido no se enteró**.
`reescalarRejilla` cambia la resolución conservando lo escrito y avisando de lo que no cabe:
rehacer el patrón a mano cada vez sería peor que no ofrecer el cambio.

**Y dejó de estar escondido.** Vivía tras un estado aparte (`ritmoEnEdicion`) y sólo aparecía al
pulsar un lápiz, así que la parte más trabajosa de la canción era la que no se veía. Ahora, si el
ritmo activo es tuyo, la rejilla está delante; si es de fábrica, una línea invita a escribir el
tuyo. No hay nada que abrir ni que cerrar.

Tocar una casilla la hace **rotar**:

```
vacío → ↓ → ↑ → ↓ acentuada → ↑ acentuada → × apagado → vacío
```

Un solo gesto en vez de un menú por casilla: con menú, escribir un compás serían veinte toques y
dos decisiones cada vez. **Eso se queda**, porque escribir de corrido es lo que más se hace.

Lo que el ciclo hace mal es **corregir**: cambiar un ↓ por un × son cuatro clics contando de
cabeza los estados de por medio. Para eso está el **clic derecho**, que abre los seis estados en
fila y salta al que sea de un gesto. Tres gestos y ninguno pisa al otro:

| Gesto | Qué hace |
|---|---|
| clic | avanza el ciclo |
| shift + clic | lo retrocede (era el clic derecho) |
| clic derecho | abre los seis estados en horizontal |

En horizontal porque una casilla de rasgueo se reconoce **por su flecha**, de un vistazo: una
lista vertical obliga a leer seis renglones para elegir un símbolo. El menú pinta un botón por
entrada de `CICLO_CELDA` —la misma lista que recorre el clic izquierdo, ahora exportada— para que
añadir un estado no pueda dejar el menú y el ciclo diciendo cosas distintas.

## El ▶: percusión, y un bucle de verdad

El botón decía «Escuchar el patrón en bucle» y programaba **dos pasadas**: se paraba justo cuando
empezabas a contarlo. Ahora es un bucle real, con el mismo planificador de horizonte que la
canción (§14), y **suena a percusión, no al acorde** (§8). Cambiar el tempo con el preview sonando
lo relanza, porque todo va programado por delante contra el reloj de audio y si no no se enteraba.

Y suena al tempo de la **sección activa** si lo tiene propio. Antes usaba `song.bpm` a secas,
mientras la reproducción real usa `section.bpm || song.bpm`: el mismo patrón se oía a un tempo en
el editor y a otro en la canción.

## Cómo llega al sonido

Los patrones de fábrica son listas de eventos; los que escribes tú son una **rejilla**.
`gridToEvents` traduce la rejilla a los mismos eventos que el motor ya consumía, así que **la
reproducción no distingue unos de otros y no hubo que tocarla**.

Lo que se deriva solo, para no preguntarlo casilla a casilla:

| Campo | De dónde sale |
|---|---|
| `at` | El índice de la casilla dividido por la subdivisión |
| `zone` | ↓ toca todas las cuerdas, ↑ sólo las agudas. Es lo que hace que suene a rasgueo y no a acordeón |
| `gain` | 0,8 normal · 1,0 acentuado · 0,35 apagado |
| `duration` | Sólo la fija el apagado: un × es un golpe seco, no un acorde flojo |
| `muted`, `accent` | Viajan tal cual, para que el preview sepa con qué timbre percusivo suena cada golpe |

Los patrones propios viven en `song.customRhythms` y **viajan dentro del JSON exportado**. Si
vivieran aparte, una canción compartida sonaría con otro ritmo.

---

# 18. Ejercicios

Otra tarea con otro entregable: una ficha de técnica, no un cancionero. Por eso tiene pestaña
propia — y también un atajo desde Escalas y Arpegios, porque es ahí donde se monta la digitación
y obligar a rehacerla en otro sitio sería pedirla dos veces.

```js
Exercise = { id, title, notes, bpm, subdivision, loop, pasos: [Paso] }

Paso = { id, tipo,          // "escala" | "arpegio" | "libre"
         nombre,
         instrument, tuning, tuningMidi, startingFret, numFrets,
         root, presetId,    // null en un paso libre: no sale de ninguna fórmula
         path,              // el recorrido: [{s, f, tap}] — qué notas y en qué orden
         sweep,
         envolvente,        // { color } si viene de una agrupación de tríada: se
                            // dibuja envuelto y SIN flechas (§15 bis)
         repeticiones }
```

Cada paso guarda **todo** lo necesario para reconstruirse —instrumento, afinación, ventana—
porque un ejercicio se abre semanas después y para entonces el mástil está en otra cosa.

- **La velocidad de la digitación** son BPM + subdivisión (negras, corcheas, tresillos,
  semicorcheas). La cabecera muestra el resultado en notas por segundo, que es lo que se nota.
- El botón **↗** de cada paso lo abre en el mástil para retocarlo. Un ejercicio que no se puede
  corregir obliga a rehacerlo entero.
- `ExerciseFretboard` dibuja **sólo las notas del recorrido**, no el mapa entero: de eso trata un
  ejercicio. Lleva tinta fija, como la hoja de canción, porque es obra.
- Con `envolvente`, el paso se dibuja **como se veía en el mástil**: la mancha de su color
  alrededor de las notas y **sin flechas**. De una forma no importa en qué orden se toca —importa
  dónde está la mano—, y las flechas ahí sobran; el recorrido es para las escalas. El color es un
  hex literal que viaja dentro del paso, así que la ficha no depende de qué escala tengas puesta
  cuando la abras semanas después.
- **Una mancha por agrupación, no una que las envuelva todas.** Con «todo el grado» son once notas
  repartidas por el mástil, y un solo casco alrededor de todas es una sábana que no dice nada. Se
  reparte con la misma `zonasDeUnGrado` que el mástil, así que la ficha se ve como se veía al
  elegirla.
- **Cuatro cosas se apilan encima de la cejuela** y cada una necesita su carril: el título, los
  nombres de las cuerdas, las notas al aire y la propia cejuela. Con el margen de antes se pisaban
  —en el PDF el título salía por delante de las notas al aire y no se leía ninguno—, así que
  `padTop` no es un margen redondo: es la suma de lo que hay que meter ahí.

## De dónde sale un paso

Tres caminos, y los tres acaban en el mismo `Paso`:

| Desde | Qué se lleva |
|---|---|
| **El recorrido** de escalas o arpegios | el botón «→ Crear ejercicio» del panel de recorrido |
| **Una tríada señalada** (§15 bis) | clic derecho en su ficha: una agrupación suelta, cada agrupación como un paso, o el grado entero |
| **El apartado Libre** | lo que hayas ido poniendo en el mástil, en el orden en que lo pusiste |

## El paso libre

**Modo libre dejó de ser un interruptor y es un apartado**: la explicación entera de cómo funciona
está en §5 bis. Aquí queda lo que le toca al ejercicio.

Un paso libre guarda `root` y `presetId` en **`null`**: no hay tónica ni fórmula que declarar, y
guardar un 0 y una escala mayor haría que la ficha coloreara como tónica una nota que nadie ha
señalado. `normalizeExercise` los colapsaba, y ya no.

Los pasos `tipo: "libre"` guardados antes de la mudanza **siguen abriéndose**: `cargarPasoEnMastil`
los lleva ahora a la pestaña Libre, y `song-core.js` no cambió.

La rejilla del mástil libre y las zonas de agarre de las flechas van marcadas `data-transient`,
así que `svgParaExportar` las quita: son interacción, no dibujo, y no tienen por qué pesar dentro
del archivo que te descargas.
- La ficha A4 usa el mismo `id="song-sheet-page-N"` y `data-song-sheet`, así que **la exportación
  es literalmente la misma función** que la de la canción.

---

# 19. La canción: tonalidad y presentación

## La tonalidad, elegida o libre

`song.keyRoot` (0–11) + `song.keyScale` cuando está **elegida**: la app la conoce y puede razonar
sobre ella. `keyRoot` en `null` es **modo libre**: se guarda el texto que escribas y la hoja de
teoría se desactiva, con el motivo al lado. Generar teoría sobre una tonalidad que no se sabe
cuál es sería inventarla.

## La hoja de tonalidad

Una página más, activable, con cuatro cosas: las notas de la tonalidad, los **grados diatónicos
con séptima** y sus **suspendidos**, **el mástil entero en horizontal** y los **acordes de la
canción que vienen de fuera**.

### La función tonal de cada grado

Qué papel cumple: sitio de reposo (**tónica**), de tensión que quiere resolver (**dominante**) o
de camino entre los dos (**subdominante**). Más el nombre propio del grado —supertónica,
mediante, sensible…—, que es como se le llama cuando se explica.

La familia va por **posición en la escala**, no por la calidad del acorde: el tercer grado hace de
tónica lo mismo en mayor (iii menor) que en menor (III mayor). Por eso funciona en cualquier
escala de siete notas sin una tabla por escala, igual que `diatonicChords`.

El séptimo es el único que se **deduce**: si está a un semitono de la tónica es **sensible** y
tira hacia ella; si está a un tono es **subtónica** y no tira. Es la diferencia entre el Si de Do
mayor y el Sol de La menor, y decirla es media explicación del modo.

> Juicio asumido: a la subtónica se le asigna familia de subdominante. Es lo más común, pero el
> bVII es un caso discutido —también se lee como dominante del relativo mayor—. Si algún día se
> quiere matizar, el sitio es `funcionDelGrado` en `theory-core.js`.

Los suspendidos llevan la función de su grado: un sus cambia la tercera, no el sitio donde vive.

### El mástil entero, en horizontal

`SheetNeckMap`: del traste 0 al 24, con todas las notas de la tonalidad y la tónica destacada. Es
la **única vista del proyecto que no es vertical**, y lo es a propósito: en una hoja A4, apaisar
el mástil es lo que permite meter veinticuatro trastes sin que quepan cuatro.

La afinación sale del primer acorde guardado, porque **la canción no guarda ninguna**: los acordes
sí, y son los suyos. Sin acordes todavía, guitarra estándar.

### Los acordes de fuera

Los grados dicen de qué está hecha la tonalidad; esto dice qué hay en la canción que no sale de
ella, con la lectura que le hayas puesto. Ver §19 bis.

`diatonicChords` los saca **apilando terceras de la propia escala** —los grados i, i+2, i+4,
i+6—, no de una tabla escrita a mano. Por eso funciona igual en mayor, en menor armónica o en
cualquier modo, sin una lista por escala:

```
Do mayor   I Cmaj7 · ii Dm7 · iii Em7 · IV Fmaj7 · V G7 · vi Am7 · vii° Bm7b5
La menor   i Am7 · ii° Bm7b5 · III Cmaj7 · iv Dm7 · v Em7 · VI Fmaj7 · VII G7
```

Los suspendidos se marcan sólo si sus tres notas son de la tonalidad: un sus4 sobre el séptimo
grado casi siempre trae una nota de fuera, y decirlo es más útil que ofrecerlo sin más.

## Los acordes, con dedos, con notas o con grados

`song.chordLabels` decide qué se escribe dentro de cada punto de los diagramas: `"dedos"`,
`"notas"` o `"grados"`. Con texto, el punto crece un poco: con el radio normal, «C#» no entra.

Eran **dos**, no tres, aunque el comentario del modelo dijera lo contrario. Y «dedos» no dibujaba
ningún dedo: los puntos llevan `finger` desde siempre y `MiniFretboard` no lo leía nunca, así que
la pestaña se llamaba «Dedos» y pintaba un punto liso.

Al añadir el tercero hay que tocar `normalizeSong`: colapsaba **cualquier** valor desconocido a
`"dedos"`, así que «grados» no habría sobrevivido a un guardado.

### Lo que no se veía: la cejuela y las cejillas

Con «Notas» activado había dos agujeros, y los dos escondían justo lo que más se pregunta:

- **Las cuerdas al aire** imprimían `○` y nada más, sin mirar nunca el modo. La cuenta correcta
  —la rama `f === 0` de `notaEnPosicion`, que resuelve la cejuela como traste 0— **ya estaba
  escrita y no la llamaba nadie**.
- **Las cejillas** eran un rectángulo pelado. Un acorde con cejilla enseñaba sus notas sueltas y
  callaba las cuatro o cinco de la barra. Ahora la barra se dibuja igual y encima va un punto por
  cuerda, que es lo que ya hacía el mástil grande.

### Grados de qué

`song.degreeBasis` responde a la otra mitad de la pregunta:

| | Qué cuenta | Para qué sirve |
|---|---|---|
| `"acorde"` | 1, 3, 5, 7 dentro del propio acorde | ver la digitación por dentro |
| `"tonalidad"` | el grado dentro de la tonalidad de la canción | ver **por qué** ese acorde está ahí |

Con `keyRoot` en `null` sólo tiene respuesta la primera, y la pestaña se deshabilita.

La fundamental del acorde sale de reconocer la digitación (`identifyChordFromVoicing`), que son
unas sesenta comparaciones de fórmula. Se guarda en una caché por `id` porque un acorde de la
biblioteca es inmutable salvo el nombre: sin ella, escribir la letra recalcularía la biblioteca
entera en cada tecla.

## La cabecera flotante

En Canción y en Ejercicios, lo que hace falta tener a mano mientras se baja por el contenido
—qué es, a qué velocidad, con qué ritmo, y los botones de escucharlo— se queda pegado arriba
(`.k-sticky-header`). El resto se va con el scroll.

`sticky` dentro del contenedor que hace scroll y no `fixed`: así no tapa nada de fuera del
apartado y no hay que reservarle sitio a mano.

El **bucle de sección** (⟳) repite sólo la sección activa. Los tiempos se recolocan desde cero,
porque `expandSong` los da relativos a la canción entera y al quedarnos con un trozo del medio
habría que esperar en silencio hasta que le llegara el turno.


---
---

# 19 bis. ¿Este acorde es de la tonalidad, o viene de fuera?

Antes **nadie cruzaba los acordes con la tonalidad**. `keyRoot` sólo se leía para montar la hoja
de teoría; ni la biblioteca, ni los compases, ni la hoja sabían si un acorde pertenecía a la
canción que decían acompañar.

## Lo que la app afirma y lo que deja al usuario

`analyzeChordInKey` (en `theory-core.js`) devuelve lo que se puede sacar con aritmética:

| Sugerencia | Regla |
|---|---|
| **V7/x** | dominante o mayor cuya fundamental está una quinta por encima de la de un grado |
| **subV7/x** | dominante que resuelve medio tono abajo hacia un grado |
| **vii°/x** | disminuido que sube medio tono hasta un grado |
| **Préstamo modal** | el mismo acorde existe sobre la misma tónica en una escala paralela |

Y ahí se para. **Nombrar la función que cumple un acorde prestado es una lectura**, y esa la firma
quien escribe la canción: un Db7 en Do es a la vez `subV7/I` y `bII7`, y las dos son ciertas. Por
eso `sugerencias` es una lista ordenada y no una respuesta, y siempre hay un campo libre.

Los préstamos se cortan en dos: un Mi bemol en Do sale de la menor natural, de la dórica y de la
frigia a la vez, y listarlas todas no es más preciso, es más largo.

`diatonico: null` significa **«no se puede decir»** —tonalidad sin elegir, escala de menos de
siete notas, acorde que no se reconoce—. No es lo mismo que «no es de la tonalidad», y
confundirlos sería inventar.

> Limitación heredada (§7): `identifyChord` gana con el primer match del bucle, sin criterio de
> preferencia. Con voicings ambiguos puede enraizar mal, y entonces la clasificación automática se
> equivoca. Es la razón de que poder corregirla a mano no sea un adorno.

## Dónde vive la lectura

En `song.harmony`, un mapa `{ [chordId]: { funcion, nota } }`. No en el acorde y no en el compás:

| Sitio | Por qué no |
|---|---|
| en el `Chord` de la biblioteca | La biblioteca es **global**, de todas las canciones. Un Am es vi en Do y ii en Sol: la lectura no es del acorde, es de la canción |
| en el `bar` | El mismo acorde puede estar en ocho compases y la lectura es la misma en los ocho. Además `normalizeSong` reconstruye cada compás con un `map` que sólo conserva `chordId` y `beats` |

**Deuda conocida:** un acorde pivote puede cumplir dos funciones distintas en dos puntos de la
canción. Indexar por acorde cubre el caso normal y mantiene el modelo simple; un ajuste por compás
se puede añadir después sin rehacer nada.

Al borrar un acorde de la biblioteca se borra también su entrada, en el mismo sitio donde ya se
limpiaban los compases.

## Dónde se ve

En cada tarjeta de la biblioteca, bajo el nombre: el romano si es diatónico —y ahí no hay nada que
decidir—, o una ficha pulsable si viene de fuera, que abre las sugerencias y el campo libre. Y en
la hoja de tonalidad, como tabla al pie.

---

# 20. El prototipo de piano (`Piano/piano_chord_diagram_generator.tsx`)

**Estado: existe, funciona por su cuenta, y no está conectado con nada de lo anterior.** Es un
archivo `.tsx` de 1.097 líneas con `import` de npm (`react`, `lucide-react`), así que **no puede
cargarse en `index.html`** tal cual: el bootstrap de Babel de §3 compila JSX pero no resuelve
módulos. Hoy es un componente pensado para un entorno con build.

## Qué hace (bastante más de lo que hace la app de cuerda)

- **Teclado SVG** de 1 a 4 octavas (`renderedOctaves`) con octava base ajustable (2–7).
  Click en tecla = alternar nota, y la nota suena al activarla.
- **Constructor de acordes**: raíz + tipo, de una tabla propia de 19 fórmulas (`CHORD_TYPES`).
- **Detección** con su propio `identifyChord`, que devuelve **todas** las coincidencias unidas
  por `/` en vez de sólo la primera.
- **Progresiones** con dos interfaces: modo simple (una lista con drag & drop y duración por
  acorde) y **modo avanzado**, con partes nombradas (`Parte A`…), repeticiones, y BPM y estilo
  rítmico propios de cada parte. Al pasar de simple a avanzado por primera vez migra la lista.
- **Motor rítmico**: 7 estilos (`block`, `arpeggio`, `pop`, `waltz`, `alberti`, `reggae`,
  `disco`), compás 4/4 o 3/4, loop, y edición de un acorde ya añadido.
- **Exportación**: PNG y SVG del teclado, y una **hoja de acordes (lead sheet)** A4 en PNG, SVG
  y **PDF** — esto último con jsPDF cargado desde CDN.

## Diferencias de fondo con la app de cuerda

| | `index.html` (cuerda) | `Piano/…tsx` |
|---|---|---|
| Teoría | `theory-core.js`, ≈60 fórmulas | tabla propia de 19, duplicada |
| Audio | 3 osciladores + paso-bajo | 1 oscilador triangle con envolvente simple |
| Progresiones | no hay | sí, con partes, BPM y ritmos |
| Dependencias | todo local en `vendor/` | npm + jsPDF por CDN |
| Iconos | emoji | `lucide-react` |

## Lo que sigue valiendo del plan original

Al extraer `theory-core.js` el piano heredó terreno preparado, y **el prototipo todavía no lo
usa**: `identifyChord`, los presets de escalas y arpegios, los nombres de nota y los grados
funcionan igual con un teclado, porque sólo miran clases de altura y cuál es la nota más grave.
Si el diagrama del teclado se dibuja en un SVG con `id="chord-diagram-svg"`, las tres
exportaciones de §10 sirven sin escribir una línea nueva.

Decisión de diseño que sigue en pie: **el piano no debería ser un cuarto `appMode`**. `appMode`
distingue qué se dibuja (acorde / escala / arpegio) y eso es ortogonal a con qué instrumento. Lo
natural es que sea otra opción del selector de instrumento, con `INSTRUMENTS` declarando si se
dibuja como mástil o como teclado.

Camino de integración, si se decide hacerla:

1. Quitar los `import` y las dependencias de `lucide-react` y del CDN de jsPDF, o aceptar que el
   piano rompe la promesa de "funciona sin internet".
2. Sustituir su `CHORD_TYPES` e `identifyChord` por los del núcleo.
3. Sacar la geometría del teclado a un `keyboard-core.js`, hermano de `render-core.js`.
4. Decidir qué pasa con las progresiones: hoy son la mejor parte del prototipo y la app de cuerda
   no tiene nada equivalente.

Sobre el sonido, la decisión anterior sigue en pie: empezar **sin samples**, con una voz dedicada
(ataque rápido, sin el sostenido de la cuerda pulsada, parciales inarmónicos, ruido de martillo).
El prototipo hoy usa un solo oscilador triangle, que es menos que eso.

---

# 21. Historial: los bugs de afinación (corregidos el 2026-07-16)

Los tres eran la misma familia: **el diagrama y el audio no calculaban la misma nota.** El
diagrama siempre se vio bien; el sonido no le correspondía.

### Bug C — El audio ignoraba el traste de inicio

La app dibuja una VENTANA del mástil, así que hay dos numeraciones de traste:

```
relFret 1 = el primer traste DIBUJADO      absFret 1 = el primer traste REAL
absFret = startingFret + relFret - 1
```

`analyzeCurrentChord` usaba el absoluto; las dos rutas de audio usaban el **relativo**. Con
`startingFret = 5`, un acorde sonaba como si estuviera en el traste 1. No era ni siquiera una
transposición: las cuerdas al aire sonaban bien y las pisadas no, así que el resultado era un
acorde distinto. En modo escala, el diagrama mostraba Do mayor y sonaban A#, C#, D# y G#.

Ahora toda conversión de traste a MIDI pasa por `fretToMidi(baseMidi, startingFret, relFret)`
en el núcleo.

### Bug D — Al mover la ventana, la digitación se transponía a medias

Una digitación es una FORMA que se desplaza entera con la ventana: es lo que hace un
guitarrista al subir la forma de C por el mástil, donde la cejuela pasa a ser una cejilla.

Pero las notas pisadas se transponían y las cuerdas al aire no, así que el acorde salía medio
transpuesto. La forma de C subiendo por el mástil se nombraba `C`, `Desconocido (C#, F, G, E)`,
`Em9/D`, `Em(maj7)/D#`…

Ahora `toAbsoluteFret(startingFret, 0)` devuelve `startingFret - 1`: la cuerda al aire es la
**cejuela de la digitación**, y sube con ella. La misma forma da C, C#, D, D#, E, F, F#, G…

**Importante:** esta regla vale sólo en modo Acorde. En escalas y arpegios el diagrama es un
**mapa del mástil**, no una forma transponible, así que una cuerda al aire es literal y no se
desplaza. Por eso `playSingleNoteAudio` mira `appMode`.

**Consecuencia visual conocida:** con `startingFret > 1`, esa cejilla cae en el traste
`startingFret - 1`, que queda justo por encima de la ventana. Suena y cuenta, pero no se dibuja.
Es una decisión consciente, no un descuido.

### Bugs A y B — Dos sistemas de afinación en paralelo

El análisis de acordes leía el array `tuning[]` (las letras), y el audio usaba unas tablas
fijas dentro de `getStringBaseMIDI` que ignoraban ese array.

- **Bug A** — Ukelele y bajo compartían opción y ambos sonaban mal. La decisión "¿ukelele o
  bajo?" se tomaba cuerda por cuerda, mirando la letra de esa cuerda, cuando es una pregunta del
  instrumento entero.
- **Bug B** — La afinación no afectaba al sonido. Drop D y DADGAD se dibujaban y se nombraban
  bien, pero sonaban en afinación estándar.

### Cómo quedó

1. **El instrumento es un estado explícito** (`instrument`), no algo que se deduce del número
   de cuerdas. `numStrings` se deriva del instrumento. En la interfaz, `4 (Ukelele)` y
   `4 (Bajo)` son opciones separadas, y cada instrumento ofrece sólo sus propias afinaciones.
2. **Un único punto de afinación.** Todo el audio pasa por `stringBaseMIDI(stringIndex)`.
3. **La regla de octava:** al reafinar, el músico mueve la cuerda lo mínimo posible, así que cada
   cuerda suena en la octava más cercana a su afinación de fábrica
   (`nearestMidiWithPitchClass`). Drop D sobre E2 baja a D2, no sube a D3. Esto hace que
   funcione cualquier afinación libre que escriba el usuario, no sólo los presets.
4. El ukelele de **sol grave** necesita octava explícita, así que un preset puede fijar `midi` y
   saltarse la deducción (`tuningMidi`). Es la única excepción.

### Verificado entonces

| Caso | Suena | Antes |
|---|---|---|
| Guitarra estándar, acorde C | `C3 E3 G3 C4 E4` | igual (correcto ya) |
| Drop D, cuerdas al aire | `D2 A2 D3 G3 B3 E4` | `E2 A2 D3 G3 B3 E4` ❌ |
| DADGAD | `D2 A2 D3 G3 A3 D4` | `E2 A2 D3 G3 B3 E4` ❌ |
| Bajo 4c, al aire | `E1 A1 D2 G2` | `E1 C4 D2 A4` ❌ |
| Ukelele, al aire | `G4 C4 E4 A4` | `G4 A1 D2 A4` ❌ |
| Escala de Do mayor en el traste 5 | solo notas de Do mayor | sonaban A#, C#, D#, G# ❌ |

**Nota sobre cómo probarlo a oído:** la digitación de C tiene la 6ª cuerda muteada, que es
justo la que Drop D reafina — con ese acorde no se nota diferencia, y es correcto. Para oírlo,
vacía el mástil o usa una digitación que pise la 6ª.

---

# 22. Revisión del 2026-09-02 — hallazgos

Lo que apareció al releer todo el código. Marcado lo que ya está resuelto.

### a) Lo que suena y lo que se nombra — RESUELTO (2026-09-03)

`analyzeCurrentChord` sólo contaba una cuerda sin nota si su estado era `"open"`, pero
`triggerStrumOrSequence` tocaba `"open"` **y** `"none"`. Con el mástil recién limpiado el título
decía `Ninguno (Mástil Vacío)` y al pulsar Reproducir sonaban las seis cuerdas al aire; en un
acorde a medio construir, el nombre ignoraba cuerdas que sí se oían.

Se unificó al montar el apartado Canción, donde un acorde tiene que sonar como se llama: **una
cuerda suena si tiene nota, si la pisa una cejilla o si está marcada al aire**. `none` es "sin
decidir" y no suena. La regla vive ahora en `chordVoicingToMidi`, dentro del núcleo, en un solo
sitio.

Cambio visible: rasguear un mástil vacío ya no suena.

### b) Cambiar entre dos instrumentos con el mismo número de cuerdas conserva el dibujo

El efecto de la línea 477 sólo limpia dots, cejillas y estados `if (stringStates.length !==
numStrings)`. Al pasar de Ukelele a Bajo (4 y 4) se recarga la afinación pero se conservan las
posiciones, que ahí significan otro acorde. El comentario del propio efecto dice justo lo
contrario de lo que hace el código.

### c) `changeTuningNote` no valida lo que se escribe

`parseNoteToSemi` de una letra inválida devuelve `0` (Do) sin avisar. Una afinación mal escrita
no falla: suena y se analiza como Do.

### d) La afinación libre queda fuera del desplegable

Al editar una cuerda, `selectedTuningName` pasa a `"Personalizada"`, pero el `<select>` de
afinaciones sólo tiene los presets del instrumento, así que ese valor no corresponde a ninguna
opción.

### e) `loadPreset` fijaba el nombre de afinación a mano — RESUELTO (2026-09-03)

Escribía `"Estándar (E A D G B e)"` literal, lo que funcionaba de milagro porque los cinco
presets eran de guitarra. Ahora el nombre se **deduce** comparando la afinación con los presets
del instrumento, y cae en «Personalizada» si no coincide con ninguno.

Salió al hacer que los acordes que guardas aparezcan también entre los presets del panel de
Acordes: en cuanto uno es de ukelele o de bajo, el nombre escrito a mano era falso.

### f) Deuda del prototipo de piano

- **Bug real**: el botón `+` de "Octavas a Mostrar" hace `Math.min(prev + 4, 4)` (línea 788), así
  que salta de 1 a 4 de un clic en vez de subir de uno en uno. El `−` sí resta 1.
- Con 1 octava visible, `handleBuildChord` puede generar notas por encima de la tecla 11 (p. ej.
  B mayor = 11, 15, 18): suenan y se nombran, pero no se ven.
- La hoja de acordes tiene **32 casillas fijas**; a partir del acorde 33 se descartan en silencio.
- Carga jsPDF desde `cdnjs.cloudflare.com`, lo que rompe la promesa de "funciona sin internet".
  En la app de cuerda esto ya está resuelto: jsPDF vive en `vendor/`.

### g) Documentación y repo

- `README.md` era un título de una línea; se amplió para que apunte aquí.
- Esta carpeta **no es un repositorio git**, aunque tiene `.gitignore`. No hay historial local:
  los cambios entre revisiones hay que reconstruirlos leyendo el código. Es la razón por la que
  esta documentación lleva fechas y marca lo resuelto.

### h) El control de tempo no hacía nada en la mitad de su recorrido — RESUELTO (2026-09-06)

`separacionRasgueo = Math.min(0.045, segundosPorCorchea / 6)`. Como `segundosPorCorchea / 6` es
`5 / bpm`, ese valor sólo bajaba de 0,045 por encima de **111 bpm**: en modo Acorde, mover el
control de 30 a 111 devolvía siempre el mismo número y sonaba idéntico.

No era un valor muerto ni un olvido: era un techo puesto por una razón buena —a tempos muy bajos,
sin él, un acorde tarda casi dos segundos en sonar entero— aplicado de la peor forma posible. Un
techo plano no aprieta el recorrido, se lo come. Ahora el margen es 15–110 ms, que empieza a
morder por debajo de 45 bpm, y el control muestra los milisegundos reales (§8).

Lección: **un límite que se activa dentro del rango normal de uso deja de ser un límite y pasa a
ser el comportamiento**. Si el techo hubiera estado documentado con el bpm a partir del cual
actúa, se habría visto de lejos.

### i) El ▶ del rasgueo decía «en bucle» y daba dos pasadas — RESUELTO (2026-09-06)

`const vueltas = 2`. Ver §17.

### j) El preview del rasgueo ignoraba el tempo de la sección — RESUELTO (2026-09-06)

Usaba `song.bpm` a secas mientras la reproducción real usa `section.bpm || song.bpm`. El mismo
patrón sonaba a dos tempos distintos según dónde lo escucharas. Ver §17.

### k) En Libre, poner una nota preguntaba por las notas del acorde — RESUELTO (2026-09-06)

`handleMouseUp` comprobaba `dots.findIndex(...)` para saber si la casilla estaba ocupada. Al
separar el mástil de Libre en `dotsLibre`, esa línea siguió preguntando por el de Acordes: una
casilla ocupada allí se comía el clic aquí, sin error ni aviso. Ahora pregunta por `dotsActivos`.

Es el fallo típico de partir un estado en dos: se cambian todas las **escrituras** y se olvida
alguna **lectura**, que es la mitad que no da error.

# 24. Plan de diez etapas (arrancado el 2026-09-07)

Funde las seis fases de `HOJA-DE-RUTA.md`, los veinte bugs de `BUGS.md` y un bloque nuevo
—las revisiones del sistema de flechas, etapa 3— en una sola secuencia. El plan entero está
fuera del repo; aquí queda lo que se ha hecho y con qué números.

Dos motivos mandan en el orden, y los dos salen de leer el código:

1. **Los bugs que cambian el SVG exportado van antes de la fase 2.** El 5, el 11, el 16 y el 17
   modifican el archivo que sale. La fase 2 exige que los tres SVG de referencia salgan byte a
   byte iguales, así que las fotos hay que tomarlas *después* de arreglarlos —al cerrar la
   etapa 4— o el `diff` no puede pasar.
2. **La bandera `restaurando` la necesitan tres sitios**, no sólo el historial de la fase 1:
   también el bug 7 (`loadPreset`) y `cargarPasoEnMastil`. Entra en la etapa 2.

## Etapa 1 — Lo que rompía la app (2026-09-07)

### Bug 1 — `cargarPasoEnMastil` lanzaba `ReferenceError`

`setModoLibre` murió cuando Libre pasó de interruptor a pestaña, y se llevó por delante el
camino de vuelta entero entre Ejercicios y el mástil. El estado que lo sustituye es
`appMode === "free"`.

Debajo había un segundo fallo que sólo aparecía al arreglar el primero: un paso de tipo
`libre` no rellenaba `dotsLibre` ni `stringStatesLibre`, así que el mástil se habría abierto
vacío con las flechas apuntando a notas que no se dibujan. Un paso libre guarda sus notas
**sólo** en `path`, y de ahí hay que repartirlas en dos sitios distintos, que es como
`notasDelMapa` lee Libre: el traste 0 es una cuerda al aire y vive en `stringStatesLibre`; lo
pisado vive en `dotsLibre`. Una posición repetida en el recorrido —una nota pedal— es un solo
punto en el mástil.

Comprobado con un paso sembrado a mano de seis posiciones, una de ellas al aire y una repetida:
abre con «4 notas · 6 en el recorrido» y cinco puntas de flecha, sin un solo `NaN`.

### Bug 2 — pantalla en blanco al quitar la tonalidad

En `ChordLibrary`, el panel desplegable del acorde prestado leía `lectura.sugerencias` sin la
guarda que sí tenía el chip de arriba. `lecturaDe` devuelve `null` en cuanto no hay tonalidad
—su comportamiento correcto: sin tonalidad no hay lectura que dar— y la app desaparecía
entera. Ahora lleva la misma guarda, y además el panel se cierra solo al cambiar de tonalidad:
uno que existe para decir que un acorde es prestado no significa nada cuando ya no hay de dónde
prestarlo.

### Fase 0 a — «Ejercicios» recortado por debajo de 480 px

Los seis destinos pedían 424 px y en un teléfono de 359 no los hay; el padre lleva
`overflow-hidden`, así que lo que sobraba no se recortaba con puntos suspensivos: desaparecía.
Ahora el segundo grupo (Canción / Ejercicios) baja a su propia fila por debajo de 480 px.

**Lo que hacía falta resolver primero:** el reparto de ancho entre los dos grupos se escribía
en el atributo `style` de cada `<nav>`, y **un `flex` en línea gana a cualquier media query**.
Con eso puesto, ninguna regla de `ui.css` podía partir la fila. El peso pasó a una custom
property `--k-tabs-peso`: lo pone el JSX, y la FORMA la puede seguir poniendo el CSS.

A 375 px las seis pestañas miden 87×87×99×63 y 143×202, todas a 60 px de alto, ninguna
recortada. En escritorio siguen en una sola fila.

### Fase 0 b — la etiqueta de la herramienta activa pisaba el botón vecino

El `span` es `absolute left-full`: en la barra **vertical** de escritorio se pinta al lado, pero
en la **horizontal** de móvil cae encima del botón de al lado. Oculta por debajo de `md`; el
`title` del botón ya cubre el caso. En escritorio sigue apareciendo.

### Fase 0 c — cuatro clases de Tailwind que no existían

`text-slate-350` (×2), `border-slate-850` y `text-indigo-450`. No hay `tailwind.config`, así que
no pintaban nada. Sustituidas por el token que se quería: `--k-text-muted`, `--k-border`,
`--k-highlight`.

**`HOJA-DE-RUTA.md` se equivocaba aquí:** lista además `text-slate-200` y `text-slate-100` como
inexistentes, y existen las dos. La lista buena era la de `BUGS.md`. Esas dos son Tailwind de
verdad y les toca en la etapa 6, con el resto de la retirada.

Una consecuencia de la sustitución, dicha porque no es neutra: en el botón «Mostrar Leyenda»
desaparece el `hover:text-indigo-300`. Un `style` en línea gana al `hover` de Tailwind, así que
dejarlo habría sido dejar una regla muerta. El `hover` de fondo se queda.

### Fase 0 d — `showToast` sin `clearTimeout`

Cada llamada abría su propio `setTimeout` y ninguna cancelaba el anterior: dos toasts seguidos
compartían el reloj del primero, y el segundo moría a los 200 ms. Ahora hay **un** temporizador
vivo en un `useRef`.

Y una **acción opcional**, que es la pieza de la que dependen las etapas 3 y 5:
`showToast(msg, { texto, alPulsar })`. Con acción vive 8 s —hay que leerlo Y decidir—; sin
ella, 3. Las 59 llamadas de un solo argumento siguen valiendo tal cual.

Con acción se le quita el `animate-bounce`: a un botón que bota no se le acierta.

Medido: el segundo toast sobrevive a los 3.200 ms —donde antes moría— y expira a los 5.800.

### Lo que la etapa 1 deja sin hacer

- **El toast con acción no tiene todavía ningún llamante**, así que ese camino está escrito
  pero no ejercitado. Se estrena en la etapa 3 (aviso del saneado del recorrido) y en la 5
  (deshacer al borrar un acorde); hasta entonces, no dar por probado el botón.
- **Canción a 375 px desborda**: la vista previa de la hoja A4 pide 853 px dentro de 343, con 93
  objetivos táctiles por debajo de 44. Es anterior a esta etapa y no entra en la fase 0; va en
  la etapa 8.
- **En Libre, la etiqueta de la primera herramienta dice «Arpegio»**. El ternário sólo contempla
  acorde / escala / resto, y Libre cae en el `else`. Anotado para la etapa 8, con el resto de la
  voz de la interfaz.
- La cejuela de Libre sigue mostrando las marcas del acorde (bug 8): es de la etapa 2.

### Números de partida, medidos hoy

El script de comprobación, en el estudio:

| Pantalla | 375 px | 1280 px |
|---|---|---|
| Acordes | 10 avisos, 0 desbordes | 32 avisos, 0 desbordes |
| Escalas | 21, 0 | 64, 0 |
| Arpegios | 15, 0 | — |
| Libre | 10, 0 | 24, 0 |
| Canción | 184, 5 desbordes | 162, 0 |
| Ejercicios | 34, 0 | 28, 1 desborde |

Casi todo son textos por debajo de 12 px y pares de contraste por debajo de 4,5:1, que son el
trabajo de la etapa 6. Los conteos de `index.html` hoy: **156** `text-[Npx]` (todos entre 8 y
11 px), **58** `text-xs`, **40** `text-slate-400`, **6** `focus:outline-none`. La hoja de ruta
decía 162 / 59 / 43; han bailado, hay que volver a medirlos al empezar la fase y no citar los
de la hoja.

## Etapa 2 — El mástil dice la verdad (2026-09-07)

Los seis sitios donde el mástil escribía en el lugar equivocado o mostraba lo que no era.

### La bandera `restaurando`, y por qué el ORDEN de tres efectos importa

`loadPreset` y `cargarPasoEnMastil` escriben instrumento **y** afinación en el mismo render.
Los efectos corren después: el de `[instrument]` ve que el instrumento cambió y hace lo que le
toca —poner la afinación de fábrica— pisando lo que se acaba de escribir.

La bandera es un `useRef` que se levanta al restaurar, la consultan los efectos guardados, y la
baja un `useEffect` **sin dependencias**. Los tres van seguidos y en este orden, porque React
corre los efectos en el orden en que se declaran:

1. el de `[instrument]` (guardado),
2. el de `[appMode]` que limpia el recorrido (guardado),
3. el que baja la bandera (sin dependencias, corre en cada commit).

Un `setTimeout` no vale: para cuando saltara, los dos efectos ya habrían corrido.

La usan tres sitios y va a usarla un cuarto: el historial de deshacer de la etapa 5, por el
mismo motivo —aplicar una foto llega en varios `set` y los efectos no pueden reaccionar a medio
camino—.

### Bug 7 — cargar un acorde de otro instrumento perdía su afinación

`loadPreset`, con la bandera. Sólo pasaba cuando el acorde guardado traía **otro** instrumento
que el que había puesto, porque el efecto sólo se dispara si `instrument` cambia: con todo de
guitarra no se notaba nunca.

Comprobado: ukelele → `G C E A`, D5 en Drop D → `D A D G B E`, y de vuelta. Antes el segundo
salía en `E A D G B e`.

### Bug 8 — en Libre, los ×/○ de la cejuela eran los del acorde

La fila de cuerdas al aire dibujaba con `stringStates` en vez de `stringStatesActivos`. Todo el
resto de Libre ya usaba el mástil activo; esta rama se quedó atrás.

Lo visible era ver marcas que no son de este mástil. Lo peor estaba debajo: al pulsarlas,
`toggleStringState` sí escribe en el de Libre, así que quedaba una cuerda al aire marcada que no
se dibujaba en ningún sitio y que `notasDelMapa` metía en el recorrido — una flecha hacia una
nota invisible.

Es el fallo típico de partir un estado en dos, el mismo que el apartado k) de la §22: se cambian
todas las **escrituras** y se olvida alguna **lectura**, que es la mitad que no da error.

Comprobado: mástil de Libre vacío, 0 marcas; Acordes conserva las suyas.

### Bug 9 — arrastrar en horizontal en Libre creaba una cejilla en el acorde

**Decisión de Carlos: en Libre el gesto no hace nada.** Libre no dibuja cejillas, así que el
arrastre no dejaba rastro donde ocurría y escribía en `barres`, que es del acorde de al lado: se
salía de Libre y el C se había convertido en C6. Trazar flechas ya se hace arrastrando de una
nota a otra, que es el gesto que ahí significa algo.

Tres piezas, no una:

- la rama de la cejilla de `handleMouseUp` pasa a `else if (appMode === "chord")`;
- `clearAll` sólo vacía `barres` en Acordes — «Vaciar» en Libre borraba las cejillas del acorde,
  el mismo agujero por el otro lado;
- la **previsualización** del gesto también se guarda a Acordes: enseñar la cejilla que se va a
  crear y luego no crearla sería prometer lo que no se va a cumplir.

Comprobado con un arrastre real de ratón en Libre: sin toast, sin cejilla nueva, y la del acorde
sigue ahí al volver.

### Bug 10 — el recorrido a mano era uno solo para Escalas, Arpegios y Libre

**Decisión de Carlos: limpiar al cambiar de modo.** Entrar en Libre dejaba `pathManual` en `[]`,
y como `recorridoActual` da prioridad a `pathManual` sobre el automático, un array vacío
significa «recorrido de cero notas escrito por ti»: al volver a Escalas el panel decía «0 notas,
a mano» con el mástil lleno y ninguna flecha.

En Libre se repone a `[]` y no a `null`: ahí el recorrido **siempre** es tuyo —no hay fórmula de
la que sacar uno automático— y el panel tiene que decir «a mano» desde el primer momento.

`showPath` y `editandoPath` sólo se tocan al entrar o salir de Libre, que es quien los enciende
por su cuenta y quien los dejaba encendidos al salir. **Entre Escalas y Arpegios se respetan**:
ahí los enciende el usuario, y apagárselos al cambiar de pestaña sería quitarle algo que él
había puesto.

Comprobado: Escalas con flechas (17 flechas, «18 notas, automático») → Libre → Escalas → volver a
encender las flechas devuelve las 17. Antes salía «0 notas, a mano» y ninguna flecha.

### Bug 11 — coordenadas `NaN` al reducir trastes

**Decisión de Carlos: impedir que la nota quede fuera**, más una guarda de cinturón. Son dos
piezas y hacen falta las dos.

**El clamp.** `trasteMasAltoDibujado()` mira los dos mástiles editables y las cejillas, y el
stepper no baja por debajo de él: lo dice con un toast en vez de encoger igual. Cuenta los dos
mástiles a propósito —reducir la ventana desde Libre y volver a Acordes con notas del acorde
fuera es el mismo fallo, sólo que se descubre más tarde—.

**La guarda.** `yDeTraste(f)` devuelve `null` cuando la casilla ya no está en la ventana, y los
nueve sitios que hacían la aritmética a mano la usan y saltan el nodo. `posicionEnLienzo` la usa
también, y `renderNotePath` y `notaMasCercana` descartan lo que dé `null`.

Lo malo nunca fue el error de consola: la nota desaparecía de la vista pero **seguía contando**
—entraba en el análisis del acorde, sonaba al rasguear y viajaba en el SVG exportado con
`cy="NaN"`—. Es el fallo silencioso contra el que avisa el comentario de `normalizeStyle`, por
el otro extremo. El clamp impide llegar; la guarda es para el camino que no hayamos previsto.

Comprobado con un acorde de 8 trastes y una nota en el 7: baja a 7 y ahí se planta, con el
mensaje. Cero `NaN` y cero `undefined` en el SVG de los cuatro modos.

### Bug 5 — el color del texto de las notas y de las flechas no llegaba al mástil

Trece lecturas del SVG grande leían `DEFAULT_STYLE` en vez de `style`. Vienen de la mudanza de
`DEFAULT_STYLE` a `render-core.js`: el alias se dejó a propósito para no tocar los ~109 usos, y
estos trece se quedaron leyendo la constante. Los dos selectores del panel de Estilo se
guardaban, sobrevivían al recargar y gobernaban las miniaturas… y el mástil los ignoraba.

Siguen leyendo la constante `.triadRingColors` y `.fretboardRadius`, que sí quieren ser fijos.
El comentario de la cabecera del archivo se ha corregido: decía que `.pathColor` y
`.dotTextColor` «siguen escribiéndose igual», y ya no es verdad.

Comprobado: cambiar «Texto en las notas» repinta las 30 etiquetas del mástil; cambiar «Flechas
del recorrido» repinta las flechas.

### Lo que la etapa 2 deja sin hacer

- **El recorrido sigue sin revisarse contra el mástil.** El bug 8 y el bug 11 tapan dos de las
  ocho vías por las que `pathManual` acaba apuntando a notas que ya no existen; las otras seis
  siguen abiertas. Es la etapa 3 entera, y es la razón de que exista.
- Los datos de prueba sembrados en `localStorage` (acordes de ukelele, Drop D, uno con nota en
  el traste 7, un Fm con cejilla, una progresión de doce compases y un ejercicio con paso libre)
  **siguen puestos** en el navegador integrado, en `http://localhost:8731`. Hacen falta para las
  etapas 3 y 4; se borran al terminar.

## 23. Deuda técnica de fondo

- `App()` sigue siendo un componente enorme: todo el estado y todo el JSX del estudio juntos. Va
  saliendo por trozos — primero el núcleo de teoría, luego `FretStepper`, `ModeTabs`, y ahora el
  apartado de canción entero en su propio bloque — pero el mástil sigue dentro.
- El JSX usa `class` en vez de `className`. Funciona porque React lo tolera, pero llena la consola
  de advertencias.
- El logo va como base64 en una sola línea de 76.849 caracteres. Hace el archivo incómodo de leer
  con herramientas de texto y no aporta nada frente a un archivo en `vendor/`.
- El bloque de compatibilidad con Tailwind (al final de `ui.css`) repinta su paleta con
  `!important`. Está aislado y marcado *en retirada*, pero mientras exista, una clase de color
  nueva puede salir con un color que no es el que dice su nombre.
- Los presets de acordes (`PRESETS`) son solo 5 y todos de guitarra.
- El **reconocimiento de acordes gana con el primer match** del bucle, sin criterio de preferencia
  (ver §7). Es la deuda más musical que queda.
- El **texto de dentro del punto** ya es editable, pero sigue siendo uno solo para todos los
  grados: con una paleta de intervalos muy contrastada, un mismo color de texto no puede leerse
  bien sobre los siete.
- Las **miniaturas** siguen el radio del estilo hasta donde caben (tope de media separación entre
  cuerdas). En guitarra el tope es inerte, así que subir el radio del mástil casi no se nota en
  las tarjetas.
- ~~**Sólo cabe una canción y un ejercicio.**~~ **RESUELTO (2026-09-06).** La previsión era
  correcta: bastó dar `id` a la canción, guardar la lista en vez de `[song]` y añadir el gestor
  (§14). El formato no cambió.
- El **recorrido a mano no se guarda** con el diagrama: vive en el estado de la sesión. Si se
  quiere conservar, hay que pasarlo a un ejercicio, que sí lo guarda. Eso vale también para
  **Libre**, cuyo mástil (`dotsLibre`) tampoco se persiste: es el hueco más visible que deja el
  apartado nuevo.
- **La portada no se puede saltar.** Sale en cada carga a propósito (§5), pero quien use la app a
  diario da un clic de más siempre. Si algún día molesta, el gancho es guardar la última vista;
  la decisión de no hacerlo fue que una portada intermitente desconcierta más que una fija.
- El **gestor no permite renombrar desde la lista**: se renombra abriendo la canción y editando su
  título. Con veinte canciones eso son dos clics de más por cada una.
- La **hoja de canción** sigue midiendo el ancho de carácter con la constante `8,4` (el editor ya
  lo mide de verdad). Mientras la tipografía monoespaciada sea la de ahora coinciden, pero son
  dos fuentes de la misma verdad y algún día habrá que unirlas.
- La **lectura armónica se indexa por acorde**, no por compás: un acorde pivote que cumple dos
  funciones en dos sitios de la canción hoy sólo puede llevar una (§19 bis).
- El **mástil horizontal** de la hoja de tonalidad saca la afinación del primer acorde guardado,
  porque la canción no guarda ninguna. Con acordes de dos instrumentos distintos, elige el primero.
- La **subtónica** se marca con familia de subdominante. Es lo más común, pero el bVII es un caso
  discutido; el sitio para matizarlo es `funcionDelGrado`.
- El **tapping** sólo ofrece octava y novena, y siempre en la cuerda más aguda del juego. Ya no es
  un fallo —hace lo que dice y se recalcula solo (§16)—, pero sigue siendo una sola forma de
  estirar la tríada.
- Con una inversión alta, la octava de tapping puede caer quince trastes por encima de la forma y
  la ventana se abre hasta ahí. Es correcto —esa nota está donde está— pero el diagrama sale
  larguísimo.
- La agrupación **por juegos de cuerdas** usa las tres primeras notas del arpegio. En un
  disminuido de séptima o un m7♭5 eso deja fuera la cuarta nota, que es justo la que da nombre al
  acorde. Para tríadas —el caso del sweep— es exacto, y desde la revisión de 2026-09-05 **se avisa
  en el panel** en vez de faltar una nota en silencio.
- Las formas por juegos de cuerdas **no usan cuerdas al aire**, porque esa capa del dibujo no las
  sabe pintar. Se pierden digitaciones reales (C/E en 6-5-4 en primera posición) que salen una
  octava más arriba.
