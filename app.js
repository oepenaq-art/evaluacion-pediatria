/* ========================================================
   CONFIGURACIÓN
   ======================================================== */
const SUPABASE_URL = 'https://wgsnjayvreknhsikgqbn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sp0h2Qle7Fj660C0ht9tNA_Q8edhQ68';
const GEMINI_API_KEY = 'AQ.Ab8RN6KTfz4ECPvp2KxVXb7Dwx_Jr3TAHyP5WgLVox6TkzP5xw';
const COORDINATOR_PIN = '2835';

let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) { console.error("Error Supabase:", e); }

/* ========================================================
   NIVELES DE CALIFICACIÓN
   ======================================================== */
const SCORE_LEVELS = [
    { key: 'insuficiente',  label: 'Insuficiente',  range: '0.0 – 2.9', cls: 'insuficiente'  },
    { key: 'aceptable',     label: 'Aceptable',     range: '3.0 – 3.5', cls: 'aceptable'     },
    { key: 'bueno',         label: 'Bueno',         range: '3.6 – 4.5', cls: 'bueno'         },
    { key: 'sobresaliente', label: 'Sobresaliente', range: '4.6 – 5.0', cls: 'sobresaliente'  },
    { key: 'na',            label: 'No aplica',     range: '',           cls: 'no-aplica'     }
];

const LEVEL_RANGES = {
    insuficiente:  { min: 0.0, max: 2.9, step: 0.1, default: 2.0 },
    aceptable:     { min: 3.0, max: 3.5, step: 0.1, default: 3.0 },
    bueno:         { min: 3.6, max: 4.5, step: 0.1, default: 4.0 },
    sobresaliente: { min: 4.6, max: 5.0, step: 0.1, default: 5.0 },
    na:            { min: 0,   max: 0,   step: 0,   default: null }
};

const itemSelections = {};

/* ========================================================
   ASIGNATURAS Y RÚBRICA
   ======================================================== */
const subjectsYear1 = [
    "Atención del parto y cuidados básicos del recién nacido",
    "Seguimiento del niño y el adolescente sano y en riesgo",
    "Psiquiatría pediátrica",
    "Hospitalización pediátrica tercer nivel fundamentación",
    "Neumología y alergología pediátrica",
    "Neurología y rehabilitación pediátrica"
];

const rubricStructure = [
    {
        category: "Conocimientos académicos (25%)",
        items: [{
            id: "c_acad", title: "Conocimientos académicos",
            desc: "Nivel de actualización, organización y lectura crítica de la evidencia.",
            weight: 0.25,
            details: {
                insuficiente:  "Conocimientos desactualizados, desorganizados o inconsistentes para su nivel; no aplica ni contrasta con evidencia científica.",
                aceptable:     "Conocimientos básicos para su nivel, con aplicabilidad limitada; lectura crítica ocasional de la evidencia.",
                bueno:         "Según su nivel son adecuados, organizados, consistentes y sólidos; tienen aplicabilidad y están actualizados; hace lectura crítica de la mejor evidencia.",
                sobresaliente: "Conocimientos que superan lo esperado para su nivel; integra evidencia de vanguardia y la aplica con criterio propio."
            }
        }]
    },
    {
        category: "Habilidad práctica (25%)",
        items: [
            {
                id: "h_historia", title: "Abordaje historia clínica",
                desc: "Metódica, profunda, íntegra, veraz y oportuna.", weight: 0.12,
                details: { insuficiente: "Historia clínica incompleta, desorganizada, omite datos críticos.", aceptable: "Historia clínica básica, a veces omite detalles relevantes.", bueno: "Historia metódica, profunda e íntegra.", sobresaliente: "Historia clínica excepcional, veraz, oportuna y enfocada al contexto del paciente." }
            },
            {
                id: "h_tecnico", title: "Desempeño técnico",
                desc: "Disposición, oportunidad, ingenio, recursividad, eficiencia.", weight: 0.13,
                details: { insuficiente: "Dificultad evidente en habilidades técnicas básicas.", aceptable: "Desempeño técnico aceptable pero requiere supervisión constante.", bueno: "Buen desempeño técnico, recursivo y eficiente.", sobresaliente: "Altamente ingenioso, eficiente y seguro en su desempeño técnico." }
            }
        ]
    },
    {
        category: "Criterio clínico (25%)",
        items: [
            {
                id: "cr_anamnesis", title: "Anamnesis y examen clínico",
                desc: "Ordenado, completo, con énfasis en la situación clínica.", weight: 0.05,
                details: { insuficiente: "Examen físico incompleto o sin correlación clínica.", aceptable: "Examen físico estándar, le falta énfasis en el problema actual.", bueno: "Examen ordenado y completo, dirigido a la situación.", sobresaliente: "Examen físico exhaustivo, preciso y con excelente razonamiento." }
            },
            {
                id: "cr_examenes", title: "Solicitud e interpretación de exámenes",
                desc: "Racionalidad, oportunidad, utilidad y articulación.", weight: 0.10,
                details: { insuficiente: "Solicita exámenes sin justificación o interpreta erróneamente.", aceptable: "Solicitud adecuada pero le cuesta articular los resultados.", bueno: "Uso racional y oportuno de ayudas diagnósticas.", sobresaliente: "Excelente utilidad, racionalidad y articulación clínica de los exámenes." }
            },
            {
                id: "cr_diagnostico", title: "Impresión diagnóstica y conducta terapéutica",
                desc: "Precisión, claridad, consistencia, responsabilidad.", weight: 0.10,
                details: { insuficiente: "Impresión diagnóstica errada y plan terapéutico inseguro.", aceptable: "Diagnósticos básicos correctos, plan terapéutico requiere ajustes.", bueno: "Diagnósticos precisos y conducta terapéutica consistente.", sobresaliente: "Alta precisión diagnóstica y responsabilidad en terapias complejas." }
            }
        ]
    },
    {
        category: "Compromiso (25%)",
        items: [
            {
                id: "co_seguridad", title: "Con la seguridad del paciente y su familia",
                desc: "Calidez, consideración, respeto, interés, paciencia.", weight: 0.08,
                details: { insuficiente: "Falta de empatía, irrespeta normas de seguridad.", aceptable: "Trato cordial, cumple normas básicas de seguridad.", bueno: "Trato cálido, considerado e interés genuino por el paciente.", sobresaliente: "Modelo a seguir en paciencia, respeto y seguridad del paciente." }
            },
            {
                id: "co_equipo", title: "Con el equipo de trabajo",
                desc: "Colaboración, solidaridad, respeto y lealtad.", weight: 0.08,
                details: { insuficiente: "Conflictivo, no colabora con el equipo.", aceptable: "Relación funcional con el equipo, participación pasiva.", bueno: "Colaborador, solidario y respetuoso con sus pares y superiores.", sobresaliente: "Líder positivo, fomenta la lealtad y el trabajo en equipo." }
            },
            {
                id: "co_academico", title: "Con actividades académicas e investigación",
                desc: "Interés, constancia, creatividad, puntualidad.", weight: 0.09,
                details: { insuficiente: "Impuntual, falta de interés en actividades académicas.", aceptable: "Asiste a actividades académicas pero participa poco.", bueno: "Interés constante, puntual y participativo.", sobresaliente: "Aporta creativamente, excelente nivel investigativo y académico." }
            }
        ]
    }
];

