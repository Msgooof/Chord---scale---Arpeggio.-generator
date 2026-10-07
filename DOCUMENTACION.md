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

## Etapa 3 — Las flechas se revisan (2026-09-07)

No estaba en `HOJA-DE-RUTA.md` ni en `BUGS.md`. Es la causa de fondo de la que cuelgan varios
síntomas que sí estaban apuntados: el bug 8, el 10 y el 11 son tres caras de lo mismo.

### La invariante que faltaba

**El recorrido es una lista de posiciones y nada comprobaba que esas posiciones siguieran
existiendo.** Cuando el mapa de notas cambia por debajo, la lista se queda apuntando a sitios
que ya no hay: flechas hacia el vacío, cuentas falsas en el panel («12 notas, a mano» con seis
dibujadas) y notas que suenan sin verse.

Sólo **dos** sitios de todo el archivo hacían la limpieza —`quitarNotaLibre` y la rama de quitar
nota de `handleMouseUp`—. Los ocho caminos que cambian el mapa y **no** la hacían:

| Camino | Qué dejaba atrás |
|---|---|
| `toggleStringState` marca al aire o muteada | Flecha a una nota que deja de dibujarse |
| Encoger la ventana de trastes | Notas fuera → `NaN` (bug 11) |
| Cambiar de instrumento con otro nº de cuerdas | Vacía los dos mástiles, **no** el recorrido |
| `loadPreset` | Repone el mástil entero y deja el recorrido anterior |
| `cargarPasoEnMastil` | Escribe el recorrido del paso sin comprobarlo contra el mástil |
| Cambiar raíz o tipo de escala o arpegio | El recorrido congelado sigue sobre otro mapa |
| `clearAll` | Vacía el mástil y deja el recorrido |
| Los atajos de tríada | Recolocan la ventana con `setStartingFret`/`setNumFrets` |

### `sanearRecorrido`, en `theory-core.js`

Al lado de `buildNotePath` y de `samePosition`, que es de quien tira. Devuelve
`{ recorrido, quitadas }` y habla **sólo de validez**: qué hacer cuando quedan menos de dos
posiciones lo decide quien llama, porque no es lo mismo que el mástil se lleve las notas por
delante —ahí lo suyo es volver al estado de entrada del modo— que cortar el recorrido a
propósito desde el menú, donde una lista corta es lo que se ha pedido.

**Las repeticiones se conservan.** Una nota pedal o una vuelta atrás repiten posición a
propósito, y confundirlas con basura sería romper justo lo que el modo a mano existe para poder
escribir.

### Un punto de aplicación, no ocho

Un `useEffect` sobre una huella del mapa, y no ocho llamadas repartidas por los ocho caminos:
una llamada que hay que acordarse de poner es una llamada que algún día no se pone. Los dos
sitios que ya limpiaban a mano se quedan — son inmediatos y ahorran un fotograma de flecha
colgando.

La huella se recalcula en **cada render**, sin `useMemo` a propósito: su lista de dependencias
tendría diecisiete entradas —modo, los dos mástiles, la ventana, la afinación, la escala, el
arpegio y sus cinco ajustes— y una que se olvidara dejaría la huella vieja, que es exactamente
el fallo que esto viene a arreglar.

Tres guardas en el efecto, y las tres hacen falta:

- **En Acordes no se sanea.** Ahí `notasDelMapa` devuelve `[]` por diseño, no porque hayan
  desaparecido notas. Sin esto, cargar un preset desde Escalas soltaba un aviso de que el
  recorrido se había quedado sin notas, que sería mentira.
- **Un recorrido a mano vacío es legítimo:** es con lo que entra Libre. No hay nada que revisar.
- **`restaurando`**, la bandera de la etapa 2.

Cuando quedan menos de dos posiciones se vuelve al **estado de entrada del modo**: el automático
en Escalas y Arpegios, y `[]` en Libre, porque ahí no hay fórmula de la que sacar un recorrido y
decir «automático» sería no decir nada.

**Se avisa.** Un saneado callado deja al usuario con un recorrido más corto del que escribió y
sin saber por qué. No lleva «Deshacer»: las notas ya no están, así que no hay nada que devolver.
Es el primer llamante de la firma con acción de `showToast`… y no la usa, precisamente porque
aquí no hay acción honesta que ofrecer.

### Las cinco operaciones del menú de la flecha

`invertirSaltoEn(i)` **no comprobaba que existiera `base[i + 1]`**. El índice se guarda en
`menuFlecha` en el momento del clic derecho, y el recorrido puede cambiar debajo antes de que se
elija una opción: entonces metía un `undefined` en la lista y el render moría al pedirle su
posición a una nota que no existe.

Ahora las tres que reciben índice pasan por `flechaSigueAhi`, y si la flecha ya no está se dice
—«Esa flecha ya no está»— en vez de no hacer nada: un menú que se cierra sin efecto se lee como
que la app se ha colgado.

Las cuatro que modifican pasan por `aplicarAlRecorrido`, que hace dos cosas que antes no se
hacían: pasa el resultado por `sanearRecorrido`, y **si el resultado es igual a lo que había y
el recorrido era automático, lo deja automático**. Las tres que tiraban de `recorridoParaEditar`
congelaban el automático en `pathManual` como efecto colateral aunque no cambiaran nada.

### El menú nombra la flecha que se ve

`renderNotePath` salta los tramos demasiado cortos (`largo <= margen * 2`), así que el segmento
`i` de la lista **no siempre es la flecha `i` que se ve**. El menú titulaba «Flecha {i + 1}» con
el índice de la lista: con un tramo saltado, la segunda flecha que ves se llamaba «Flecha 3».
Ahora se cuenta lo dibujado. Para operar sigue mandando `i`, que es el índice de verdad; el
número es sólo el nombre.

### `conectarEnRecorrido` comprueba su destino

Hoy `notaMasCercana` sólo devuelve notas del mapa, así que la guarda no salta nunca. Está
escrita porque el resto de la función ya contempla sus cuatro casos de índice, y confiar en el
llamante era la única suposición sin comprobar que quedaba.

### Comprobado

| Qué | Resultado |
|---|---|
| «Vaciar» en Libre con recorrido puesto | 2 notas y 1 flecha → 0 y 0, con aviso |
| Guitarra → bajo de 4 cuerdas con recorrido de 5 notas | 5 fuera, aviso, sin `NaN` |
| Cambiar de Do a Fa# mayor con 6 notas a mano | sobreviven 2, se van 4, y lo dice |
| Recorrido con nota pedal (tramo de largo cero) | 3 tramos en la lista, 2 flechas, y la segunda se llama «Flecha 2» |
| Menú abierto + vaciar + «Invertir este salto» | «Esa flecha ya no está», sin romper nada |
| «Invertir el recorrido» con ida y vuelta (palíndromo) | sigue en «automático», no se congela |

Cero `NaN` y cero `undefined` en el SVG de las seis pantallas.

### Si añades un camino que cambia el mapa

No tienes que llamar a nada: el efecto de la huella lo coge solo. Lo que **sí** tienes que hacer
es preguntarte si tu camino es una restauración —escribe mástil y recorrido a la vez— y en ese
caso levantar `restaurando`, como hacen `loadPreset` y `cargarPasoEnMastil`. Si no, el saneado
verá el mástil nuevo con el recorrido nuevo a medio aplicar y se comerá lo que acabas de poner.

## Etapa 4 — La hoja dice la verdad, y el archivo sale limpio (2026-09-07)

Todo lo que hacía que lo impreso o lo exportado mintiera. Cierra tomando las tres fotos SVG de
referencia, en `referencia-svg/`, que gobiernan el `diff` de la etapa 6.

### Bug 3 — la hoja tiraba los compases que no cabían en la fila

Una progresión de doce compases se imprimía con ocho, sin decirlo: la peor forma de estar mal,
porque la hoja parece correcta.

No era un `break` mal puesto que se pudiera cambiar por otra cosa. `SheetBars` hacía `return` en
cuanto un compás se pasaba del ancho útil **porque el bloque tenía reservada UNA fila de alto
fijo** (`HOJA.altoCompases`, 58 px) y `paginateSong` ya había repartido las páginas contando con
eso. Arreglar el dibujo sin arreglar la reserva habría cambiado un fallo por otro peor: compases
pisando la letra.

Tres piezas:

1. **`disponerCompases(section, song, ancho)`** — UNA función para las dos cosas que tienen que
   decir lo mismo: cuánto alto ocupa el bloque —que lo pregunta la paginación **antes** de
   dibujar nada— y dónde va cada celda. Separadas, la hoja se descuadra en cuanto una de las dos
   cambie.
2. **`paginateSong` acepta `barsRow` como número o como función de la sección**, y guarda el alto
   dentro del bloque, igual que ya hacía el diccionario de acordes con `bloque.alto`.
3. **`SheetBars` pinta todas las filas** y `SongSheet` avanza `y` por `bloque.alto`.

Con una sola fila el alto da 58, que es lo que valía antes: una progresión corta se pagina
exactamente igual. Y un compás más ancho que la página se topa al ancho útil en vez de salirse.

Comprobado con 14 compases: se dibujan los 14 en dos filas, y **cero solapes** entre bloques de
la hoja (la progresión ocupa 334–418 y el verso siguiente empieza en 440).

### Bug 6 — borrar un acorde dejaba compases huérfanos en las demás canciones

La biblioteca es de TODAS las canciones, pero `removeChordFromLibrary` sólo tocaba la abierta:
las demás se quedaban con compases apuntando a un id que ya no existe, que en la hoja salen como
«?» y al reproducir no suenan. El paso que faltaba ya estaba escrito cuarenta líneas más abajo,
en `borrarTodosLosAcordes`: `fundirEnLista(prev, song).map(limpiar)`.

Y el aviso mentía por lo mismo: contaba los usos de la canción abierta.

Comprobado con dos canciones que comparten un acorde: 12 → 6 compases en una, 5 → 0 en la otra, y
el toast dice «quitado de 11 compases en 2 canciones».

### Bug 4 — la hoja imprimía «Negras» cuando el rasgueo es tuyo

`Song.getRhythm(s.rhythmId || song.rhythmId)` sin el segundo argumento. Era el único sitio del
proyecto donde se llamaba con uno solo, y por eso la canción **sonaba** con tu rasgueo mientras
la hoja decía otra cosa. Comprobado: la hoja dice «Mi rasgueo X».

### Bug 13 — la hoja de tonalidad cogía la afinación del primer acorde de la biblioteca

Ahora sale de los acordes que **esta canción** usa, que ya se calculaban ahí al lado en `usados`.
La biblioteca queda de recurso para una canción que todavía no usa ninguno. Comprobado: con un
acorde de ukelele guardado el primero, el mástil horizontal de una canción de guitarra sale con
seis cuerdas, `E A D G B E`.

### Bug 12 — una nota por debajo de una cejilla sonaba en vez de la cejilla

`chordVoicingToMidi` buscaba primero el punto y hacía `continue`, así que el punto siempre ganaba.
Con el punto **por encima** de la cejilla eso es correcto, que es el caso normal; **por debajo**,
no: físicamente suena la cejilla, porque la cuerda vibra desde ahí. Es alcanzable porque crear una
cejilla no borra las notas que hubiera («Cejilla es INMUNE», dice el comentario de
`handleMouseUp`).

Ahora gana el que está más cerca del puente, **y en los dos sitios**: `chordVoicingToMidi` y
`analyzeCurrentChord`. Si se arregla sólo uno, lo que se ve y lo que se oye dejan de coincidir,
que es peor que estar los dos igual de mal.

Comprobado: punto en el traste 1 bajo cejilla en el 3 suena el 3 (MIDI 43, igual que la cejilla
sola); punto en el 3 sobre cejilla en el 1 sigue sonando el 3.

### Bugs 16 y 17 — la suciedad del archivo exportado

`data-transient="1"` a la rejilla de clic del modo Acorde (treinta rectángulos invisibles por
archivo), al área de toque de las marcas de la cejuela, al halo de nota pulsada —que además se
llevaba una clase CSS que en el archivo suelto no anima nada— y a la previsualización del
arrastre, que es del gesto por definición.

`fontWeight="black"` no existe: el valor válido es `900`. Eran las etiquetas de las notas al aire
de escalas y arpegios, que salían en peso normal mientras las demás usaban `"bold"`.

Comprobado en los cuatro modos: el SVG exportado tiene **cero** rectángulos invisibles, cero
`font-weight="black"`, cero clases de animación y cero `NaN`; y el SVG vivo conserva sus 36
casillas de clic y muestra los seis rótulos a peso 900.

### Bug 18 — la miniatura dibujaba fuera de la caja lo que no cabía

`MiniFretboard` topaba la rejilla en seis trastes pero colocaba los puntos sin ese tope. Ahora la
ventana crece hasta la nota más alta del acorde: uno de ocho trastes sale más apretado, que es
mejor que salir roto. Comprobado con una nota en el traste 7: `cy` 92,9 dentro de una caja de 112.

### Las tres fotos de referencia

En `referencia-svg/`, con su `LEEME.md` diciendo qué escena es cada una y cómo reproducirla.
Tomadas **después** de los bugs 5, 11, 16 y 17, que son los que cambian el archivo que sale.

### Un aviso que costó una hora: el navegador cachea los `.js` del núcleo

Durante esta etapa, `song-core.js` se sirvió con **200 OK** y aun así se ejecutó la versión
vieja: la paginación de la hoja parecía rota cuando el arreglo ya estaba puesto. `location.reload()`
no revalida esos cuatro archivos, y abrir una pestaña nueva tampoco —la caché es del navegador,
no de la pestaña—.

Antes de dar por buena cualquier comprobación que dependa de `theory-core.js`, `render-core.js` o
`song-core.js`, refresca con la **URL exacta**, sin query (un `?v=` crea otra entrada de caché y
no sirve de nada):

```js
for (const f of ['song-core.js','theory-core.js','render-core.js','ui.css','theme.css'])
  await fetch(f, { cache: 'reload' });
location.reload();
```

Y confírmalo mirando el código **cargado**, no el del disco:

```js
window.KharoSong.paginateSong.toString().includes('typeof m.barsRow === "function"')
```

### Lo que la etapa 4 deja sin hacer

- El bug 19 (`LyricEditor` y los scrolls por índice) y el 15 (el ⟲ del ejercicio) siguen
  pendientes: van en la etapa 8, con el resto de Canción y Ejercicios.
- El bug 14 (JSON en Ejercicios) también es de la etapa 8.
- El bug 20 (el doble toque en móvil) necesita un teléfono de verdad: etapa 9.

