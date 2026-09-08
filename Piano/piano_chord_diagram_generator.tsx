import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Download, Image as ImageIcon, PenTool, Play, Volume2, Plus, Minus, ListMusic, Trash2, ListPlus, PlayCircle, GripVertical, X, Clock, Repeat, Square, Save, XCircle, Activity, Layers, Maximize, Minimize, FileText, FileDown } from 'lucide-react';

// Constants for keys and chords
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHORD_TYPES = {
  'Major': [0, 4, 7],
  'Minor': [0, 3, 7],
  'Diminished': [0, 3, 6],
  'Augmented': [0, 4, 8],
  'Sus2': [0, 2, 7],
  'Sus4': [0, 5, 7],
  'Major 7': [0, 4, 7, 11],
  'Minor 7': [0, 3, 7, 10],
  'Dominant 7': [0, 4, 7, 10],
  'Diminished 7': [0, 3, 6, 9],
  'Half-Diminished 7': [0, 3, 6, 10],
  'Major 6': [0, 4, 7, 9],
  'Minor 6': [0, 3, 7, 9],
  'Major 9': [0, 2, 4, 7, 11],
  'Minor 9': [0, 2, 3, 7, 10],
  'Dominant 9': [0, 2, 4, 7, 10],
  'Dom 7#9': [0, 3, 4, 7, 10],
  'Dom 7b9': [0, 1, 4, 7, 10],
  'Add 9': [0, 2, 4, 7]
};

// Piano SVG constants
const WHITE_KEY_WIDTH = 40;
const WHITE_KEY_HEIGHT = 150;
const BLACK_KEY_WIDTH = 24;
const BLACK_KEY_HEIGHT = 90;

const identifyChord = (activeNotes) => {
  if (!activeNotes || activeNotes.length === 0) return "Ninguna nota seleccionada";
  if (activeNotes.length === 1) return `Nota ${NOTES[activeNotes[0] % 12]}`;

  // Reduce to base pitches (0-11) and remove octaves/duplicates
  const uniquePitches = [...new Set(activeNotes.map(n => n % 12))].sort((a, b) => a - b);
  let detected = [];

  // Check each pitch as a potential root
  for (let root of uniquePitches) {
    let intervals = uniquePitches.map(p => (p - root + 12) % 12).sort((a,b) => a-b);
    for (const [typeName, typeIntervals] of Object.entries(CHORD_TYPES)) {
      if (JSON.stringify(intervals) === JSON.stringify(typeIntervals)) {
         detected.push(`${NOTES[root]} ${typeName}`);
      }
    }
  }
  return detected.length > 0 ? detected.join(' / ') : "Acorde Personalizado / Invertido";
};

const loadJsPDF = () => {
  return new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => resolve(window.jspdf);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const LeadSheetSVG = React.forwardRef(({ title, songKey, chords }, ref) => {
  const cells = Array.from({ length: 32 }); // Grilla de 4 columnas x 8 filas = 32 casillas
  return (
    <svg ref={ref} viewBox="0 0 840 1188" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', background: '#ffffff', width: '100%', height: 'auto' }}>
      <rect width="100%" height="100%" fill="#ffffff" />
      
      {/* Cabecera de Partitura Rediseñada */}
      <text x="420" y="80" fontFamily="Helvetica, Arial, sans-serif" fontSize="42" fontWeight="bold" textAnchor="middle" fill="#0f172a">{title || 'Sin Título'}</text>
      
      <rect x="40" y="105" width="760" height="1" fill="#e2e8f0" />
      
      <text x="40" y="130" fontFamily="Helvetica, Arial, sans-serif" fontSize="14" fontWeight="bold" fill="#64748b">TONALIDAD: <tspan fill="#0f172a">{songKey || 'N/A'}</tspan></text>
      <text x="800" y="130" fontFamily="Helvetica, Arial, sans-serif" fontSize="14" textAnchor="end" fill="#94a3b8">Generado con Piano Chords Generator</text>
      
      <rect x="40" y="145" width="760" height="2" fill="#0f172a" />

      {/* Grilla 4x8 (Calculada para encajar perfecto en A4) */}
      {cells.map((_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const xBase = 40;
        const yBase = 175;
        const cellW = 175;  // Ancho exacto calculado
        const cellH = 105;  // Alto optimizado
        const gapX = 20;
        const gapY = 20;
        const x = xBase + col * (cellW + gapX);
        const y = yBase + row * (cellH + gapY);
        const chord = chords[i];

        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            {chord ? (
              <>
                {/* Fondo y borde de celda limpia */}
                <rect width={cellW} height={cellH} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" rx="6" />
                
                {/* Etiqueta de la Parte (Intro, Coro, etc) */}
                {chord.partName && (
                  <g transform="translate(0, -12)">
                    <rect width="65" height="20" fill="#0f172a" rx="4" />
                    <text x="32.5" y="14" fontFamily="Helvetica, Arial, sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#ffffff" letterSpacing="0.5">{chord.partName.toUpperCase()}</text>
                  </g>
                )}
                
                {/* Nombre del Acorde */}
                <text x={cellW/2} y="32" fontFamily="Helvetica, Arial, sans-serif" fontSize="24" fontWeight="800" textAnchor="middle" fill="#0f172a">{chord.name}</text>
                
                {/* Duración (Discreta abajo a la derecha) */}
                <text x={cellW - 10} y="95" fontFamily="monospace" fontSize="14" fontWeight="bold" textAnchor="end" fill="#64748b">{chord.duration}T</text>
                
                {/* Renderizar mini piano más estilizado */}
                {(() => {
                  const activeNotes = chord.notes || [];
                  const minNote = activeNotes.length > 0 ? Math.min(...activeNotes) : 0;
                  const startKey = Math.max(0, Math.floor(minNote / 12) * 12);
                  const octaves = 2; 
                  const wKeyWidth = 9;
                  const bKeyWidth = 5;
                  const wKeyHeight = 38;
                  const bKeyHeight = 22;

                  const keys = [];
                  let wIndex = 0;
                  for (let k = 0; k < octaves * 12; k++) {
                    const note = startKey + k;
                    const isBlack = [1, 3, 6, 8, 10].includes(note % 12);
                    if (isBlack) {
                      keys.push({ type: 'black', x: wIndex * wKeyWidth - (bKeyWidth/2), note });
                    } else {
                      keys.push({ type: 'white', x: wIndex * wKeyWidth, note });
                      wIndex++;
                    }
                  }

                  const totalWidth = wIndex * wKeyWidth; // 14 * 9 = 126
                  const offsetX = (cellW - totalWidth) / 2; 
                  const offsetY = 45; 

                  return (
                    <g transform={`translate(${offsetX}, ${offsetY})`}>
                      <rect width={totalWidth} height={wKeyHeight} fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" rx="2" />
                      {keys.filter(k => k.type === 'white').map((k, idx) => (
                        <rect key={`w-${idx}`} x={k.x} y="0" width={wKeyWidth} height={wKeyHeight} fill={activeNotes.includes(k.note) ? '#c7d2fe' : '#ffffff'} stroke="#94a3b8" strokeWidth="0.5" />
                      ))}
                      {keys.filter(k => k.type === 'black').map((k, idx) => (
                        <rect key={`b-${idx}`} x={k.x} y="0" width={bKeyWidth} height={bKeyHeight} fill={activeNotes.includes(k.note) ? '#4f46e5' : '#1e293b'} rx="1" />
                      ))}
                    </g>
                  );
                })()}
              </>
            ) : (
              // Celda vacía con diseño sutil
              <rect width={cellW} height={cellH} fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="6, 6" rx="6" />
            )}
          </g>
        );
      })}
      
      {/* Pie de página de la grilla */}
      <rect x="40" y="1150" width="760" height="1" fill="#e2e8f0" />
    </svg>
  );
});

