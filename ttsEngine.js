/**
 * ttsEngine.js - Motor TTS con Guard de Verificación de Audio Físico por Polling
 */

export class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.vozSeleccionada = null;
    this.currentUtterance = null;
    this.inicializarVoces();
  }

  inicializarVoces() {
    const seleccionarVoz = () => {
      const voces = this.synth.getVoices();
      this.vozSeleccionada = voces.find(v => 
        v.lang.startsWith('es') || v.lang.includes('es-CO') || v.lang.includes('es-MX') || v.lang.includes('es-ES')
      ) || voces[0];
      
      if (this.vozSeleccionada) {
        console.log('[TTS] Voz activa:', this.vozSeleccionada.name);
      }
    };

    seleccionarVoz();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = seleccionarVoz;
    }
  }

  hablar(texto, onStartCallback = null, onEndCallback = null) {
    if (!this.synth) {
      if (onEndCallback) onEndCallback();
      return;
    }

    this.synth.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(texto);
      this.currentUtterance = utterance;

      utterance.lang = 'es-ES';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      if (this.vozSeleccionada) {
        utterance.voice = this.vozSeleccionada;
      }

      let finProcesado = false;

      // Espera a que el hardware de audio termine de sonar físicamente
      const confirmarFinFisicoDeAudio = () => {
        if (finProcesado) return;
        
        const intervaloCheck = setInterval(() => {
          if (!this.synth.speaking) {
            clearInterval(intervaloCheck);
            finProcesado = true;
            this.currentUtterance = null;
            console.log('[TTS Physical End] Audio finalizado en altavoces.');
            if (onEndCallback) onEndCallback();
          }
        }, 100);
      };

      utterance.onstart = () => {
        console.log('[TTS Start] Avatar hablando:', texto);
        if (onStartCallback) onStartCallback();
      };

      utterance.onend = () => {
        confirmarFinFisicoDeAudio();
      };

      utterance.onerror = (err) => {
        console.warn('[TTS Warning]', err);
        confirmarFinFisicoDeAudio();
      };

      this.synth.speak(utterance);
    }, 150);
  }

  detener() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }
}