## Etapa 5 — Que perdone (2026-09-07)

La que más cambia cómo se siente usar la app, y la más barata de lo que parece: cada cambio del
mástil ya era un gesto discreto —`setBarres` sólo se llama al soltar, `conectarEnRecorrido` una
vez en el `pointerUp`— así que un historial de fotos funciona sin reescribir nada.

### `useHistorial`: una pila de fotos

De **fotos** y no de acciones. Con acciones habría que escribir el inverso de cada una, y el de
«cambiar a un instrumento con otro número de cuerdas» —que vacía el mástil— no es una acción
inversible: es una foto anterior o no es nada. Pila con índice, tope 60, comparación por
`JSON.stringify` porque la foto es pequeña y plana.

Dos banderas dentro del hook, y las dos hicieron falta:

- **`aplicando`** — reponer una foto CAMBIA la foto, y ese cambio no es un paso nuevo. Sin ella,
  deshacer empuja lo deshecho y el rehacer no llega nunca a ningún sitio.
- **`rebasar`** — al reponer el mástil guardado al arrancar, la foto que llega es el punto de
  partida, no un paso. Sin ella, lo primero que hace Ctrl+Z recién abierta la app es borrarte el
  trabajo que se acaba de recuperar. Comprobado: ahora dice «Nada que deshacer».

### El respiro de 150 ms, que no estaba previsto

Apareció al probarlo: **un gesto llega en DOS commits.** El clic cambia el modo, y el efecto que
reacciona al modo cambia el recorrido — un efecto no puede correr en el mismo commit que el
manejador que lo dispara. Cada cambio de pestaña dejaba dos pasos en la pila y el primer Ctrl+Z
parecía no hacer nada, que es peor que no tener deshacer: parece que la app no responde.

Con la limpieza del `useEffect`, de una ráfaga sólo se guarda la última foto. La granularidad
pasa a ser «lo que hiciste, ya asentado», que es como cuenta los pasos una persona.

De paso salió sobrando `prepararModoLibre`: desde la etapa 2 el efecto de `[appMode]` es el dueño
de lo que vale en cada modo, y `selectMode` hacía lo mismo otra vez en otro commit.

### La foto: tres campos más de los que decía la hoja de ruta

Los once de la hoja, **más `appMode`, `showPath` y `editandoPath`**. La razón apareció al
escribirlo: desde la etapa 2 el recorrido muere con el modo, así que `pathManual` no significa
nada sin saber de qué modo es. Una foto con el recorrido y sin el modo se puede restaurar sobre
el modo equivocado, y entonces devuelve un recorrido que no es de ahí.

**Fuera queda el estilo**, que tiene su propio «Reiniciar». Es la trampa que avisa la hoja de
ruta y es real: mueves el radio de la nota, pulsas Ctrl+Z para quitar una nota que sobra, y se
deshace el radio. Comprobado: el radio va de 10 a 13 y Ctrl+Z lo deja en 13.

Fuera también los paneles, el toast, la reproducción, `dragCurrent` y `arrastreFlecha`: son del
gesto en curso, no del trabajo.

### El mástil se guarda — `kharo.studio.v1`

Era lo único que no sobrevivía a un F5: se podía pasar media hora trazando una escala y perderla
al recargar. Guarda **la misma foto** que alimenta el deshacer, así que no hay dos ideas
distintas de «lo que es tu trabajo». Mismo respiro de 500 ms que la canción y la biblioteca.

Se repone en un efecto de arranque y no en los `useState`: son catorce estados repartidos por el
componente y tocarlos todos serían catorce sitios donde equivocarse.

### Borrar un acorde: deshacer, no confirmación

**Nada de `confirm`.** El diálogo pone el peso ANTES de saber si te has equivocado; el toast lo
pone cuando ya lo sabes. Se guarda la copia de la biblioteca y de **todas** las canciones —la
etapa 4 amplió el alcance del borrado, así que el deshacer tiene que cubrir lo mismo— y se ofrece
en el toast.

Es el primer llamante de verdad de la firma con acción de `showToast`, que la etapa 1 dejó escrita
sin ejercitar. Comprobado de punta a punta: biblioteca 3 → 2, la canción de 14 → 0 compases, toast
«"G" borrado, y quitado de 14 compases · Deshacer», y al pulsarlo vuelve todo.

### La papelera, al menú

El icono medía 19×14 px y estaba pegado a «Añadir». Lo destructivo no va al lado de lo que se
pulsa cien veces al día. Borrar vive en el menú del clic derecho, que ya lo tenía; «Añadir» se
queda a lo ancho, con área táctil de verdad.

### Cambiar de instrumento lo dice, y se deshace

Sigue vaciando —las posiciones del instrumento anterior no significan lo mismo aquí— pero ahora
avisa: «Mástil vaciado: Bajo (4c) tiene 4 cuerdas · Deshacer». Vaciar y cambiar de instrumento
ocurren en el mismo commit, así que son **un solo paso** de la pila.

**Un choque que sólo se ve probándolo:** el saneado del recorrido de la etapa 3 se disparaba
inmediatamente después y su toast pisaba a éste — el único de los dos que traía el «Deshacer».
Son dos avisos del mismo suceso. Ahora una bandera, `vaciadoPorInstrumento`, hace que el saneado
limpie **en silencio** cuando el vaciado ya se ha anunciado.

### Comprobado

| Qué | Resultado |
|---|---|
| Poner notas y Ctrl+Z / Ctrl+Shift+Z | baja a cero y vuelve, simétrico, y luego «Nada que deshacer» |
| Cambiar de pestaña | **un** paso, no dos |
| Mover el radio y Ctrl+Z | el radio no se toca |
| F5 con notas puestas | vuelven, y el primer Ctrl+Z dice «Nada que deshacer» |
| Borrar un acorde usado en 14 compases y «Deshacer» | vuelven el acorde y los 14 compases |
| Cambiar a bajo de 4 cuerdas y «Deshacer» | vuelven las 6 cuerdas y la nota |
| `referencia-acorde.svg` | sha256 idéntico: la obra no se ha movido |

Cero `NaN` y cero `undefined` en las seis pantallas.

### Lo que la etapa 5 deja sin hacer

- **El respiro de 150 ms junta dos ediciones muy seguidas en un solo paso.** Es deliberado, pero
  significa que colocar dos notas a toda prisa se deshace de una vez. Si algún día molesta, la
  salida no es bajar el respiro —volvería el paso fantasma— sino marcar explícitamente qué
  commits son continuación de un gesto.
- Sólo se ha vuelto a comprobar la foto del **acorde**. Las tres se comparan enteras al cerrar la
  etapa 6, que es para lo que existen.

## Etapa 6 — Que se lea (2026-09-07)

La más ancha del plan, y casi toda mecánica. Lo que no era mecánico está abajo.

### La escala que faltaba

`theme.css` no tenía **ninguna** escala de tamaños ni de espacios, y por eso el JSX había
acumulado 155 tamaños escritos a mano por debajo de 12 px: 102 a 10, 26 a 11, 25 a 9 y 2 a 8.
Un tamaño que se elige a ojo en cada sitio no es una decisión, es una acumulación.

`--k-text-xs` 12 · `sm` 13 · `md` 14 · `lg` 16 · `xl` 18 · `2xl` 22, y `--k-space-1…6` de 4 a 32.
**El suelo son 12 px.** Lo que estaba a 8–10 sube a 12; lo que estaba a 11–12 sube a 13.

Las clases `.k-text-*` llevan `line-height` propio a propósito: las de Tailwind que sustituyen
traían el suyo (`text-xs` es 12/16), y cambiar el tamaño sin cambiar la altura de línea mueve
todo lo que hay alrededor.

### La migración, y la trampa del guion

190 sustituciones en seis tandas, por tamaño y de mayor a menor, mirando la app entre tanda y
tanda.

**`\btext-xs\b` casa DENTRO de `k-text-xs`**, porque el guion es un límite de palabra. Sin un
`(?<!k-)` delante, la quinta tanda habría convertido las 129 clases recién migradas en
`k-k-text-sm`. Se vio antes de ejecutarla, pero por poco: es el fallo que habría dejado la app
en blanco sin decir por qué.

### Contraste: lo que estaba mal y por qué

| Token | Antes | Ahora |
|---|---|---|
| `--k-text-faint` | #64748b, 3,58:1 | #8AA0B8, **5,4:1** |
| `--k-text-disabled` | #3f5773, 1,94:1 | #6B84A1, **4,65:1** |
| `--k-border` | `rgba(acento, .35)`, 1,30:1 | #4074DA sólido, **3,25:1** |
| `--k-surface` | #001d38, 1,05:1 sobre el fondo | #062A50, **1,24:1** |

El borde pasa de transparencia a color sólido: **un borde es un LÍMITE**, y un límite tiene que
verse contra lo que separa. A 0,35 de opacidad era una raya que se adivinaba, y la separación
entre panel y lienzo dependía toda de ella porque el panel estaba a 1,05:1 del fondo — que es no
estar.

### Lo que no era mecánico

**Los números de la leyenda de intervalos.** Fallaban hasta 1,56:1 —blanco sobre el amarillo del
grado 3— y no se podían arreglar cambiando el color: **los colores de intervalo son OBRA**, los
elige el usuario y salen en el archivo exportado. Lo que sí es piel es la TINTA de la ficha. Se
añadió `tintaLegibleSobre(color)`, que elige negro o blanco según la luminancia relativa del
fondo. El umbral no es a ojo: sale de igualar los dos contrastes, y el blanco y el negro empatan
en L ≈ 0,179.

**Las pestañas del header medían 25 px en escritorio.** No lo había roto la migración: había una
`@media (min-width: 768px)` que ponía `min-height: 0`. Eran los seis destinos principales de la
app y el objetivo más pequeño que había. Subidas a 28 px — es criterio de la etapa 9, pero estaba
en el archivo que tenía abierto y arreglarlo aquí costaba una línea.

### La retirada de Tailwind, completa

**El bloque de compatibilidad está vacío**, que era el criterio de cierre de la etapa 9. Vivían
allí diecinueve reglas repintando la paleta de Tailwind a golpe de `!important`; en `ui.css` ya
no queda ni un `!important` fuera de los comentarios.

Ahora los textos van por `.k-ink*` (98 usos), los fondos por `.k-fill*` (55) y los bordes por
`.k-stroke*` (48), y todos leen `theme.css`.

**Las peores eran las de opacidad.** `bg-slate-900/90` o `border-slate-800/60` **no se podían
repintar desde el bloque ni con `!important`**, porque Tailwind las genera a partir de su propio
color: componía el rgba antes de que `ui.css` tuviera nada que decir. Salían con el azul de
Tailwind y nadie lo veía, porque se parecía bastante al del tema. Cada una tiene ahora su clase
(`.k-fill-90`, `.k-stroke-60`…) compuesta sobre el triplete del token.

### El foco, que no existía

No había **ninguna** regla de foco, y el JSX además apagaba el del navegador con
`focus:outline-none` en seis sitios. Quien navega con teclado no tenía forma de saber dónde
estaba. Ahora `:focus-visible` con un aro de 2 px del realce y 2 px de separación — comprobado
con Tab de verdad: `2px solid rgb(172, 236, 0)`.

`:focus-visible` y no `:focus`, para que un clic con el ratón no deje el aro puesto: eso es lo
que llevó a apagarlo en su día.

### Los números

| Pantalla | 1280 px antes | 1280 px ahora | 375 px antes | 375 px ahora |
|---|---|---|---|---|
| Portada | — | **0** | — | — |
| Acordes | 32 | **2** | 10 | **2** |
| Escalas | 64 | **2** | 21 | **2** |
| Arpegios | — | **2** | 15 | — |
| Libre | 24 | **1** | 10 | **2** |
| Canción | 162 | **78** | 184 | **111** |
| Ejercicios | 28 | **7** | 34 | **15** |

**Cero avisos de «letra < 12 px» y cero de «contraste < 4,5» en todas las pantallas y en los dos
anchos.** Todo lo que queda son objetivos táctiles y dos desbordes, que son de las etapas 8 y 9.

En el archivo: 0 `text-[Npx]`, 0 `text-slate-*`, 0 `text-gray-*`, 0 `text-white`,
0 `focus:outline-none`.

### Y la obra no se ha movido

Las **tres** fotos de `referencia-svg/` salen byte a byte idénticas después de reescribir la
escala tipográfica, la paleta, los bordes y el foco:

```
acorde   3311 chars  c28789593cc3eed3…  IDÉNTICO
escala  12104 chars  911658b856d64979…  IDÉNTICO
hoja    10861 chars  e034369b05b95b5a…  IDÉNTICO
```

Que es exactamente para lo que existen: la regla de §12 dice que un tema no puede tocar la obra,
y ésta era la fase que más podía romperla.

### Lo que la etapa 6 deja sin hacer

- **`text-base`, `text-lg`, `text-xl` y `text-2xl` de Tailwind siguen puestos** (7 usos entre los
  cuatro). Están por encima del suelo y son tamaños semánticos, no números a ojo, así que no
  hacían daño. Pasarlos a `.k-text-*` es trabajo de limpieza, no de legibilidad.
- La escala de espacio (`--k-space-*`) está declarada pero **todavía no se usa**: el espaciado
  sigue viniendo de las clases de Tailwind, que ahí sí son una escala coherente. Queda para
  cuando alguien toque el layout.
- Los objetivos táctiles por debajo de 28/44 px: 78 en Canción a 1280 y 106 a 375. Es la etapa 9,
  y el grueso está en la vista previa de la hoja A4.

## Piel «Estudio de noche» (2026-10-02)

Una actualización de la interfaz con libertad de color y de disposición. La única condición era no
tocar lo esencial. Fuera de esta etapa: la etapa 7 (el lienzo) sigue a medias y sin documentar.

**El problema.** La piel era azul marino de punta a punta: fondo, paneles, bordes, pestañas y
botones en la misma familia, con el lima repartido por todas partes (pestañas inactivas, títulos de
panel, pista de abajo, texto de los botones). Si todo resalta, no resalta nada, y el mástil
competía con lo que tenía alrededor.

**La regla nueva.** La piel pasa a grafito neutro y el color se gasta sólo en dos cosas:

| Color | Para qué | Ejemplos |
|---|---|---|
| Cobalto `#3D66FF` | Lo que **actúa** | Botón principal, pestaña activa, el cerco del modo «a mano» |
| Lima `#ACEC00` | El **dato** | Acorde detectado, número de trastes, grados de la leyenda |

El lienzo blanco del diagrama queda como el único objeto luminoso de la pantalla.

