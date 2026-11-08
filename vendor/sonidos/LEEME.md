# Sonidos de guitarra y bajo

Las muestras de esta carpeta vienen de la colección
[tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
(<https://nbrosowsky.github.io/tonejs-instruments/>) de **Nicholaus P. Brosowsky**.
Él no las grabó: las reunió de otras fuentes y las editó (quitar silencios, rampas,
igualar volumen, normalizar, quitar ruido y corregir la afinación donde hacía falta).

- **La colección editada:** licencia [Creative Commons Atribución 3.0 (CC BY 3.0)](https://creativecommons.org/licenses/by/3.0/deed.es).
- **De dónde sale cada instrumento** (según su `sample-source-info.txt`, comprobado el 2026-10-06):

| Carpeta | Fuente original | Licencia en origen |
|---|---|---|
| `guitar-acoustic/` | [University of Iowa Electronic Music Studios](https://theremin.music.uiowa.edu/MIS.html) | Uso libre, «sin restricciones» |
| `guitar-nylon/` | [quartertone, «ClassicalGuitar-multisampled» (Freesound)](https://freesound.org/people/quartertone/packs/11573/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es): pide cita |
| `guitar-electric/` | [Karoryfer Samples](https://shop.karoryfer.com/pages/free-samples) | CC0 |
| `bass-electric/` | [Karoryfer Samples](https://shop.karoryfer.com/pages/free-samples) | CC0 |

Kharo cita a Brosowsky, a quartertone y, por cortesía, a Iowa y Karoryfer en la app
(`CreditoSonidos`: pie de la portada y debajo del selector de sonido de la pedalera) y en este archivo.

- **Código del proyecto original:** licencia MIT (`LICENSE-tonejs-instruments.md`).

Se copiaron sin cambios el 2026-10-04 desde
`https://nbrosowsky.github.io/tonejs-instruments/samples/`:

| Carpeta | Instrumento | Archivos |
|---|---|---|
| `guitar-acoustic/` | Guitarra acústica | 37 |
| `guitar-nylon/` | Guitarra clásica (nylon) | 29 |
| `guitar-electric/` | Guitarra eléctrica | 17 |
| `bass-electric/` | Bajo eléctrico | 16 |

Los nombres siguen el original: la nota y la octava, con `s` en vez de `#` (`Fs2.mp3` = F#2).

Para reproducirlas, Kharo usa [Tone.js](https://tonejs.github.io/) 14.8.49 (MIT), copiado en `vendor/tone.js`.

## 0.16 · Los sonidos de Banda

Añadidos el 2026-11-07 con permiso de Carlos, para la sección Banda (backing tracks).

### `piano/` — 18 notas

Una nota cada tercera menor, de La1 a Do6 (`A1`, `C2`, `Ds2`, `Fs2` … `C6`); las de en medio se
sacan acelerando o frenando la grabación más cercana, como con las guitarras.

- **De dónde:** la misma colección [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)
  de Nicholaus P. Brosowsky, copiadas sin cambios desde
  `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/piano/`.
- **Licencia:** [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/deed.es), la de la colección.
- **Ojo:** a diferencia de las guitarras, la carpeta del piano no trae `sample-source-info.txt`;
  la colección dice que sus muestras vienen «de fuentes de dominio público», pero no cuál es la del
  piano. Se cita a la colección.

### `bateria/` — 22 golpes

Once piezas con dos tomas cada una (`…1.mp3`, `…2.mp3`), que el motor alterna para que no suene a máquina:

| Archivo | Pieza | Origen en Big Rusty Drums (`Samples/…`) | Micrófonos |
|---|---|---|---|
| `bombo` | Bombo 24″ | `kick_24/kick`, velocidad 10 de 14 | bombo + ambiente |
| `caja` | Caja 14″, centro | `snare_14/center`, 7 de 10 | parche + ambiente |
| `aro` | Golpe de aro (sidestick) | `snare_14/sidestick`, 3 de 4 | parche + ambiente |
| `hhc` | Hi-hat cerrado | `hihat_14/tc`, 5 de 8 | ambiente |
| `hho` | Hi-hat abierto | `hihat_14/open`, 4 de 6 | ambiente |
| `hhp` | Hi-hat con el pie | `hihat_14/chik`, 4 de 5 | ambiente |
| `ride` | Ride 22″ | `ride_22/rd`, 7 de 10 | ambiente |
| `campana` | Campana del ride | `ride_22/bl`, 3 de 4 | ambiente |
| `crash` | Crash 17″ | `crash_17/cr`, 4 de 5 | ambiente |
| `escobilla` | Caja con escobilla | `snare_14/brush`, 6 de 8 | parche + ambiente |
| `barrido` | Barrido de escobilla | `snare_14/bstir` | ambiente |

- **De dónde:** [Big Rusty Drums](https://github.com/sfzinstruments/karoryfer.big-rusty-drums) de
  [Karoryfer Samples](https://shop.karoryfer.com/pages/free-samples), una batería polaca antigua.
  Se bajaron solo estos 30 archivos (FLAC/WAV, ~10 MB), no el kit entero (731 MB).
- **Licencia:** [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/deed.es) (dominio público).
  Se cita por cortesía.
- **Qué se les hizo** (ffmpeg): mezcla a mono del micro cercano con el de ambiente (este al 80 %),
  recorte (de 0,6 s el hi-hat a 4 s el crash) con desvanecido al final, pico a −3 dBFS y mp3 a 112 kbps.
  El volumen relativo entre piezas lo pone el motor de Banda.
