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
