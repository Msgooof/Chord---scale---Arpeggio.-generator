# Kharo Studio — Bugs encontrados

Barrido del 6 de septiembre de 2026 sobre `index.html`, `theory-core.js`, `render-core.js`,
`song-core.js`, `theme.css` y `ui.css`. Lectura completa de los cuatro archivos de código, más
reproducción en el navegador de todo lo que se podía provocar con datos de prueba.

**Cómo leer este archivo.** Cada bug dice si está **comprobado** —reproducido en la app, con lo
que se vio— o **por lectura**, que significa que el código dice que pasa pero no se ha
provocado. Los dos merecen arreglo; la diferencia es cuánto hay que investigar antes.

Los números de línea sirven de orientación y bailan en cuanto se toca el archivo, como avisa
`DOCUMENTACION.md` §4. Para encontrar un bloque, mejor buscar el nombre de la función.

Los tres bugs de la **fase 0** de `HOJA-DE-RUTA.md` siguen sin arreglar y van al final, sin
repetir lo que ya explica la hoja de ruta.

---

## Índice

| # | Qué pasa | Dónde | Estado |
|---|---|---|---|
| **1** | Abrir un paso de ejercicio en el mástil lanza `ReferenceError` | `cargarPasoEnMastil` | Comprobado |
| **2** | Pantalla en blanco al quitar la tonalidad con el panel armónico abierto | `ChordLibrary` | Comprobado |
| **3** | La hoja tira los compases que no caben en la fila | `SheetBars` | Comprobado |
| **4** | La hoja imprime «Negras» cuando el rasgueo es tuyo | `SongSheet` | Comprobado |
| **5** | El color del texto de las notas y de las flechas no llega al mástil | Bloque del estudio | Por lectura |
| **6** | Borrar un acorde deja compases huérfanos en las demás canciones | `removeChordFromLibrary` | Por lectura |
| **7** | Cargar un acorde de otro instrumento pierde su afinación | `loadPreset` + efecto de `instrument` | Comprobado |
| **8** | En Libre, los ×/○ de la cejuela son los del acorde | Dibujo de cuerdas al aire | Comprobado |
| **9** | Arrastrar en horizontal en Libre crea una cejilla en el acorde | `handleMouseUp` | Comprobado |
| **10** | El recorrido a mano es uno solo para Escalas, Arpegios y Libre | `pathManual` | Comprobado |
| **11** | Coordenadas `NaN` al reducir trastes con notas fuera de la ventana | Dibujo de notas | Comprobado |
| 12 | Una nota por debajo de una cejilla suena en vez de la cejilla | `chordVoicingToMidi` | Por lectura |
| 13 | La hoja de tonalidad coge la afinación del primer acorde de la biblioteca | `SheetTheoryPage` | Por lectura |
| 14 | La portada promete exportar a JSON desde Ejercicios y no se puede | `ExerciseEditor` | Por lectura |
| 15 | El ⟲ del ejercicio no hace efecto hasta parar | `playExercise` | Por lectura |
| 16 | La rejilla de clic y el halo viajan dentro del SVG exportado | Lienzo del estudio | Por lectura |
| 17 | `fontWeight="black"` no existe: las notas al aire salen en peso normal | Lienzo del estudio | Por lectura |
| 18 | La miniatura recorta a seis trastes y dibuja fuera lo que pase | `MiniFretboard` | Por lectura |
| 19 | Al borrar un verso, el siguiente hereda su desplazamiento | `LyricEditor` | Por lectura |
| 20 | En móvil, el toque podría deshacer la nota que acaba de poner | `handleMouseUp` | Sospecha |

Los once primeros son los que cambian lo que la app hace. Del 12 al 20 son molestias, casos
raros o suciedad en el archivo exportado.

---

## 1. Abrir un paso de ejercicio en el mástil lanza `ReferenceError`

**Comprobado.** El botón ↗ de una tarjeta de paso y la opción «Abrirlo en el mástil» del clic
derecho no hacen nada, y la consola escupe `setModoLibre is not defined`.

`cargarPasoEnMastil` (`index.html:6807` y `:6810`) llama a `setModoLibre`, que dejó de existir
cuando Libre pasó de ser un interruptor a ser una pestaña. El estado que lo sustituye es
`appMode === "free"`.