**Paleta y contrastes** (WCAG 2.1, medidos sobre panel `#161D27`):

| Token | Valor | Contraste |
|---|---|---|
| `--k-bg` / `--k-surface` / `--k-surface-raised` | `#0B0F15` / `#161D27` / `#202937` | escalones de 1,13 y 1,16:1 |
| `--k-text` | `#E8ECF2` | 14,3:1 |
| `--k-text-muted` | `#A3AFC0` | 7,6:1 |
| `--k-text-faint` | `#8C99AC` | 5,9:1 |
| `--k-text-disabled` | `#7E8B9F` | 4,9:1 |
| `--k-border` / `--k-border-strong` | `#647186` / `#7E8B9F` | 3,4:1 / 4,9:1 (límite ≥ 3) |
| `--k-accent` + `--k-accent-ink` | `#3D66FF` + blanco | 4,6:1 (5,9:1 en hover) |
| `--k-highlight` | `#ACEC00` | 11,9:1 |

El cobalto de marca `#013FF6` se aclaró a `#3D66FF` porque sobre grafito se hundía (2,2:1 contra
el fondo). Encima del acento ya no se escribe en lima sino en blanco: el lima sobre cobalto vibraba
y gastaba el color del dato en un botón.

Tokens nuevos: `--k-divider` (la raya que ordena dentro de un panel; no es un límite, por eso va
suave), `--k-accent-soft` (fondo de lo elegido) y `--k-shadow-inset` (una luz de 1 px en el canto
superior, que en grafito separa mejor que una sombra negra).

**Disposición:**

- **Cabecera** más baja, separada por un divisor en vez de la línea cobalto. Las pestañas van
  centradas y, desde `lg`, cada grupo lleva su nombre («Diagramas», «Documentos»), igual que en la
  portada.
- **Pestañas** como control segmentado: contenedor hundido, inactivas en texto apagado (antes lima
  al 50 %) y la activa en cobalto. En móvil pasan de 60 a 44 px de alto: el relleno de `.k-tab` se
  sumaba al `line-height` de 44.
- **Lienzo** con marco neutro y una rejilla de puntos muy tenue (piel, fuera del SVG). El **pie de
  página sólo sale en la portada**, y esos 33 px vuelven al mástil.
- **Los ± de trastes y posición** (`.k-stepper`) son una cápsula discreta: botones en superficie
  elevada que se encienden en cobalto al pasar por encima, y el número en lima. En móvil la cápsula
  desaparece y se aprietan los huecos para que los dos quepan en una fila a 359 px.
- **Toolbar flotante**: el icono abierto se marca con `--k-accent-soft` y un aro cobalto, no con un
  bloque cobalto relleno. Se añadieron `aria-label` y `aria-pressed`.
- **Paneles**: título en texto claro con una muesca cobalto (`.k-panel-title`) en vez de lima.
- **Pista bajo el mástil**: pasa de ser una píldora con borde a una frase al margen (`.k-hint`).
- **Portada**: título grande con «Studio» en lima y fichas (`.k-card`) con una franja superior que
  dice el grupo (cobalto en Diagramas y lima en Documentos).
- **Exportar**: PNG como acción principal y SVG / Illustrator como secundarias neutras.

**Lo que no cambió.** La obra (`DEFAULT_STYLE`, `intervalColors`, el SVG del mástil y la hoja) y
todo el comportamiento. Comprobado: el `outerHTML` del `#chord-diagram-svg` con el acorde de C da
el mismo SHA-256 antes y después (`068460074dfe928b…`). Las clases del propio `<svg>` no se
tocaron, porque viajan dentro del archivo exportado.

**Pendiente visto de paso.** ~~En Canción, a 359 px, un `.k-lyric-line` mide 960 px y hace salir una
barra horizontal en el contenedor. No viene de este cambio.~~ **RESUELTO (2026-10-03).** Ver la
sección siguiente.

## La barra horizontal de Canción en móvil — RESUELTO (2026-10-03)

**El síntoma.** En Canción, a 359 px, el contenedor con scroll del editor medía 985 px de
`scrollWidth` para 351 de `clientWidth`: todo el apartado se podía arrastrar de lado.

**La causa.** El `span.k-lyric-line` de 960 px no era una caja de letra, era el **medidor** de
`useCharWidth`: cien ceros (`"0".repeat(100)`) a 9,6 px cada uno. Lleva las mismas clases que la
caja de la letra a propósito (ver el comentario del hook), así que las reglas de `.k-lyric-line`
le afectan, pero esas reglas sólo afinan la barra de desplazamiento: no ponen `overflow` ni ancho,
y aunque los pusieran, el medidor tiene que medir su ancho natural. Es invisible y va en
`position: absolute`, pero eso no lo saca del cálculo: un hijo absoluto que se sale de su bloque
contenedor cuenta como desbordamiento del contenedor con scroll más cercano. En escritorio no se
notaba porque 840 px (a 14 px de letra) caben en el editor; en móvil, a 16 px y en 351 px de
ancho, no.

**El arreglo.** Sólo JSX, en `useCharWidth`: el medidor va dentro de una capa
`position: absolute; inset: 0; overflow: hidden` que ocupa exactamente lo que el editor y recorta
lo que sobresale. `getBoundingClientRect` devuelve la caja sin recortar, así que la medida es la
misma de antes y el carril de acordes no se mueve. El medidor sigue siendo `inline-block` dentro
de la capa. Ni `theme.css` ni `ui.css` cambian.

**Comprobado** con un verso de prueba de 80 caracteres y cinco acordes (borrado después):

| | 359 px | 1400 px |
| --- | --- | --- |
| `scrollWidth` / `clientWidth` del contenedor | 985 / 351 → **351 / 351** | 1392 / 1392 |
| Ancho del medidor (100 caracteres) | 960,16 px, igual que antes | 840,14 px |
| Inicio de `.k-chord-lane__inner` = inicio del texto | 45 = 45 | 197 = 197 |
| Con la letra desplazada 200 px | −155 = −155 | — |

A 1400 px el ancho por carácter del medidor (8,4014) coincide con el de la tipografía real de la
caja medido con `canvas.measureText` (8,4014).

**Lo que no cambió.** La hoja exportada (SVG, PNG, PDF) no usa `LyricEditor` ni `useCharWidth`;
el cambio no llega a ella.

Lección: **`visibility: hidden` y `position: absolute` no sacan un elemento del desbordamiento**.
Un medidor fuera de la vista necesita algo que lo recorte, o acaba ensanchando la página justo en
la pantalla donde menos sitio hay.

## Versiones de prueba de la interfaz: 0.1 y 0.2 (2026-10-02 → 2026-10-04)

> **La 0.2 es Prime desde el 2026-10-04.** Carlos la aprobó con sus cuatro vueltas y se aplicó así:
>
> - `index.html` es la 0.2, sin el selector de versión y con el título «Kharo Studio».
> - `theme.css` es el antiguo `theme-prueba.css`.
> - `ui.css` es `ui-prueba.css` con `ui-v02.css` pegado al final, en ese orden, para que la cascada no cambie.
> - `render-core.js` es el antiguo `render-core-prueba.js` (trae la piel «madera»).
>
> Se borraron `prueba.html`, `v02.html`, `theme-prueba.css`, `ui-prueba.css`, `ui-v02.css` y
> `render-core-prueba.js`. Comprobado antes de borrar: con el mismo estado guardado, el
> `#chord-diagram-svg` de `index.html` y el de `v02.html` daban el mismo SHA-256 en Acordes y en
> Escalas.
>
> **Claves de almacenamiento que siguen con su nombre de prueba**, a propósito, para no perder lo
> guardado: `kharo.prueba.modo` (claro u oscuro) y `kharo.v02.inspector`.
>
> Lo que sigue es la historia de cómo se llegó aquí. Donde dice `-prueba` o `v02`, hoy es el archivo de
> Prime equivalente.

Eran **propuestas para confirmar antes de aplicarlas**:

| Versión | Archivos | Qué es |
|---|---|---|
| **Prime** | `index.html` · `theme.css` · `ui.css` · `render-core.js` | La app de verdad |
| **0.1** | `prueba.html` · `theme-prueba.css` · `ui-prueba.css` · `render-core-prueba.js` | Piel «Papel y tinta», sitio y app separados |
| **0.2** | `v02.html` · lo de la 0.1 · `ui-v02.css` | La 0.1 con todo el Taller reorganizado |

Se cambia de una a otra con el selector **Prime · 0.1 · 0.2** de la cabecera (sólo está en 0.1 y 0.2). Las
tres comparten el almacenamiento del navegador (`kharo.*`): lo que se guarda en una aparece en las otras.
Ninguna cambia la forma de los datos, así que no hay migración.

**La obra no cambia en ninguna.** Comprobado el 2026-10-04: el `outerHTML` de `#chord-diagram-svg` da el
mismo SHA-256 en Prime, 0.1 y 0.2 con el mismo estado guardado (acordes y escala de C mayor). Se mide
cargando las tres en iframes con el mismo `localStorage`.

### 0.1 · «Papel y tinta» y el sitio

- **Piel clara de cuaderno** (`theme-prueba.css`): papel crema, tinta casi negra, el cobalto como bolígrafo y
  el lima como **rotulador**. El lima deja de ser color de letra, porque sobre papel no se lee (1,3:1).
  Por eso hay un token nuevo: `--k-marker` (fondo, con `--k-marker-ink` encima, 12,5:1) frente a
  `--k-marker-trazo` (el subrayado detrás del texto).
- **Modo oscuro «Papel de noche»** (`:root[data-theme="oscuro"]`): tinta cálida, letra color papel. Lo pone el
  botón sol/luna de la cabecera; se guarda en `kharo.prueba.modo` y, si no hay elección, sigue al sistema.
  Se aplica antes de pintar, con un script en el `<head>`, para que no parpadee.
- **Sitio y app, separados.** El sitio (Inicio, Sobre el proyecto, Foro, Tienda) tiene su navegación; la app
  (el Taller) tiene sus pestañas. Foro y Tienda todavía no existen: ficha a trazos, sticker «en obra» y una
  página que cuenta qué serán, con textos escritos con la guía de voz.
- **La portada como disco:** mástil de madera que suena (cuerdas al aire o acordes con sus botones, con el
  mismo `synthInstance` del estudio), Lado A · Diagramas y Lado B · Documentos como pistas, y las fichas de
  los seis instrumentos que salen de `INSTRUMENT_ORDER` / `TUNING_PRESETS` (nada escrito a mano).
- **Diapasón «Madera»** (`render-core-prueba.js`, clave de estilo `fretboardSkin`): es obra, se exporta.
  Con «Plano», que es el valor por defecto, el SVG sale idéntico al de siempre.

### 0.2 · El Taller reorganizado

El inventario de controles sacó seis problemas de fondo: controles lejos de lo que tocan, duplicados,
funciones sólo con clic derecho, cuatro formas distintas de borrar, huecos de accesibilidad y rótulos en
inglés o fuera del glosario. La 0.2 los resuelve con una regla por pantalla: **qué tengo** (el lienzo),
**qué puedo hacer ahora** (una barra de acción) y **cómo lo ajusto** (un inspector).

**Componentes base** (al principio del bloque `app-source-core`, clases `.k2-*`). Traen la accesibilidad
de serie:

| Componente | Qué trae |
|---|---|
| `Segmentado` | radiogroup, flechas del teclado, 44 px en móvil |
| `Interruptor` | `role="switch"` + `aria-checked`; toda la fila es pulsable |
| `Campo` | `<label htmlFor>` y ayuda en `aria-describedby` |
| `BotonIcono` | no se pinta sin `etiqueta` (avisa en consola) |
| `MenuAcciones` | el «⋯» visible de lo que antes era sólo clic derecho |
| `MenuContextualAccesible` | foco en la primera opción, flechas y Esc |
| `Dialogo` / `DialogoBorrar` | foco atrapado, Esc, devuelve el foco; sustituyen a `confirm()` |
| `Seccion` | plegable; recuerda si estaba abierta |
| `Icono` | SVG de un trazo en vez de emojis |
| `crearPulsacionLarga` | 500 ms sin moverse abre el menú en móvil; se come el clic de después |

**El estudio.**

- **Barra de acción:** qué hay · escuchar y tempo · deshacer y rehacer visibles · «Guardar acorde» · el «⋯»
  (Mandar a Ejercicios, que ya no exige tener las flechas puestas; Vaciar el mástil; Atajos) · panel ·
  Exportar.
- **Inspector con cuatro pestañas:** Qué tocar · Vista · Instrumento · Estilo. Desde 1280 px es una
  columna que recuerda si estaba abierta (`kharo.v02.inspector`). Por debajo es un cajón, y en el
  teléfono una hoja que sube desde un dock con las mismas cuatro pestañas. La barra flotante de emojis
  ya no existe.
- **Un control, un sitio:**
  - «Las notas muestran» es un solo control en todos los modos (Dedos / Notas / Grados).
  - La leyenda se enciende sólo desde Vista.
  - «A mano» y «Barrido (sweep)» viven en Vista › Recorrido.
  - Los selectores duplicados de trastes y traste inicial se quitaron: mandan los ± del lienzo.
  - Colores de intervalos entra en Estilo.
- **Exportar** es un diálogo con el nombre de archivo editable, el tamaño y para qué sirve cada formato.
  Las funciones `exportPNG` / `exportSVG` / `exportSVGForIllustrator` son las mismas.
- **Atajos:** 1–4 cambian de modo, P escucha, [ y ] mueven la ventana, E exporta, ? muestra la lista.
  Ninguno funciona mientras se escribe.
- **Pulsación larga** en flechas, notas de Libre y tríadas. La pista del lienzo ya no promete un menú de
  nota en Acordes, que no existe.

**Canción y Ejercicios** tienen la misma forma, para aprenderla una vez:

- **Cabecera:** campos con nombre, «Escuchar» o «Practicar», qué suena (toda la canción o esta sección),
  Repetir con estado visible, deshacer y rehacer, y el «⋯» (mis canciones o ejercicios, nueva, duplicar,
  copia de seguridad).
- **Dos columnas:** el editor a la izquierda y la hoja o ficha **en vivo** a la derecha, con exportar pegado
  a ella. En el teléfono, «Editar / Ver la hoja».
- **Canción en tres pasos:** 1 Los acordes, 2 La estructura (las secciones llevan su «⋯»: duplicar, nueva
  después, mover, borrar) y 3 El ritmo base. El rasgueo se edita en su diálogo, con un nombre accesible en
  cada casilla y pulsación larga para elegir el golpe.
