/**
 * fsmEngine.js - Motor FSM con Medición de Contacto Visual (Gaze Tracking 3D) y UI Glass
 */
import { TTSEngine } from './ttsEngine.js';
import { STTEngine } from './sttEngine.js';
import { NLPEngine } from './nlpEngine.js';

export const ESTADOS = {
  HABITUACION: 'ESTADO_HABITUACION',
  SALUDO: 'ESTADO_SALUDO',
  PREGUNTA_BASE: 'ESTADO_PREGUNTA_BASE',
  ESCUCHA: 'ESTADO_ESCUCHA',
  EVALUACION: 'ESTADO_EVALUACION',
  RAMIFICACION: 'ESTADO_RAMIFICACION',
  CIERRE: 'ESTADO_CIERRE'
};

export class FSMEngine {
  constructor() {
    this.estadoActual = ESTADOS.HABITUACION;
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.iniciandoHabituacion = false;
    
    this.tts = new TTSEngine();
    this.stt = new STTEngine();
    this.nlp = new NLPEngine();

    this.bancoPreguntas = [
      {
        id: 1,
        categoria: "Resolucion de Problemas Tecnicos",
        pregunta: "Cuentame sobre una situacion en la que resolviste un problema tecnico complejo. Cual era la situacion, que accion realizaste tu y cual fue el resultado?"
      },
      {
        id: 2,
        categoria: "Trabajo en Equipo y Conflictos",
        pregunta: "Describe una situacion en la que tuviste un desacuerdo tecnico con un compañero. Como manejaste la situacion, que accion tomaste y cual fue el resultado?"
      },
      {
        id: 3,
        categoria: "Adaptabilidad y Prioridades",
        pregunta: "Hablame de una ocasion en la que los requerimientos de un proyecto cambiaron a ultimo momento. Cual era la situacion, como actuaste y cual fue el resultado final?"
      }
    ];

    this.indicePreguntaActual = 0;
    this.historialEvaluaciones = [];
    
    this.tiempoInicioRespuesta = 0;
    this.intervaloHablaAvatar = null;
    this.intervaloHUDVUMeter = null;
    
    // VARIABLES PARA GAZE TRACKING 3D (CONTACTO VISUAL)
    this.intervaloGazeTracking = null;
    this.framesContactoVisual = 0;
    this.framesTotalesEscucha = 0;
    this.porcentajeContactoVisual = 0;
  }

  init() {
    this.actualizarHUD("FASE DE HABITUACION TECNICA\nHaz clic en el boton burbuja para probar el microfono");
    this.subscribirEventosUI();
  }

  subscribirEventosUI() {
    const dispararHabituacion = () => {
      if (!this.iniciandoHabituacion) {
        this.iniciandoHabituacion = true;
        this.toggleBoton3D('#btn-3d-habituacion', false);
        const btn2D = document.querySelector('#btn-habituacion');
        if (btn2D) btn2D.style.display = 'none';
        
        this.ejecutarPruebaMicrofono();
      }
    };

    const dispararFinalizar = () => {
      if (this.estadoActual === ESTADOS.ESCUCHA) {
        this.finalizarCapturaRespuesta();
      }
    };

    const dispararSimular = () => {
      if (this.estadoActual === ESTADOS.ESCUCHA) {
        this.stt.transcripcionCompleta = "En mi proyecto la situacion era un problema critico. Mi tarea era solucionarlo. La accion que tome fue implementar una solucion estructurada y el resultado fue 100% exitoso.";
        this.stt.latenciaCognitivaSeg = 1.35;
        this.stt.analizarMuletillas(this.stt.transcripcionCompleta);
        this.finalizarCapturaRespuesta();
      }
    };

    document.querySelector('#btn-habituacion')?.addEventListener('click', dispararHabituacion);
    document.querySelector('#btn-finalizar-respuesta')?.addEventListener('click', dispararFinalizar);
    document.querySelector('#btn-simular-texto')?.addEventListener('click', dispararSimular);

    document.querySelector('#btn-3d-habituacion')?.addEventListener('click', dispararHabituacion);
    document.querySelector('#btn-3d-finalizar')?.addEventListener('click', dispararFinalizar);
    document.querySelector('#btn-3d-simular')?.addEventListener('click', dispararSimular);
  }

