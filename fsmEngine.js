export class FSMEngine {
  constructor() {
    this.currentState = 'HABITUACION';
    this.hudText = document.querySelector('#hud-system');
    this.avatarMesh = document.querySelector('#avatar-mesh');
    this.cameraEl = document.querySelector('#main-camera');
    this.avatarEyesEl = document.querySelector('#target-ojos-avatar');
    this.lastRenderedHUD = '';

    // Botones 3D
    this.btn3dHabituacion = document.querySelector('#btn-3d-habituacion');
    this.btn3dFinalizar = document.querySelector('#btn-3d-finalizar');
    this.btn3dSimular = document.querySelector('#btn-3d-simular');

    // Botones 2D de respaldo
    this.btn2dHabituacion = document.querySelector('#btn-habituacion');
    this.btn2dFinalizar = document.querySelector('#btn-finalizar-respuesta');
    this.btn2dSimular = document.querySelector('#btn-simular-texto');

    // Banco de preguntas adaptativo por nivel de dificultad de la FSM
    this.bancoPreguntas = {
      Inicial: [
        'Hola, bienvenido. Para empezar, cuentame quien eres, cual es tu formacion y que te motiva a postularte.',
        'Cuentame sobre un proyecto academico o laboral en el que hayas participado. Cual fue tu tarea principal?',
        'Como organizas tus actividades diarias cuando tienes varias entregas pendientes?'
      ],
      Intermedio: [
        'Describeme un problema tecnico o operativo dificil que hayas resuelto. Que acciones tomaste y cual fue el resultado?',
        'Cuentame sobre un desacuerdo o tension dentro de un equipo de trabajo. Como lo gestionaste y que lograste?',
        'Relata una ocasion en la que tuviste que aprender una herramienta nueva bajo presion para cumplir una meta.'
      ],
      Avanzado: [
        'Describe una decision critica donde tuviste que equilibrar tiempo, calidad y recursos limitados. Que impacto medible tuvo?',
        'Cuentame sobre un fallo o desviacion grave en un proyecto bajo tu responsabilidad. Como lo mitigaste y que metricas mejoraron despues?',
        'Como has liderado o influido en un equipo multidisciplinario para sacar adelante un objetivo estrategico complejo?'
      ]
    };

    this.totalPreguntasSesion = 3;
    this.preguntaActualIndex = 0;
    this.preguntaActualTexto = '';
    this.preguntasUsadas = new Set();
    this.resultadosPorPregunta = [];

    // Estado adaptativo de la FSM
    this.nivelInicialFSM = 'Inicial';
    this.nivelActualFSM = 'Inicial';

    // Reconocimiento de Voz (STT) y Grabación Universal
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.fatalSTTError = false;
    this.finalTranscript = '';
    this.latestLiveTranscript = '';
    this.interimFillerPeak = 0;
    this.confirmedInterimFillers = 0;

    // Análisis Acústico, Latencia Cognitiva y Pausas de Silencio (> 2.5s)
    this.audioStream = null;
    this.audioContext = null;
    this.micAnimationFrame = null;
    this.micBar = '|-----';
    this.answerStartTime = 0;
    this.firstSpeechTime = null;
    this.prolongedSilenceMs = 0;
    this.totalAudioFrames = 0;
    this.activeVoiceFrames = 0;
    this.vocalHesitations = 0;

    // Seguimiento de Contacto Visual (Gaze Tracking)
    this.gazeInterval = null;
    this.totalGazeSamples = 0;
    this.eyeContactSamples = 0;
    this.isLookingAtInterviewer = true;
    this.cachedEyeTargetPos = null;

    // Síntesis de Voz del Avatar (TTS)
    this.synth = window.speechSynthesis || null;
    this.selectedVoice = null;
    this.ttsFallbackTimer = null;
  }

  init() {
    this.setupTextToSpeech();
    this.setupSpeechRecognition();
    this.bindEvents();
    this.transitionTo('HABITUACION');
  }

  sanitizeForAFrame(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿¡]/g, '');
  }

  seleccionarPreguntaAdaptativa() {
    const pool = this.bancoPreguntas[this.nivelActualFSM] || this.bancoPreguntas.Inicial;
    const disponibles = pool.filter((p) => !this.preguntasUsadas.has(p));
    const seleccionada = disponibles.length > 0 ? disponibles[0] : pool[this.preguntaActualIndex % pool.length];
    this.preguntasUsadas.add(seleccionada);
    this.preguntaActualTexto = seleccionada;
    return seleccionada;
  }

  actualizarNivelAdaptativoFSM(ultimoPuntaje) {
    const niveles = ['Inicial', 'Intermedio', 'Avanzado'];
    const idx = niveles.indexOf(this.nivelActualFSM);

    if (ultimoPuntaje >= 72 && idx < niveles.length - 1) {
      this.nivelActualFSM = niveles[idx + 1];
    } else if (ultimoPuntaje < 48 && idx > 0) {
      this.nivelActualFSM = niveles[idx - 1];
    }
  }

  getAvatarEyeWorldPosition(outVec) {
    if (this.cachedEyeTargetPos) {
      return outVec.copy(this.cachedEyeTargetPos);
    }

    if (this.avatarMesh && this.avatarMesh.object3D) {
      this.avatarMesh.object3D.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(this.avatarMesh.object3D);
      if (!box.isEmpty() && box.max.y - box.min.y > 0.5) {
        const centerX = (box.min.x + box.max.x) * 0.5;
        const centerZ = (box.min.z + box.max.z) * 0.5;
        const eyeY = box.min.y + (box.max.y - box.min.y) * 0.88;
        this.cachedEyeTargetPos = new THREE.Vector3(centerX, eyeY, centerZ);
        return outVec.copy(this.cachedEyeTargetPos);
      }
    }

    if (this.avatarEyesEl && this.avatarEyesEl.object3D) {
      this.avatarEyesEl.object3D.getWorldPosition(outVec);
      if (outVec.y > 1.0) {
        this.cachedEyeTargetPos = outVec.clone();
        return outVec;
      }
    }

    return outVec.set(-0.45, 1.55, -2.3);
  }

  startEyeContactTracking() {
    this.stopEyeContactTracking();
    if (!this.cameraEl || typeof THREE === 'undefined') return;

    const camPos = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const targetPos = new THREE.Vector3();

    this.gazeInterval = setInterval(() => {
      if (this.currentState !== 'PREGUNTA_RECLUTADOR' && this.currentState !== 'RESPUESTA_CANDIDATO') {
        return;
      }

      const cameraObj = this.cameraEl.getObject3D('camera');
      if (!cameraObj) return;

      cameraObj.getWorldPosition(camPos);
      cameraObj.getWorldDirection(camDir);
      this.getAvatarEyeWorldPosition(targetPos);

      const toTarget = targetPos.sub(camPos).normalize();
      const alignment = camDir.dot(toTarget);

      this.totalGazeSamples++;
      const lookingNow = alignment >= 0.895;
      if (lookingNow) {
        this.eyeContactSamples++;
      }

      if (this.isLookingAtInterviewer !== lookingNow) {
        this.isLookingAtInterviewer = lookingNow;
        if (this.currentState === 'RESPUESTA_CANDIDATO') {
          this.renderCandidateHUD();
        }
      }
    }, 150);
  }

  stopEyeContactTracking() {
    if (this.gazeInterval) {
      clearInterval(this.gazeInterval);
      this.gazeInterval = null;
    }
  }

  setupTextToSpeech() {
    if (!this.synth) return;

    const loadVoices = () => {
      const voices = this.synth.getVoices();
      if (!voices.length) return;
      const spanishVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
      this.selectedVoice =
        spanishVoices.find((v) => /jorge|alvaro|pablo|diego|raul|male|hombre/i.test(v.name)) ||
        spanishVoices[0] ||
        null;
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  speakQuestion(text, onComplete) {
    if (this.ttsFallbackTimer) clearTimeout(this.ttsFallbackTimer);
    if (this.synth) {
      this.synth.cancel();
      if (this.synth.paused) this.synth.resume();
    }

    this.setAvatarTalkingState(true);

    const estimatedDuration = Math.max(4500, text.length * 78);
    let completed = false;

    const finishSpeaking = () => {
      if (completed) return;
      completed = true;
      if (this.ttsFallbackTimer) clearTimeout(this.ttsFallbackTimer);
      this.setAvatarTalkingState(false);
      if (onComplete) onComplete();
    };

    this.ttsFallbackTimer = setTimeout(finishSpeaking, estimatedDuration + 2000);

    if (!this.synth) {
      setTimeout(finishSpeaking, 3500);
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      if (this.selectedVoice) utterance.voice = this.selectedVoice;

      utterance.onend = finishSpeaking;
      utterance.onerror = () => finishSpeaking();

      this.synth.speak(utterance);
    } catch (e) {
      finishSpeaking();
    }
  }

  setAvatarTalkingState(isTalking) {
    if (!this.avatarMesh) return;
    const mesh = this.avatarMesh.getObject3D('mesh');
    if (!mesh || !mesh.animations || mesh.animations.length <= 1) return;

    const talkClip = mesh.animations.find((a) => /talk|speak|habla/i.test(a.name));
    const idleClip = mesh.animations.find((a) => /idle|espera|stand/i.test(a.name));

    if (isTalking && talkClip) {
      this.avatarMesh.setAttribute('animation-mixer', { clip: talkClip.name, crossFadeDuration: 0.3 });
    } else if (!isTalking && idleClip) {
      this.avatarMesh.setAttribute('animation-mixer', { clip: idleClip.name, crossFadeDuration: 0.3 });
    }
  }

  contarMuletillasEnTexto(texto) {
    if (!texto) return 0;
    const limpio = this.sanitizeForAFrame(texto.toLowerCase());
    const regexMuletillas =
      /\b(e+h+|e+m+|m+m+|a+m+|u+m+|u+h+|h+m+|e+s+t+e+|o sea|digamos|como que|bueno|pues|tipo|entonces|basicamente|literal|la verdad|es decir|sabes|verdad|aja)\b/g;
    const matches = limpio.match(regexMuletillas);
    return matches ? matches.length : 0;
  }

  setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.fatalSTTError = true;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-CO';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => {
      if (!this.isRecording || this.currentState !== 'RESPUESTA_CANDIDATO') return;

      if (this.firstSpeechTime === null) {
        this.firstSpeechTime = performance.now();
      }

      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
          const finalCount = this.contarMuletillasEnTexto(transcript);
          this.confirmedInterimFillers += Math.max(finalCount, this.interimFillerPeak);
          this.interimFillerPeak = 0;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        const currentInterimCount = this.contarMuletillasEnTexto(interimTranscript);
        if (currentInterimCount > this.interimFillerPeak) {
          this.interimFillerPeak = currentInterimCount;
        }
      }

      this.latestLiveTranscript = (this.finalTranscript + interimTranscript).trim();
      this.renderCandidateHUD();
    };

    this.recognition.onerror = (event) => {
      if (event.error === 'network' || event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.fatalSTTError = true;
        this.renderCandidateHUD();
      }
    };

    this.recognition.onend = () => {
      if (this.isRecording && !this.fatalSTTError && this.currentState === 'RESPUESTA_CANDIDATO') {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };
  }

  renderCandidateHUD() {
    if (this.currentState !== 'RESPUESTA_CANDIDATO') return;

    const num = this.preguntaActualIndex + 1;
    const total = this.totalPreguntasSesion;
    const gazeTag = this.isLookingAtInterviewer ? 'Ojos: OK' : 'Mira al avatar';

    if (this.latestLiveTranscript) {
      const visibleSpeech =
        this.latestLiveTranscript.length > 165
          ? '...' + this.latestLiveTranscript.slice(-165)
          : this.latestLiveTranscript;

      this.updateHUD(`TURNO (${num}/${total}) [${this.micBar}] ${gazeTag}\n\n"${visibleSpeech}"`);
    } else {
      const estadoVoz = this.fatalSTTError ? 'Modo acustico activo' : 'Habla ahora...';
      this.updateHUD(
        `TURNO (${num}/${total}) [${this.micBar}] ${gazeTag}\n\n"${this.preguntaActualTexto}"\n\n[${estadoVoz}]`
      );
    }
  }

  bindEvents() {
    const handleStart = async () => {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach((track) => track.stop());

        this.fatalSTTError = false;
        this.preguntaActualIndex = 0;
        this.preguntasUsadas.clear();
        this.resultadosPorPregunta = [];
        this.nivelInicialFSM = 'Inicial';
        this.nivelActualFSM = 'Inicial';
        this.totalGazeSamples = 0;
        this.eyeContactSamples = 0;
        this.cachedEyeTargetPos = null;
        this.startEyeContactTracking();
        this.transitionTo('PREGUNTA_RECLUTADOR');
      } catch (err) {
        this.updateHUD('NO SE DETECTO MICROFONO\n\nRevisa permisos o usa "Texto Ejemplo".');
        this.toggleButtons({ habituacion: false, finalizar: false, simular: true });
      }
    };

    const handleFinishAnswer = () => {
      const textoCapturado = (this.latestLiveTranscript || this.finalTranscript).trim();
      const muletillasTexto = Math.max(
        this.contarMuletillasEnTexto(textoCapturado),
        this.confirmedInterimFillers + this.interimFillerPeak
      );
      const metricas = this.calcularMetricasRespuesta(
        textoCapturado,
        false,
        muletillasTexto,
        this.vocalHesitations
      );
      this.resultadosPorPregunta.push(metricas);
      this.stopRecording();
      this.actualizarNivelAdaptativoFSM(metricas.puntaje);
      this.avanzarSiguientePaso();
    };

    const handleSimulateAnswer = () => {
      const textoSimulado =
        'Cuando lideraba el proyecto de migracion web tenia como objetivo reducir fallos; implemente pruebas automatizadas y logre bajar los errores en un 45 porciento.';
      const metricas = this.calcularMetricasRespuesta(textoSimulado, true, 0, 0);
      this.resultadosPorPregunta.push(metricas);
      this.stopRecording();
      this.actualizarNivelAdaptativoFSM(metricas.puntaje);
      this.avanzarSiguientePaso();
    };

    [this.btn3dHabituacion, this.btn2dHabituacion].forEach((btn) => {
      if (btn) btn.addEventListener('click', handleStart);
    });
    [this.btn3dFinalizar, this.btn2dFinalizar].forEach((btn) => {
      if (btn) btn.addEventListener('click', handleFinishAnswer);
    });
    [this.btn3dSimular, this.btn2dSimular].forEach((btn) => {
      if (btn) btn.addEventListener('click', handleSimulateAnswer);
    });
  }

  avanzarSiguientePaso() {
    this.preguntaActualIndex++;
    if (this.preguntaActualIndex < this.totalPreguntasSesion) {
      this.transitionTo('PREGUNTA_RECLUTADOR');
    } else {
      this.stopEyeContactTracking();
      this.transitionTo('EVALUACION');
    }
  }

  async startRecording() {
    this.finalTranscript = '';
    this.latestLiveTranscript = '';
    this.interimFillerPeak = 0;
    this.confirmedInterimFillers = 0;
    this.audioChunks = [];
    this.totalAudioFrames = 0;
    this.activeVoiceFrames = 0;
    this.vocalHesitations = 0;
    this.answerStartTime = performance.now();
    this.firstSpeechTime = null;
    this.prolongedSilenceMs = 0;
    this.isRecording = true;

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (window.MediaRecorder) {
        this.mediaRecorder = new MediaRecorder(this.audioStream);
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) this.audioChunks.push(e.data);
        };
        this.mediaRecorder.start();
      }

      this.startMicVisualizer();
    } catch (e) {
      console.warn('[Audio Error]', e);
    }

    if (this.recognition && !this.fatalSTTError) {
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  startMicVisualizer() {
    if (!this.audioStream) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.audioStream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let lastTime = performance.now();
    let silenceMs = 350;
    let prolongedPauseCounted = false;
    let burstMs = 0;
    let inVoiceBurst = false;
    let pendingHesitation = null;

    const updateLevel = () => {
      if (!this.isRecording || this.currentState !== 'RESPUESTA_CANDIDATO') return;

      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const currentWordCount = this.latestLiveTranscript
        ? this.latestLiveTranscript.split(/\s+/).filter(Boolean).length
        : 0;

      if (pendingHesitation && now - pendingHesitation.time >= 700) {
        if (currentWordCount === pendingHesitation.wordCount) {
          this.vocalHesitations++;
        }
        pendingHesitation = null;
      }

      this.totalAudioFrames++;
      if (average > 14) {
        if (this.firstSpeechTime === null) {
          this.firstSpeechTime = now;
        }

        this.activeVoiceFrames++;

        if (!inVoiceBurst && silenceMs >= 300) {
          inVoiceBurst = true;
          burstMs = 0;
        }
        if (inVoiceBurst) {
          burstMs += dt;
        }
        silenceMs = 0;
        prolongedPauseCounted = false;
      } else {
        silenceMs += dt;

        if (this.firstSpeechTime !== null && silenceMs > 2500) {
          if (!prolongedPauseCounted) {
            this.prolongedSilenceMs += silenceMs;
            prolongedPauseCounted = true;
          } else {
            this.prolongedSilenceMs += dt;
          }
        }

        if (inVoiceBurst && silenceMs >= 300) {
          if (burstMs >= 180 && burstMs <= 900) {
            pendingHesitation = { time: now, wordCount: currentWordCount };
          }
          inVoiceBurst = false;
          burstMs = 0;
        }
      }

      const prevBar = this.micBar;
      if (average > 25) this.micBar = '||||||';
      else if (average > 14) this.micBar = '|||---';
      else this.micBar = '|-----';

      if (prevBar !== this.micBar) {
        this.renderCandidateHUD();
      }

      this.micAnimationFrame = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }

  stopRecording() {
    this.isRecording = false;
    this.finalTranscript = '';
    this.latestLiveTranscript = '';

    if (this.micAnimationFrame) {
      cancelAnimationFrame(this.micAnimationFrame);
      this.micAnimationFrame = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  evaluarPilaresSTAR(textoLimpio, totalPalabras, fluidezVocalPct, duracionSeg) {
    if (totalPalabras === 0) {
      const base = Math.min(75, Math.max(30, Math.round(fluidezVocalPct * 0.55 + Math.min(25, duracionSeg * 2))));
      return {
        starScore: base,
        pilares: { situacion: 15, tarea: 15, accion: 15, resultado: 0 }
      };
    }

    const kwSituacion = [
      'cuando', 'proyecto', 'empresa', 'equipo', 'cliente', 'contexto',
      'problema', 'situacion', 'momento', 'etapa', 'area', 'sistema', 'anteriormente', 'trabajaba'
    ];
    const kwTarea = [
      'objetivo', 'tenia que', 'debia', 'responsable', 'encargado', 'meta',
      'reto', 'tarea', 'necesitabamos', 'requeria', 'cargo', 'rol', 'mision', 'funcion'
    ];
    const kwAccion = [
      'implemente', 'desarrolle', 'disene', 'organice', 'lidere', 'cree',
      'analice', 'coordine', 'propuse', 'ejecute', 'construi', 'optimice', 'hice', 'gestione', 'comunique', 'resolvi'
    ];
    const kwResultado = [
      'resultado', 'logre', 'reduje', 'aumente', 'mejore', 'exito',
      'porciento', '%', 'ahorro', 'eficiencia', 'entrega', 'impacto', 'satisfaccion', 'consegui', 'finalmente'
    ];

    const scorePilar = (keywords, extraMatch = false) => {
      const hits = keywords.filter((kw) => textoLimpio.includes(kw)).length + (extraMatch ? 1 : 0);
      if (hits >= 2) return 25;
      if (hits === 1) return 18;
      return totalPalabras >= 18 ? 8 : 0;
    };

    const tieneNumeros = /\b\d+\b/.test(textoLimpio);

    const situacion = scorePilar(kwSituacion);
    const tarea = scorePilar(kwTarea);
    const accion = scorePilar(kwAccion);
    const resultado = scorePilar(kwResultado, tieneNumeros);

    return {
      starScore: situacion + tarea + accion + resultado,
      pilares: { situacion, tarea, accion, resultado }
    };
  }

  calcularMetricasRespuesta(texto, esSimulado, muletillasTexto = 0, hesitacionesAcusticas = 0) {
    const now = performance.now();
    const duracionSeg = esSimulado
      ? 14
      : Math.max(2, Math.round((now - this.answerStartTime) / 1000));

    const reaccionSeg = esSimulado
      ? 1.2
      : this.firstSpeechTime !== null
      ? +Math.max(0.2, (this.firstSpeechTime - this.answerStartTime) / 1000).toFixed(1)
      : duracionSeg;

    const pausasProlongadasSeg = esSimulado
      ? 0.0
      : +(this.prolongedSilenceMs / 1000).toFixed(1);

    const fluidezVocalPct = esSimulado
      ? 88
      : this.totalAudioFrames > 0
      ? Math.min(100, Math.round((this.activeVoiceFrames / this.totalAudioFrames) * 140))
      : 0;

    const palabras = texto ? texto.split(/\s+/).filter(Boolean) : [];
    const totalPalabras = palabras.length;
    const wpm = totalPalabras > 0 ? Math.round((totalPalabras / duracionSeg) * 60) : 0;

    const textoLimpio = this.sanitizeForAFrame(texto.toLowerCase());
    const muletillas = muletillasTexto + hesitacionesAcusticas;
    const tasaMuletillasMin = duracionSeg > 0 ? +(muletillas / (duracionSeg / 60)).toFixed(1) : 0;

    const { starScore, pilares } = this.evaluarPilaresSTAR(
      textoLimpio,
      totalPalabras,
      fluidezVocalPct,
      duracionSeg
    );

    let puntaje = Math.round(starScore * 0.45 + fluidezVocalPct * 0.25);
    if (totalPalabras > 0) {
      if (wpm >= 100 && wpm <= 165) puntaje += 20;
      else if (wpm >= 70) puntaje += 12;
      else puntaje += 5;
    } else {
      puntaje += Math.min(20, duracionSeg * 2);
    }

    if (reaccionSeg <= 2.5) puntaje += 10;
    else if (reaccionSeg > 4.5) puntaje -= 8;

    puntaje -= Math.min(15, Math.round(pausasProlongadasSeg * 2));
    puntaje -= Math.min(18, Math.round(tasaMuletillasMin * 2.5));

    return {
      duracionSeg,
      reaccionSeg,
      pausasProlongadasSeg,
      fluidezVocalPct,
      totalPalabras,
      wpm,
      muletillas,
      tasaMuletillasMin,
      starScore,
      pilares,
      puntaje: Math.max(0, Math.min(100, puntaje))
    };
  }

  generarResumenFinal() {
    const n = this.resultadosPorPregunta.length || 1;

    let avgPuntaje = Math.round(
      this.resultadosPorPregunta.reduce((acc, r) => acc + r.puntaje, 0) / n
    );
    const avgStar = Math.round(
      this.resultadosPorPregunta.reduce((acc, r) => acc + r.starScore, 0) / n
    );
    const avgReaccion = (
      this.resultadosPorPregunta.reduce((acc, r) => acc + r.reaccionSeg, 0) / n
    ).toFixed(1);
    const totalPausasProlongadas = this.resultadosPorPregunta
      .reduce((acc, r) => acc + r.pausasProlongadasSeg, 0)
      .toFixed(1);
    const avgFluidez = Math.round(
      this.resultadosPorPregunta.reduce((acc, r) => acc + r.fluidezVocalPct, 0) / n
    );

    const totalMuletillas = this.resultadosPorPregunta.reduce((acc, r) => acc + r.muletillas, 0);
    const totalDuracionSeg = this.resultadosPorPregunta.reduce((acc, r) => acc + r.duracionSeg, 0);
    const tasaMuletillasMin =
      totalDuracionSeg > 0 ? (totalMuletillas / (totalDuracionSeg / 60)).toFixed(1) : '0.0';

    const respuestasConTexto = this.resultadosPorPregunta.filter((r) => r.totalPalabras > 0);
    const avgWpm = respuestasConTexto.length
      ? Math.round(respuestasConTexto.reduce((acc, r) => acc + r.wpm, 0) / respuestasConTexto.length)
      : 0;

    const avgPilares = {
      Situacion: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.situacion, 0) / n,
      Tarea: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.tarea, 0) / n,
      Accion: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.accion, 0) / n,
      'Resultado medible': this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.resultado, 0) / n
    };

    let pilarFaltante = 'Ninguno (Completo)';
    let menorPuntajePilar = 25;
    for (const [nombre, valor] of Object.entries(avgPilares)) {
      if (valor < menorPuntajePilar) {
        menorPuntajePilar = valor;
        pilarFaltante = nombre;
      }
    }
    const detalleStar = menorPuntajePilar < 16 ? `Falto: ${pilarFaltante}` : 'Pilares completos';

    const contactoVisualPct =
      this.totalGazeSamples > 0
        ? Math.round((this.eyeContactSamples / this.totalGazeSamples) * 100)
        : 0;

    if (contactoVisualPct >= 65) avgPuntaje = Math.min(100, avgPuntaje + 5);
    else if (contactoVisualPct < 35) avgPuntaje = Math.max(0, avgPuntaje - 8);

    const ritmoTexto = avgWpm > 0 ? `${avgWpm} ppm` : 'Modo acustico';
    const nivelProgresion = `${this.nivelInicialFSM} -> ${this.nivelActualFSM}`;

    let consejo = 'Excelente estructura STAR, ritmo y contacto visual.';
    if (contactoVisualPct < 45) {
      consejo = 'Manten mayor contacto visual mirando al entrevistador.';
    } else if (parseFloat(tasaMuletillasMin) >= 4.0) {
      consejo = `Reduce la tasa de muletillas (${tasaMuletillasMin}/min).`;
    } else if (parseFloat(avgReaccion) > 3.5 || parseFloat(totalPausasProlongadas) > 5.0) {
      consejo = 'Agiliza tu tiempo de reaccion y evita silencios mayores a 2.5s.';
    } else if (menorPuntajePilar < 16) {
      consejo = `Refuerza la estructura STAR: falto definir ${pilarFaltante}.`;
    }

    const textoHUD =
      `RESULTADOS ENTREVISTA\n\n` +
      `Global: ${avgPuntaje}/100 | Ojos: ${contactoVisualPct}%\n` +
      `STAR: ${avgStar}/100 (${detalleStar})\n` +
      `Reaccion: ${avgReaccion}s | Pausas >2.5s: ${totalPausasProlongadas}s\n` +
      `Muletillas: ${tasaMuletillasMin}/min (${totalMuletillas})\n` +
      `Fluidez: ${avgFluidez}% | Ritmo: ${ritmoTexto}\n` +
      `Nivel FSM: ${nivelProgresion}\n\n` +
      `Feedback: ${consejo}`;

    const textoVoz =
      `Hemos terminado la entrevista. Tu puntaje global es de ${avgPuntaje} sobre 100, ` +
      `con ${avgStar} puntos en estructura STAR y un ${contactoVisualPct} por ciento de contacto visual. ` +
      `Alcanzaste el nivel ${this.nivelActualFSM}. ${consejo}`;

    return { textoHUD, textoVoz };
  }

  transitionTo(newState) {
    this.currentState = newState;

    switch (newState) {
      case 'HABITUACION':
        this.isRecording = false;
        this.stopEyeContactTracking();
        this.updateHUD('FASE DE HABITUACION TECNICA\n\nHaz clic en el boton para probar el microfono e iniciar');
        this.toggleButtons({ habituacion: true, finalizar: false, simular: false });
        break;

      case 'PREGUNTA_RECLUTADOR': {
        this.isRecording = false;
        const num = this.preguntaActualIndex + 1;
        const total = this.totalPreguntasSesion;
        const preguntaActual = this.seleccionarPreguntaAdaptativa();

        this.toggleButtons({ habituacion: false, finalizar: false, simular: false });
        this.updateHUD(
          `ENTREVISTADOR (${num}/${total}) [${this.nivelActualFSM}]:\n\n"${preguntaActual}"\n\n[Escuchando al reclutador...]`
        );

        this.speakQuestion(preguntaActual, () => {
          if (this.currentState === 'PREGUNTA_RECLUTADOR') {
            this.transitionTo('RESPUESTA_CANDIDATO');
          }
        });
        break;
      }

      case 'RESPUESTA_CANDIDATO': {
        this.toggleButtons({ habituacion: false, finalizar: true, simular: true });
        this.startRecording();
        this.renderCandidateHUD();
        break;
      }

      case 'EVALUACION': {
        this.isRecording = false;
        this.stopEyeContactTracking();
        const { textoHUD, textoVoz } = this.generarResumenFinal();
        this.updateHUD(textoHUD);
        this.toggleButtons({ habituacion: true, finalizar: false, simular: false });
        this.speakQuestion(textoVoz);
        break;
      }
    }
  }

  updateHUD(text) {
    if (!this.hudText) return;
    const cleanText = this.sanitizeForAFrame(text);
    if (cleanText === this.lastRenderedHUD) return;
    this.lastRenderedHUD = cleanText;

    // Ajusta el ancho de lectura para que todas las métricas quepan completas dentro del FOV de Quest 2
    this.hudText.setAttribute('text', {
      value: cleanText,
      width: 1.08,
      wrapCount: 28,
      align: 'center'
    });
  }

  toggleButtons({ habituacion, finalizar, simular }) {
    this.set3DButtonState(this.btn3dHabituacion, habituacion);
    this.set3DButtonState(this.btn3dFinalizar, finalizar);
    this.set3DButtonState(this.btn3dSimular, simular);

    if (this.btn2dHabituacion) this.btn2dHabituacion.style.display = habituacion ? 'inline-block' : 'none';
    if (this.btn2dFinalizar) this.btn2dFinalizar.style.display = finalizar ? 'inline-block' : 'none';
    if (this.btn2dSimular) this.btn2dSimular.style.display = simular ? 'inline-block' : 'none';
  }

  set3DButtonState(el, isVisible) {
    if (!el) return;
    el.setAttribute('visible', isVisible);
    if (isVisible) {
      el.classList.add('raycastable');
    } else {
      el.classList.remove('raycastable');
    }
  }
}