Hay un segundo problema debajo del primero, y aparece en cuanto se arregle este: para un paso de
tipo `libre` la función no rellena `dotsLibre` ni `stringStatesLibre`, así que aunque se ponga
bien el modo, el mástil se abriría vacío con un recorrido apuntando a notas que no están
dibujadas. Un paso libre guarda sus notas en `path` y de ahí hay que sacarlas.

Es el camino de vuelta entero entre Ejercicios y el mástil, que es la mitad de para qué existe
Ejercicios: sin él, corregir un paso obliga a rehacerlo.

## 2. Pantalla en blanco al quitar la tonalidad con el panel armónico abierto

**Comprobado.** Con una tonalidad elegida, se abre el chip «de fuera» de un acorde prestado y se
vuelve a poner la tonalidad en «Libre». La app desaparece entera.

En `ChordLibrary` (`index.html:1393`), el bloque que dibuja las sugerencias hace
`lectura.sugerencias` sin comprobar que `lectura` exista. Y `lecturaDe` devuelve `null` en cuanto
no hay tonalidad: es su comportamiento correcto, porque sin tonalidad no hay lectura que dar.

El chip de arriba sí se guarda (`if (!lectura) return null`); el panel desplegable no. Basta la
misma guarda, o cerrar `armoniaAbierta` cuando cambia `song.keyRoot`.

## 3. La hoja tira los compases que no caben en la fila

**Comprobado con una progresión de doce compases: la hoja dibujó ocho.**

`SheetBars` (`index.html:2607`) recorre los compases acumulando ancho y hace `return` en cuanto
uno se pasa del ancho útil. No es un `break` mal puesto que se pueda cambiar por otra cosa: el
bloque de compases tiene reservada **una** fila de alto fijo (`HOJA.altoCompases`, 58 px) y
`paginateSong` ya ha repartido las páginas contando con eso.

Arreglarlo es dejar que la progresión ocupe varias filas y devolver el alto real a la
paginación, igual que hace el diccionario de acordes con `bloque.alto`. Mientras tanto, una
canción normal se imprime incompleta y sin decirlo, que es la peor forma de estar mal: la hoja
parece correcta.

## 4. La hoja imprime «Negras» cuando el rasgueo es tuyo

**Comprobado.** Con un rasgueo propio activo, la cabecera de pantalla dice «Mi rasgueo X» y la
hoja A4 dice «Negras (un golpe por pulso)».

`SongSheet` llama a `Song.getRhythm(s.rhythmId || song.rhythmId)` (`index.html:3027`) sin el
segundo argumento. `getRhythm` busca primero entre los patrones propios, pero sólo si se los
pasan; sin ellos no encuentra el id y cae al de fábrica.

Se arregla pasando `song.customRhythms`. Es el único sitio del proyecto donde `getRhythm` se
llama con un argumento: `rhythmEventsForBar` lo hace bien, y por eso la canción **suena** con tu
rasgueo aunque la hoja diga otra cosa.

## 5. El color del texto de las notas y de las flechas no llega al mástil

**Por lectura.** El panel de Estilo tiene dos selectores, «Texto en las notas» y «Flechas del
recorrido». Se guardan, sobreviven al recargar y gobiernan las miniaturas de la biblioteca y la
ficha de ejercicio. El mástil del estudio los ignora.

El SVG grande lee `DEFAULT_STYLE.dotTextColor` y `DEFAULT_STYLE.pathColor` en trece sitios
—`index.html:7125`, `:7133`, `:7179`, `:8720`, `:8747`, `:8784`, `:9017`, `:9046`, `:9093`,
`:9122`, `:9132`, `:9188`, `:9235`— en vez de leer el estilo activo. Son los valores de fábrica,
así que sólo se nota cuando los cambias.

Viene de la mudanza de `DEFAULT_STYLE` a `render-core.js`: el alias se dejó a propósito para no
tocar los ~109 usos, y estos trece se quedaron leyendo la constante en lugar de `style`. Es
sustituir `DEFAULT_STYLE.` por `style.` en esas líneas, con cuidado de no tocar
`DEFAULT_STYLE.fretboardRadius` ni `DEFAULT_STYLE.triadRingColors`, que sí quieren ser fijos.