- **Deshacer** con `useHistorial`, que ahora acepta un respiro propio (400 ms en los documentos). Cada
  editor se monta con `key={id}`, así que el historial no cruza de una canción a otra.
- **Ejercicios gana la copia de seguridad en JSON**, que no existía aunque el aviso de «Borrar todo» la pedía.
- **Arreglado de paso:** el medidor del ancho de carácter de la letra era un `absolute` de cien caracteres
  y sacaba una barra horizontal en Canción en el teléfono. Ahora es `fixed`.

**Borrar, siempre igual:**

- **Una cosa** (sección, paso, rasgueo, canción, ejercicio, estilo, recorrido, mástil): se borra y el aviso
  trae «Deshacer».
- **En masa** (todas las canciones, todos los ejercicios, la biblioteca): `DialogoBorrar` con la cifra
  exacta, qué se pierde y qué se conserva. El foco empieza en «Cerrar».
- **Ya no queda ningún `confirm()`.**

**Lenguaje.** Fuera «Entorno Vectorial», «Cromaticidad», «Geometría Física», «Escala Pro», «High-Res»,
«Lienzo Width», «Preset de Afinación», «Tónica / Raíz», «limpiado completamente», «descargado
correctamente». «Afinación Libre» pasa a «Afinación propia», para no chocar con el modo Libre.

**Comprobado (2026-10-04):**

- Auditoría automática a 375 px en estudio (con dos pestañas del inspector abiertas), Canción y
  Ejercicios: 0 controles sin nombre, 0 por debajo de 44 px y sin scroll horizontal.
- Sin errores en consola.
- Probados de punta a punta: deshacer, menús, diálogos y la pulsación larga.
- El `localStorage` se devolvió como estaba tras las pruebas.

**Sin probar:** no he escuchado el audio (sólo comprobé que el reproductor se dispara) ni he descargado
archivos desde los diálogos nuevos. Tampoco he pasado un lector de pantalla real: sólo el árbol de
accesibilidad.

**Segunda vuelta de la 0.2 (2026-10-04), a pedido de Carlos:**

- **Mandar acordes y pasos:** todo pasa por un diálogo «¿Adónde va?» (`DialogoMandar`), con el nombre
  editable, la lista de destinos (radios nativos) y un interruptor «Ir allí después». Si no se va, el
  aviso trae «Ir allí».
  - **Acordes:** «Guardar acorde» ya no guarda a ciegas. Se elige entre «Sólo a la biblioteca» o una
    sección de cualquier canción, agrupadas por canción.
  - **Pasos:** «Mandar a Ejercicios» es ahora un botón visible en la barra de Escalas, Arpegios y Libre.
    Se elige el ejercicio abierto, otro, o uno nuevo, y ya no te saca del mástil sin preguntar.
  - **Desde la biblioteca de Canción:** el «⋯» de un acorde abre el mismo diálogo en vez de la lista de
    todas las secciones de todas las canciones en fila.
  - **Por qué las listas se calculan en el momento:** `confirmarMandar` las calcula y las fija de una vez,
    para que «Ir allí» abra la canción o el ejercicio ya con lo mandado. El «Ir allí» del aviso lee
    `ultimasRef`, porque se pulsa segundos después, cuando su cierre ya es viejo.
- **Canción plegable:** Tonalidad y notas, 1 Los acordes, 2 La estructura y 3 El ritmo base son `Seccion`
  y recuerdan si estaban abiertas. El ritmo y la tonalidad empiezan cerrados. Ejercicios igual (Los pasos,
  Nota).
- **«Página de la tonalidad» pasa a «Tonalidad y notas»**, que es lo que la hace posible.
- **Columna del editor angosta** (380–460 px). La hoja en vivo se queda con el resto; a 1440 px pasa de
  460 a 820 px.
- **Pantalla de carga de 1 s** («Afinando el Taller…», seis cuerdas que se afinan) al pasar del sitio a la
  app. El temporizador va en una ref: si cambias de sección dentro de ese segundo, la limpieza del efecto
  la dejaría puesta para siempre.
- **Raíl lateral** (`RailTaller`) con iconos y agrupado como el disco: Lado A (Acordes, Escalas,
  Arpegios, Libre) y Lado B (Canción, Ejercicios). Sustituye a las pestañas de la cabecera desde 768 px;
  en el teléfono se quedan las pestañas.
- **Comprobado:**
  - Los cuatro destinos de mandar, «Ir allí» desde el diálogo y desde el aviso, y la carga.
  - Auditoría a 375 px: sin controles sin nombre, sin scroll horizontal y todo a 44 px tras subir los
    chips de acorde de la letra.
  - Datos de Carlos devueltos como estaban.

**Tercera vuelta de la 0.2 (2026-10-04), a pedido de Carlos:**

- **Raíl en dos bandas de color.** El Lado A va en cobalto pastel y el Lado B en lima tenue, y cada banda
  cubre su sección entera (la B se estira hasta abajo). Cada banda lleva la galleta, «Lado A» o «Lado B»
  escrito y qué hay (Diagramas, Documentos). Los colores son tokens `--k2-lado-a` / `--k2-lado-b`, hechos
  con `color-mix` sobre `--k-accent` y `--k-marker`, con su versión para oscuro.
- **«Vaciar» a la vista.** En escritorio va encima del control de Posición, a la derecha del mástil. En el
  teléfono es una papelera en la esquina del lienzo, porque la fila de los ± no tiene sitio para un tercero
  (se partía en dos y le quitaba alto al mástil). Sólo sale en Acordes y Libre, se apaga si el mástil
  está vacío y se puede deshacer. Sigue también en el «⋯».
- **Guardar acorde, rehecho** (`PanelGuardarAcorde`). Ya no es un diálogo en medio de la pantalla con
  todas las secciones de todas las canciones en fila:
  - Es un panel pegado al botón; en el teléfono, una hoja que sube desde abajo.
  - Enseña la miniatura de lo que se guarda y el nombre, con el foco puesto. Enter guarda en la biblioteca.
  - «También en una canción» es opcional: un selector de canción (la abierta por defecto) y sus secciones
    como fichas. Al elegir una, el botón pasa a «Guardar y añadir a Coro». Se quita el interruptor «Ir
    allí después»: el aviso ya trae «Ir allí».
  - **Si la biblioteca ya tiene esa digitación**, lo dice. Añadirlo a una sección usa el acorde que ya
    estaba, y guardar sin sección pasa a «Guardar otra copia». Se compara instrumento y notas MIDI por
    cuerda (`chordVoicingToMidi`). La biblioteca de Carlos tenía dos F# iguales: es justo lo que esto evita.
  - `DialogoMandar` se queda para mandar pasos a Ejercicios y para el «⋯» de la biblioteca de Canción.
    La lógica de añadir un compás a una sección es ahora `anadirAcordeASeccion`, compartida por los dos.
- **Comprobado:** guardar en la biblioteca, guardar y añadir a una sección, el aviso de repetido, Esc y
  clic fuera. A 375 px: la hoja sin controles por debajo de 44 px y sin scroll horizontal. Raíl en claro
  y oscuro. Los datos de Carlos se devolvieron como estaban.

**Cuarta vuelta de la 0.2 (2026-10-04): tríadas a la vista y «dibujo vivo».**

- **El mástil del Taller sale de `App`.** El SVG del estudio pasa a `DiagramaKharo`, un componente puro,
  y se parte en dos mitades:
  - La **escena** dice qué se dibuja: datos sueltos, sin coordenadas ni colores. La hace
    `escenaDelEstudio(op)` en `App`.
  - El **estilo** lo pone el Context, así que un cambio en Estilo redibuja todo lo que usa el componente.
  - El estudio le pasa `interaccion`: manejadores y capas del gesto (zonas de toque, arrastres, el halo
    del audio). Fuera del estudio no se pasa y el dibujo es sólo obra.
  - Ayudantes puros: `colorDeGrado` (era `getIntervalColor`), `alAireDeDigitacion`,
    `acordeDeDigitacion` y `medidaDeEscena`.
  - `renderNotePath`, `renderEnvolventesDeTriadas` y `MiniFretboard` se borraron; su código vive en el
    componente.
- **La obra no cambió.** Un banco de 17 escenarios (Acordes en sus tres modos, cejilla con números a la
  derecha, Escalas con flechas, sweep y tríadas, Arpegios con tapping, Libre, madera, bajo de 4 cuerdas
  con 12 trastes) saca el SHA-256 del `outerHTML` de `#chord-diagram-svg`. Antes y después de la
  mudanza dio lo mismo en los 17.
- **Cambio a propósito en la obra:** con una tríada señalada, las notas que no son suyas pasan de 0,15
  a 0,3 de opacidad (`OPACIDAD_FUERA_DE_TRIADA`). Con 0,15 casi no se veían. Comprobado: es la única
  diferencia del SVG.
- **Ejercicios con el dibujo del Taller.**
  - Cada paso nuevo guarda su `escena` (`crearPasoDelMastil`, `pasoDeTriada`).
  - `escenaDePaso` pone el título y las flechas desde `paso.path`, que sigue siendo lo que suena.
  - Los pasos viejos se dibujan con `escenaDePasoLegado`: geometría y colores por grado del Taller, pero
    sólo con sus notas.
  - `ExerciseFretboard` queda como último recurso, si una escena no se puede montar.
  - `Song.normalizeExercise` tira las claves que no conoce. `normalizarEjercicio` (en la 0.2) le devuelve
    a cada paso su escena saneada (`sanearEscena`). `song-core.js` no se tocó.
  - **Ojo:** si se abre Prime o la 0.1 y se guarda un ejercicio, las escenas se pierden y esos pasos
    vuelven al dibujo de respaldo.
- **Tríada con su escala.** Un paso de tríada lleva toda la escala de la ventana. Lo que no es de la
  tríada va a 0,3, con la mancha de su color y sin flechas; suena sólo la tríada. «Mandar a Ejercicios»
  de la barra, con una tríada fijada, manda esa tríada. Arreglado de paso: el color de la mancha usaba
  `grado - 1` y el estudio usa el índice entre las visibles.
- **Canción con el dibujo del Taller.**
  - `escenaDeAcorde` se calcula al vuelo desde la digitación guardada. Dedos, notas y grados siguen
    funcionando, ahora con los colores por grado del Taller. En notas, el color sale de la fundamental
    reconocida (`fundamentalDe`, con la caché de antes); si no se reconoce, se queda el color base.
  - Las tarjetas de la biblioteca pasan de 108 a 168 px para que el diagrama se lea.
  - En la hoja, el diccionario va a 128 px y el alto de la fila se mide con la geometría real.
  - La miniatura del panel Guardar acorde también usa el componente.
  - Cada diagrama lleva su propio id de degradado de madera: con dos en la página y el mismo id, Chrome
    pinta el primero que encuentra.
- **Botón Tríadas** encima de Posición en Escalas (`botonTriadas`, misma pieza que Vaciar, icono
  `triadas`). En el teléfono va en la esquina del lienzo, con su nombre.
  - Al encenderlo queda fijada la I.
  - La tira pasa a «Elige tríada»: un radiogroup con «Todas» delante. «Todas» da exactamente el dibujo
    de antes, comprobado por hash. El «⋯» pasa a «Mandar…».
  - El interruptor del inspector hace lo mismo (`activarTriadas`).
  - En el teléfono las fichas miden 44 px.
- **Comprobado:**
  - Los 17 hashes.
  - Mandar una tríada y una escala a Ejercicios, recargar (la escena sigue), un paso viejo, la madera
    redibujando fichas y hoja en vivo, las tarjetas de Canción en modo notas.
  - A 375 px, sin scroll lateral.
  - «Practicar» arranca y para, y la consola sólo da los avisos de Babel de siempre.
  - Datos de Carlos devueltos como estaban.
  - **Sin probar:** exportar a PNG o PDF las hojas nuevas, y escuchar el audio.

**Menú «Mandar…» de una tríada, simplificado (2026-10-04, ya en Prime).** Queda «Abrir en Arpegios» y
dos formas de mandarla:
- **Toda la tríada (N notas):** todas sus notas en la ventana.
- **Cada posición, un paso (N):** una ficha por cada forma que cabe en la mano. Sólo sale si hay más de
  una.

Se quitaron las entradas sueltas «Sólo la agrupación (trastes X-Y)» y «Quitar la selección», que ya hace
la ficha «Todas». Las dos opciones llevan la escala alrededor en cada ficha.

## Prueba 0.3: Biblioteca y Tablaturas (2026-10-04)

> **Es una prueba.** Vive en `v03.html` + `tab-core.js` + `ui-v03.css`. Prime (`index.html`, `ui.css`,
> `theme.css`, `render-core.js`, `song-core.js`) no se tocó. Se cambia de una a otra con el selector
> **Prime · 0.3** de la cabecera de la 0.3.
>
> **Si se aprueba:** `v03.html` pasa a ser `index.html` (sin el selector), `ui-v03.css` se pega al final de
> `ui.css` y `tab-core.js` se queda como está.

Carlos pidió dos cosas:

- **Una Biblioteca:** un botón abajo a la izquierda del raíl que lleve a una vista grande donde ver y
  gestionar canciones, ejercicios y acordes.
- **Una sección «Tablaturas» en el Lado B:** pentagrama y TAB a la vez, con las técnicas de guitarra
  como anotación y la púa con la notación internacional, inspirada en MuseScore pero sencilla.

Decidió:

- hacerlo como prueba aparte
- dibujar la notación con SVG propio, no con VexFlow
- que la tablatura lleve ritmo de verdad
- que la Biblioteca tenga lo básico, imprimir o PDF y organizar
- **dejar fuera, por ahora, compartir**

### Datos nuevos

| Clave | Qué guarda |
|---|---|
| `kharo.tabs.v1` | Las tablaturas (lista, como canciones y ejercicios) |
| `kharo.biblioteca.v1` | Por id: `{ fijado, etiquetas[], modificado, abierto }` |
| `kharo.v03.biblioteca.vista` | Filtro de tipo, orden y fichas o lista. Es una comodidad de quien mira |

Canciones y ejercicios **no ganan campos**. `normalizeSong` y `normalizeExercise` tiran lo que no conocen,
así que guardar desde Prime borraría las etiquetas. Por eso lo de la Biblioteca va aparte, por id.

**Fecha de una pieza:**

- Es `modificado` si la 0.3 la ha visto cambiar.
- Si no, sale del propio id: `newId` lleva dentro `Date.now()` en base 36, así que es su fecha de creación.

### La Biblioteca