/* ========================================================
   MICROCURRÍCULOS (contexto para Gemini IA)
   ======================================================== */
const MICROCURRICULOS = {
    "Atención del parto y cuidados básicos del recién nacido": `ASIGNATURA: Atención del parto y cuidados básicos del recién nacido.
JUSTIFICACIÓN: Los pediatras deben anticipar y manejar las necesidades médicas del recién nacido a término normal y prematuro tardío en sala de partos, manejar condiciones que no requieren UCI, hacer seguimiento en alojamiento conjunto y dar manejo a condiciones del período neonatal.
COMPETENCIAS ESPECÍFICAS: Identificar y aplicar pautas basadas en evidencia para atención del recién nacido. Proporcionar atención de rutina y abordar problemas en los primeros 28 días. Asesoría en lactancia materna, uso de sucedáneos y puericultura neonatal. Juicio clínico para problemas comunes del recién nacido en el hogar. Generar confianza en padres. Direccionar tamizajes neonatales. Fisiología normal y patológica del recién nacido. Habilidades de adaptación neonatal y reanimación. Preparación del niño que requiere traslado.
SABERES ESENCIALES: Evaluación y organización del cuidado neonatal; niveles asistenciales. Hijo de madre con infección perinatal. Hijo de madre consumidora de sustancias. Embarazos múltiples. Crecimiento fetal y RCIU. Enfermedades crónicas maternas y repercusión fetal. RN con ictericia, sepsis, enterocolitis, hipoalimentación. Diagnóstico prenatal. Atención y estabilización inicial del RN. Resucitación cardiopulmonar neonatal. Examen general y valoración neurológica del neonato. Cuidados del RN normal a término y postérmino. Lactancia materna y leche de fórmula. Tamizaje y vacunación neonatal. Evaluación en alojamiento conjunto. Transporte neonatal (STABLE).
DESENLACES: Criterios de ingreso/alta en unidad de cuidado básico neonatal. Embriología y desarrollo fetal. Cambios fisiológicos del RN hasta día 28. Adaptación neonatal en sala de partos. Identificar paciente que requiere reanimación neonatal. Patologías y riesgos maternos que afectan al RN. Examen físico para variaciones normales y anomalías congénitas. Patologías en primeros 28 días. Puericultura del RN. Tamizajes necesarios. Lactancia materna. Transporte neonatal.`,

    "Seguimiento del niño y el adolescente sano y en riesgo": `ASIGNATURA: Seguimiento del niño y el adolescente sano y en riesgo.
JUSTIFICACIÓN: El cuidado ambulatorio requiere un abordaje empático e integrado entre paciente, familia y atención primaria. El pediatra debe ser facilitador clave de la atención centrada en el paciente, proporcionar cuidado ambulatorio para niños de todas las edades, identificar necesidades en el contexto comunitario y coordinar la atención integral.
COMPETENCIAS ESPECÍFICAS: Conocimiento de fisiología normal, epidemiología y estándares de práctica para todos los grupos de edad. Relación terapéutica altamente efectiva con pacientes y familias. Evaluación integral del paciente ambulatorio. Identificación de recursos y coordinación de atención. Atención primaria, seguimiento del niño sano y detección temprana de patologías. Programas de detección temprana (PAI, AIEPI, tamizaje ocular, detección temprana de cáncer). Reconocer límites de atención ambulatoria y momento de remisión. Educación en puericultura.
SABERES ESENCIALES: Patrones normales de crecimiento. Nutrición y transiciones dietéticas. Hitos del desarrollo motor, lingüístico y cognitivo. Salud socioemocional normal. Calendario de vacunación. Tamizaje apropiado para la edad. Puericultura. Orientación anticipatoria. TEA. Retraso del neurodesarrollo. Parálisis cerebral. Detección temprana de cáncer. Sospechas reumatológicas y endocrinológicas. Anomalías congénitas. Seguimiento de patologías GI, hematológica, pulmonar y nefro-urológica ambulatoria.
DESENLACES: Historia clínica completa enfocada en seguimiento del niño sano. Esquema de vacunación colombiano. Valoración nutricional completa. Estrategia AIEPI. Fisiopatología y abordaje de patologías ambulatorias. Comunicación efectiva y educativa con familias.`,

    "Psiquiatría pediátrica": `ASIGNATURA: Psiquiatría pediátrica.
JUSTIFICACIÓN: Prevalencia de trastornos mentales infantiles del 13-20%, con 4-6% graves y 10% con deterioro funcional. El 75% de los niños no recibe atención adecuada. La AAP emitió en 2019 competencias de salud mental para la práctica pediátrica. El pediatra debe hacer abordaje inicial, exploración y orientación familiar.
COMPETENCIAS ESPECÍFICAS: Identificar estrategias de valoración en salud mental (entrevista clínica, valoración sociofamiliar, escalas validadas). Abordaje sintomático inicial de dificultades de salud mental y conductuales. Habilidades de comunicación fundamentales. Herramientas de salud mental en promoción y prevención primaria/secundaria. Terapias psicofarmacológicas según guías actuales. Trabajo en equipo multidisciplinario (hospitalario y ambulatorio).
SABERES ESENCIALES: Entrevista clínica y uso de escalas. Diagnósticos sindromáticos de salud mental en pediatría. Guías para trastornos mentales más frecuentes. Enfoque de factores comunes HELP (AAP).
DESENLACES: Promoción del desarrollo emocional saludable y prevención primaria. Abordaje rutinario de historial biopsicosocial según edad. Identificar factores de riesgo y síntomas emergentes. Reconocer límites de atención y necesidad de remisión. Emergencias de salud mental (suicidio, psicosis, riesgo auto/heteroagresivo). Diagnósticos más comunes (depresión, ansiedad, TDAH). Habilidades de comunicación para acceso a servicios. Abordaje farmacológico inicial.`,

    "Hospitalización pediátrica tercer nivel fundamentación": `ASIGNATURA: Hospitalización pediátrica III nivel fundamentación.
JUSTIFICACIÓN: El pediatra debe dominar el manejo de patologías que requieren hospitalización, establecer plan de manejo con fecha de egreso, seguimiento frecuente, identificación de deterioro y necesidad de transferencia, así como plan de egreso y manejo en casa. Implica conocimiento de fisiopatología, cambios de la hospitalización y farmacología.
COMPETENCIAS ESPECÍFICAS: Atención centrada en el paciente hospitalizado en tercer nivel. Historia clínica, examen físico completo y diagnóstico diferencial. Epidemiología, fisiopatología e historia natural de patologías de tercer nivel. Abordaje diagnóstico y terapéutico intrahospitalario diario. Principios de investigación clínica y MBE. Plan farmacológico y no farmacológico basado en farmacocinética y farmacodinamia. Anticipar complicaciones de terapia médica. Manejo multidisciplinario. Reconocimiento temprano de cambios agudos y transferencia. Procedimientos básicos (canalización venosa, sonda vesical, sonda gástrica, punción lumbar). Compromiso con calidad, compasión y respeto. Integración de mejor evidencia a práctica clínica.
SABERES ESENCIALES: Líquidos y electrolitos pediátricos. Enfermedades respiratorias (neumonía, asma, bronquiolitis, sistemas de oxigenación). Enfermedades infecciosas (ITU, osteomusculares, fiebre sin foco, piel y tejidos blandos). Patología crónica descompensada. Manejo posoperatorio pediátrico. Paciente con parálisis cerebral. Paciente con síndrome de Down. Manejo del dolor. Enfermedades exantemáticas.
DESENLACES: Cálculo de líquidos y electrolitos. Fisiopatología de principales enfermedades, abordaje diagnóstico y terapéutico. Evaluación y manejo del dolor. Sistemas de oxigenación. Evaluación nutricional y tamizaje de desnutrición. Parámetros diferenciales en condiciones patológicas. Manejo posoperatorio sistematizado. Interpretación de estudios paraclínicos e imagenológicos. Puericultura y cuidado al egreso.`,

    "Neumología y alergología pediátrica": `ASIGNATURA: Neumología y alergología pediátrica.
JUSTIFICACIÓN: El pediatra EIA debe tener competencias en abordaje, sospecha diagnóstica, detección y manejo del niño con patología del tracto respiratorio superior e inferior, desde atención primaria hasta cuidado crítico, en todas las edades desde recién nacido hasta adolescente. Debe conocer estrategias de tamizaje y educación.
COMPETENCIAS ESPECÍFICAS: Embriología, anatomía y fisiología respiratoria en diferentes etapas de la vida. Factores biológicos y ambientales de enfermedades respiratorias. Epidemiología, etiología e historia natural. Pruebas diagnósticas, indicaciones y limitaciones. Intervenciones terapéuticas farmacológicas y no farmacológicas. Historia clínica y examen físico completo. Diagnóstico diferencial de problemas respiratorios agudos y crónicos. Herramientas estandarizadas de seguimiento. Prescripción e interpretación de laboratorio e imágenes. Sospecha diagnóstica e indicaciones de remisión a neumología. Tratamiento adecuado a la edad. Plan de tratamiento a largo plazo de enfermedades crónicas. Trabajo colaborativo. Educación a pacientes y familias. Autoevaluación de pacientes con enfermedades crónicas. Análisis crítico de evidencia.
SABERES ESENCIALES: Epidemiología de enfermedad respiratoria pediátrica. Fisiología y embriología respiratoria normal. Patofisiología de bronquiolitis, asma, fibrosis quística, neumonía, tuberculosis. Procedimientos (fibrobroncoscopia, polisomnografía). Ayudas diagnósticas (radiografía, tomografía, electrolitos en sudor). Escalas de clasificación de riesgo y severidad.
DESENLACES: Identificar paciente que requiere abordaje dirigido y remisión a neumología. Detectar riesgos de enfermedad pulmonar y prevenir complicaciones. Educar en adherencia farmacológica y no farmacológica. Identificar problemas respiratorios y aproximación terapéutica. Interpretar ayudas diagnósticas. Dispositivos de oxígeno. Evaluación secuencial de radiografía de tórax. Indicaciones de pruebas diagnósticas. Farmacocinética y farmacodinamia de fármacos respiratorios. Programas de detección de riesgos.`,

    "Neurología y rehabilitación pediátrica": `ASIGNATURA: Neurología y rehabilitación pediátrica.
JUSTIFICACIÓN: El pediatra EIA debe tener competencias en seguimiento del neurodesarrollo del niño sano, tamizaje de riesgo neurológico, abordaje diagnóstico y manejo del niño con patología neurológica aguda y crónica, desde atención primaria hasta intrahospitalaria. Debe conocer estrategias de tamizaje y educación.
COMPETENCIAS ESPECÍFICAS: Embriología, anatomía y semiología del SNC en etapas de desarrollo. Hitos normales del neurodesarrollo y semiología de la entrevista y examen neurológico. Factores de riesgo biológicos y ambientales para enfermedades neurológicas. Epidemiología, etiología e historia natural. Herramientas de laboratorio e imagenología. Intervenciones terapéuticas farmacológicas y no farmacológicas. Diagnóstico diferencial de patologías neurológicas agudas. Bases fisiopatológicas de enfermedad neurológica aguda y crónica. Abordaje estructurado por problemas. Factores importantes en seguimiento de patología crónica. Herramientas de tamizaje. Prescripción e interpretación de pruebas. Trabajo multidisciplinario. Educación a familias. Análisis crítico de evidencia. Interpretación de pruebas diagnósticas. Manejo integral del paciente neurológico.
SABERES ESENCIALES: Semiología neurológica pediátrica. Neurodesarrollo normal. Niño con hipotonía. Abordaje de primera convulsión. Síndromes epilépticos en la infancia. Retardo en neurodesarrollo (motor, fino, lenguaje). Parálisis cerebral. Infecciones del SNC. Enfermedades autoinmunes del SNC. Alteración del sensorio. Cefalea y migraña. Hipertensión intracraneal. Parálisis flácidas agudas. Compromiso de médula espinal. Alteraciones del movimiento. Síndrome de Down y TEA. ACV y malformaciones arteriovenosas. Facomatosis.
DESENLACES: Anamnesis y examen físico enfocado en enfermedad neurológica. Evaluación de hitos del neurodesarrollo y desviaciones. Identificar factores de riesgo. Interpretar pruebas diagnósticas. Fisiopatología de enfermedades neurológicas. Principios de neurofármacos. Pruebas de tamizaje. Comunicación asertiva con padres. Rol docente activo con estudiantes de pregrado.`
};