  toggleBoton3D(selector, visible) {
    const el = document.querySelector(selector);
    if (!el) return;
    el.setAttribute('visible', visible ? 'true' : 'false');
    if (visible) el.classList.add('raycastable');
    else el.classList.remove('raycastable');
  }

  transicionA(nuevoEstado, payload = {}) {
    if (this.estadoActual === nuevoEstado && nuevoEstado !== ESTADOS.PREGUNTA_BASE) return;
    console.log(`[FSM Transición] ${this.estadoActual} ===> ${nuevoEstado}`);
    this.estadoActual = nuevoEstado;
    this.onCambioEstado(nuevoEstado, payload);
  }

  onCambioEstado(nuevoEstado, payload) {
    switch (nuevoEstado) {

      case ESTADOS.HABITUACION:
        this.actualizarHUD("Fase de Habituacion Tecnica");
        break;

      case ESTADOS.SALUDO:
        const saludo = "Hola, bienvenido al simulador. Realizaremos tres preguntas para evaluar tu perfil.";
        this.actualizarHUD("ENTREVISTADOR:\n\"" + saludo + "\"");
        
        this.tts.hablar(
          saludo, 
          () => this.iniciarAnimacionHablaAvatar(), 
          () => {
            this.detenerAnimacionHablaAvatar();
            setTimeout(() => this.transicionA(ESTADOS.PREGUNTA_BASE), 1000);
          }
        );
        break;

      case ESTADOS.PREGUNTA_BASE:
        const qObj = this.bancoPreguntas[this.indicePreguntaActual];
        const numPreg = this.indicePreguntaActual + 1;
        
        this.actualizarHUD(`PREGUNTA ${numPreg} DE 3 [${qObj.categoria}]:\n"${qObj.pregunta}"`);
        
        this.tts.hablar(
          qObj.pregunta, 
          () => this.iniciarAnimacionHablaAvatar(), 
          () => {
            this.detenerAnimacionHablaAvatar();
            this.actualizarHUD(`ESPERANDO RESPUESTA P${numPreg}...\n(Preparando tu turno)`);
            setTimeout(() => this.transicionA(ESTADOS.ESCUCHA), 1200);
          }
        );
        break;

      case ESTADOS.ESCUCHA:
        const btnFinalizar2D = document.querySelector('#btn-finalizar-respuesta');
        const btnSimular2D = document.querySelector('#btn-simular-texto');
        if (btnFinalizar2D) btnFinalizar2D.style.display = 'inline-block';
        if (btnSimular2D) btnSimular2D.style.display = 'inline-block';

        this.toggleBoton3D('#btn-3d-finalizar', true);
        this.toggleBoton3D('#btn-3d-simular', true);

        // Reiniciar métricas de Gaze Tracking para esta ronda
        this.framesContactoVisual = 0;
        this.framesTotalesEscucha = 0;
        this.iniciarGazeTracking();

        this.tiempoInicioRespuesta = performance.now();
        this.stt.iniciarCaptura();
        this.iniciarHUDVUMeter();
        break;

      case ESTADOS.EVALUACION:
        this.detenerGazeTracking();
        if (this.intervaloHUDVUMeter) clearInterval(this.intervaloHUDVUMeter);
        
        const btnFin2D = document.querySelector('#btn-finalizar-respuesta');
        const btnSim2D = document.querySelector('#btn-simular-texto');
        if (btnFin2D) btnFin2D.style.display = 'none';
        if (btnSim2D) btnSim2D.style.display = 'none';

        this.toggleBoton3D('#btn-3d-finalizar', false);
        this.toggleBoton3D('#btn-3d-simular', false);

        // Adjuntar porcentaje de contacto visual a la evaluación
        payload.porcentajeContactoVisual = this.porcentajeContactoVisual;
        const evalNLP = this.nlp.evaluarRespuesta(payload);
        
        this.historialEvaluaciones.push({
          pregunta: this.bancoPreguntas[this.indicePreguntaActual].categoria,
          eval: evalNLP,
          metricas: payload
        });

        const numP = this.indicePreguntaActual + 1;
        this.actualizarHUD(
          `EVALUACION PREGUNTA ${numP} / 3:\n` +
          `* INDICE RONDA: ${evalNLP.indiceGlobal} / 100 PTS\n` +
          `* STAR: ${evalNLP.puntajeSTAR}% | Fluidez: ${evalNLP.puntajeFluidez}%\n` +
          `* Contacto Visual: ${this.porcentajeContactoVisual}% | Lat: ${payload.latenciaCognitivaSeg || 1.35}s`
        );

        setTimeout(() => {
          this.transicionA(ESTADOS.RAMIFICACION, evalNLP);
        }, 3500);
        break;

      case ESTADOS.RAMIFICACION:
        const feedback = payload.mensajeFeedback;
        this.actualizarHUD(`FEEDBACK AVATAR:\n${feedback}`);

        this.tts.hablar(
          feedback, 
          () => this.iniciarAnimacionHablaAvatar(), 
          () => {
            this.detenerAnimacionHablaAvatar();
            
            if (this.indicePreguntaActual < this.bancoPreguntas.length - 1) {
              this.indicePreguntaActual++;
              setTimeout(() => this.transicionA(ESTADOS.PREGUNTA_BASE), 1500);
            } else {
              setTimeout(() => this.transicionA(ESTADOS.CIERRE), 1500);
            }
          }
        );
        break;

      case ESTADOS.CIERRE:
        const totalEvaluaciones = this.historialEvaluaciones.length;
        const sumaGlobal = this.historialEvaluaciones.reduce((acc, curr) => acc + curr.eval.indiceGlobal, 0);
        const promedioGlobal = Math.round(sumaGlobal / (totalEvaluaciones || 1));

        const sumaSTAR = this.historialEvaluaciones.reduce((acc, curr) => acc + curr.eval.puntajeSTAR, 0);
        const promedioSTAR = Math.round(sumaSTAR / (totalEvaluaciones || 1));

        const sumaGaze = this.historialEvaluaciones.reduce((acc, curr) => acc + (curr.metricas.porcentajeContactoVisual || 0), 0);
        const promedioGaze = Math.round(sumaGaze / (totalEvaluaciones || 1));

        this.actualizarHUD(
          `REPORTES EXECUTIVE FINAL (3 RONDAS):\n` +
          `* INDICE GLOBAL PROMEDIO: ${promedioGlobal} / 100 PTS\n` +
          `* Coherencia STAR: ${promedioSTAR}% | Contacto Visual: ${promedioGaze}%\n` +
          `* Sesion VR Completada Exitosamente.`
        );
        break;

      default:
        console.log(`[FSM] Estado alcanzado: ${nuevoEstado}`);
    }
  }