// --- NUEVO COMPONENTE: Mini Diagrama de Piano para las tarjetas ---
const MiniPiano = ({ activeNotes }) => {
  const minNote = activeNotes.length > 0 ? Math.min(...activeNotes) : 0;
  // Centrar el mini-piano en la octava del acorde seleccionado
  const startKey = Math.max(0, Math.floor(minNote / 12) * 12);
  const octaves = 2; // Renderizar 2 octavas para mantenerlo compacto
  const keys = [];
  let wIndex = 0;

  for (let i = 0; i < octaves * 12; i++) {
    const note = startKey + i;
    const noteIndex = note % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
    if (isBlack) {
      keys.push({ type: 'black', x: wIndex * 12 - 4, note });
    } else {
      keys.push({ type: 'white', x: wIndex * 12, note });
      wIndex++;
    }
  }

  const totalWidth = wIndex * 12;

  return (
    <svg viewBox={`0 0 ${totalWidth} 40`} className="block w-full max-w-[200px] h-auto mx-auto mt-2 mb-1 rounded opacity-90 transition-opacity group-hover:opacity-100 drop-shadow-sm">
      <rect width="100%" height="100%" fill="#f9fafb" />
      {keys.filter(k => k.type === 'white').map((key, i) => (
         <rect key={`w-${i}`} x={key.x} y={0} width={12} height={40} fill={activeNotes.includes(key.note) ? '#818cf8' : '#ffffff'} stroke="#d1d5db" strokeWidth="1" />
      ))}
      {keys.filter(k => k.type === 'black').map((key, i) => (
         <rect key={`b-${i}`} x={key.x} y={0} width={7} height={24} fill={activeNotes.includes(key.note) ? '#4f46e5' : '#1f2937'} />
      ))}
    </svg>
  );
};