let selectedSubjectName = "";
let reportEvaluations = []; // Evaluaciones encontradas para el informe

/* ========================================================
   INICIALIZACIÓN
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
    renderSubjects();
    renderRubric();
    generateFullRubricTable();
});

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(el => el.classList.add('hidden'));
    document.getElementById(stepId).classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goBack(stepId) { showStep(stepId); }
function selectYear(year) { if (year === 1) showStep('step-subject'); }

function renderSubjects() {
    const c = document.getElementById('subjects-container');
    c.innerHTML = '';
    subjectsYear1.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn secondary';
        btn.style.textAlign = 'left';
        btn.innerText = `${i + 1}. ${s}`;
        btn.onclick = () => selectSubject(s);
        c.appendChild(btn);
    });
}

async function selectSubject(subject) {
    selectedSubjectName = subject;
    document.getElementById('form-subject-title').innerText = subject;
    Object.keys(itemSelections).forEach(k => delete itemSelections[k]);
    document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.score-input-row').forEach(r => { r.classList.add('hidden'); r.style.display = 'none'; });
    await loadResidents();
    await loadTeachers(subject);
    showStep('step-form');
}

/* ========================================================
   RÚBRICA — BOTONES + INPUT EXACTO
   ======================================================== */
function renderRubric() {
    const container = document.getElementById('rubric-table-container');
    container.innerHTML = '';

    rubricStructure.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'rubric-category';
        catDiv.innerText = cat.category;
        container.appendChild(catDiv);

        cat.items.forEach(item => {
            const block = document.createElement('div');
            block.className = 'rubric-item-block';
            block.innerHTML = `
                <div class="rubric-item-header">
                    <div>
                        <span class="rubric-item-title">${item.title} <span class="rubric-item-weight">Peso: ${(item.weight * 100)}%</span></span>
                        <span class="rubric-item-desc">${item.desc}</span>
                    </div>
                </div>
                <div class="score-buttons" id="btns-${item.id}">
                    ${SCORE_LEVELS.map(l => `
                        <button type="button" class="score-btn ${l.cls}" id="btn-${item.id}-${l.key}"
                            onclick="selectScore('${item.id}','${l.key}',this)">
                            <strong>${l.label}</strong><br><span style="font-weight:400;font-size:0.72rem;">${l.range}</span>
                        </button>`).join('')}
                </div>
                <div class="score-input-row hidden" id="input-row-${item.id}"
                     style="padding:10px 15px;background:#f9fbfd;display:flex;align-items:center;gap:12px;border-top:1px solid #eee;">
                    <label style="margin:0;font-size:0.88rem;white-space:nowrap;" for="exact-${item.id}">Nota (0.0 - 5.0):</label>
                    <input type="number" id="exact-${item.id}" min="0.0" max="5.0" step="0.1" inputmode="decimal"
                           style="width:110px;padding:8px 12px;font-size:1.1rem;font-weight:700;text-align:center;border:2px solid var(--primary-color);border-radius:8px;color:var(--primary-color);"
                           oninput="updateExactScore('${item.id}')"
                           onblur="clampScore('${item.id}')">
                    <span id="range-hint-${item.id}" style="font-size:0.82rem;color:#666;"></span>
                </div>
                <div class="item-guide">
                    <strong>Guía:</strong>
                    <span style="color:var(--danger);"> Insuf.: </span>${item.details.insuficiente} |
                    <span style="color:#9a6f00;"> Acep.: </span>${item.details.aceptable} |
                    <span style="color:var(--info);"> Bueno: </span>${item.details.bueno} |
                    <span style="color:#1a6b2e;"> Sobr.: </span>${item.details.sobresaliente}
                </div>`;
            container.appendChild(block);
        });
    });
}