  /**
   * Módulo de Contacto Visual 3D por Producto Escalar (Vectorial)
   */
  iniciarGazeTracking() {
    const cameraEl = document.querySelector('#main-camera');
    if (!cameraEl) return;

    this.intervaloGazeTracking = setInterval(() => {
      if (this.estadoActual !== ESTADOS.ESCUCHA) return;

      const cameraObj = cameraEl.object3D;
      
      // Vector de dirección de la cámara (Forward Vector)
      const camDir = new THREE.Vector3();
      cameraObj.getWorldDirection(camDir);
      camDir.negate(); // Invertir vector Z nativo de THREE.js

      // Vector desde la cámara hacia los ojos del entrevistador (0, 1.42, -2.4)
      const camPos = new THREE.Vector3();
      cameraObj.getWorldPosition(camPos);
      const targetPos = new THREE.Vector3(0, 1.42, -2.4);
      const targetDir = new THREE.Vector3().subVectors(targetPos, camPos).normalize();

      // Cálculo del ángulo mediante Producto Escalar (Dot Product)
      const dot = camDir.dot(targetDir);
      const anguloDeg = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

      this.framesTotalesEscucha++;
      // Si la mirada está dentro de un cono focal de 22 grados, se considera contacto visual directo
      if (anguloDeg < 22) {
        this.framesContactoVisual++;
      }

      this.porcentajeContactoVisual = Math.round((this.framesContactoVisual / (this.framesTotalesEscucha || 1)) * 100);
    }, 100);
  }