- **Botón al pie del raíl**, dentro de la banda del Lado B (`.k3-rail__pie`, `margin-top:auto`). En el teléfono
  no hay raíl: es un icono en la cabecera. Canción, Ejercicios y Tablaturas tienen «Ver en la Biblioteca» en su «⋯».
- **Cabecera:**
  - buscador (`/` lo enfoca)
  - orden: recientes, nombre o tipo
  - vista en fichas o en lista
  - filtros por tipo con su cifra, «Fijados» y una ficha por etiqueta
- **«Seguir con…»:** las cuatro últimas piezas abiertas, cuando no hay filtro.
- **Miniaturas reales:**
  - acorde: `DiagramaKharo`
  - ejercicio: el primer paso con el número de los demás
  - tablatura: su primer sistema
  - canción: sus acordes como fichas
- **Cada pieza:**
  - abrir (un acorde se abre en el mástil con `loadPreset`)
  - **renombrar en el sitio** (F2). Era deuda de §23
  - duplicar
  - fijar
  - etiquetas
  - PDF
  - imprimir
  - copia JSON
  - borrar con «Deshacer»
  - un acorde dice en cuántas canciones está y, desde «Dónde se usa», abre cada una
- **Varias a la vez:**
  - casillas, Mayús+clic para un tramo y Ctrl+A para todo lo visible
  - la barra trae PDF, imprimir, etiquetar, fijar y borrar
  - borrar varias usa `DialogoBorrar` con la cuenta por tipo y **un solo «Deshacer»** que lo devuelve todo,
    también los compases que se quitaron al borrar acordes
- **Imprimir o pasar a PDF sin abrir nada:**
  - `Imprenta` monta fuera de la pantalla (en un portal colgado de `<body>`) las hojas de lo elegido:
    `SongSheet`, `ExerciseSheet`, `TabSheet` y la nueva `HojaDeAcordes` (rejilla A4 de 4×4).
  - `paginasDeLaHoja(raiz)` las recoge y `exportSheetPDF(paginas, nombre)` hace el PDF. Las dos funciones
    ganaron un argumento opcional y sin él hacen lo de antes.
  - Imprimir usa la clase `k3-imprimiendo` y un `@media print` que sólo deja la imprenta, una página A4 por hoja.
  - Se espera con un temporizador y no con `requestAnimationFrame`, porque con la pestaña en segundo plano
    los fotogramas se paran y el PDF no llegaba nunca.

### Tablaturas

**Modelo (`tab-core.js`).** Una tablatura lleva:

- título, artista, nota
- instrumento, afinación, cejilla
- tempo, compás y armadura (en quintas)
- `compases[{ eventos[] }]`

Cada evento lleva:

- figura, puntillo y tresillo
- `notas[{ s, f, tec }]` (vacío es un silencio)
- púa, P.M., let ring, sweep y texto encima

Las técnicas de cada nota son: ligado H o P, tap, slide (hasta la siguiente, de entrada o de salida), bend
(bend, bend y suelta, suelta, prebend, de ½ a 2 tonos), vibrato, armónico natural o artificial, muerta,
fantasma y acento.

**El tiempo va en ticks, con la negra en 48.** Es el menor número que deja enteros la fusa, su puntillo y los
tresillos. Con decimales, un compás de tresillos daba «incompleto» por 0,0001.

**Altura:**

- MIDI = afinación de la cuerda + traste + cejilla.
- Se nombra con sostenidos, o con bemoles si la armadura los lleva.
- Las alteraciones duran el compás.
- Guitarra y bajo se escriben en clave de sol y de fa con el 8 debajo (suenan una octava más grave). El
  ukelele, en sol sin 8.

**Maquetación pura:**

- `maquetar` reparte compases en sistemas y sistemas en páginas A4, y devuelve las coordenadas.
- El ancho de cada evento crece con la raíz de su duración. Los sistemas se justifican, menos el último si está
  muy vacío, como en MuseScore.
- La armadura se repite en cada sistema y el compás sólo en el primero.
- El editor usa las mismas coordenadas para saber dónde has hecho clic.

**El dibujo (`TabSheet` / `SistemaTab`):**

- **Pentagrama:** cabezas (huecas en redonda y blanca), segundas desplazadas, plicas, corchetes, barras por
  pulso con secundarias y ganchos, puntillos, «3» de tresillo, líneas adicionales, alteraciones y silencios.
- **Glifos:** trazos SVG en `GLIFOS` (claves, silencio de negra, ♯ ♭ ♮, púas). No hay fuente musical, así que
  el SVG, el PNG y el PDF salen iguales en cualquier ordenador.
- **TAB:** traste con fondo de papel, `x` en la muerta, `(n)` en la fantasma y `<n>` en el armónico.
- **Técnicas:**
  - H y P van en arco con la letra y con su ligadura en el pentagrama.
  - El slide es una diagonal.
  - El bend es una flecha curva con ½, full o 1½. Al soltarlo baja en discontinua.
  - T, A.H. y el vibrato ondulado van en la banda entre los dos.
  - P.M., let ring y sweep (con flecha) van en tramos discontinuos sobre los eventos seguidos que los llevan.
  - La púa va encima del pentagrama: ⊓ abajo, V arriba.
  - El acento va del lado de la cabeza, el contrario a la plica.
- **Sólo en pantalla:** el cursor, lo que suena y la raya de «le faltan / le sobran tiempos» llevan
  `data-no-exportar`. `svgDeLaPagina` los quita del archivo.

**El editor (`TabEditor`), al estilo de la entrada TAB de MuseScore.** Se escribe sobre la hoja:

| Tecla | Qué hace |
|---|---|
| `0–9` | El traste. Dos cifras en menos de 0,7 s hacen 10–24 |
| ↑ ↓ | Cambia de cuerda |
| ← → y Espacio | Se mueve. En un hueco, → deja un silencio |
| Mayús+1…6 | La figura |
| `.` | Puntillo |
| `R` | Silencio |
| Supr | Borra |
| H P T S B V X G A N | Las técnicas de la nota |
| M L | P.M. y let ring |
| [ ] | La púa |
| Ctrl+Z | Deshacer |

- Varias notas en el mismo evento forman un acorde.
- Si el compás se llena, la nota va al siguiente.
- La paleta hace lo mismo con botones y devuelve el foco a la hoja.
- Hay un teclado de trastes 0–24 para el teléfono y el ratón.
- La barra de estado dice compás, tiempo, cuerda, traste y nota, y avisa si al compás le faltan o le sobran
  tiempos.

**Suena** con el mismo sintetizador:

- `playNote` ganó un argumento opcional `curva` (`[[segundos, semitonos]]`). Sin él suena como antes.
- El bend, el slide y el vibrato doblan el tono.
- La muerta es `playPercussion("seco")`.
- El P.M. corta la nota, el let ring la deja sonar y el ligado ataca más suave.
- Se puede escuchar desde el compás del cursor y en bucle.

**Desde otros sitios:**

- «Mandar el recorrido» (Escalas, Arpegios, Libre) ofrece también una tablatura abierta, otra o una nueva.
- En Ejercicios, «Pasar a una tablatura» funciona con un paso o con el ejercicio entero.
- En los dos casos, una nota por corchea, el tap como T y el sweep como su marca.

### Comprobado (2026-10-04)

- **La obra no cambia:** el SHA-256 de `#chord-diagram-svg` es el mismo en Prime y en la 0.3 con el mismo
  estado guardado.
- **Escribir con el teclado:** H, el traste 12 de dos cifras, bend, vibrato, púa, silencio, P.M. y cambio de
  figura.
- **Una tablatura de 17 compases con todas las técnicas:**
  - sale en 2 páginas
  - la armadura de 2♭ se repite en cada sistema
  - las alteraciones son correctas
  - barras de semicorchea, tresillo, acorde de 6 notas, sweep y let ring en su sitio