function selectScore(itemId, levelKey, btnEl) {
    document.getElementById(`btns-${itemId}`).querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');

    const inputRow = document.getElementById(`input-row-${itemId}`);
    const exactInput = document.getElementById(`exact-${itemId}`);
    const rangeHint = document.getElementById(`range-hint-${itemId}`);

    if (levelKey === 'na') {
        inputRow.classList.add('hidden'); inputRow.style.display = 'none';
        itemSelections[itemId] = { level: 'na', value: null };
        return;
    }

    const range = LEVEL_RANGES[levelKey];
    exactInput.min = "0.0";
    exactInput.max = "5.0";
    exactInput.step = "0.1";
    exactInput.inputMode = "decimal";
    
    // Si no había nada o cambia de nivel, colocamos la nota sugerida por defecto
    if (!itemSelections[itemId] || itemSelections[itemId].level === 'na' || itemSelections[itemId].level !== levelKey) {
        exactInput.value = range.default;
    }
    
    rangeHint.innerText = `(Ref. ${range.min}–${range.max} | libre 0.0 a 5.0)`;
    inputRow.classList.remove('hidden'); inputRow.style.display = 'flex';
    itemSelections[itemId] = { level: levelKey, value: parseFloat(exactInput.value) };
}

function updateExactScore(itemId) {
    const sel = itemSelections[itemId];
    if (!sel || sel.level === 'na') return;
    const exactInput = document.getElementById(`exact-${itemId}`);
    let val = parseFloat(exactInput.value);
    if (!isNaN(val)) {
        itemSelections[itemId].value = val;
    }
}

function clampScore(itemId) {
    const sel = itemSelections[itemId];
    if (!sel || sel.level === 'na') return;
    const exactInput = document.getElementById(`exact-${itemId}`);
    let val = parseFloat(exactInput.value);
    if (isNaN(val)) val = 0.0;
    if (val < 0) val = 0.0;
    if (val > 5) val = 5.0;
    val = Math.round(val * 10) / 10;
    exactInput.value = val;
    itemSelections[itemId].value = val;
}

/* ========================================================
   MODAL RÚBRICA COMPLETA
   ======================================================== */
function openFullRubric() { document.getElementById('full-rubric-modal').classList.remove('hidden'); }
function closeFullRubric() { document.getElementById('full-rubric-modal').classList.add('hidden'); }