const App = () => {
  const [renderedOctaves, setRenderedOctaves] = useState(2);
  const [startingOctave, setStartingOctave] = useState(4);
  const [activeNotes, setActiveNotes] = useState([0, 4, 7]); // C Major default
  const [detectedName, setDetectedName] = useState('C Major');
  
  const [rootNote, setRootNote] = useState('C');
  const [chordType, setChordType] = useState('Major');
  
  // --- Estados Modo Simple ---
  const [progression, setProgression] = useState([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [rhythmStyle, setRhythmStyle] = useState('block');
  const [bpm, setBpm] = useState(120);
  
  // --- Estados Modo Avanzado ---
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [parts, setParts] = useState([
    { id: 'part-1', name: 'Parte A', repeats: 1, bpm: 120, rhythmStyle: 'block', chords: [] }
  ]);
  const [activePartId, setActivePartId] = useState('part-1');

  // --- Estados Globales Reproducción ---
  const [isPlayingProgression, setIsPlayingProgression] = useState(false);
  const [editingChordId, setEditingChordId] = useState(null);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [isLooping, setIsLooping] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('Mi Canción');
  const [sheetKey, setSheetKey] = useState('Do Mayor');
  const sheetSvgRef = useRef(null);

  const svgRef = useRef(null);
  const audioCtxRef = useRef(null);
  const isPlayingRef = useRef(false);

  const { pianoKeys, totalWhiteKeys } = useMemo(() => {
    const keys = [];
    let wIndex = 0;
    const totalNotes = renderedOctaves * 12;
    
    for (let i = 0; i < totalNotes; i++) {
      const noteIndex = i % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
      
      if (isBlack) {
        keys.push({
          type: 'black',
          x: wIndex * WHITE_KEY_WIDTH - (BLACK_KEY_WIDTH / 2),
          note: i
        });
      } else {
        keys.push({
          type: 'white',
          x: wIndex * WHITE_KEY_WIDTH,
          note: i
        });
        wIndex++;
      }
    }
    return { pianoKeys: keys, totalWhiteKeys: wIndex };
  }, [renderedOctaves]);

  useEffect(() => {
    setDetectedName(identifyChord(activeNotes));
  }, [activeNotes]);

  const toggleAdvancedMode = () => {
    // Si entramos al modo avanzado por primera vez y tenemos acordes en la progresión simple, los migramos
    if (!isAdvancedMode && parts[0].chords.length === 0 && progression.length > 0) {
      setParts([{ ...parts[0], chords: [...progression], bpm, rhythmStyle }]);
    }
    setIsAdvancedMode(!isAdvancedMode);
  };

  const playSingleNote = (noteIndex) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    const midiNote = noteIndex + ((startingOctave + 1) * 12);
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 1.0);
  };

  const toggleNote = (note) => {
    setActiveNotes(prev => {
      if (prev.includes(note)) return prev.filter(n => n !== note);
      playSingleNote(note); 
      return [...prev, note].sort((a,b) => a-b);
    });
  };

  const handleBuildChord = (root, type) => {
    setRootNote(root);
    setChordType(type);
    const rootIndex = NOTES.indexOf(root);
    const intervals = CHORD_TYPES[type];
    const calculatedNotes = intervals.map(interval => rootIndex + interval);
    setActiveNotes(calculatedNotes);
  };

  const playSound = (isArpeggio = false, notesToPlay = activeNotes) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const time = ctx.currentTime;
    const arpeggioDelay = 0.3;
    
    notesToPlay.forEach((noteIndex, i) => {
      const startTime = isArpeggio ? time + (i * arpeggioDelay) : time;
      const midiNote = noteIndex + ((startingOctave + 1) * 12);
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 1.5);
    });
  };

  const clearNotes = () => setActiveNotes([]);

  const addToProgression = () => {
    if (activeNotes.length === 0) return;
    const defaultDuration = parseInt(timeSignature.split('/')[0], 10);
    const newChord = {
      id: Date.now().toString() + Math.random().toString(),
      name: detectedName,
      notes: [...activeNotes],
      duration: defaultDuration
    };

    if (isAdvancedMode) {
      setParts(parts.map(p => 
        p.id === activePartId ? { ...p, chords: [...p.chords, newChord] } : p
      ));
    } else {
      setProgression([...progression, newChord]);
    }
  };

  // --- Funciones para Modo Simple ---
  const removeFromProgression = (id) => {
    setProgression(progression.filter(chord => chord.id !== id));
    if (editingChordId === id) setEditingChordId(null);
  };

  const updateChordDuration = (id, newDuration) => {
    setProgression(progression.map(chord => 
      chord.id === id ? { ...chord, duration: parseFloat(newDuration) || 1 } : chord
    ));
  };

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newProgression = [...progression];
    const draggedItem = newProgression[draggedItemIndex];
    newProgression.splice(draggedItemIndex, 1);
    newProgression.splice(index, 0, draggedItem);
    setProgression(newProgression);
    setDraggedItemIndex(null);
  };

  // --- Funciones para Modo Avanzado ---
  const addNewPart = () => {
    const newId = 'part-' + Date.now();
    setParts([...parts, {
      id: newId,
      name: `Parte ${String.fromCharCode(65 + parts.length)}`,
      repeats: 1,
      bpm: bpm,
      rhythmStyle: rhythmStyle,
      chords: []
    }]);
    setActivePartId(newId);
  };

  const updatePartSetting = (partId, field, value) => {
    setParts(parts.map(p => p.id === partId ? { ...p, [field]: value } : p));
  };

  const removeFromPart = (partId, chordId) => {
    setParts(parts.map(p => p.id === partId ? { ...p, chords: p.chords.filter(c => c.id !== chordId) } : p));
    if (editingChordId === chordId) setEditingChordId(null);
  };

  const updateChordDurationInPart = (partId, chordId, newDuration) => {
    setParts(parts.map(p => 
      p.id === partId ? { ...p, chords: p.chords.map(c => c.id === chordId ? { ...c, duration: parseFloat(newDuration) || 1 } : c) } : p
    ));
  };

  // --- Edición Global ---
  const loadChordToEdit = (chord) => {
    setActiveNotes(chord.notes);
    setDetectedName(chord.name);
    setEditingChordId(chord.id);
    playSound(false, chord.notes);
  };

  const saveEditedChord = () => {
    if (!editingChordId || activeNotes.length === 0) return;
    
    if (isAdvancedMode) {
      setParts(parts.map(p => ({
        ...p,
        chords: p.chords.map(c => c.id === editingChordId ? { ...c, name: detectedName, notes: [...activeNotes] } : c)
      })));
    } else {
      setProgression(progression.map(chord => 
        chord.id === editingChordId ? { ...chord, name: detectedName, notes: [...activeNotes] } : chord
      ));
    }
    setEditingChordId(null);
  };

  const cancelEdit = () => {
    setEditingChordId(null);
    clearNotes();
  };

  const playScheduledNotes = (notesArr, durationSec, offsetSec = 0) => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const time = ctx.currentTime + offsetSec;

    notesArr.forEach(noteIndex => {
      const midiNote = noteIndex + ((startingOctave + 1) * 12);
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + durationSec);
    });
  };

  const togglePlayProgression = async () => {
    if (isPlayingProgression) {
      isPlayingRef.current = false;
      setIsPlayingProgression(false);
      return;
    }

    const hasChords = isAdvancedMode ? parts.some(p => p.chords.length > 0) : progression.length > 0;
    if (!hasChords) return;
    
    setIsPlayingProgression(true);
    isPlayingRef.current = true;
    
    const playSequence = async () => {
      do {
        // En modo avanzado tocamos las partes que tengan acordes, en modo simple simulamos una parte
        const sequenceToPlay = isAdvancedMode 
          ? parts.filter(p => p.chords.length > 0)
          : [{ id: 'simple', repeats: 1, bpm: bpm, rhythmStyle: rhythmStyle, chords: progression }];

        for (const part of sequenceToPlay) {
          if (!isPlayingRef.current) return;
          
          const currentBpm = part.bpm || bpm;
          const currentStyle = part.rhythmStyle || rhythmStyle;
          const beatMs = 60000 / currentBpm;
          const beatSecs = 60 / currentBpm;

          // Repetir la parte 'x' cantidad de vueltas
          for (let r = 0; r < (part.repeats || 1); r++) {
            if (!isPlayingRef.current) return;

            for (let i = 0; i < part.chords.length; i++) {
              if (!isPlayingRef.current) return;
              
              const chord = part.chords[i];
              setActiveNotes(chord.notes);
              setDetectedName(chord.name);
              
              const sortedNotes = [...chord.notes].sort((a,b) => a-b);
              const root = sortedNotes.length > 0 ? [sortedNotes[0]] : [];
              const rest = sortedNotes.length > 1 ? sortedNotes.slice(1) : root;
              
              for(let b = 0; b < chord.duration; b++) {
                if (!isPlayingRef.current) return;

                if (currentStyle === 'block') {
                   if (b === 0) playScheduledNotes(chord.notes, chord.duration * beatSecs);
                } 
                else if (currentStyle === 'arpeggio') {
                   const n1 = sortedNotes[(b * 2) % sortedNotes.length];
                   const n2 = sortedNotes[(b * 2 + 1) % sortedNotes.length];
                   if(n1 !== undefined) playScheduledNotes([n1], beatSecs * 0.45, 0);
                   if(n2 !== undefined) playScheduledNotes([n2], beatSecs * 0.45, beatSecs * 0.5);
                } 
                else if (currentStyle === 'pop') {
                   if (b % 2 === 0 || b === 0) playScheduledNotes(root, beatSecs * 0.8, 0);
                   else playScheduledNotes(rest, beatSecs * 0.8, 0);
                } 
                else if (currentStyle === 'waltz') {
                   if (b % 3 === 0) playScheduledNotes(root, beatSecs * 0.8, 0);
                   else playScheduledNotes(rest, beatSecs * 0.8, 0);
                }
                else if (currentStyle === 'alberti') {
                   const low = sortedNotes[0];
                   const mid = sortedNotes[1] || sortedNotes[0];
                   const high = sortedNotes[2] || sortedNotes[1] || sortedNotes[0];
                   if (b % 2 === 0) {
                       if (low !== undefined) playScheduledNotes([low], beatSecs * 0.45, 0);
                       if (high !== undefined) playScheduledNotes([high], beatSecs * 0.45, beatSecs * 0.5);
                   } else {
                       if (mid !== undefined) playScheduledNotes([mid], beatSecs * 0.45, 0);
                       if (high !== undefined) playScheduledNotes([high], beatSecs * 0.45, beatSecs * 0.5);
                   }
                }
                else if (currentStyle === 'reggae') {
                   if (b % 2 === 0) playScheduledNotes(root, beatSecs * 0.5, 0); 
                   playScheduledNotes(rest.length > 0 ? rest : root, beatSecs * 0.35, beatSecs * 0.5);
                }
                else if (currentStyle === 'disco') {
                   playScheduledNotes(root, beatSecs * 0.6, 0);
                   playScheduledNotes(rest.length > 0 ? rest : root, beatSecs * 0.4, beatSecs * 0.5);
                }

                let elapsed = 0;
                const step = 20; 
                while(elapsed < beatMs) {
                   if (!isPlayingRef.current) return;
                   await new Promise(resolve => setTimeout(resolve, step));
                   elapsed += step;
                }
              }
            }
          }
        }
      } while (isLooping && isPlayingRef.current);
      
      setIsPlayingProgression(false);
      isPlayingRef.current = false;
      clearNotes();
    };
    
    playSequence();
  };

  const triggerDownload = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilenamePrefix = () => {
    return detectedName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  };

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${getFilenamePrefix()}_chord.svg`);
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = 3; 
    canvas.width = (WHITE_KEY_WIDTH * totalWhiteKeys) * scale;
    canvas.height = WHITE_KEY_HEIGHT * scale;
    
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      ctx.fillStyle = 'white'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      
      const pngUrl = canvas.toDataURL('image/png');
      triggerDownload(pngUrl, `${getFilenamePrefix()}_chord.png`);
    };
    img.src = url;
  };

  const getFlattenedChords = () => {
    let flat = [];
    if (isAdvancedMode) {
      parts.forEach(part => {
        for (let r = 0; r < (part.repeats || 1); r++) {
          part.chords.forEach((chord, i) => {
            flat.push({ ...chord, partName: (r === 0 && i === 0) ? part.name : null });
          });
        }
      });
    } else {
      flat = progression.map((chord, i) => ({ ...chord, partName: i === 0 ? 'Progresión Principal' : null }));
    }
    return flat;
  };

  const exportSheetSVG = () => {
    if (!sheetSvgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(sheetSvgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(URL.createObjectURL(blob), `${sheetTitle.replace(/ /g, '_')}_Partitura.svg`);
  };

  const exportSheetPNG = () => {
    if (!sheetSvgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(sheetSvgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2.5; // Escala alta para evitar pixelación
    // Dimensiones A4 a 100dpi
    canvas.width = 840 * scale;
    canvas.height = 1188 * scale;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      triggerDownload(canvas.toDataURL('image/png'), `${sheetTitle.replace(/ /g, '_')}_Partitura.png`);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
  };

  const exportSheetPDF = async () => {
    if (!sheetSvgRef.current) return;
    try {
      const jspdfObj = await loadJsPDF();
      const svgData = new XMLSerializer().serializeToString(sheetSvgRef.current);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const scale = 2.5; 
      canvas.width = 840 * scale;
      canvas.height = 1188 * scale;
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        
        // Crear documento garantizando tamaño A4 físico (210mm x 297mm)
        const doc = new jspdfObj.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        // Mapear la imagen de manera exacta a las dimensiones del papel
        doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
        doc.save(`${sheetTitle.replace(/ /g, '_')}_Partitura.pdf`);
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
    } catch (err) {
      alert("No se pudo generar el PDF. Verifica tu conexión para descargar la librería.");
    }
  };

  const sheetChords = getFlattenedChords();

  return (
    <div className={`min-h-screen bg-gray-100 flex flex-col items-center p-2 sm:p-6 font-sans transition-all duration-300 ${isAdvancedMode ? 'justify-start' : 'justify-center'}`}>
      <div className={`bg-white rounded-2xl shadow-xl overflow-hidden w-full transition-all duration-500 flex flex-col ${isAdvancedMode ? 'max-w-[98vw] min-h-[90vh]' : 'max-w-7xl'}`}>
        
        <div className="bg-indigo-600 text-white p-6 flex flex-col sm:flex-row justify-between items-center relative flex-shrink-0 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Generador de Acordes de Piano</h1>
            <p className="text-indigo-100 mt-2 hidden sm:block">Crea, detecta, escucha y exporta diagramas de acordes</p>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-emerald-500 hover:bg-emerald-600 border border-emerald-400 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              <FileText size={18}/> <span className="hidden sm:inline">Exportar Partitura</span>
            </button>
            <button
              onClick={toggleAdvancedMode}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-colors shadow-md border ${
                isAdvancedMode ? 'bg-indigo-800 hover:bg-indigo-900 border-indigo-400 text-indigo-100' : 'bg-white/20 hover:bg-white/30 border-transparent text-white'
              }`}
            >
              {isAdvancedMode ? <><Minimize size={18}/> <span className="hidden sm:inline">Modo Simple</span></> : <><Maximize size={18}/> <span className="hidden sm:inline">Producción Avanzada</span></>}
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 flex-1 flex flex-col">
          {/* Controles de Opciones Globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Construir: Raíz</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                value={rootNote}
                onChange={(e) => handleBuildChord(e.target.value, chordType)}
              >
                {NOTES.map(note => <option key={note} value={note}>{note}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Construir: Tipo</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                value={chordType}
                onChange={(e) => handleBuildChord(rootNote, e.target.value)}
              >
                {Object.keys(CHORD_TYPES).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-center">Octavas a Mostrar</label>
              <div className="flex items-center justify-between bg-white border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setRenderedOctaves(prev => Math.max(prev - 1, 1))} className="p-2 bg-gray-50 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="font-semibold text-gray-800">{renderedOctaves}</span>
                <button onClick={() => setRenderedOctaves(prev => Math.min(prev + 4, 4))} className="p-2 bg-gray-50 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 text-center">Octava Base</label>
              <div className="flex items-center justify-between bg-white border border-gray-300 rounded-lg overflow-hidden">
                <button onClick={() => setStartingOctave(prev => Math.max(prev - 1, 2))} className="p-2 bg-gray-50 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="font-semibold text-gray-800">{startingOctave}</span>
                <button onClick={() => setStartingOctave(prev => Math.min(prev + 1, 7))} className="p-2 bg-gray-50 hover:bg-gray-200 text-gray-600 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* LAYOUT PRINCIPAL DINÁMICO */}
          <div className={`flex flex-1 ${isAdvancedMode ? 'flex-col' : 'flex-col lg:flex-row'} gap-6 sm:gap-8 mb-4`}>
            
            {/* ZONA DE PIANO (Ajusta su ancho según el modo) */}
            <div className={`${isAdvancedMode ? 'w-full' : 'lg:w-2/3'} flex flex-col items-center justify-start border-b lg:border-b-0 ${!isAdvancedMode && 'lg:border-r'} border-gray-200 pb-8 lg:pb-0 lg:pr-8`}>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 w-full justify-between">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center flex-1">
                  {detectedName}
                </h2>
                
                <div className="flex flex-wrap justify-center gap-2 bg-gray-100 p-1.5 rounded-full shadow-inner">
                  <button onClick={() => playSound(false)} className="p-2 sm:p-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-full transition-colors flex items-center justify-center shadow-sm" title="Escuchar Acorde Completo"><Volume2 size={20} /></button>
                  <button onClick={() => playSound(true)} className="p-2 sm:p-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full transition-colors flex items-center justify-center shadow-sm" title="Escuchar Arpegio"><ListMusic size={20} /></button>
                  <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
                  <button onClick={clearNotes} className="p-2 sm:p-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-full transition-colors flex items-center justify-center shadow-sm" title="Limpiar Notas"><Trash2 size={20} /></button>
                  
                  {editingChordId ? (
                    <>
                      <button onClick={saveEditedChord} className="p-2 sm:p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors flex items-center justify-center shadow-md animate-pulse" title="Actualizar Acorde">
                        <Save size={20} />
                      </button>
                      <button onClick={cancelEdit} className="p-2 sm:p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors flex items-center justify-center shadow-sm" title="Cancelar Edición">
                        <XCircle size={20} />
                      </button>
                    </>
                  ) : (
                    <button onClick={addToProgression} className={`p-2 sm:p-3 rounded-full transition-colors flex items-center justify-center shadow-sm ${isAdvancedMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`} title={isAdvancedMode ? "Añadir a Parte Activa" : "Añadir a Progresión"}>
                      <ListPlus size={20} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="shadow-lg rounded-xl bg-white overflow-x-auto p-2 border border-gray-300 max-w-full">
                <svg ref={svgRef} width={WHITE_KEY_WIDTH * totalWhiteKeys} height={WHITE_KEY_HEIGHT} viewBox={`0 0 ${WHITE_KEY_WIDTH * totalWhiteKeys} ${WHITE_KEY_HEIGHT}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', minWidth: '300px' }}>
                  <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" /></filter>
                  </defs>
                  <rect width="100%" height="100%" fill="white" rx="4" />
                  
                  {pianoKeys.filter(k => k.type === 'white').map((key, index) => {
                    const isActive = activeNotes.includes(key.note);
                    return (
                      <g key={`white-${index}`} onClick={() => toggleNote(key.note)} style={{ cursor: 'pointer' }}>
                        <rect x={key.x} y={0} width={WHITE_KEY_WIDTH} height={WHITE_KEY_HEIGHT} fill={isActive ? '#818cf8' : '#ffffff'} stroke="#d1d5db" strokeWidth="1.5" rx="3" ry="3" />
                        {isActive && <circle cx={key.x + WHITE_KEY_WIDTH / 2} cy={WHITE_KEY_HEIGHT - 30} r={10} fill="#4f46e5" />}
                      </g>
                    );
                  })}
                  {pianoKeys.filter(k => k.type === 'black').map((key, index) => {
                    const isActive = activeNotes.includes(key.note);
                    return (
                      <g key={`black-${index}`} onClick={() => toggleNote(key.note)} style={{ cursor: 'pointer' }}>
                        <rect x={key.x} y={0} width={BLACK_KEY_WIDTH} height={BLACK_KEY_HEIGHT} fill={isActive ? '#4f46e5' : '#1f2937'} stroke="#111827" strokeWidth="1" rx="2" ry="2" filter="url(#shadow)" />
                        {isActive && <circle cx={key.x + BLACK_KEY_WIDTH / 2} cy={BLACK_KEY_HEIGHT - 15} r={6} fill="white" />}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Botones de Descarga en el área del piano */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
                <button onClick={downloadPNG} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg shadow transition-colors">
                  <ImageIcon size={18} /> Descargar PNG
                </button>
                <button onClick={downloadSVG} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow transition-colors">
                  <PenTool size={18} /> Descargar SVG
                </button>
              </div>
            </div>

            {/* ZONA DE PROGRESIÓN (Derecha en Simple, Abajo en Avanzado) */}
            {!isAdvancedMode ? (
              // --- INTERFAZ MODO SIMPLE ---
              <div className="lg:w-1/3 flex flex-col bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ListPlus className="text-indigo-600" /> Progresión
                  </h3>
                </div>
                
                <div className="flex flex-col gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
                  <div className="flex gap-2 w-full">
                    <div className="flex-1 flex items-center gap-2 p-1.5 bg-gray-50 border border-gray-200 rounded">
                       <Activity size={16} className="text-gray-500" />
                       <select value={rhythmStyle} onChange={(e) => setRhythmStyle(e.target.value)} className="w-full text-sm bg-transparent outline-none font-medium text-gray-700">
                         <option value="block">Bloque</option><option value="arpeggio">Arpegio</option><option value="pop">Pop</option><option value="waltz">Vals</option><option value="alberti">Alberti</option><option value="reggae">Reggae</option><option value="disco">Disco</option>
                       </select>
                    </div>
                    <div className="w-24 flex items-center gap-1 p-1.5 bg-gray-50 border border-gray-200 rounded">
                       <Clock size={16} className="text-gray-500" />
                       <input type="number" value={bpm} onChange={(e) => setBpm(Math.max(40, Math.min(240, Number(e.target.value))))} className="w-full text-sm bg-transparent text-center outline-none" title="BPM"/>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center justify-between w-full">
                    <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)} className="p-1.5 text-sm bg-gray-50 border border-gray-200 rounded outline-none font-medium text-gray-700">
                       <option value="4/4">4/4</option><option value="3/4">3/4</option><option value="6/8">6/8</option>
                     </select>
                    
                    <button onClick={() => setIsLooping(!isLooping)} className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isLooping ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Bucle">
                      <Repeat size={16} className={isLooping ? 'text-indigo-600' : 'text-gray-500'} />
                    </button>

                    <button onClick={togglePlayProgression} disabled={progression.length === 0} className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md font-medium transition-all text-sm ${progression.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : isPlayingProgression ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'}`}>
                      {isPlayingProgression ? <><Square size={14} fill="currentColor" /> Detener</> : <><PlayCircle size={16} /> Play</>}
                    </button>
                  </div>
                </div>
                
                {progression.length === 0 ? (
                  <div className="text-center py-10 px-4 text-sm text-gray-400 border-2 border-dashed border-gray-300 rounded-lg bg-white flex-1 flex flex-col justify-center">
                    Usa el botón <ListPlus size={18} className="inline mx-1 text-emerald-600" /> en el piano para añadir acordes aquí.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1 max-h-[450px]">
                    {progression.map((chord, index) => (
                      <div key={chord.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => handleDragOver(e, index)} onDrop={(e) => handleDrop(e, index)} className={`flex flex-col border-2 ${draggedItemIndex === index ? 'opacity-40 border-dashed border-indigo-400' : editingChordId === chord.id ? 'bg-blue-50 border-blue-400 shadow-md transform scale-[1.02]' : 'bg-white opacity-100 border-gray-200 hover:border-indigo-400'} rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all select-none group w-full`}>
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="cursor-grab text-gray-400 group-hover:text-indigo-400"><GripVertical size={18} /></div>
                          <button className={`font-bold text-center flex-1 mx-2 transition-colors text-sm ${editingChordId === chord.id ? 'text-blue-700' : 'text-gray-700 hover:text-indigo-600'}`} onClick={() => loadChordToEdit(chord)}>{chord.name}</button>
                          <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                            <input type="number" min="0.5" step="0.5" value={chord.duration} onChange={(e) => updateChordDuration(chord.id, e.target.value)} className="w-12 p-1 text-xs border border-gray-300 rounded text-center outline-none focus:border-indigo-500" title="Tiempos"/>
                            <span className="text-[10px] text-gray-500 font-bold">T</span>
                          </div>
                          <button onClick={() => removeFromProgression(chord.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full p-1 transition-all ml-1"><X size={16} /></button>
                        </div>
                        <div onClick={() => loadChordToEdit(chord)} className="cursor-pointer bg-gray-50 rounded p-1"><MiniPiano activeNotes={chord.notes} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // --- INTERFAZ MODO AVANZADO (PANTALLA COMPLETA) ---
              <div className="w-full bg-gray-900 rounded-xl shadow-[inset_0_4px_10px_rgba(0,0,0,0.4)] text-gray-100 flex flex-col border border-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-800/80 p-4 sm:p-5 rounded-t-xl border-b border-gray-700 gap-4">
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-indigo-100"><Layers className="text-indigo-400" /> Arreglo Multi-Parte</h3>
                    <button onClick={addNewPart} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium flex items-center gap-2 transition-colors border border-gray-600 shadow-sm text-white">
                      <Plus size={16}/> Añadir Parte
                    </button>
                  </div>
                  <div className="flex items-center gap-5 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700/50">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-gray-300 hover:text-white transition-colors">
                      <input type="checkbox" checked={isLooping} onChange={() => setIsLooping(!isLooping)} className="w-4 h-4 rounded text-indigo-500 bg-gray-800 border-gray-600 focus:ring-indigo-500" />
                      Bucle Global
                    </label>
                    <div className="w-px h-6 bg-gray-700"></div>
                    <button
                      onClick={togglePlayProgression}
                      disabled={!parts.some(p => p.chords.length > 0)}
                      className={`flex items-center gap-2 px-5 py-2 rounded-md font-bold transition-all shadow-md ${!parts.some(p => p.chords.length > 0) ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' : isPlayingProgression ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                    >
                      {isPlayingProgression ? <><Square size={16}/> Detener</> : <><PlayCircle size={18} /> Reproducir Todo</>}
                    </button>
                  </div>
                </div>

                <div className="flex gap-6 overflow-x-auto p-6 snap-x min-h-[350px]">
                  {parts.map((part, index) => (
                    <div 
                      key={part.id} 
                      className={`min-w-[320px] sm:min-w-[380px] max-w-[380px] flex flex-col bg-gray-800 rounded-xl p-5 snap-start transition-all cursor-default border-2 ${activePartId === part.id ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] scale-[1.01]' : 'border-gray-700 opacity-70 hover:opacity-100 hover:border-gray-500'} relative`}
                      onClick={() => setActivePartId(part.id)}
                    >
                      {/* Borde Superior Activo */}
                      {activePartId === part.id && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 rounded-t-xl" />
                      )}
                      
                      <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
                        <input type="text" value={part.name} onChange={e => updatePartSetting(part.id, 'name', e.target.value)} className="bg-transparent font-bold text-xl text-white outline-none w-2/3 border-b border-transparent focus:border-indigo-400 focus:bg-gray-900/50 px-1 rounded transition-colors" />
                        <button className="p-2 hover:bg-red-500/20 rounded-md text-gray-400 hover:text-red-400 transition-colors" onClick={(e) => { e.stopPropagation(); setParts(parts.filter(p => p.id !== part.id)); }} title="Eliminar Parte">
                          <Trash2 size={18}/>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="flex flex-col gap-1.5 bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Vueltas</span>
                          <div className="flex items-center justify-center font-mono">
                            <span className="text-gray-500 mr-1">x</span>
                            <input type="number" min="1" value={part.repeats} onChange={e => updatePartSetting(part.id, 'repeats', parseInt(e.target.value) || 1)} className="bg-transparent text-white w-10 text-center outline-none border-b border-gray-600 focus:border-indigo-400" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5 bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">BPM</span>
                          <input type="number" min="40" max="240" value={part.bpm} onChange={e => updatePartSetting(part.id, 'bpm', parseInt(e.target.value) || 120)} className="bg-transparent text-white font-mono w-full text-center outline-none border-b border-gray-600 focus:border-indigo-400" />
                        </div>
                        <div className="flex flex-col gap-1.5 bg-gray-900/50 p-2 rounded-lg border border-gray-700/50">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Ritmo</span>
                          <select value={part.rhythmStyle} onChange={e => updatePartSetting(part.id, 'rhythmStyle', e.target.value)} className="bg-transparent text-white text-sm font-medium w-full outline-none text-center appearance-none">
                            <option value="block" className="bg-gray-800">Bloque</option><option value="arpeggio" className="bg-gray-800">Arpegio</option><option value="pop" className="bg-gray-800">Pop</option><option value="waltz" className="bg-gray-800">Vals</option><option value="alberti" className="bg-gray-800">Alberti</option><option value="reggae" className="bg-gray-800">Reggae</option><option value="disco" className="bg-gray-800">Disco</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex-1 bg-gray-900/80 rounded-lg p-3 border border-gray-700 shadow-inner overflow-y-auto">
                        <div className="flex flex-wrap gap-2 items-start content-start">
                          {part.chords.length === 0 ? (
                            <div className="w-full h-full min-h-[100px] flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
                              {activePartId === part.id ? (
                                <><ListPlus className="text-indigo-500/50" size={24}/> Usa el piano y añade acordes</>
                              ) : (
                                "Haz clic para activar esta parte"
                              )}
                            </div>
                          ) : (
                            part.chords.map((chord, i) => (
                              <div key={chord.id} className={`bg-gray-800 border ${editingChordId === chord.id ? 'border-blue-400 bg-blue-900/30 shadow-[0_0_10px_rgba(96,165,250,0.2)]' : 'border-gray-600 hover:border-gray-400'} rounded-md p-2 flex flex-col items-center gap-1.5 w-[85px] relative group cursor-pointer transition-colors`} onClick={(e) => { e.stopPropagation(); loadChordToEdit(chord); }}>
                                <span className="text-[10px] text-gray-500 font-mono absolute top-1 left-1.5">{i+1}</span>
                                <span className="font-bold text-sm truncate w-full text-center mt-3 text-gray-100">{chord.name}</span>
                                <div className="flex items-center gap-1 bg-gray-950/50 rounded px-1.5 py-0.5 border border-gray-700">
                                  <input type="number" step="0.5" value={chord.duration} onChange={e => { e.stopPropagation(); updateChordDurationInPart(part.id, chord.id, e.target.value) }} className="w-8 bg-transparent text-xs font-mono text-center outline-none text-gray-300" />
                                  <span className="text-[9px] text-gray-500 font-bold">T</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); removeFromPart(part.id, chord.id); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"><X size={12}/></button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fantasma para Añadir Nueva Parte Rápido */}
                  <div onClick={addNewPart} className="min-w-[80px] flex flex-col items-center justify-center bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:bg-gray-800 hover:border-gray-500 transition-all text-gray-500 hover:text-gray-300 snap-start">
                    <Plus size={32} />
                    <span className="text-xs font-bold mt-2">Añadir</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden max-h-[95vh] border border-gray-200">
            <div className="bg-indigo-600 text-white p-5 flex justify-between items-center shadow-md z-10">
              <h2 className="text-xl font-bold flex items-center gap-2"><FileText /> Exportar Arreglo Completo</h2>
              <button onClick={() => setShowExportModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors"><X /></button>
            </div>
            
            <div className="p-6 flex flex-col md:flex-row gap-8 overflow-y-auto bg-gray-50 flex-1">
              <div className="w-full md:w-1/3 flex flex-col gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Información de la Partitura</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Título de la Canción</label>
                      <input type="text" value={sheetTitle} onChange={e => setSheetTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Ej: Mi Gran Obra" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Tonalidad</label>
                      <input type="text" value={sheetKey} onChange={e => setSheetKey(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Ej: Do Mayor" />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                  <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">Formatos de Descarga</h3>
                  <button onClick={exportSheetPDF} className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                    <FileDown size={18} /> Descargar PDF
                  </button>
                  <button onClick={exportSheetPNG} className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                    <ImageIcon size={18} /> Descargar PNG
                  </button>
                  <button onClick={exportSheetSVG} className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm">
                    <PenTool size={18} /> Descargar Vector (SVG)
                  </button>
                </div>
              </div>

              <div className="w-full md:w-2/3 bg-gray-200/50 rounded-xl p-4 flex justify-center items-start overflow-y-auto border border-gray-300 shadow-inner max-h-[60vh]">
                <div className="w-full max-w-[500px] shadow-2xl transition-transform hover:scale-[1.02] duration-300 cursor-crosshair">
                  <LeadSheetSVG ref={sheetSvgRef} title={sheetTitle} songKey={sheetKey} chords={sheetChords} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;