- **Reproducir:** se ilumina lo que suena, y para.
- **Exportar SVG:** 2 páginas sin el cursor dentro.
- **Biblioteca:**
  - renombrar con F2
  - fijar (sube arriba)
  - duplicar
  - borrar y deshacer
  - Mayús+clic para elegir un tramo
  - etiquetar 4 piezas (sale el filtro #etiqueta)
  - PDF de 6 piezas: 7 páginas
- **A 375 px:**
  - sin scroll horizontal en Biblioteca ni en Tablaturas
  - en la Biblioteca, todo a 44 px
  - el «0.3» del selector de versión mide 40 px, como el de Prime
- **Consola:** sólo el aviso de Babel de siempre.
- **Datos:** el `localStorage` de Carlos se devolvió como estaba.

### El sonido: guitarras grabadas (2026-10-04, segunda vuelta)

Antes de elegir, Carlos comparó tres motores en `prueba-sonido.html`, una página aparte: el sintetizador de
Kharo, las muestras de tonejs-instruments y WebAudioFont. (Ojo: la autoría y las licencias de las
muestras se corrigieron el 2026-10-06, ver «0.8».) Eligió **tonejs-instruments con Tone.js**.

**Los sonidos son de Nicholaus Brosowsky** ([tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)),
con licencia **CC BY 3.0**, así que hay que citarlo. La cita está en tres sitios:

- debajo de cada selector de sonido (`CreditoSonidos`)
- en el pie del sitio
- en `vendor/sonidos/LEEME.md`, junto con la licencia MIT de su código

**Archivos nuevos en `vendor/`.** Se copiaron para que la app siga funcionando sin conexión:

- `vendor/tone.js`: Tone.js 14.8.49, de cdnjs, 349 KB.
- `vendor/sonidos/`: 99 MP3 sin cambios, 16 MB.

| Carpeta | Instrumento | Archivos | Peso |
|---|---|---|---|
| `guitar-acoustic/` | Acústica | 37 | 7,0 MB |
| `bass-electric/` | Bajo eléctrico | 16 | 4,9 MB |
| `guitar-nylon/` | Nylon | 29 | 2,4 MB |
| `guitar-electric/` | Eléctrica | 17 | 1,8 MB |

**Cómo suena.**

- `InstrumentSynth.playNote` prueba primero `tocarMuestra`: elige la grabación más cercana a la nota y la
  acelera o frena hasta ella con `Tone.ToneBufferSource`.
- La `curva` de bends, slides y vibrato rampea esa misma velocidad, así que la tablatura suena con sus
  técnicas.
- Tone.js usa el **mismo** `AudioContext` que el sintetizador (`Tone.setContext`).
- Cada juego se carga con `Tone.ToneAudioBuffers` la primera vez que hace falta: al primer gesto, o al cambiar
  de instrumento o de sonido.
- Mientras no ha cargado, o si falta `vendor/tone.js`, suena el sintetizador de siempre. La app nunca se
  queda muda.
- La percusión del rasgueo y la nota muerta siguen sintetizadas.

**Selector «Sonido».** Está en el inspector (pestaña Instrumento) y en Tablaturas (Instrumento y compás), y
se recuerda en `kharo.v03.timbre`. Las opciones son:

- **Según el instrumento**, que es la opción por defecto:

  | Instrumento | Suena con |
  |---|---|
  | Ukelele | Nylon |
  | Bajos | Bajo eléctrico |
  | Guitarra de 6 cuerdas | Acústica |
  | Guitarras de 7 y 8 cuerdas | Eléctrica |

- Cualquiera de los cuatro juegos, fijo.
- El sintetizador de Kharo.

**Comprobado:**

- Las 37 muestras de la acústica cargan desde `vendor/`.
- Tone.js usa el contexto del sintetizador.
- Escribir un traste en Tablaturas y reproducir con un bend arranca `ToneBufferSource` sin errores.
- La cita sale en el selector y en el pie.

**Sin probar:** no lo he escuchado; eso queda para Carlos.

**Ojo:** el sonido es parte de la app, no de la obra exportada. Lo que se descarga no cambia.

### Retoques de la portada (2026-10-04, tercera vuelta)

- **El mástil de la portada pasa a vertical**, como los diagramas que hace el Taller. Tiene la cejuela arriba,
  hasta el traste 5 y la grave a la izquierda. Encima va el nombre del acorde y una ○ o una × por cuerda;
  abajo, la nota de cada cuerda. Se toca igual, pasando el dedo de lado a lado, y las cuerdas vibran en
  horizontal.
- **Suena siempre con la guitarra acústica grabada**, con independencia del selector de sonido. Si las
  muestras aún no han llegado, espera a que lleguen en vez de sonar al sintetizador. Para eso,
  `playNote` acepta un sexto argumento, `juego`, y el sintetizador gana `muestrasListas` y `esperarMuestras`.
- **La pantalla de carga también sale al volver del Taller a la portada** con el logo. Dice «Volviendo a la
  portada…»; al entrar sigue diciendo «Afinando el Taller…».
- **Comprobado:** el acorde G dibuja 3 dedos y sus 6 notas arrancan con muestras. La carga sale al pulsar
  el logo y se va sola.

### Cuarta vuelta (2026-10-04)

- **Portada equilibrada.**
  - El diagrama es más pequeño (300 px).
  - Los acordes van en una columna a su derecha y «Rasguear …» debajo de ellos.
  - Se quitó «Elige un acorde y pasa el dedo por las cuerdas».
  - Por debajo de 600 px no cabe la columna: los acordes bajan en filas bajo el diagrama.
- **La fila de acordes de Canción no se podía deslizar.** `.k-strip` escondía la barra y la fila no tenía
  ancho propio. Ahora es `TiraDeslizable`:
  - barra fina visible
  - flechas ‹ › cuando hay más a un lado
  - la rueda del ratón desliza en horizontal
  - se puede enfocar con el teclado

  Comprobado con 16 acordes: 2.808 px de contenido en 426 px de ancho, con la flecha a la vista.
- **El rasgueo del editor ya no sigue sonando.** Se para:
  - al cerrar «Editar rasgueo» (Cerrar, Listo o Esc)
  - al salir de Canción
  - al empezar cualquier otra cosa
- **Una sola cosa suena a la vez.** Canción, ejercicio, tablatura y rasgueo paran a los demás al empezar.
- **Ventana «Sonando», abajo a la izquierda** (`Reproduciendo`).
  - Dice exactamente qué suena: «Rasgueo «Mi rasgueo» en bucle», la canción con su sección, el ejercicio o
    la tablatura.
  - Tiene **Pausar / Seguir**, que suspende el reloj de audio: todo se congela y sigue desde el mismo sitio.
  - Tiene **Parar todo**.
  - Con la pausa puesta, una nota suelta no despierta el audio (`synthInstance.pausado`).
- **Tablaturas sonaba con el sintetizador** porque las grabaciones aún estaban cargando cuando sonaba la
  primera nota. Ahora:
  - las muestras se cargan al abrir la página, sin esperar a un gesto (Tone decodifica con su contexto y el
    AudioBuffer sirve en el de la app)
  - una nota suelta espera a que lleguen
  - Canción, Ejercicios y Tablaturas esperan a las muestras antes de arrancar

  Comprobado: la primera nota y la reproducción usan sólo `ToneBufferSource`, con 0 osciladores.
- **Datos:** los de Carlos se devolvieron como estaban.

### «Cómo se hizo» en Sobre el proyecto (2026-10-04)

- **Cuarto bloque de `NOTAS_FUNDA`**, a pedido de Carlos. Cuenta que Kharo se hizo en colaboración con IA:
  - la IA escribió el código
  - las decisiones las tomó él, como diseñador y como guitarrista
  - eso tiene valor: no es un prompt de 20 palabras
- **Está escrito con `voz-kharo`:**
  - en primera persona y firmado («— Carlos, guitarrista y diseñador de Kharo»), como pide la guía para contar el
    origen
  - con un solo remate: «La IA puso las manos en el teclado. Las de la guitarra fueron mías.»
- **Las bandas aceptan ahora un campo opcional `firma`** (`.k3-nota__firma`).

### Sin probar

- No he escuchado el audio (sólo comprobé que se dispara y se ilumina).
- No he abierto el diálogo de impresión real ni he descargado archivos de verdad: las descargas se
  interceptaron.
- No he pasado un lector de pantalla.
- No he probado el bajo de 4 cuerdas ni el ukelele en la hoja.

### Pendiente o a decidir

- **En el teléfono la hoja A4 se ve pequeña** para tocar una cuerda concreta. Se escribe mejor con el teclado
  de trastes y las flechas de la paleta. Una vista «sólo TAB» a lo ancho sería el siguiente paso.
- **No hay ligaduras de prolongación** (una nota que pasa de un compás a otro).
- **Tampoco hay copiar y pegar** compases, sólo duplicar.
- **Compartir** quedó fuera de esta vuelta, a pedido de Carlos.

## 0.7: la barra del Taller (2026-10-06)

El raíl de dos bandas (Lado A / Lado B, 92 px con icono y nombre) pasa a ser una **barra de
iconos de 48 px**, como la caja de herramientas de Photoshop. Salió de varias rondas de
wireframes (`wireframes-menu-lateral.html`, `wireframes-sin-rail.html`, `wireframes-lomo.html`):
Carlos eligió la barra de iconos y la recortó hasta lo esencial.

- **Un color por sección**: Acordes #7D96FF, Escalas #22C3D6, Arpegios #B57CF5, Libre #F06AA8,
  Canción #ACEC00, Ejercicios #F2C230, Tablaturas #FF9440, Biblioteca #C2B9A8. Viven en
  `RAIL_TALLER` y llegan al CSS como `--k7-color`.
- **Al pasar el ratón** el icono se tiñe de su color al 18 % y, tras un cuarto de segundo, sale una
  barrita con el nombre en Fjalla, nada más (sin atajo, sin «último», sin lado). También sale con
  el foco del teclado.
- **La activa** es un cuadrado lleno de su color (sin esquinas redondas) con una raya del mismo
  color pegada al borde.
- **Sin «A» ni «B»**: una raya fina separa los diagramas de los documentos; la Biblioteca va al pie.
- Los iconos son propios de la barra (`ICONOS_RAIL`), los del prototipo aprobado; el resto de la
  app sigue con `ICONOS`.
- La barra ya no tiene `overflow`: la barrita del nombre tiene que salir por encima del lienzo.
  Con ocho botones cabe en cualquier alto de escritorio.
- En el teléfono no cambia nada: siguen las pestañas.

Código: `RailTaller` en `index.html`, estilos `.k7-barra*` en `ui.css` (sustituyen a
`.k2-rail__*`); se quitó `.k3-rail__pie` de `ui-v03.css`. También se fueron las variables
`--k2-lado-*`, que sólo usaba el raíl.

**Abierto:** varios colores de sección se parecen a los del EQ de grados de la pedalera.

## 0.8: el Taller reordenado (2026-10-06)

Cambios de organización pedidos por Carlos, directos sobre Prime:

- **La mesa se ciñe al diagrama.** El papel milimetrado ya no ocupa todo el ancho: mide lo que
  miden Trastes + diagrama + Posición (y la leyenda de grados en Escalas/Arpegios) y se centra.
  Truco: el hueco (`.k8-hueco`) es un contenedor de tamaño y el SVG toma su alto en `cqh`
  (`100cqh - 78px`). Con un alto en % el navegador medía la mesa con el tamaño natural del
  dibujo (340 px) y los mandos se salían por los lados.
- **Deshacer y rehacer** van arriba de la mesa (`.k8-mesa__arriba`), no en una barra aparte.
- **La barra de acción desapareció.** Guardar acorde (o Mandar a Ejercicios) y la Pedalera suben
  a la cabecera, con este orden: Guardar · modo claro/oscuro · Pedalera.
- **«Panel» se llama «Pedalera».** Se probó que saliera de arriba abajo, tapando la cabecera, y
  no convenció (segunda vuelta, abajo): sale debajo de la franja de KHARO, como antes.
- El título **«Pedalera»** mide 34 px, como el nombre del acorde en el diagrama.
- **Abajo a la izquierda**, en la fila del sonido: el botón de atajos, ahora un «?», y un botón
  **Tutorial** que por ahora sólo avisa «El tutorial llega pronto.» (la lógica es otra etapa).
  Los dos sólo desde 768 px.

**Segunda vuelta (mismo día):**

- La pedalera vuelve a salir **debajo de la cabecera** y ahora **entra con animación**: se desliza
  desde la derecha en escritorio y tableta, y sube desde abajo en el teléfono; el velo aparece
  fundido. Sin animación con «movimiento reducido». (Al cerrar desaparece sin animación.)
- **Tutorial va dentro del «?»**: el botón despliega hacia arriba un menú con «Atajos de teclado»
  y «Tutorial». Se cierra con Esc o tocando fuera.
- **Arreglo:** en Escalas y Arpegios, cerrar la leyenda de grados con su × no tenía vuelta desde
  la mesa. Ahora hay un botón **Colores** abajo a la izquierda de la mesa que la abre y la cierra
  (`showLegend`). Como la leyenda sólo existe desde 1280 px, el botón también; a ese ancho el
  diagrama descuenta la fila de abajo (`100cqh - 122px`).
- **La cita de los sonidos estaba incompleta.** Decía «grabaciones de Nicholaus Brosowsky», pero él
  reunió y editó muestras de tres fuentes (su `sample-source-info.txt`, comprobado en la web):
  University of Iowa EMS (acústica, uso libre), **quartertone en Freesound (nylon, CC BY 4.0,
  que obliga a citarlo)** y Karoryfer Samples (eléctrica y bajo, CC0). `CreditoSonidos` ahora
  nombra a los cuatro, con enlace a cada fuente y a cada licencia CC BY, y dice que las muestras
  están editadas. Mismo cambio en `vendor/sonidos/LEEME.md`.

**Tercera vuelta (mismo día):**

- El **«?»** se pega al borde de abajo: esquina inferior izquierda de la zona del lienzo, a la
  altura de la línea de pista, ya no a media altura junto a la píldora.
- Bajo el título «Pedalera», un subtítulo: **«Configuración del Lado A»**. Al pasar el ratón por el
  título sale **al instante** (al principio esperaba 3 s): **«Un pedal por ajuste: afinación,
  etiquetas, colores y estilo de la hoja.»** (tooltip escrito con la skill voz-kharo; se va al
  quitar el ratón). En el teléfono no salen: ahí el título está oculto.

Código: JSX en `index.html` (cabecera, estudio); estilos al final de `ui-v06.css` (bloque 0.8).
Se añadió el icono `ayuda` a `ICONOS`.


## 0.9: la lupa sobre el mástil (2026-10-06)

Los mandos de **Trastes** y **Posición** (dos `FretStepper`, uno a cada lado del diagrama) se
sustituyen por un solo mando, `VentanaMastil` (`ui-v09.css`). Elegida por Carlos entre cuatro
propuestas (`wireframes-trastes-posicion.html`, opción A).

- **Por qué:** los dos mandos describían un solo dato —qué trozo del mástil se ve— partido en
  dos, contaban de uno en uno (del 1 al 12 eran 11 clics) y no decían dónde estás en el mástil.
- **Qué es:** un mástil entero de 24 trastes con sus incrustaciones (3, 5, 7, 9, 12 doble…) y una
  ventana lima encima, que es lo que se ve en la hoja. Va a la derecha del diagrama; Vaciar y
  Tríadas quedan solos en su columna, arriba.
- **Gestos:** arrastrar la ventana = posición; estirar sus asas = cuántos trastes (el asa de
  arriba deja quieto el último traste); clic fuera de la ventana = saltar ahí, centrada; doble
  clic = mástil entero (1–24) y otra vez para volver.
- **Teclado** (con el foco en la ventana, `role="slider"`): ↑↓ mueven, Mayús+↑↓ estiran, Inicio
  = traste 1, Fin = hasta el 24, Intro = mástil entero. Los atajos `[` y `]` siguen igual.
- **El suelo de las notas se respeta:** la ventana no encoge por debajo de
  `trasteMasAltoDibujado()`; el aviso sale una vez por gesto, no en cada píxel del arrastre.
- **Teléfono:** la lupa se tumba y va debajo del diagrama, en el sitio de la fila de los ±.
- La ventana arrastrada no pasa del traste 24. Si ya viene pasada (cargada así o con `]`), el
  mini-mástil crece para enseñarla entera.
- `FretStepper` se queda en el código sin usarse, por si hay que volver atrás.
- **Tríadas baja junto a Colores** (pedido de Carlos, mismo día): sale de la columna de Vaciar y
  va en la fila de abajo de la mesa, con el mismo aspecto que Colores (activo = tinte cobalto).
  Como Colores sólo existe desde 1280 px, en Escalas esa fila aparece ya desde 768 px con sólo
  Tríadas, y el diagrama descuenta su alto (`.k9-mesa--triadas`). En el teléfono sigue en la
  esquina del lienzo.
- **Tríadas en lima** (`--k-marker` con tinta oscura), en la mesa y en la esquina del teléfono:
  es lo que más tiene que llamar la atención. Encendidas llevan un aro de tinta.
- **Vaciar sube junto a deshacer y rehacer** (`.k9-vaciar`, separado por una raya fina), en
  todos los anchos. Sale la columna de la derecha de la lupa y la esquina del teléfono; el
  ayudante `botonVaciar` se borró. Sigue saliendo sólo en los modos editables, como antes.
- **En modo oscuro el mini-mástil es de maple:** diapasón claro con veta, trastes de alpaca,
  cejuela de hueso y puntos negros. La ventana lima lleva un filo de tinta para no perderse en
  la madera. En claro no cambia.

**Segunda vuelta de 0.9 (mismo día):**

- **El mini-mástil tiene proporciones reales.** Los trastes siguen el temperamento igual (el
  traste f a `1 − 2^(−f/12)` del largo): cada uno es un 5,6 % más corto que el anterior y el 12
  queda a dos tercios del recorrido hasta el 24. El grosor sale del largo (largo ÷ 9,7, medido
  con un `ResizeObserver`) y la madera es un trapecio que se abre de 43 a 57 mm, como un
  diapasón. El arrastre cuenta en trastes, no en píxeles.
- **Los trastes van de borde a borde.** Antes quedaban 5 px por lado y el mástil parecía más
  ancho que los trastes. Ahora la madera (`.k9-lupa__madera`) se recorta con `clip-path` y todo
  lo de dentro se recorta con ella; la ventana va fuera del recorte.
- **Pedal «Escala» / «Arpegio»**, el primero de la pedalera en esos dos modos (y en el dock del
  teléfono). Desde 0.6 no había forma de cambiar la escala ni el arpegio. Lleva una pantalla
  de tónica, otra del tipo (con el nombre corto: «Maj7», «Dórico») y debajo todas las opciones
  en fichas. Usa `setScaleType`/`setArpeggioType` y sus raíces, como el antiguo «Qué tocar».
  La agrupación de arpegios (Mapa · Por cuerdas · Posiciones) sigue sin control: pendiente.
- **El afinador sólo deja escribir notas con la afinación «Propia».** Con un preset las seis
  letras quedan de sólo lectura (`readOnly`, atenuadas, con un title que lo explica). Antes
  teclear una nota rompía el preset en silencio.
- «Guitarra clásica (nylon)» pasa a **«Guitarra clásica»** en el selector de sonido. La cita
  de las grabaciones mantiene «nylon» porque la licencia CC BY obliga a describir la fuente.
- **Un mini-mástil por instrumento** (`MASTILES`, junto a `VentanaMastil`). Cada uno con las
  medidas de un modelo típico: escala, ancho en la cejuela y en el último traste, calibre de
  cada cuerda y número de trastes. De ahí salen la proporción largo/ancho, cuánto se estrecha
  hacia la cejuela (`--k9-cono`), cuántas cuerdas se dibujan y su grosor.

  | Instrumento | Trastes | Escala | Cejuela → final | Largo/ancho |
  |---|---|---|---|---|
  | Ukelele (concierto, nailon) | 18 | 381 mm | 35 → 44 mm | ≈ 6 |
  | Bajo 4 (tipo Jazz) | 20 | 864 mm | 38 → 60 mm | ≈ 12 |
  | Bajo 5 | 24 | 864 mm | 45 → 72 mm | ≈ 11 |
  | Guitarra 6 (tipo Strat) | 22 | 648 mm | 43 → 56 mm | ≈ 9,4 |
  | Guitarra 7 | 24 | 648 mm | 48 → 64 mm | ≈ 8,7 |
  | Guitarra 8 | 24 | 686 mm | 55 → 73 mm | ≈ 8 |

  El ukelele lleva las incrustaciones de ukelele (5, 7, 10, 12, 15) y cuerdas de nailon (más
  claras y menos marcadas); la G, fina por ser reentrante. La ventana ya no pasa del último
  traste del instrumento, y «mástil entero» y Fin van hasta él. Si la ventana viene pasada (de
  otro instrumento, o con `]`), el mini-mástil crece para enseñarla, como antes con el 24.
  El diagrama grande sigue permitiendo hasta el 24 en todos.

**Tercera vuelta de 0.9 (mismo día):**

- **Libre sin menú de nota.** Tocar una nota la quita y tocar una casilla la pone, como en
  Acordes. El clic derecho (y la pulsación larga) ya no abre el menú «Escucharla · Añadir al
  recorrido · Quitar la nota». Con el recorrido a mano activo, el clic sigue siendo para el
  recorrido. El menú (`menuNota`) queda en el código sin nada que lo abra.
- **Pedal Escala/Arpegio:** fuera las fichas. La tónica es una **perilla con las doce notas en
  círculo** (`PerillaTonica`): se gira arrastrando, con la rueda o con las flechas, o se toca la
  nota. El tipo se recorre con ◀ ▶, y el **clic derecho sobre su pantalla despliega la lista
  completa hacia abajo** (`menuTipoTocar`, con `MenuContextualAccesible`).
- **Rótulos al pasar el ratón** (`Pantalla rotuloAlPasar`): bajo las pantallas del Afinador
  (Afinación, Instrumento, Sonido) y del Ampli (Canal, Letra) ya no hay texto; sale como globo
  tras un segundo con el ratón encima o con el foco dentro.
- **Ampli más ligero:** «Guardar en este canal», «Vaciar» y «Fábrica» pasan a tres iconos
  (guardar, papelera, volver) con su explicación en el title, y las perillas Notas y Línea
  dejan de escribir su valor en px (sale al pasar el ratón por el rótulo).

## 0.10: el metrónomo (2026-10-06)

Pedido por Carlos: un metrónomo con su botón **encima de Biblioteca** en la barra del Taller, que
sea una sección propia y que se pueda **desacoplar a una ventana externa**. Tempo independiente
del de «Reproducir». Código en el bloque nuevo `app-source-metronomo` (compilado entre
Biblioteca y el estudio) y estilos en `ui-v10.css`.

**Qué hace**

- **Tempo** de 30 a 300 bpm: número grande editable, − / + (Mayús: ±10), perilla y **Tap**
  (media de los últimos toques; se reinicia tras 2 s). Debajo, el nombre italiano del tempo.
- **Compás** 1–16 sobre 4 u 8, con atajos (2/4 … 12/8). En los de 8, la **agrupación**
  (6/8 = 3+3, 7/8 = 2+2+3 · 3+2+2 · 2+3+2…) decide los acentos secundarios.
- **Tiempos:** un disco por tiempo. Clic: Fuerte → Normal → Suave → Silencio. Clic derecho:
  menú con el estado y una **figura propia para ese tiempo**.
- **Figuras:** negra, corcheas, tresillo, semicorcheas, corchea + 2 semis, 2 semis + corchea,
  galope, swing, contratiempo, quintillo y seisillo, dibujadas en SVG (`FiguraMetro`).
- **Sonido:** Madera, Clic, Cencerro, Electrónico y Guitarra, sintetizados (`golpeMetro`). Perillas
  de volumen general, acento, tiempo y subdivisión. El acento sube de tono además de volumen.
- **Práctica:** entrenador de tempo (de X a Y, ±Z cada N compases), compases mudos (suena N,
  calla M), silencio al azar (%), temporizador (para solo) y destello en el 1. Abajo, compás
  actual y tiempo transcurrido.
- **Presets** con nombre (lo musical: tempo, compás, acentos, figuras, sonido).
- **Atajos** donde está el metrónomo: Espacio, ↑↓ (Mayús ×10), T.
- **Sigue sonando al cambiar de sección**; su botón de la barra late con el pulso.
- Todo se guarda en `kharo.metronomo.v1`.

**Cómo está hecho**

- `MotorMetronomo` tiene **su propio AudioContext**: el del reproductor se suspende con su pausa
  y no debe callar el metrónomo. Planificador con anticipación (cada 25 ms programa lo que cae
  en los próximos 120 ms con hora exacta del reloj de audio); el latido sale de un **Worker**
  para no frenarse con la pestaña detrás. El temporizador también lo vigila el motor.
- `useMetronomo` vive en `App`, no en la vista. La vista sigue al reloj de audio con
  `requestAnimationFrame`, de la ventana externa si existe (la página oculta no pinta).
- **Desacoplar:** `documentPictureInPicture` (siempre encima, Chrome/Edge) o, si no, una ventana
  emergente. `prepararVentanaMetro` copia hojas de estilo y tema; `App` monta el mismo
  `<Metronomo compacto>` con `ReactDOM.createPortal`. El estado y el sonido siguen en la página,
  que muestra «El metrónomo está en otra ventana · Traer de vuelta». Si el navegador bloquea la
  ventana, sale un aviso. `window.__kharoMetroEn(w)` acopla a una ventana ya abierta (pruebas).
- El icono de **Ejercicios** era un metrónomo: pasa a una diana, y el metrónomo se queda el suyo.
- Depuración: `window.__kharoMetronomo.ultimos` guarda los últimos golpes programados.
- **En la ventana «Sonando»** (abajo a la izquierda, la misma de Canción): mientras suena y no
  estás en su sección, sale «Metrónomo · 100 bpm · 4/4 · Negra». **Pausar** congela también
  su reloj (suspende su AudioContext) y **Parar todo** lo para. Si se arranca el metrónomo con
  todo en pausa, se quita la pausa general.

**La tarjeta de grados: escalera y círculo (mismo día).** De los wireframes de grados
(`wireframes-metronomo-grados.html`) Carlos eligió la 1 y la 2, las dos a la vez:

- El botón **«Colores»** de la mesa pasa a llamarse **«Grados»** (y el pisador del pedal EQ, que
  hace lo mismo, también). A su lado, con los grados a la vista, un conmutador **Escalera ·
  Círculo** (`vistaGrados`, recordado en `kharo.v10.vistaGrados`; por defecto Escalera).
- **Escalera:** la columna de bolas (nota dentro, función al lado), y entre grado y grado el hueco
  real: 6 px por semitono + 8 de base, con su letra (S, T, T½…), también del último a la octava.
  La mayor se lee T T S T T T S.
- **Círculo:** las doce notas en un reloj con la tónica arriba; las de la escala con su bola y la
  función fuera del aro, las demás un punto, y un polígono lima que las une (la forma de la
  escala).
- La lista ya no lleva tope propio (el redondeo de los huecos sacaba una barra por 1 px): es la
  tarjeta la que se desplaza si no cabe en la mesa (`100cqh − 90px`).

**Grados: sólo el círculo, del tamaño del diagrama (mismo día).** La escalera no convenció y
se quitó, con su conmutador: el botón «Grados» sólo enseña u oculta la tarjeta. La tarjeta es
ahora tan alta como el diagrama (`100cqh − 122px`) y un 82 % de ese alto de ancha (máx. 460 px),
con el círculo llenándola; queda diagrama · mini-mástil · círculo. Medido a 1366×900: diagrama
581×567, círculo 460×567.

**El metrónomo, en tarjeta (mismo día).** De `wireframes-metronomo-variantes.html` Carlos eligió
la 4 y la afinó en `wireframes-metronomo-tarjeta.html`; se aplica a Prime:

- Una tarjeta en columna (máx. 440 px), la misma en la sección y en la ventana externa:
  tiempos → **la rueda del tempo** con − + y «BPM» debajo → TAP · arrancar · volumen → Compás →
  Figura → «Ajustes».
- **La rueda** (`RuedaTempo`): un cilindro de números (24° entre número y número, 205 px de
  radio). Arrastrar hacia arriba sube (9 px = 1 bpm); al soltar con fuerza sigue girando por
  inercia y se asienta en un entero. Rueda del ratón ±1 (Mayús ±10), flechas ±1, RePág/AvPág ±10,
  doble clic para escribir el número. Sólo el arrastre y la inercia cambian el tempo en vivo; lo
  demás (−, +, tap, entrenador) llega por `valor` y la rueda gira hasta él sin avisar, para no
  devolver el tempo hacia atrás. Pide los cuadros a su propia ventana.
- **Compás:** 3/4 · 4/4 · 6/8 · 7/8 y un «+» con 2/4, 5/4, 9/8, 12/8, uno a medida (− n + / 4·8) y
  la agrupación de los de 8. **Figura:** negra, corcheas, tresillo, semicorcheas, swing y
  contratiempo, y un «+» con las demás. Si se elige una del «+», el «+» la enseña encendida.
- **Ajustes:** una hoja que sube desde abajo con Sonido (timbre y mezcla acento · tiempo ·
  subdivisión), Práctica (cada interruptor enseña sus números sólo si está encendido) y Presets
  (lista, cargar, borrar, guardar el actual). Un punto lima en «Ajustes» avisa si hay práctica
  activa. Mientras suena, debajo de los mandos: compás y tiempo transcurrido.
- Fuera: la perilla y el número grande editable, las cajas de compás/figura/sonido/práctica y la
  pantalla de presets de la cabecera. El motor (`MotorMetronomo`, `useMetronomo`) no cambia.
- Comprobado: arrastre real (182 → 96 con inercia), rueda del ratón, teclado, los dos «+», la hoja,
  el motor (0,619 s a 97 bpm), la ventana externa en un iframe y el teléfono sin desbordes.

**Retoques del metrónomo y de las tríadas (mismo día).**

- **Ajustes del metrónomo:** «Cerrar» va centrado. Fuera las perillas Acento · Tiempo · Subdiv.
  (no se entendían) y los sonidos Cencerro y Guitarra (quedan Madera, Clic y Electrónico; un estilo
  guardado con uno de los quitados vuelve a Madera). En su lugar, en la pestaña Sonido, la
  **cuadrícula de acentos**: un bloque por tiempo con su figura dibujada y una barra por golpe
  (tresillo: 3, semicorcheas: 4…). La primera barra es el tiempo y cicla como su disco (Fuerte ·
  Normal · Suave · Silencio); las demás, normal → acento → silencio. El alto de la barra es lo fuerte
  que suena y el tiempo que suena se marca. Datos: `subEstados` (`{"tiempo-golpe": "acento" |
  "mudo"}`), que el motor respeta y que se vacía al cambiar de figura o de compás; va en los presets.
- **Tríadas de Escalas a la izquierda del diagrama** (desde 768 px): una columna de botones
  rectangulares (Todas, I … vii° y «Mandar…» con una fijada), con el mismo comportamiento de antes
  (pasar señala, clic fija, clic derecho o pulsación larga abre su menú). En el teléfono siguen en la
  tira de arriba. La mesa marca `k10-con-triadas` y `k10-con-grados` y el diagrama se estrecha lo
  justo para que quepan la columna, el mini-mástil y el círculo.

**La rueda del tempo, más precisa y con sonido (mismo día).** Carlos: «muy poco precisa; cuando
creo que lo dejé, pasa». Segunda versión de `RuedaTempo`:

- **Sin inercia:** al soltar se queda en el número que se ve en el centro.
- **Precisión según la velocidad:** despacio, 18 px por número; deprisa, hasta 4 px (gradual,
  como la aceleración del ratón). Probado: 60 px lentos = +3; 120 px rápidos = +30.
- **Margen:** el número sólo cambia al pasar el 75 % del paso y sólo vuelve si se retrocede otro
  tanto (una banda de medio paso, ~9 px despacio). Un temblor de ±4 px no lo mueve. Mientras
  tanto la rueda se asoma un poco (35 %) hacia el siguiente, sin cambiarlo.
- **Tic:** `MotorMetronomo.tic()`, un chasquido de 20 ms muy bajo (ruido por un paso-banda en
  3,4 kHz y un golpecito de 1,9 kHz), por el bus del metrónomo (lo baja su volumen). Suena en cada
  número que pasa por el centro cuando la mueve alguien (arrastre, rueda del ratón, flechas, −, +,
  TAP), no cuando la mueve el entrenador; como mucho uno cada 28 ms.

**La guitarra eléctrica, con distorsión (mismo día).** Sus muestras ya no van directas al bus
maestro: pasan por un ampli (`InstrumentSynth.distorsion()`), una cadena compartida que se monta
la primera vez: ganancia ×7 → paso-alto 110 Hz → saturación `tanh` (WaveShaper con sobremuestreo
4x) → realce de medios (+5 dB en 800 Hz) → «caja de altavoz» (paso-bajo 5 kHz) → salida ×0,24.
Al ser una sola cadena, un acorde se ensucia junto, como en un ampli de verdad. Medido con un
rasgueo: a 0,32 de salida la eléctrica daba 0,48 de RMS frente a 0,34 de la acústica; bajada a
0,24 queda a la par (≈0,36, calculado). Afecta a todo lo que suena con «Guitarra eléctrica»
(elegida o por «Según el instrumento» en 7 y 8 cuerdas); el bajo eléctrico sigue limpio.

**Cuarta vuelta de 0.9 (mismo día):**

- **Conmutador** (`Conmutador`, `ui-v09.css`) en vez de la palanca vertical: dos posiciones
  escritas sobre fondo de pantalla y una pastilla lima que se desliza hasta la elegida; con
  flechas del teclado. **Etiqueta → Números de traste:** horizontal, más grande, con **L** y **R**
  (y «Números de traste» debajo). **Ampli → Diapasón:** vertical, sin el título, **Madera**
  arriba y **Plano** abajo.
- **Ampli: Guardar, Vaciar y Fábrica vuelven** como botones redondos de pedal con su nombre
  debajo (`BotonPedal`), como las perillas. Los iconos de la vuelta anterior eran casi blancos
  sobre el crema del pedal y no se veían. Vaciar queda apagado si el canal está vacío.
- **Los grados, sintéticos** (antes «Leyenda de grados»): una bola del color con la **nota
  dentro**, a su lado el **número del grado** (b3, 5, b7…), debajo la **función** (Tónica, 3ª
  menor…). Cuatro por fila, sin la nota repetida a la derecha. La columna pasa de unos 380 px a
  ~125 px y ya no se estira hasta el alto de la mesa. La tira del móvil usa lo mismo (bola con la
  nota + número). El nombre largo sigue en el `title`.
  **Retocada el mismo día:** a Carlos le gustó más esta leyenda, pero en **columna** y más
  legible: una fila por grado (bola de 34 px con la nota, número a 16 px, función a 14 px en el
  color de texto, no atenuado) con una raya fina entre filas. Mide ~420 px con siete grados y,
  con una escala de doce, se desplaza dentro de su caja (máx. 580 px).
  **Sin los números** (b3, 5…) a petición de Carlos: queda la bola con la nota y la función; la tira del móvil igual.
- **Letras del diagrama: sólo sans-serif libres, guardadas en el proyecto.** `FONTS_LIST` pasa
  de Inter, Georgia, Courier, Times y Trebuchet a **Inter, Montserrat, Poppins, Space Grotesk,
  Oswald, Nunito, Josefin Sans y Barlow Condensed** (OFL), en `vendor/fonts/*.woff2` (10 archivos,
  251 KB, sólo el subconjunto latino) y declaradas en `ui-v09.css`. Antes Inter ni siquiera estaba
  incluida: se veía la que tuviera el equipo. La pantalla «Letra» del Ampli escribe el nombre en
  su propia letra. Si un estilo guardado trae una letra que ya no está en la lista (Georgia…), se
  enseña tal cual y no se cambia sola. Créditos y licencia en `vendor/fonts/LEEME.md`.
- **La exportación lleva la letra dentro.** PNG, SVG y SVG para Illustrator incrustan el
  `.woff2` de la elegida como `@font-face` en base64 (`incrustarFuente`), así el archivo se ve
  igual en cualquier equipo. Comprobado: el SVG con Montserrat pesa 53 KB y la lleva dentro. Sólo
  funciona servido por http(s); abriendo `index.html` con doble clic el navegador no deja leer los
  `.woff2` y se exporta como antes (con la letra del sistema).

**Comprobado en el navegador:** 100 bpm = 0,6 s exactos y acento en el 1; tresillo a 0,2 s;
galope en 0 y 0,75; tiempo silenciado sin golpe; 7/8 con sus acentos; tap a 500 ms = 120;
entrenador 200 → 210; compases mudos alternos; sigue sonando en Escalas; la ventana externa
(probada con un iframe) funciona y vuelve; teléfono sin desbordes. **Sin probar:** abrir la
ventana real, porque el navegador integrado del panel bloquea Picture-in-Picture y las
emergentes; hay que probarlo en Chrome o Edge.

## 0.11: Canción en cuatro pasos (2026-10-06 / 07)

Del wireframe `_trabajo/wireframes/wireframes-cancion-flujo-2.html`. Canción deja de ser una
columna de tarjetas y pasa a cuatro pasos en la base: **Estructura › Letra y hoja › Ritmo ›
Tocar**, con la biblioteca a la izquierda, la pedalera de la canción a la derecha y el transporte
centrado en la barra de arriba (el mismo en los cuatro pasos). Se hizo en `v11.html` en cinco
fases y tres vueltas de retoques; al aprobarla se copió sobre `index.html` (respaldo de la 0.10
en el scratchpad de esa sesión; la copia `v11.html` queda en `_trabajo/versiones-antiguas/`).
Estilos en `ui-v11.css`.

**Qué hace**

- **Estructura: la pista.** Regla de compases y pulsos, carril de Secciones (bloques de su color,
  del ancho de lo que duran con sus vueltas), de Acordes (con su diagrama si cabe) y de Letra.
  Zoom − / Toda / +. Las secciones se **reordenan arrastrando**; los acordes se **mueven
  arrastrando** (también a otra sección) y se **estiran o encogen por su borde** en pasos de ½
  pulso. Clic derecho en un acorde: duplicar, **partir en dos**, pulsos, mover, quitar. Panel de la
  sección elegida (nombre, vueltas, tempo propio, nota).
- **El imán** (junto a «+ Sección»). Encendido: al mover, encoger o quitar, lo de después se
  corre. Apagado: queda el **hueco, un compás de silencio** que se ve rayado y no suena; soltar un
  acorde encima lo llena.
- **Los acordes se ponen arrastrando** desde la biblioteca; un clic solo los hace sonar (con el
  dedo, tocar sí añade: el arrastre táctil choca con el scroll).
- **Letra y hoja: el papel es el editor.** Una página cada vez con su mando ▲ n ▼. Tocar una
  sección del papel la enmarca y abre un globo con su letra (`LyricEditor`). Un acorde soltado
  sobre una línea cae en la sílaba que marca la raya azul (`columnaEnHoja`). La capa de edición va
  marcada `data-no-exportar` y no viaja al archivo.
- **Ritmo.** La pista con los carriles Ritmo (uno por sección: neutro si hereda el de la canción,
  morado si lleva el suyo) y Rasgueo (casilla a casilla). Un ritmo soltado en el carril Ritmo es
  de esa **sección**; soltado sobre un **acorde**, solo de ese acorde (etiqueta naranja). Tocarlo en
  la biblioteca lo pone en toda la canción. ✎ hace una **copia editable** de un ritmo de fábrica
  («Mi pop»). El compositor (`StrumEditor`) va en línea, abajo.
- **Tocar: el atril.** El acorde de ahora en grande y el siguiente en pequeño; la letra con la
  sílaba que suena en lima (el acorde k de la sección ↔ el acorde k escrito en la letra; los
  silencios no cuentan); las partes sin letra salen como «Instrumental» con cuántos compases faltan
  para la letra; la cinta del rasgueo pasa hacia la línea AHORA. Tocar una sección del recorrido
  empieza desde ahí.
- **Transporte en la barra:** ⏮ ▶/⏹ ⟳, visor con tiempo y compás, Toda | Sección. Espacio =
  play/stop.
- **Pedalera de la canción:** Tonalidad, Tempo (bpm, compás, Tap), Ritmo, Etiqueta, **Looper**
  (repite la sección elegida N vueltas o sin fin y sigue) y **Ensayo** (empieza al X % y sube un
  Y % por vuelta).
- **Color (pedido de Carlos):** colores planos, sin bordes de color; en oscuro, grafito neutro en
  vez de la tinta cálida (solo en Canción y en las pedaleras); el lima solo como acento. Cada
  pedal de un color (Tonalidad azul, Tempo rojo, Ritmo y Escala morado, Etiqueta cian, Afinador
  azul, Looper naranja, Ensayo rosa, EQ y Ampli claros) **también en la pedalera del Taller**.
  Pantallas con letra pixelada **VT323** (enlazada a Google Fonts; sin conexión cae a la
  monoespaciada).
- **Diagrama horizontal en el Taller.** Botón lima pegado al borde de la pedalera: gira el
  diagrama 90° (cejuela a la izquierda, 6.ª cuerda abajo, textos derechos) y lo exportado sale
  igual. Se guarda en `kharo.v11.taller.horizontal`. Biblioteca y hojas siguen en vertical.

**Cómo está hecho**

- **Modelo (`song-core.js`):** un compás puede llevar su **ritmo propio** (`bars[].rhythmId`) o ser
  un **silencio** (`{ chordId: null, rest: true, beats }`); `normalizeSong` los conserva y
  `expandSong` usa el ritmo del compás antes que el de la sección. Las duraciones admiten ½ pulso.
- **Reproductor:** `playSong(soloSeccion, opciones)` arma un **plan** que crece vuelta a vuelta
  (`looper`, `ensayo`, `desde`); cada vuelta puede ir a otro tempo. El atril lo lee de
  `songPlaybackRef.current.plan` y anima la cinta con `requestAnimationFrame`.
- **Arrastre entre paneles:** `useArrastreKharo` (puntero, fantasma, `elementFromPoint` y destinos
  `data-soltar`). Sin DnD de HTML5.
- **Exportar** lee las páginas de la hoja del DOM: en los pasos sin hoja a la vista va una
  escondida (`.k11-hoja-oculta`).
- **Diagrama horizontal:** `escena.orientacion`; `DiagramaKharo` envuelve el dibujo en
  `<g data-dibujo transform="translate(-60, W+56) rotate(-90)">` y contragira cada texto sobre su
  centro. En vertical no añade nodos: **el SVG sale idéntico** (comprobado con SHA-256).
  `puntoDelLienzo` pasa a `getScreenCTM`, así los gestos funcionan girados.
- Estado de la canción en `kharo.v11.cancion` (paso, imán, Looper, Ensayo).

**Comprobado en el navegador** (con «Olvídala», `_trabajo/pruebas/olvidala-binomio.json`: la
progresión de acordesweb, la letra de relleno): reordenar, mover y estirar acordes con el ratón
real, con imán y sin él; soltar acordes y ritmos por sección y por acorde; la sílaba en la hoja;
Looper 2 vueltas y sigue; Ensayo 80 → 100 %; «desde aquí»; los gestos del diagrama horizontal
(punto, cejilla, al aire/apagada); exportar con todas las páginas; teléfono sin desbordes.
**Sin probar:** descargar de verdad el PNG del diagrama horizontal.

**Pendiente:** soltar un acorde *entre* dos con el imán apagado sigue corriendo lo de detrás (solo
los huecos se llenan sin mover nada). En la hoja de Prime anterior un silencio salía como «?».
Guardar VT323 en `vendor/fonts` para que funcione sin conexión.

### 0.11 · tercera vuelta (2026-10-07)

Arreglos que pidió Carlos después de probar la 0.11 ya en Prime. Se aplicaron directo a Prime;
la copia de antes queda solo en el scratchpad de esa sesión.

**Taller, diagrama en horizontal**
- **Menos aire y letras más grandes.** Al girar el diagrama, los 70 px de margen de cada lado
  quedaban enteros arriba y abajo. `medidasHorizontal(geo, numerosTraste, dotRadius)` los recorta:
  deja unos 44 px en el lado de los números de traste y unos 26 en el otro. La franja del título baja
  de 56 a 46. Como el SVG es más bajo, al ajustarse al alto se dibuja ~25 % más grande. Además, los
  números de traste (13 → 17) y la afinación (12 → 16) se escriben más grandes. La exportación lee
  `width/height` del propio SVG, así que no hubo que tocarla. **En vertical el SVG sale idéntico**
  (mismo SHA-256 antes y después).
- **El mini-mástil ya no cambia con los trastes.** `VentanaMastil` acepta `largo` (px). La mesa
  calcula lo que mediría el diagrama con 7 trastes a la escala con que se ve, mide el alto real del
  mini-mástil y lo publica como `--k11-lupa`. Con eso se resta al diagrama: con el número fijo de
  antes (194 px) se quedaba corto y pisaba Grados/Tríadas.
- **Tríadas a la izquierda también en horizontal.** El diagrama y el mini-mástil van en
  `.k11-columna` (en vertical es `display: contents`). La fila ya no se pone en columna.
- **Etiqueta:** en horizontal el conmutador es vertical y dice **Arriba / Abajo** (la derecha
  queda arriba al girar). El dato guardado es el mismo.

**Canción**
- **Imán:** solo el icono (`BotonIman`). Al dejar el ratón encima un segundo sale un globo propio
  (`.k11-con-globo` + `data-globo`, reutilizable), debajo del botón: arriba lo cortaba la pista.
- **Estirar con el imán apagado ya no salta.** La vista previa del estirado usa
  `cambiarDuracion(…, iman)`, la misma regla que al soltar, así que el silencio aparece mientras
  arrastras. `PistaCancion` recibe `iman`.
- **Se oye si el golpe va ↓ o ↑.** `Song.strokeForEvent(notas, evento)` (en `song-core.js`) da cada
  nota con su retraso y fuerza: el orden de siempre más un crescendo a lo largo del barrido, y hacia
  arriba nunca menos de 22 ms. Lo usan la canción completa y el ▶ del compositor. El ▶ ya no toca
  solo ruido: toca el primer acorde de la sección activa (o las cuerdas al aire) con notas cortas.
  × sigue siendo el chasquido. Escribir una casilla suena ese golpe (`onProbarGolpe`).
- **Arpegios.** El compositor tiene «Rasgueo | Arpegio». En Arpegio, la rejilla tiene una fila por
  nota del acorde: la aguda arriba y «Bajo» abajo, como en una tablatura. Clic = que suene esa nota
  en esa casilla (dos = pellizco); clic derecho = acento de la columna. Modelo: casilla
  `{ picks: [0, 2], accent }`, patrón `tipo: "arpegio"`. `gridToEvents` lo traduce a los mismos
  `{ at, pick }` de los patrones de fábrica, y `normalizeSong` lo conserva (`normalizarCelda`). ✎
  sobre «Balada (arpegio)» abre la copia como arpegio con sus notas. El vals, que mezcla bajo y
  rasgueo, sigue abriéndose como rasgueo.
- **«?» de ayuda en el pie de Canción.** El menú del Taller pasó a ser `MenuAyuda({ opciones })` y
  lo usan los dos. En Canción, «Atajos de teclado» abre un diálogo con los atajos de la pista y
  «Tutorial» dice que llega pronto.

**Comprobado en el navegador:** la huella del SVG vertical no cambió. En horizontal, con Escalas,
Tríadas y Grados a 1280–1440 px: tríadas a la izquierda, sin solapes (mini-mástil 722 px, fila de
abajo 737 px), mini-mástil de 787 px con 5, 6, 7 y 12 trastes. Arriba/Abajo mueve los números.
Estirar sin imán: la vista previa ya muestra el silencio. Arpegio: escribir, acentuar, guardar y
recargar, ▶ sin errores, ✎ de la balada. El menú de ayuda de Canción.
**Sin probar:** escuchar a oído la diferencia ↓/↑ (el panel del navegador no da sonido) y el
globo en un navegador de verdad (sí se comprobó por estilos calculados).

**Después, el mismo día:**
- Botones de tríadas más angostos (96 × 30 px, en `ui-v10.css`): la columna se salía de la cuadrícula.
- **Teléfono:** fuera las pestañas de texto de la cabecera (dos filas) y el dock de cuatro pedales.
  Abajo va `BarraMovilTaller`: las siete secciones con los iconos de la barra de escritorio, en
  una franja, con el nombre chiquito y la activa en su color. La Pedalera se abre con un botón
  de icono en la cabecera, que se apretó (`.k12-cabecera`) para que quepan logo, Metrónomo,
  Biblioteca, Guardar, modo y Pedalera en 375 px. La pista del lienzo («Arrastra entre cuerdas…»)
  no se muestra en el teléfono (`.k12-pista`).
- **Teléfono, diagrama horizontal:** el mini-mástil iba al lado y sacaba el diagrama de la
  pantalla. Ahora `.k11-columna` es columna también bajo 768 px: el diagrama a todo lo ancho
  (alto según su proporción) y el mini-mástil debajo, a todo lo ancho.
- **Teléfono, grados:** la tira «2ª mayor · 3ª mayor…» pasa a un botón «Grados ▾» con la lista
  (`.k12-grados`). Entre 768 y 1279 px sigue la tira.
- **Teléfono, tríadas:** sin «Elige tríada» ni «Todas»; solo las siete y «Mandar…». Tocar la
  tríada fijada la suelta (vuelven a verse todas).
- **Teléfono, botón de girar:** el flotante tapaba deshacer y Vaciar. Bajo 768 px se esconde y
  va uno redondo lima, solo icono, en la fila de deshacer (`.k11-girar-movil`).
- **El giro, animado:** al cambiar de orientación, el diagrama entra girado un cuarto de vuelta y
  algo encogido y se asienta (520 ms, Web Animations sobre `.k-lienzo`; no toca el SVG, así que no
  viaja al exportar). Con movimiento reducido no se anima.

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