function generateFullRubricTable() {
    const c = document.getElementById('full-rubric-content');
    let h = `<table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
        <thead><tr>
            <th style="padding:10px;border:1px solid #ddd;background:#005A9C;color:white;">Ítem</th>
            <th style="padding:10px;border:1px solid #ddd;background:#dc3545;color:white;">Insuficiente 0.0–2.9</th>
            <th style="padding:10px;border:1px solid #ddd;background:#e6a817;color:white;">Aceptable 3.0–3.5</th>
            <th style="padding:10px;border:1px solid #ddd;background:#17a2b8;color:white;">Bueno 3.6–4.5</th>
            <th style="padding:10px;border:1px solid #ddd;background:#28a745;color:white;">Sobresaliente 4.6–5.0</th>
        </tr></thead><tbody>`;
    rubricStructure.forEach(cat => {
        h += `<tr style="background:#f0f4f8;"><td colspan="5" style="padding:8px;font-weight:bold;text-align:center;color:#005A9C;">${cat.category}</td></tr>`;
        cat.items.forEach(item => {
            h += `<tr><td style="padding:10px;border:1px solid #ddd;font-weight:500;">${item.title}<br><span style="font-size:0.72rem;color:#666;">${item.desc}</span></td>
                <td style="padding:10px;border:1px solid #ddd;">${item.details.insuficiente}</td>
                <td style="padding:10px;border:1px solid #ddd;">${item.details.aceptable}</td>
                <td style="padding:10px;border:1px solid #ddd;">${item.details.bueno}</td>
                <td style="padding:10px;border:1px solid #ddd;">${item.details.sobresaliente}</td></tr>`;
        });
    });
    h += `</tbody></table>`;
    c.innerHTML = h;
}

/* ========================================================
   BASE DE DATOS: RESIDENTES Y DOCENTES
   ======================================================== */
async function loadResidents() {
    const sel = document.getElementById('resident-select');
    sel.innerHTML = '<option value="">Seleccione residente...</option>';
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('residentes').select('id, nombre').eq('año', 1);
            if (!error && data && data.length > 0) { data.forEach(r => sel.add(new Option(r.nombre, r.id))); return; }
        }
    } catch (e) { console.warn(e); }
    [{id:1,nombre:'Maria Alejandra Echavarria'},{id:2,nombre:'Sara Jaramillo'},{id:3,nombre:'Valeria Naranjo'}]
        .forEach(r => sel.add(new Option(r.nombre, r.id)));
}

async function loadTeachers(rot) {
    const sel = document.getElementById('teacher-select');
    sel.innerHTML = '<option value="">Seleccione docente...</option>';
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('docentes').select('id, nombre').eq('rotacion', rot);
            if (!error && data && data.length > 0) data.forEach(t => sel.add(new Option(t.nombre, t.id)));
            else sel.add(new Option('Dr. Demo (Local)', '999'));
        } else sel.add(new Option('Dr. Demo (Local)', '999'));
    } catch (e) { sel.add(new Option('Dr. Demo (Local)', '999')); }
    sel.add(new Option('+ Agregar nuevo docente...', 'new'));
}

function checkNewTeacher(s) { if (s.value==='new') { document.getElementById('new-teacher-modal').classList.remove('hidden'); s.value=''; } }
function closeTeacherModal() { document.getElementById('new-teacher-modal').classList.add('hidden'); document.getElementById('new-teacher-name').value=''; }

async function saveNewTeacher() {
    const name = document.getElementById('new-teacher-name').value.trim();
    if (!name) return closeTeacherModal();
    showLoading('Guardando docente...');
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('docentes').insert([{ nombre: name, rotacion: selectedSubjectName }]).select();
            if (!error && data && data.length > 0) {
                const sel = document.getElementById('teacher-select');
                const opt = new Option(data[0].nombre, data[0].id);
                sel.insertBefore(opt, sel.options[sel.options.length - 1]);
                sel.value = data[0].id;
                hideLoading(); return closeTeacherModal();
            }
        }
    } catch (e) { console.warn(e); }
    const sel = document.getElementById('teacher-select');
    const opt = new Option(name, name);
    sel.insertBefore(opt, sel.options[sel.options.length - 1]);
    sel.value = name;
    hideLoading(); closeTeacherModal();
}

/* ========================================================
   CALCULAR RESULTADOS Y GUARDAR (con ítems individuales)
   ======================================================== */
async function calculateResults() {
    const allItems = rubricStructure.flatMap(cat => cat.items);
    const unselected = allItems.filter(item => !itemSelections[item.id]);
    if (unselected.length > 0) {
        alert(`Faltan ítems por calificar:\n${unselected.map(i => '• ' + i.title).join('\n')}`);
        return;
    }

    const applicable = allItems.filter(item => itemSelections[item.id] && itemSelections[item.id].level !== 'na' && itemSelections[item.id].value !== null);
    let totalWeight = applicable.reduce((s, i) => s + i.weight, 0);
    let finalScore = 0;
    if (totalWeight > 0) applicable.forEach(i => { finalScore += itemSelections[i.id].value * (i.weight / totalWeight); });
    finalScore = finalScore.toFixed(2);

    const resSel = document.getElementById('resident-select');
    const teaSel = document.getElementById('teacher-select');
    const eticosNode = document.querySelector('input[name="eticos"]:checked');
    const eticosVal = eticosNode ? eticosNode.value : 'NO';
    const fortalezas = document.getElementById('fortalezas').value;
    const mejoras = document.getElementById('mejoras').value;
    const residentName = resSel.options[resSel.selectedIndex].text;
    const teacherName = teaSel.options[teaSel.selectedIndex].text;

    let qualitative = finalScore >= 4.6 ? "Sobresaliente" : finalScore >= 3.6 ? "Bueno" : finalScore >= 3.0 ? "Aceptable" : "Insuficiente";

    document.getElementById('final-score-value').innerText = finalScore;
    document.getElementById('result-resident-info').innerHTML = `
        <p><strong>Residente:</strong> ${residentName}</p>
        <p><strong>Docente:</strong> ${teacherName}</p>
        <p><strong>Rotación:</strong> ${selectedSubjectName}</p>
        <p><strong>Ítems evaluados:</strong> ${applicable.length} de ${allItems.length}</p>`;

    let feedback = `<p>Desempeño clasificado como <strong>${qualitative.toUpperCase()}</strong> con nota de <strong>${finalScore} / 5.0</strong>.</p>`;
    if (applicable.length < allItems.length) feedback += `<p style="color:#757575;">ℹ️ ${allItems.length - applicable.length} ítem(s) "No aplica" excluidos del cálculo.</p>`;
    if (eticosVal === 'NO') feedback += `<p style="color:var(--danger);font-weight:bold;">⚠️ Incumplimiento ético reportado. Requiere análisis del comité.</p>`;
    if (fortalezas) feedback += `<p><strong>Fortalezas:</strong> ${fortalezas}</p>`;
    if (mejoras) feedback += `<p><strong>Por mejorar:</strong> ${mejoras}</p>`;
    document.getElementById('generated-feedback').innerHTML = feedback;

    const scoreUI = document.getElementById('final-score-value');
    scoreUI.style.color = finalScore < 3.0 ? 'var(--danger)' : finalScore < 3.6 ? 'var(--warning)' : finalScore < 4.6 ? 'var(--info)' : 'var(--success)';

    // Guardar en Supabase
    try {
        if (supabaseClient) {
            showLoading('Guardando evaluación...');
            const { data: evalData, error: evalError } = await supabaseClient.from('evaluaciones').insert([{
                residente_id: resSel.value, docente_id: teaSel.value,
                rotacion: selectedSubjectName, nota_final: finalScore,
                aspectos_eticos: (eticosVal === 'SI'), fortalezas, por_mejorar: mejoras
            }]).select('id');

            // Guardar ítems individuales
            if (!evalError && evalData && evalData.length > 0) {
                const evalId = evalData[0].id;
                const itemsToInsert = [];
                rubricStructure.forEach(cat => {
                    cat.items.forEach(item => {
                        const sel = itemSelections[item.id];
                        if (sel && sel.level !== 'na' && sel.value !== null) {
                            itemsToInsert.push({
                                evaluacion_id: evalId,
                                item_id: item.id,
                                item_titulo: item.title,
                                categoria: cat.category,
                                peso: item.weight,
                                nota: sel.value,
                                nivel: sel.level
                            });
                        }
                    });
                });
                if (itemsToInsert.length > 0) {
                    await supabaseClient.from('evaluacion_items').insert(itemsToInsert);
                }
            }
            hideLoading();
        }
    } catch (e) { console.error("Error guardando:", e); hideLoading(); }

    showStep('step-results');
}

