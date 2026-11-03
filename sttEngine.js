/**
 * sttEngine.js - Captura de Voz Persistente sin Pérdida de Transcripción
 */

export class STTEngine {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.soportaSTT = !!SpeechRecognition;
    this.recognition = this.soportaSTT ? new SpeechRecognition() : null;
    
    this.debeEscuchar = false;
    this.tiempoInicioEscucha = 0;
    this.latenciaCognitivaSeg = 0;
    this.primerSonidoCapturado = false;
    
    this.transcripcionCompleta = "";
    this.totalMuletillas = 0;
    
    this.audioContext = null;
    this.analyser = null;
    this.intervaloAudio = null;

    this.listaMuletillas = [
      'este', 'estee', 'esteee',
      'o sea', 'osea', 'oseaa',
      'bueno',
      'entonces',
      'digamos',
      'como',
      'aja', 'ajaa',
      'eh', 'ehh', 'ehhh',
      'em', 'emm', 'mmm',
      'es decir'
    ];

    if (this.soportaSTT) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'es-ES'; // Idioma base más estable en servidores STT
      this.configurarEventosSTT();
    }
  }

  setAudioAnalyser(analyser, audioContext) {
    this.analyser = analyser;
    this.audioContext = audioContext;
  }

  configurarEventosSTT() {
    this.recognition.onresult = (event) => {
      let acumulado = '';
      for (let i = 0; i < event.results.length; ++i) {
        acumulado += event.results[i][0].transcript + ' ';
      }

      this.transcripcionCompleta = acumulado.trim();
      this.analizarMuletillas(this.transcripcionCompleta);

      // Registrar Latencia Cognitiva en el primer fragmento de voz capturado
      if (!this.primerSonidoCapturado && this.transcripcionCompleta.length > 0) {
        const tiempoActual = performance.now();
        this.latenciaCognitivaSeg = parseFloat(((tiempoActual - this.tiempoInicioEscucha) / 1000).toFixed(2));
        this.primerSonidoCapturado = true;
      }
    };

    this.recognition.onend = () => {
      // Si el navegador cierra la conexión por pausa, la reactivamos de inmediato
      if (this.debeEscuchar) {
        try {
          this.recognition.start();
        } catch (e) {}
      }
    };

    this.recognition.onerror = (err) => {
      console.warn('[STT Error]', err.error);
    };
  }

  iniciarCaptura() {
    this.debeEscuchar = true;
    this.transcripcionCompleta = "";
    this.totalMuletillas = 0;
    this.primerSonidoCapturado = false;
    this.latenciaCognitivaSeg = 0;
    this.tiempoInicioEscucha = performance.now();

    // Detección de Latencia por Audio RMS local (Web Audio API)
    if (this.analyser) {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.intervaloAudio = setInterval(() => {
        if (this.primerSonidoCapturado) return;

        this.analyser.getByteFrequencyData(dataArray);
        let suma = 0;
        for (let i = 0; i < bufferLength; i++) suma += dataArray[i];
        const promedioVolumen = suma / bufferLength;

        if (promedioVolumen > 10) {
          const tiempoActual = performance.now();
          this.latenciaCognitivaSeg = parseFloat(((tiempoActual - this.tiempoInicioEscucha) / 1000).toFixed(2));
          this.primerSonidoCapturado = true;
          clearInterval(this.intervaloAudio);
        }
      }, 30);
    }

    if (this.soportaSTT) {
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  detenerCaptura() {
    this.debeEscuchar = false;
    if (this.intervaloAudio) clearInterval(this.intervaloAudio);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.analizarMuletillas(this.transcripcionCompleta);
  }

  analizarMuletillas(texto) {
    if (!texto) {
      this.totalMuletillas = 0;
      return;
    }

    const textoLimpio = texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ");

    const fraseNormalizada = textoLimpio.split(/\s+/).join(" ");
    let conteo = 0;

    this.listaMuletillas.forEach(muletilla => {
      const regex = new RegExp(`(?:^|\\s)${muletilla}(?=\\s|$)`, 'gi');
      const coincidencias = fraseNormalizada.match(regex);
      if (coincidencias) {
        conteo += coincidencias.length;
      }
    });

    this.totalMuletillas = conteo;
  }

  obtenerResultados(duracionTotalSegundos) {
    const duracionMin = Math.max(duracionTotalSegundos / 60, 0.05);
    const tasaMuletillasMin = parseFloat((this.totalMuletillas / duracionMin).toFixed(2));

    return {
      transcripcion: this.transcripcionCompleta,
      latenciaCognitivaSeg: this.latenciaCognitivaSeg,
      conteoMuletillas: this.totalMuletillas,
      tasaMuletillasMin: tasaMuletillasMin
    };
  }
}