/**
 * nlpEngine.js - Evaluador NLP de Metodología S.T.A.R. Multidimensional
 */

export class NLPEngine {
  constructor() {
    // Diccionarios léxico-semánticos ampliados para las 3 preguntas
    this.lexicoSTAR = {
      situacion: [
        'situacion', 'problema', 'contexto', 'cliente', 'proyecto', 'empresa', 
        'se cayo', 'se presento', 'error', 'falla', 'dificultad', 'caso', 'sistema',
        'desacuerdo', 'conflicto', 'companero', 'equipo', 'cambio', 'requerimiento', 'tiempo'
      ],
      tarea: [
        'tarea', 'objetivo', 'meta', 'debia', 'correspondia', 'responsabilidad',
        'encargado', 'desafio', 'reto', 'asignaron', 'tenia que', 'rol', 'prioridad'
      ],
      accion: [
        'accion', 'hice', 'desarrolle', 'implemente', 'migre', 'solucione', 
        'ejecute', 'cree', 'revisar', 'modifique', 'escribi', 'programe', 'tome',
        'hable', 'negocie', 'ajuste', 'reorganice', 'propuse'
      ],
      resultado: [
        'resultado', 'impacto', 'logramos', 'incremento', 'redujo', 'recupero', 
        'exito', 'porcentaje', 'por ciento', 'mejora', 'optimo', 'conseguimos', 'recuperacion', 'rendimiento',
        'entregamos', 'acordamos', 'finalizo'
      ]
    };
  }

  evaluarRespuesta(metricasSTT) {
    const text = (metricasSTT.transcripcion || "").toLowerCase();
    const textoLimpio = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. EVALUACIÓN S.T.A.R. (50% del peso total)
    const desgloseSTAR = {
      situacion: this.verificarPilar(textoLimpio, this.lexicoSTAR.situacion),
      tarea: this.verificarPilar(textoLimpio, this.lexicoSTAR.tarea),
      accion: this.verificarPilar(textoLimpio, this.lexicoSTAR.accion),
      resultado: this.verificarPilar(textoLimpio, this.lexicoSTAR.resultado)
    };

    let pilaresCount = 0;
    if (desgloseSTAR.situacion) pilaresCount++;
    if (desgloseSTAR.tarea) pilaresCount++;
    if (desgloseSTAR.accion) pilaresCount++;
    if (desgloseSTAR.resultado) pilaresCount++;

    const puntajeSTAR = pilaresCount * 25;

    // 2. EVALUACIÓN DE FLUIDEZ VERBAL (30% del peso total)
    const tasa = metricasSTT.tasaMuletillasMin || 0;
    let puntajeFluidez = Math.max(0, 100 - Math.round(tasa * 12));

    // 3. EVALUACIÓN DE LATENCIA COGNITIVA (20% del peso total)
    let latencia = metricasSTT.latenciaCognitivaSeg || 0;
    if (latencia === 0) latencia = 1.45;
    let puntajeLatencia = 100;

    if (latencia > 3.5) {
      puntajeLatencia = Math.max(0, 100 - Math.round((latencia - 3.5) * 15));
    } else if (latencia < 0.8 && latencia > 0) {
      puntajeLatencia = 80;
    }

    // 4. ÍNDICE GLOBAL DE DESEMPEÑO
    const indiceGlobal = Math.round(
      (puntajeSTAR * 0.50) + (puntajeFluidez * 0.30) + (puntajeLatencia * 0.20)
    );

    // 5. FEEDBACK ADAPTATIVO
    let tipoRamificacion = '';
    let mensajeFeedback = '';

    if (indiceGlobal >= 75) {
      tipoRamificacion = 'ALTA_COMPLEJIDAD';
      mensajeFeedback = "Excelente estructuración S.T.A.R. Demostraste gran claridad y métricas en tu respuesta.";
    } else if (indiceGlobal >= 50) {
      tipoRamificacion = 'DEEP_DIVE';
      mensajeFeedback = "Buena respuesta. Intenta incluir más datos numéricos sobre el resultado obtenido.";
    } else {
      tipoRamificacion = 'REORIENTACION';
      mensajeFeedback = "Recuerda estructurar tu respuesta en 4 partes: Situación, Tarea, Acción y Resultado.";
    }

    return {
      desgloseSTAR,
      puntajeSTAR,
      puntajeFluidez,
      puntajeLatencia,
      indiceGlobal,
      tipoRamificacion,
      mensajeFeedback
    };
  }

  verificarPilar(texto, palabrasClave) {
    return palabrasClave.some(palabra => texto.includes(palabra));
  }
}