function resetApp() {
    Object.keys(itemSelections).forEach(k => delete itemSelections[k]);
    document.getElementById('evaluation-form').reset();
    showStep('step-subject');
}

/* ========================================================
   COORDINADOR — PIN Y ACCESO
   ======================================================== */
function openPinModal() {
    document.getElementById('coordinator-pin').value = '';
    document.getElementById('pin-error').classList.add('hidden');
    document.getElementById('pin-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('coordinator-pin').focus(), 100);
}
function closePinModal() { document.getElementById('pin-modal').classList.add('hidden'); }

async function verifyPin() {
    const pin = document.getElementById('coordinator-pin').value;
    if (pin === COORDINATOR_PIN) {
        closePinModal();
        await loadReportSelectors();
        showStep('step-report');
    } else {
        document.getElementById('pin-error').classList.remove('hidden');
    }
}

async function loadReportSelectors() {
    // Cargar residentes
    const resSel = document.getElementById('report-resident');
    resSel.innerHTML = '<option value="">Seleccione residente...</option>';
    try {
        if (supabaseClient) {
            const { data } = await supabaseClient.from('residentes').select('id, nombre');
            if (data) data.forEach(r => resSel.add(new Option(r.nombre, r.id)));
        }
    } catch (e) { console.warn(e); }

    // Cargar rotaciones
    const rotSel = document.getElementById('report-rotation');
    rotSel.innerHTML = '<option value="">Seleccione rotación...</option>';
    subjectsYear1.forEach(s => rotSel.add(new Option(s, s)));

    // Fechas por defecto: último mes
    const today = new Date();
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 2);
    document.getElementById('report-date-to').value = today.toISOString().split('T')[0];
    document.getElementById('report-date-from').value = monthAgo.toISOString().split('T')[0];

    document.getElementById('report-preview').classList.add('hidden');
}

/* ========================================================
   INFORME FINAL — BUSCAR EVALUACIONES
   ======================================================== */
async function searchEvaluations() {
    const residentId = document.getElementById('report-resident').value;
    const rotation = document.getElementById('report-rotation').value;
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;

    if (!residentId || !rotation || !dateFrom || !dateTo) {
        alert('Por favor complete todos los campos.');
        return;
    }

    showLoading('Buscando evaluaciones...');

    try {
        const { data, error } = await supabaseClient
            .from('evaluaciones')
            .select('id, nota_final, aspectos_eticos, fortalezas, por_mejorar, fecha, docente_id, docentes(nombre)')
            .eq('residente_id', residentId)
            .eq('rotacion', rotation)
            .gte('fecha', dateFrom + 'T00:00:00')
            .lte('fecha', dateTo + 'T23:59:59')
            .order('fecha', { ascending: true });

        hideLoading();

        if (error) { alert('Error consultando: ' + error.message); return; }
        if (!data || data.length === 0) {
            alert('No se encontraron evaluaciones para este residente en esa rotación y período.');
            return;
        }

        reportEvaluations = data;

        // Mostrar preview
        const previewDiv = document.getElementById('report-preview');
        const contentDiv = document.getElementById('report-preview-content');

        const resName = document.getElementById('report-resident').options[document.getElementById('report-resident').selectedIndex].text;
        const teachers = [...new Set(data.map(e => e.docentes?.nombre || 'Docente'))];
        const avgScore = (data.reduce((s, e) => s + parseFloat(e.nota_final), 0) / data.length).toFixed(2);

        let html = `
            <p><span class="report-stat">${data.length} evaluaciones</span>
               <span class="report-stat">${teachers.length} docente(s)</span>
               <span class="report-stat">Promedio: ${avgScore}</span></p>
            <p style="margin:10px 0;"><strong>Residente:</strong> ${resName} &nbsp;|&nbsp; <strong>Rotación:</strong> ${rotation}</p>
            <p style="margin-bottom:15px;"><strong>Período:</strong> ${dateFrom} a ${dateTo}</p>
            <h4 style="margin-bottom:10px; color:var(--primary-color);">Detalle de evaluaciones:</h4>`;

        data.forEach((ev, i) => {
            const fecha = new Date(ev.fecha).toLocaleDateString('es-CO');
            const docName = ev.docentes?.nombre || 'Docente';
            html += `<div class="report-eval-card">
                <strong>#${i+1}</strong> — ${fecha} — <strong>${docName}</strong> — Nota: <strong>${ev.nota_final}</strong>
                ${ev.fortalezas ? `<br><em style="color:var(--success);">✓ ${ev.fortalezas}</em>` : ''}
                ${ev.por_mejorar ? `<br><em style="color:var(--warning);">△ ${ev.por_mejorar}</em>` : ''}
            </div>`;
        });

        contentDiv.innerHTML = html;
        previewDiv.classList.remove('hidden');

    } catch (e) {
        hideLoading();
        alert('Error: ' + e.message);
    }
}