## 6. Borrar un acorde deja compases huérfanos en las demás canciones

**Por lectura.** `removeChordFromLibrary` (`index.html:4939`) quita el acorde de la biblioteca y
de la canción **abierta**, pero no toca las otras canciones de `songs`. Los compases que lo
usaban se quedan apuntando a un id que ya no existe: en la hoja salen como «?» y al reproducir
no suenan.

El contraste está en la misma pantalla: `borrarTodosLosAcordes` sí recorre la lista entera con
`fundirEnLista(prev, song).map(limpiar)`. Aquí falta ese mismo paso.

Se nota más de lo que parece porque el aviso miente: el toast cuenta los usos de la canción
abierta y dice «quitado de 3 compases» cuando en realidad había ocho repartidos.

## 7. Cargar un acorde de otro instrumento pierde su afinación

**Comprobado.** Se carga un acorde de ukelele desde «Tuyos», luego un D5 guardado en Drop D. El
mástil muestra `E A D G B e` y lo nombra `E7sus4`.

`loadPreset` (`index.html:5902`) escribe instrumento y afinación en el mismo render. El efecto de
`[instrument]` (`index.html:4704`) corre después, ve que el instrumento cambió y hace lo que le
toca: poner la afinación de fábrica de ese instrumento. Pisa lo que acaba de escribir
`loadPreset`.

Sólo pasa cuando el acorde guardado trae **otro** instrumento que el que hay puesto, porque el
efecto sólo se dispara si `instrument` cambia. Con todo de guitarra, no se nota nunca.

La hoja de ruta ya propone la pieza que lo arregla: la bandera `restaurando` en un `useRef` que
el efecto consulta al entrar. Aquí hace falta por el mismo motivo, y también la va a necesitar
`cargarPasoEnMastil` en cuanto se arregle el bug 1.

## 8. En Libre, los ×/○ de la cejuela son los del acorde

**Comprobado: con el mástil de Libre vacío se dibujan dos ○ y una ×, que son los de la digitación
de C que hay puesta en Acordes.**

La fila de cuerdas al aire y muteadas se dibuja con `stringStates` (`index.html:8757`) en vez de
`stringStatesActivos`. Todo el resto de Libre —las notas, el clic, el recorrido— usa bien el
mástil activo; esta rama se quedó atrás.

Dos consecuencias, y la segunda es peor que la primera. Se ven marcas que no son de este mástil.
Y al pulsarlas se cambia el estado de las cuerdas de Libre, que sí es el bueno
(`toggleStringState` usa `stringStatesActivos`), así que se marca una cuerda al aire que no se
dibuja en ningún sitio y que `notasDelMapa` mete en el recorrido: aparece una flecha hacia una
nota invisible.

## 9. Arrastrar en horizontal en Libre crea una cejilla en el acorde

**Comprobado: sale el toast «Cejilla creada por arrastre», y al volver a Acordes el C se ha
convertido en C6.**

`handleMouseUp` (`index.html:5806`) trata el arrastre entre cuerdas como cejilla en los dos modos
editables, y escribe en `barres`, que es del acorde. Libre no dibuja cejillas, así que el gesto
no deja rastro visible donde ocurrió y destroza el acorde de al lado.

Es el mismo agujero que el bug 8, por el otro lado: allí se lee el estado del acorde desde Libre,
aquí se escribe. `barres` no tiene pareja `barresLibre` y probablemente no deba tenerla: en Libre
lo suyo es que el arrastre entre cuerdas no haga nada, o que trace la flecha del recorrido.

Con el mismo origen: `clearAll` (`index.html:5926`) hace `setBarres([])`. Pulsar «Vaciar» en
Libre borra las cejillas del acorde.

## 10. El recorrido a mano es uno solo para Escalas, Arpegios y Libre

**Comprobado: se enciende el recorrido en Escalas, se pasa por Libre, se vuelve, y el panel dice
«0 notas, a mano» con el mástil lleno de notas y ninguna flecha.**

