export class FSMEngine {
  constructor() {
    this.currentState = 'HABITUACION';
    this.hudText = document.querySelector('#hud-system');
    this.avatarMesh = document.querySelector('#avatar-mesh');
    this.cameraEl = document.querySelector('#main-camera');
    this.avatarEyesEl = document.querySelector('#target-ojos-avatar');
    this.lastRenderedHUD = '';

    // Contenedores de botones 3D
    this.btn3dIniciar = document.querySelector('#btn-3d-habituacion');
    this.btn3dIniciarText = document.querySelector('#btn-3d-habituacion-text');
    this.opcionesContainer3D = document.querySelector('#opciones-3d-container');
    this.opcionCards = [
      {
        el: document.querySelector('#btn-opcion-0'),
        textEl: document.querySelector('#text-opcion-0')
      },
      {
        el: document.querySelector('#btn-opcion-1'),
        textEl: document.querySelector('#text-opcion-1')
      },
      {
        el: document.querySelector('#btn-opcion-2'),
        textEl: document.querySelector('#text-opcion-2')
      }
    ];

    // Controles 2D de respaldo en pantalla
    this.btn2dIniciar = document.querySelector('#btn-habituacion');
    this.opcionesContainer2D = document.querySelector('#opciones-2d-container');
    this.opcionButtons2D = [
      document.querySelector('#btn-2d-op-0'),
      document.querySelector('#btn-2d-op-1'),
      document.querySelector('#btn-2d-op-2')
    ];

    // Banco de 12 preguntas adaptativas con ruta de audio MP3 para Meta Quest 2
    this.bancoPreguntas = {
      Inicial: [
        {
          audio: './assets/audio/inicial_1.mp3',
          pregunta: 'Cuentame sobre tu perfil y que te motiva a postularte.',
          opciones: [
            {
              texto: 'Soy ingeniero; lidere 2 proyectos web y busco aportar soluciones agiles.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Estudie sistemas y me gusta programar, aunque aun defino mi enfoque.',
              pilares: { situacion: 25, tarea: 20, accion: 15, resultado: 5 },
              muletillas: 1
            },
            {
              texto: 'Eh, pues estudio sistemas y, digamos, busco trabajo a ver que sale.',
              pilares: { situacion: 15, tarea: 10, accion: 5, resultado: 0 },
              muletillas: 3
            }
          ]
        },
        {
          audio: './assets/audio/inicial_2.mp3',
          pregunta: 'Describe un proyecto academico o laboral y tu rol principal.',
          opciones: [
            {
              texto: 'En una app escolar coordine el equipo y entregamos 1 semana antes.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Participe en una pagina web haciendo el diseno y apoyando pruebas.',
              pilares: { situacion: 20, tarea: 15, accion: 22, resultado: 5 },
              muletillas: 0
            },
            {
              texto: 'Bueno, hicimos un sistema pero, como que, no recuerdo bien mi rol.',
              pilares: { situacion: 15, tarea: 5, accion: 10, resultado: 0 },
              muletillas: 3
            }
          ]
        },
        {
          audio: './assets/audio/inicial_3.mp3',
          pregunta: 'Como organizas tus tareas cuando tienes varias entregas?',
          opciones: [
            {
              texto: 'Priorizo por urgencia con tablero Kanban y cumplo 100% de los plazos.',
              pilares: { situacion: 22, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Anoto mis pendientes en una lista y avanzo segun tengo tiempo.',
              pilares: { situacion: 15, tarea: 18, accion: 20, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Pues, o sea, hago todo al final y, digamos, resuelvo sobre la marcha.',
              pilares: { situacion: 10, tarea: 10, accion: 12, resultado: 0 },
              muletillas: 3
            }
          ]
        },
        {
          audio: './assets/audio/inicial_4.mp3',
          pregunta: 'Cual consideras que es tu mayor fortaleza profesional?',
          opciones: [
            {
              texto: 'Resolucion analitica; reduje tiempos de soporte un 30% en mi practica.',
              pilares: { situacion: 22, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Soy responsable y me adapto facil cuando me asignan tareas nuevas.',
              pilares: { situacion: 15, tarea: 18, accion: 20, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Digamos que soy buena gente y, pues, intento cumplir cuando puedo.',
              pilares: { situacion: 10, tarea: 10, accion: 10, resultado: 0 },
              muletillas: 2
            }
          ]
        }
      ],
      Intermedio: [
        {
          audio: './assets/audio/intermedio_1.mp3',
          pregunta: 'Relata un problema tecnico dificil que hayas resuelto.',
          opciones: [
            {
              texto: 'Ante fallos en la API, optimice consultas SQL y baje errores un 45%.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Hubo un error en el servidor, revise el codigo y volvio a funcionar.',
              pilares: { situacion: 22, tarea: 15, accion: 22, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Eh, habia un fallo raro y, bueno, probe cosas hasta que se arreglo.',
              pilares: { situacion: 15, tarea: 8, accion: 12, resultado: 0 },
              muletillas: 3
            }
          ]
        },
        {
          audio: './assets/audio/intermedio_2.mp3',
          pregunta: 'Como gestionaste un desacuerdo dentro de tu equipo?',
          opciones: [
            {
              texto: 'Por choque de tiempos, medie acuerdos claros y cerramos a tiempo.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Hable con el equipo para escuchar sus ideas y continuar el trabajo.',
              pilares: { situacion: 15, tarea: 18, accion: 22, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Pues, como que nadie cedia, entonces deje que cada uno hiciera lo suyo.',
              pilares: { situacion: 15, tarea: 5, accion: 8, resultado: 0 },
              muletillas: 2
            }
          ]
        },
        {
          audio: './assets/audio/intermedio_3.mp3',
          pregunta: 'Cuenta una vez que aprendiste una herramienta bajo presion.',
          opciones: [
            {
              texto: 'Debia desplegar en Docker en 3 dias; segui la guia y lance sin caidas.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Vi tutoriales rapidos para entender la herramienta y entregar.',
              pilares: { situacion: 15, tarea: 20, accion: 20, resultado: 10 },
              muletillas: 0
            },
            {
              texto: 'Digamos que me toco usarla de afan y, eh, medio la configure.',
              pilares: { situacion: 12, tarea: 12, accion: 10, resultado: 0 },
              muletillas: 2
            }
          ]
        },
        {
          audio: './assets/audio/intermedio_4.mp3',
          pregunta: 'Como manejas una critica sobre un trabajo que entregaste?',
          opciones: [
            {
              texto: 'Analice el feedback del cliente, ajuste el flujo y subi la nota un 25%.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Escucho las observaciones con calma y corrijo lo que me piden.',
              pilares: { situacion: 15, tarea: 18, accion: 22, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Bueno, a veces exageran, pero igual cambio algo para no discutir.',
              pilares: { situacion: 12, tarea: 10, accion: 10, resultado: 0 },
              muletillas: 2
            }
          ]
        }
      ],
      Avanzado: [
        {
          audio: './assets/audio/avanzado_1.mp3',
          pregunta: 'Describe una decision critica con tiempo y recursos limitados.',
          opciones: [
            {
              texto: 'Priorice el modulo central y logramos 98% de aprobacion del cliente.',
              pilares: { situacion: 22, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Recorte funciones secundarias para alcanzar a presentar el sistema.',
              pilares: { situacion: 18, tarea: 20, accion: 22, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Bueno, habia poco tiempo, o sea, quitamos cosas esperando que sirviera.',
              pilares: { situacion: 15, tarea: 10, accion: 10, resultado: 0 },
              muletillas: 2
            }
          ]
        },
        {
          audio: './assets/audio/avanzado_2.mp3',
          pregunta: 'Como mitigaste una desviacion grave en un proyecto tuyo?',
          opciones: [
            {
              texto: 'Detecte atraso del 20%, reasigne tareas clave y recupere el plazo.',
              pilares: { situacion: 25, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Avise del retraso al equipo y trabajamos mas rapido para avanzar.',
              pilares: { situacion: 20, tarea: 15, accion: 20, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Eh, se nos atraso todo y, pues, tuvimos que pedir mas plazo al final.',
              pilares: { situacion: 15, tarea: 8, accion: 8, resultado: 0 },
              muletillas: 2
            }
          ]
        },
        {
          audio: './assets/audio/avanzado_3.mp3',
          pregunta: 'Como lideraste un equipo para lograr una meta compleja?',
          opciones: [
            {
              texto: 'Alinee metas semanales entre diseno y codigo, acelerando un 30%.',
              pilares: { situacion: 22, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Coordine reuniones diarias para revisar avances y resolver dudas.',
              pilares: { situacion: 15, tarea: 18, accion: 22, resultado: 8 },
              muletillas: 0
            },
            {
              texto: 'Digamos que repartia tareas y, como que, cada area veia como hacer.',
              pilares: { situacion: 12, tarea: 10, accion: 10, resultado: 0 },
              muletillas: 2
            }
          ]
        },
        {
          audio: './assets/audio/avanzado_4.mp3',
          pregunta: 'Como automatizaste o mejoraste un proceso en tu equipo?',
          opciones: [
            {
              texto: 'Cree pruebas automaticas CI/CD y reduje los despliegues fallidos 60%.',
              pilares: { situacion: 22, tarea: 25, accion: 25, resultado: 25 },
              muletillas: 0
            },
            {
              texto: 'Documente los pasos de entrega para que todos siguieran el orden.',
              pilares: { situacion: 18, tarea: 18, accion: 20, resultado: 10 },
              muletillas: 0
            },
            {
              texto: 'Pues hicimos una lista en papel y, digamos, asi nos ibamos guiando.',
              pilares: { situacion: 12, tarea: 10, accion: 10, resultado: 0 },
              muletillas: 2
            }
          ]
        }
      ]
    };

    this.totalPreguntasSesion = 4;
    this.preguntaActualIndex = 0;
    this.preguntaActualObj = null;
    this.opcionesMezcladas = [];
    this.preguntasUsadas = new Set();
    this.resultadosPorPregunta = [];

    // Estado adaptativo de la FSM
    this.nivelInicialFSM = 'Inicial';
    this.nivelActualFSM = 'Inicial';

    // Metricas de latencia cognitiva, indecision y tiempo
    this.turnStartTime = 0;
    this.hoverSwitches = 0;
    this.lastHoveredIdx = -1;
    this.questionTimer = null;

    // Seguimiento de Contacto Visual (Gaze Tracking en tiempo real)
    this.gazeInterval = null;
    this.totalGazeSamples = 0;
    this.eyeContactSamples = 0;
    this.isLookingAtInterviewer = true;
    this.cachedEyeTargetPos = null;

    // Reproductor de Voz MP3 y Web Audio API (compatible con Meta Quest 2)
    this.voicePlayer = new Audio();
    this.voicePlayer.preload = 'auto';
    this.audioCtx = null;
  }

  init() {
    this.bindEvents();
    this.transitionTo('HABITUACION');
  }

  sanitizeForAFrame(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[¿¡]/g, '');
  }

  unlockAudioSystems() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    } catch (e) {}
  }

  playTone(type) {
    try {
      this.unlockAudioSystems();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const playNote = (freq, startOffset, duration, gainVal = 0.08) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + startOffset);
        gain.gain.setValueAtTime(0.001, now + startOffset);
        gain.gain.exponentialRampToValueAtTime(gainVal, now + startOffset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + startOffset);
        osc.stop(now + startOffset + duration + 0.02);
      };

      if (type === 'question') {
        playNote(440, 0, 0.16, 0.07);
        playNote(554.37, 0.14, 0.22, 0.07);
      } else if (type === 'select') {
        playNote(659.25, 0, 0.12, 0.06);
      } else if (type === 'finish') {
        playNote(523.25, 0, 0.16, 0.08);
        playNote(659.25, 0.14, 0.16, 0.08);
        playNote(783.99, 0.28, 0.32, 0.09);
      }
    } catch (e) {}
  }

  playQuestionVoice(audioSrc, onComplete) {
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }

    let finished = false;
    const finishQuestion = () => {
      if (finished) return;
      finished = true;
      if (this.questionTimer) {
        clearTimeout(this.questionTimer);
        this.questionTimer = null;
      }
      this.voicePlayer.onended = null;
      this.voicePlayer.onerror = null;
      this.setAvatarTalkingState(false);
      if (onComplete) onComplete();
    };

    const fallbackWithoutAudio = () => {
      this.playTone('question');
      this.questionTimer = setTimeout(finishQuestion, 1800);
    };

    if (!audioSrc) {
      fallbackWithoutAudio();
      return;
    }

    try {
      this.voicePlayer.pause();
      this.voicePlayer.currentTime = 0;
      this.voicePlayer.src = audioSrc;

      // Temporizador de seguridad maximo (8s) por si el archivo tarda en responder
      this.questionTimer = setTimeout(finishQuestion, 8000);

      this.voicePlayer.onended = () => {
        finishQuestion();
      };

      this.voicePlayer.onerror = () => {
        if (this.questionTimer) clearTimeout(this.questionTimer);
        fallbackWithoutAudio();
      };

      const playPromise = this.voicePlayer.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (this.questionTimer) clearTimeout(this.questionTimer);
          fallbackWithoutAudio();
        });
      }
    } catch (e) {
      fallbackWithoutAudio();
    }
  }

  seleccionarPreguntaAdaptativa() {
    const pool = this.bancoPreguntas[this.nivelActualFSM] || this.bancoPreguntas.Inicial;
    const disponibles = pool.filter((item) => !this.preguntasUsadas.has(item.pregunta));
    const listaCandidata = disponibles.length > 0 ? disponibles : pool;
    const elegida = listaCandidata[Math.floor(Math.random() * listaCandidata.length)];

    this.preguntasUsadas.add(elegida.pregunta);
    this.preguntaActualObj = elegida;

    const copia = elegida.opciones.map((op) => ({ ...op }));
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    this.opcionesMezcladas = copia;
    return elegida;
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

    return outVec.set(-1.22, 1.40, -0.15);
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
      const lookingNow = alignment >= 0.88;
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

  renderCandidateHUD() {
    if (this.currentState !== 'RESPUESTA_CANDIDATO' || !this.preguntaActualObj) return;

    const num = this.preguntaActualIndex + 1;
    const total = this.totalPreguntasSesion;
    const gazeTag = this.isLookingAtInterviewer ? 'Ojos: OK' : 'Mira al avatar';

    this.updateHUD(
      'PREGUNTA ' + num + '/' + total + ' [' + this.nivelActualFSM + ']\n' +
      gazeTag + '\n\n' +
      '"' + this.preguntaActualObj.pregunta + '"\n\n' +
      'Elige la mejor respuesta abajo'
    );
  }

  bindEvents() {
    const handleStart = () => {
      this.unlockAudioSystems();
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
    };

    if (this.btn3dIniciar) this.btn3dIniciar.addEventListener('click', handleStart);
    if (this.btn2dIniciar) this.btn2dIniciar.addEventListener('click', handleStart);

    for (let i = 0; i < 3; i++) {
      const card3d = this.opcionCards[i]?.el;
      const btn2d = this.opcionButtons2D[i];

      if (card3d) {
        card3d.addEventListener('mouseenter', () => {
          if (this.currentState !== 'RESPUESTA_CANDIDATO') return;
          if (this.lastHoveredIdx !== -1 && this.lastHoveredIdx !== i) {
            this.hoverSwitches++;
          }
          this.lastHoveredIdx = i;
        });

        card3d.addEventListener('click', () => {
          if (this.currentState === 'RESPUESTA_CANDIDATO') {
            this.seleccionarRespuesta(i);
          }
        });
      }

      if (btn2d) {
        btn2d.addEventListener('click', () => {
          if (this.currentState === 'RESPUESTA_CANDIDATO') {
            this.seleccionarRespuesta(i);
          }
        });
      }
    }
  }

  seleccionarRespuesta(indice) {
    const opcionElegida = this.opcionesMezcladas[indice];
    if (!opcionElegida) return;

    this.playTone('select');
    const metricas = this.calcularMetricasRespuesta(opcionElegida);
    this.resultadosPorPregunta.push(metricas);
    this.actualizarNivelAdaptativoFSM(metricas.puntaje);

    this.preguntaActualIndex++;
    if (this.preguntaActualIndex < this.totalPreguntasSesion) {
      this.transitionTo('PREGUNTA_RECLUTADOR');
    } else {
      this.stopEyeContactTracking();
      this.transitionTo('EVALUACION');
    }
  }

  calcularMetricasRespuesta(opcion) {
    const now = performance.now();
    const reaccionSeg = +Math.max(0.8, (now - this.turnStartTime) / 1000).toFixed(1);

    const excesoLecturaSeg = Math.max(0, reaccionSeg - 6.5);
    const pausasIndecisionSeg = +(excesoLecturaSeg + this.hoverSwitches * 0.6).toFixed(1);

    const { situacion, tarea, accion, resultado } = opcion.pilares;
    const starScore = Math.min(100, situacion + tarea + accion + resultado);
    const muletillas = opcion.muletillas;

    let asertividadPct = 92;
    if (reaccionSeg > 12) asertividadPct -= 22;
    else if (reaccionSeg > 8) asertividadPct -= 10;
    asertividadPct -= Math.min(25, this.hoverSwitches * 6);
    asertividadPct -= muletillas * 8;
    asertividadPct = Math.max(30, Math.min(100, asertividadPct));

    let puntaje = Math.round(starScore * 0.55 + asertividadPct * 0.25);
    if (reaccionSeg <= 7.0) puntaje += 15;
    else if (reaccionSeg <= 11.0) puntaje += 8;

    puntaje -= Math.min(15, Math.round(pausasIndecisionSeg * 1.5));
    puntaje -= muletillas * 6;

    return {
      reaccionSeg,
      pausasIndecisionSeg,
      asertividadPct,
      muletillas,
      starScore,
      pilares: opcion.pilares,
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
    const totalPausas = this.resultadosPorPregunta
      .reduce((acc, r) => acc + r.pausasIndecisionSeg, 0)
      .toFixed(1);
    const avgAsertividad = Math.round(
      this.resultadosPorPregunta.reduce((acc, r) => acc + r.asertividadPct, 0) / n
    );
    const totalMuletillas = this.resultadosPorPregunta.reduce((acc, r) => acc + r.muletillas, 0);

    const avgPilares = {
      Situacion: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.situacion, 0) / n,
      Tarea: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.tarea, 0) / n,
      Accion: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.accion, 0) / n,
      Resultado: this.resultadosPorPregunta.reduce((acc, r) => acc + r.pilares.resultado, 0) / n
    };

    let pilarFaltante = 'Ninguno';
    let menorPuntajePilar = 25;
    for (const [nombre, valor] of Object.entries(avgPilares)) {
      if (valor < menorPuntajePilar) {
        menorPuntajePilar = valor;
        pilarFaltante = nombre;
      }
    }
    const detalleStar = menorPuntajePilar < 16 ? 'Falto: ' + pilarFaltante : 'Completo';

    const contactoVisualPct =
      this.totalGazeSamples > 0
        ? Math.round((this.eyeContactSamples / this.totalGazeSamples) * 100)
        : 0;

    if (contactoVisualPct >= 65) avgPuntaje = Math.min(100, avgPuntaje + 5);
    else if (contactoVisualPct < 35) avgPuntaje = Math.max(0, avgPuntaje - 8);

    const nivelProgresion = this.nivelInicialFSM + ' -> ' + this.nivelActualFSM;

    let consejo = 'Excelente estructura STAR, seguridad y contacto visual.';
    if (contactoVisualPct < 45) {
      consejo = 'Manten mas contacto visual mirando al entrevistador.';
    } else if (totalMuletillas >= 3) {
      consejo = 'Elige respuestas mas directas y sin muletillas.';
    } else if (menorPuntajePilar < 16) {
      consejo = 'Refuerza el pilar ' + pilarFaltante + ' con datos concretos.';
    } else if (parseFloat(avgReaccion) > 9.5) {
      consejo = 'Agiliza tu toma de decision al responder.';
    }

    return (
      'RESULTADOS FINALES\n\n' +
      'Global: ' + avgPuntaje + '/100 | Ojos: ' + contactoVisualPct + '%\n' +
      'STAR: ' + avgStar + '/100 (' + detalleStar + ')\n' +
      'Reaccion: ' + avgReaccion + 's | Duda: ' + totalPausas + 's\n' +
      'Asertividad: ' + avgAsertividad + '% | Muletillas: ' + totalMuletillas + '\n' +
      'Nivel FSM: ' + nivelProgresion + '\n\n' +
      'Tip: ' + consejo
    );
  }

  transitionTo(newState) {
    this.currentState = newState;
    if (this.questionTimer) {
      clearTimeout(this.questionTimer);
      this.questionTimer = null;
    }

    switch (newState) {
      case 'HABITUACION':
        this.voicePlayer.pause();
        this.stopEyeContactTracking();
        this.setAvatarTalkingState(false);
        this.updateHUD(
          'SIMULADOR DE ENTREVISTA VR\n\n' +
          'Mira al entrevistador y selecciona tus respuestas con el puntero.\n\n' +
          'Pulsa INICIAR abajo'
        );
        this.setUIState({ showStart: true, startLabel: 'INICIAR ENTREVISTA', showOptions: false });
        break;

      case 'PREGUNTA_RECLUTADOR': {
        const num = this.preguntaActualIndex + 1;
        const total = this.totalPreguntasSesion;
        const preguntaObj = this.seleccionarPreguntaAdaptativa();

        this.setAvatarTalkingState(true);
        this.setUIState({ showStart: false, showOptions: false });
        this.updateHUD(
          'ENTREVISTADOR (' + num + '/' + total + ')\n' +
          'Nivel: ' + this.nivelActualFSM + '\n\n' +
          '"' + preguntaObj.pregunta + '"'
        );

        this.playQuestionVoice(preguntaObj.audio, () => {
          if (this.currentState === 'PREGUNTA_RECLUTADOR') {
            this.transitionTo('RESPUESTA_CANDIDATO');
          }
        });
        break;
      }

      case 'RESPUESTA_CANDIDATO': {
        this.turnStartTime = performance.now();
        this.hoverSwitches = 0;
        this.lastHoveredIdx = -1;
        this.populateOptions();
        this.setUIState({ showStart: false, showOptions: true });
        this.renderCandidateHUD();
        break;
      }

      case 'EVALUACION': {
        this.voicePlayer.pause();
        this.stopEyeContactTracking();
        this.setAvatarTalkingState(false);
        this.playTone('finish');
        const resumen = this.generarResumenFinal();
        this.updateHUD(resumen);
        this.setUIState({ showStart: true, startLabel: 'REINICIAR ENTREVISTA', showOptions: false });
        break;
      }
    }
  }

  populateOptions() {
    const letras = ['A', 'B', 'C'];
    this.opcionesMezcladas.forEach((op, idx) => {
      const etiqueta = this.sanitizeForAFrame(letras[idx] + ') ' + op.texto);
      const card3d = this.opcionCards[idx];
      if (card3d?.textEl) {
        card3d.textEl.setAttribute('text', {
          value: etiqueta,
          align: 'left',
          anchor: 'center',
          width: 0.96,
          wrapCount: 46,
          color: '#FFFFFF'
        });
      }
      const btn2d = this.opcionButtons2D[idx];
      if (btn2d) {
        btn2d.textContent = etiqueta;
      }
    });
  }

  updateHUD(text) {
    if (!this.hudText) return;
    const cleanText = this.sanitizeForAFrame(text);
    if (cleanText === this.lastRenderedHUD) return;
    this.lastRenderedHUD = cleanText;

    this.hudText.setAttribute('text', {
      value: cleanText,
      align: 'center',
      width: 0.52,
      wrapCount: 26,
      color: '#F8FAFC'
    });
  }

  setUIState({ showStart, startLabel, showOptions }) {
    if (this.btn3dIniciar) {
      this.btn3dIniciar.setAttribute('visible', showStart);
      if (showStart) {
        this.btn3dIniciar.classList.add('raycastable');
        if (this.btn3dIniciarText && startLabel) {
          this.btn3dIniciarText.setAttribute('text', 'value', startLabel);
        }
      } else {
        this.btn3dIniciar.classList.remove('raycastable');
      }
    }

    if (this.opcionesContainer3D) {
      this.opcionesContainer3D.setAttribute('visible', showOptions);
    }
    this.opcionCards.forEach((card) => {
      if (!card.el) return;
      card.el.setAttribute('visible', showOptions);
      if (showOptions) {
        card.el.classList.add('raycastable');
      } else {
        card.el.classList.remove('raycastable');
      }
    });

    if (this.btn2dIniciar) {
      this.btn2dIniciar.style.display = showStart ? 'inline-block' : 'none';
      if (startLabel) this.btn2dIniciar.textContent = startLabel;
    }
    if (this.opcionesContainer2D) {
      this.opcionesContainer2D.style.display = showOptions ? 'flex' : 'none';
    }
  }
}