  detenerGazeTracking() {
    if (this.intervaloGazeTracking) clearInterval(this.intervaloGazeTracking);
  }

  iniciarHUDVUMeter() {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.intervaloHUDVUMeter = setInterval(() => {
      if (this.estadoActual !== ESTADOS.ESCUCHA) return;

      this.analyser.getByteFrequencyData(dataArray);
      let suma = 0;
      for (let i = 0; i < bufferLength; i++) suma += dataArray[i];
      const vol = Math.floor((suma / bufferLength) / 6);
      const barras = "|".repeat(Math.min(vol, 10));

      const lat = this.stt.latenciaCognitivaSeg > 0 ? `${this.stt.latenciaCognitivaSeg}s` : "Midiendo...";
      const mul = this.stt.totalMuletillas;
      const eye = `${this.porcentajeContactoVisual}%`;
      const txt = this.sanearTexto(this.stt.transcripcionCompleta);
      const txtTrunc = txt.length > 20 ? '...' + txt.slice(-20) : (txt || 'Escuchando...');

      const pNum = this.indicePreguntaActual + 1;
      this.actualizarHUD(
        `🎯 TURNO [P${pNum}/3] [ ${barras} ] | Visual: ${eye}\n` +
        `Latencia: ${lat} | Muletillas: ${mul}\n` +
        `Texto: "${txtTrunc}"`
      );
    }, 100);
  }

  finalizarCapturaRespuesta() {
    const duracionTotalSeg = parseFloat(((performance.now() - this.tiempoInicioRespuesta) / 1000).toFixed(2));
    this.stt.detenerCaptura();

    if (!this.stt.transcripcionCompleta.trim()) {
      const entradaManual = prompt(`Ingresa tu respuesta para la Pregunta ${this.indicePreguntaActual + 1}:`);
      if (entradaManual) {
        this.stt.transcripcionCompleta = entradaManual;
        this.stt.analizarMuletillas(entradaManual);
      }
    }

    const metricas = this.stt.obtenerResultados(duracionTotalSeg);
    this.transicionA(ESTADOS.EVALUACION, metricas);
  }

  async ejecutarPruebaMicrofono() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.stt.setAudioAnalyser(this.analyser, this.audioContext);

      this.actualizarHUD("MICROFONO DETECTADO CORRECTAMENTE\nIniciando entrevista...");
      setTimeout(() => this.transicionA(ESTADOS.SALUDO), 1200);

    } catch (error) {
      console.error('[Audio Error]', error);
      this.actualizarHUD("ERROR: Permiso de microfono denegado.");
    }
  }

  iniciarAnimacionHablaAvatar() {
    const avatar = document.querySelector('#avatar-entrevistador');
    if (!avatar) return;
    let toggle = false;
    this.intervaloHablaAvatar = setInterval(() => {
      toggle = !toggle;
      avatar.setAttribute('rotation', `0 ${toggle ? 1.5 : -1.5} 0`);
    }, 250);
  }

  detenerAnimacionHablaAvatar() {
    if (this.intervaloHablaAvatar) clearInterval(this.intervaloHablaAvatar);
    const avatar = document.querySelector('#avatar-entrevistador');
    if (avatar) avatar.setAttribute('rotation', '0 0 0');
  }

  sanearTexto(str) {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ñ/g, "n")
      .replace(/Ñ/g, "N");
  }

  actualizarHUD(texto) {
    const hud = document.querySelector('#hud-system');
    if (hud) hud.setAttribute('text', 'value', this.sanearTexto(texto));
  }
}