/* ========================================================
   INFORME FINAL — GENERAR WORD CON IA
   ======================================================== */
async function generateFinalReport() {
    if (reportEvaluations.length === 0) { alert('No hay evaluaciones para generar el informe.'); return; }

    const resName = document.getElementById('report-resident').options[document.getElementById('report-resident').selectedIndex].text;
    const rotation = document.getElementById('report-rotation').value;
    const dateFrom = document.getElementById('report-date-from').value;
    const dateTo = document.getElementById('report-date-to').value;

    showLoading('Consultando puntajes individuales...');

    // 1. Obtener ítems individuales de cada evaluación
    const evalIds = reportEvaluations.map(e => e.id);
    let allItems = [];
    try {
        const { data, error } = await supabaseClient
            .from('evaluacion_items')
            .select('*')
            .in('evaluacion_id', evalIds);
        if (!error && data) allItems = data;
    } catch (e) { console.warn('No se pudieron obtener ítems:', e); }

    // 2. Calcular promedios por ítem
    const itemAverages = {};
    const rubricItems = rubricStructure.flatMap(c => c.items.map(i => ({ ...i, category: c.category })));

    rubricItems.forEach(ri => {
        const scores = allItems.filter(ai => ai.item_id === ri.id).map(ai => parseFloat(ai.nota));
        if (scores.length > 0) {
            itemAverages[ri.id] = {
                title: ri.title, category: ri.category, weight: ri.weight,
                avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
                count: scores.length, min: Math.min(...scores).toFixed(1), max: Math.max(...scores).toFixed(1)
            };
        }
    });

    // 3. Recopilar comentarios
    const allFortalezas = reportEvaluations.filter(e => e.fortalezas).map(e => `${e.docentes?.nombre || 'Docente'}: ${e.fortalezas}`);
    const allMejoras = reportEvaluations.filter(e => e.por_mejorar).map(e => `${e.docentes?.nombre || 'Docente'}: ${e.por_mejorar}`);
    const teachers = [...new Set(reportEvaluations.map(e => e.docentes?.nombre || 'Docente'))];
    const avgFinal = (reportEvaluations.reduce((s, e) => s + parseFloat(e.nota_final), 0) / reportEvaluations.length).toFixed(2);

    // 4. Generar análisis con IA
    showLoading('Generando análisis con inteligencia artificial...');
    let aiAnalysis = '';
    try {
        aiAnalysis = await callGeminiForReport(resName, rotation, avgFinal, itemAverages, allFortalezas, allMejoras, dateFrom, dateTo);
    } catch (e) {
        console.warn('Error con Gemini, usando texto automático:', e);
        aiAnalysis = generateFallbackAnalysis(resName, rotation, avgFinal, itemAverages, allFortalezas, allMejoras);
    }

    // 5. Generar Word
    showLoading('Construyendo documento Word...');
    try {
        await buildWordReport(resName, rotation, dateFrom, dateTo, teachers, reportEvaluations, itemAverages, avgFinal, aiAnalysis, allFortalezas, allMejoras);
    } catch (e) {
        console.error('Error generando Word:', e);
        alert('Error al generar el documento: ' + e.message);
    }

    hideLoading();
}

/* ========================================================
   GEMINI API — LLAMADA PARA ANÁLISIS
   ======================================================== */