`prepararModoLibre` (`index.html:6612`) hace `setPathManual([])` al entrar en Libre. Al volver a
Escalas ese array vacío sigue puesto, y como `recorridoActual` da prioridad a `pathManual` sobre
el automático, un array vacío significa «recorrido de cero notas escrito por ti». Hay que pulsar
«Digitación» o «Reiniciar» para recuperarlo.

`showPath` y `editandoPath` tienen el mismo problema en pequeño: Libre los enciende y se quedan
encendidos al salir.

El estado que es de un modo tiene que morir con el modo, o guardarse por modo como ya se hace con
`dots` y `dotsLibre`. Lo mínimo es limpiar `pathManual` al cambiar de `appMode`, que además es lo
que se quiere: un recorrido escrito sobre una escala no significa nada sobre un arpegio.

## 11. Coordenadas `NaN` al reducir trastes con notas fuera de la ventana

**Comprobado: con una nota en el traste 5 se pulsa «ver un traste menos» y la consola da
`<circle> attribute cy: Expected length, "NaN"` y lo mismo para el `<text>`.**

`fretYPositions` tiene `numFrets + 1` entradas. Cuando una nota está en un traste que ya no se
dibuja, `fretYPositions[dot.f]` es `undefined` y toda la aritmética sale `NaN`. Pasa en cuatro
sitios: los puntos del acorde (`index.html:9205`), los de Libre (`:8991`), `posicionEnLienzo`
(`:7033`) y las cejillas (`:9146`). El halo de nota pulsada (`:8676`) tiene el mismo hueco.

Lo malo no es el error de consola. Es que la nota desaparece de la vista pero **sigue contando**:
entra en el análisis del acorde, suena al rasguear y viaja en el SVG exportado con `cy="NaN"`.
Es justo el fallo silencioso contra el que avisa el comentario de `normalizeStyle` en
`render-core.js`, sólo que por el otro extremo.

Hay dos arreglos y son distintos: no dibujar lo que cae fuera de la ventana, o clampar
`numFrets` para que nunca deje notas fuera. El segundo respeta más lo que el usuario tiene
dibujado.

---

## Los menores

**12. Una nota por debajo de una cejilla suena en vez de la cejilla.** `chordVoicingToMidi`
(`theory-core.js:466`) busca primero el punto y hace `continue`, así que un punto siempre gana a
la cejilla que cubre esa cuerda. Cuando el punto está **por encima** de la cejilla eso es
correcto, que es el caso normal. Cuando está por debajo, no: físicamente suena la cejilla, porque
la cuerda vibra desde ahí. Es alcanzable porque crear una cejilla no borra las notas que hubiera
(«Cejilla es INMUNE», dice el comentario de `handleMouseUp`). El análisis en pantalla tiene la
misma preferencia (`analyzeCurrentChord`, `index.html:4770`), así que al menos se ven y se oyen
igual de mal.

**13. La hoja de tonalidad coge la afinación del primer acorde de la biblioteca.**
`SheetTheoryPage` (`index.html:2803`) usa `chordLibrary.find(...)`, no los acordes de esta
canción. Con un acorde de ukelele guardado el primero, el mástil horizontal de una canción de
guitarra sale con cuatro cuerdas. Debería mirar los acordes que la canción usa, que ya se
calculan ahí al lado en `usados`.

**14. La portada promete exportar a JSON desde Ejercicios y no se puede.** El pie de la portada
(`index.html:566`) dice «exporta a JSON desde Canción o Ejercicios», y `ExerciseEditor` sólo
tiene PNG, SVG y PDF (`index.html:4099`). Como los ejercicios sólo viven en `localStorage`, hoy
no hay forma de sacarlos del navegador. O se añade el par ⇩/⇧, o se corrige la frase.

**15. El ⟲ del ejercicio no hace efecto hasta parar.** `playExercise` lee `exercise.loop` dentro
del `tick` (`index.html:5293`), y ese `tick` se creó en un render viejo: siempre ve el valor que
había al pulsar ▶. La canción resolvió exactamente esto con `isLoopingRef`; el ejercicio no tiene
su pareja.

**16. La rejilla de clic y el halo viajan dentro del SVG exportado.** Los rectángulos
transparentes que capturan el clic en modo Acorde (`index.html:9261`) no llevan
`data-transient="1"`, así que `svgParaExportar` no los quita: un acorde de seis cuerdas por cinco
trastes se lleva treinta rectángulos invisibles al archivo. Los de Libre sí están marcados. El
halo de nota pulsada (`:8673`) tampoco lo lleva, y con él se va una clase CSS que en el archivo
suelto no anima nada.

**17. `fontWeight="black"` no existe.** En `index.html:8722`, `:8749` y `:8786`. El valor válido
es `900` o `bolder`; con una palabra que no reconoce, el navegador usa el peso normal. Son las
etiquetas de las notas al aire de escalas y arpegios: salen más flojas que las demás, que sí usan
`"bold"`.

**18. La miniatura recorta a seis trastes y dibuja fuera lo que pase.** `MiniFretboard`
(`index.html:1013`) hace `Math.min(Math.max(chord.numFrets || 4, 4), 6)` para la rejilla, pero
los puntos se colocan con `yNota(dot.f)` sin ese tope. Un acorde guardado con siete trastes y una
nota en el séptimo dibuja el punto por debajo del último traste, fuera de la caja.

**19. Al borrar un verso, el siguiente hereda su desplazamiento.** `LyricEditor` guarda los
scrolls en `scrolls[i]` por índice (`index.html:1832`), y al quitar una línea los índices se
recolocan pero el objeto no. El carril de acordes del verso que ocupa el hueco aparece desplazado
respecto a su letra: se ve el formato roto sin estarlo. Habría que indexar por otra cosa, o
limpiar `scrolls` en `onRemove`.

**20. Sospecha, sin comprobar: en móvil el toque podría deshacer la nota que acaba de poner.**
El contenedor del estudio tiene `onMouseUp={handleMouseUp}` y `onTouchEnd={handleMouseUp}`
(`index.html:7770`), y los navegadores móviles emiten eventos de ratón de compatibilidad después
del `touchend`. Si `dragStart` sigue puesto en la segunda pasada, la segunda llamada encuentra la
nota que la primera acaba de crear y la borra. No se ha podido reproducir en el emulador; hace
falta un teléfono de verdad.

---

## Lo que no es un bug hoy pero lo será

`puntoDelLienzo` (`index.html:6663`) y `handleTouchMove` (`index.html:5833`) convierten píxeles
de pantalla a coordenadas del dibujo dando por hecho que la caja del SVG tiene exactamente la
proporción del dibujo. Hoy es cierto, porque `.k-fretboard-fit` usa `width: auto; height: auto`
y la caja se ciñe al contenido. La **fase 3** de la hoja de ruta cambia eso a `width: 100%;
height: 100%`, y ese día aparece banda sobrante y las dos cuentas empiezan a mentir. La hoja de
ruta ya lo tiene apuntado; queda aquí para que no se pierda si las fases se hacen en otro orden.

## Lo que sigue pendiente de la fase 0

Los cuatro, tal cual los describe `HOJA-DE-RUTA.md`:

- `showToast` sin `clearTimeout` (`index.html:4843`). Dos toasts seguidos y el segundo hereda el
  temporizador del primero.
- Cuatro líneas con clases de Tailwind que no existen: `text-slate-350` en `:6971` y `:8135`,
  `border-slate-850` en `:8090`, `text-indigo-450` en `:9298`. No pintan nada.
- La etiqueta de la herramienta activa, pintada sobre el botón vecino en la barra móvil
  (`index.html:7893`).
- «Ejercicios» recortado por debajo de 480 px.

## Cómo se hizo el barrido

Lectura completa de los cuatro archivos de código y de las dos hojas de estilo. Para lo
comprobado: la app servida en `localhost`, con acordes, canciones y ejercicios de prueba
sembrados en `localStorage` —incluidos un acorde de ukelele, uno en Drop D, una progresión de
doce compases y un rasgueo propio—, y lectura de consola y del DOM después de cada gesto. Los
datos de prueba se borraron al terminar.

Sin cubrir: nada se probó en un teléfono real, ni con dos pestañas abiertas a la vez, ni con
`localStorage` lleno o bloqueado. El prototipo de piano queda fuera; su bug conocido está
apuntado en `DOCUMENTACION.md` §22 f.