async function callGeminiForReport(resName, rotation, avgFinal, itemAverages, fortalezas, mejoras, dateFrom, dateTo) {
    const micro = MICROCURRICULOS[rotation] || 'No disponible.';

    let itemsText = '';
    Object.values(itemAverages).forEach(ia => {
        itemsText += `- ${ia.title} (peso ${(ia.weight*100).toFixed(0)}%): promedio ${ia.avg}/5.0 (rango ${ia.min}-${ia.max}, ${ia.count} evaluaciones)\n`;
    });

    const prompt = `Eres un evaluador académico experto en educación médica de posgrado en Pediatría de la Universidad EIA, Colombia. Genera un informe de retroalimentación académica formal en prosa (4-5 párrafos) para un residente.

DATOS DE LA EVALUACIÓN:
- Residente: ${resName}
- Rotación: ${rotation}
- Período: ${dateFrom} a ${dateTo}
- Nota promedio final: ${avgFinal}/5.0
- Número de evaluaciones consolidadas: ${Object.values(itemAverages)[0]?.count || 0}

PROMEDIOS POR COMPETENCIA:
${itemsText}

COMENTARIOS DE LOS DOCENTES:
Fortalezas observadas: ${fortalezas.length > 0 ? fortalezas.join('; ') : 'Sin comentarios registrados.'}
Aspectos por mejorar: ${mejoras.length > 0 ? mejoras.join('; ') : 'Sin comentarios registrados.'}

OBJETIVOS DEL MICROCURRÍCULO DE REFERENCIA:
${micro}

INSTRUCCIONES:
1. Redacta en tercera persona y tono académico formal.
2. En el primer párrafo, contextualiza la rotación y el periodo evaluado.
3. En el segundo párrafo, analiza las fortalezas del residente vinculándolas con los objetivos del microcurrículo.
4. En el tercer párrafo, identifica áreas de mejora específicas y su impacto en la formación.
5. En el cuarto párrafo, proporciona recomendaciones concretas para el siguiente período.
6. En el último párrafo, concluye con una valoración global del desempeño.
7. NO incluyas tablas, viñetas ni encabezados. Solo párrafos en prosa.
8. NO repitas los datos numéricos exactos, intégralos de forma natural en el texto.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
    });

    if (!response.ok) throw new Error('API error: ' + response.status);
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function generateFallbackAnalysis(resName, rotation, avg, items, fort, mej) {
    let q = avg >= 4.6 ? 'sobresaliente' : avg >= 3.6 ? 'bueno' : avg >= 3.0 ? 'aceptable' : 'insuficiente';
    return `Durante el período evaluado en la rotación de ${rotation}, el/la residente ${resName} ha demostrado un desempeño general calificado como ${q}, obteniendo una nota promedio de ${avg}/5.0 a partir de las evaluaciones realizadas por el cuerpo docente.\n\n` +
        (fort.length > 0 ? `Entre las fortalezas destacadas por los docentes evaluadores se encuentran: ${fort.join('. ')}.\n\n` : '') +
        (mej.length > 0 ? `Las áreas identificadas como oportunidades de mejora incluyen: ${mej.join('. ')}.\n\n` : '') +
        `Se recomienda continuar fortaleciendo las competencias clínicas y académicas en las áreas señaladas, manteniendo el compromiso demostrado durante la rotación.`;
}

/* ========================================================
   GENERACIÓN DEL DOCUMENTO WORD
   ======================================================== */
async function buildWordReport(resName, rotation, dateFrom, dateTo, teachers, evaluations, itemAverages, avgFinal, aiAnalysis, fortalezas, mejoras) {
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType } = docx;

    const qualitative = avgFinal >= 4.6 ? 'SOBRESALIENTE' : avgFinal >= 3.6 ? 'BUENO' : avgFinal >= 3.0 ? 'ACEPTABLE' : 'INSUFICIENTE';

    // Construir filas de la tabla de promedios
    const tableRows = [
        new TableRow({
            tableHeader: true,
            children: ['Competencia', 'Peso', 'Promedio', 'Mín', 'Máx', 'Evaluaciones'].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })], alignment: AlignmentType.CENTER })],
                    shading: { fill: '005A9C', type: ShadingType.CLEAR },
                    width: { size: text === 'Competencia' ? 3500 : 1200, type: WidthType.DXA }
                })
            )
        })
    ];

    Object.values(itemAverages).forEach(ia => {
        tableRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ia.title, size: 20 })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${(ia.weight*100).toFixed(0)}%`, size: 20 })], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${ia.avg}`, bold: true, size: 20 })], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${ia.min}`, size: 20 })], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${ia.max}`, size: 20 })], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${ia.count}`, size: 20 })], alignment: AlignmentType.CENTER })] }),
            ]
        }));
    });

    // Sección de comentarios
    const commentParagraphs = [];
    if (fortalezas.length > 0) {
        commentParagraphs.push(new Paragraph({ children: [new TextRun({ text: 'FORTALEZAS OBSERVADAS POR LOS DOCENTES:', bold: true, size: 22, color: '1A6632' })], spacing: { before: 200 } }));
        fortalezas.forEach(f => commentParagraphs.push(new Paragraph({ children: [new TextRun({ text: `• ${f}`, size: 20 })], spacing: { before: 60 } })));
    }
    if (mejoras.length > 0) {
        commentParagraphs.push(new Paragraph({ children: [new TextRun({ text: 'ASPECTOS POR MEJORAR SEÑALADOS:', bold: true, size: 22, color: 'DC3545' })], spacing: { before: 200 } }));
        mejoras.forEach(m => commentParagraphs.push(new Paragraph({ children: [new TextRun({ text: `• ${m}`, size: 20 })], spacing: { before: 60 } })));
    }

    // Párrafos del análisis IA
    const aiParagraphs = aiAnalysis.split('\n').filter(p => p.trim()).map(p =>
        new Paragraph({ children: [new TextRun({ text: p.trim(), size: 22 })], spacing: { before: 120, after: 120 } })
    );

    // Construir documento
    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
            children: [
                // Encabezado
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
                    new TextRun({ text: 'UNIVERSIDAD EIA', bold: true, size: 28, color: '005A9C' })
                ] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
                    new TextRun({ text: 'Hospital Pablo Tobón Uribe', size: 22, color: '333333' })
                ] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
                    new TextRun({ text: 'Programa de Especialización en Pediatría', size: 22, color: '333333' })
                ] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [
                    new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 16, color: '00A3E0' })
                ] }),

                // Título
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [
                    new TextRun({ text: 'INFORME FINAL CONSOLIDADO DE ROTACIÓN', bold: true, size: 32, color: '005A9C' })
                ] }),

                // Datos generales
                new Paragraph({ children: [new TextRun({ text: 'Residente: ', bold: true, size: 22 }), new TextRun({ text: resName, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Rotación: ', bold: true, size: 22 }), new TextRun({ text: rotation, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Período evaluado: ', bold: true, size: 22 }), new TextRun({ text: `${dateFrom} a ${dateTo}`, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Total de evaluaciones: ', bold: true, size: 22 }), new TextRun({ text: `${evaluations.length}`, size: 22 })] }),
                new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'Docentes evaluadores: ', bold: true, size: 22 }), new TextRun({ text: teachers.join(', '), size: 22 })] }),

                // Separador
                new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: 'CALIFICACIÓN PROMEDIO POR COMPETENCIAS', bold: true, size: 26, color: '005A9C' })] }),

                // Tabla de promedios
                new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),

                // Nota final
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 100 }, children: [
                    new TextRun({ text: `NOTA DEFINITIVA DE ROTACIÓN: ${avgFinal} / 5.0 — ${qualitative}`, bold: true, size: 28, color: avgFinal >= 3.6 ? '1A6632' : 'DC3545' })
                ] }),

                // Análisis IA
                new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: 'ANÁLISIS INTEGRAL DEL DESEMPEÑO', bold: true, size: 26, color: '005A9C' })] }),
                new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '(Generado por inteligencia artificial con base en los resultados de las evaluaciones y los objetivos del microcurrículo)', italics: true, size: 18, color: '666666' })] }),
                ...aiParagraphs,

                // Comentarios
                new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: 'SÍNTESIS DE COMENTARIOS DE LOS DOCENTES', bold: true, size: 26, color: '005A9C' })] }),
                ...commentParagraphs,

                // Firma
                new Paragraph({ spacing: { before: 600 }, children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 16, color: 'CCCCCC' })] }),
                new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: '____________________________________', size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Coordinador del Programa de Pediatría', bold: true, size: 22 })] }),
                new Paragraph({ children: [new TextRun({ text: 'Universidad EIA — Hospital Pablo Tobón Uribe', size: 20, color: '666666' })] }),
                new Paragraph({ children: [new TextRun({ text: `Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, size: 20, color: '666666' })] }),
            ]
        }]
    });

    // Descargar
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Informe_Final_${resName.replace(/\s+/g, '_')}_${rotation.substring(0, 20).replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ========================================================
   UTILIDADES
   ======================================================== */
function showLoading(text) {
    document.getElementById('loading-text').innerText = text || 'Procesando...';
    document.getElementById('loading-overlay').classList.remove('hidden');
}
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }
