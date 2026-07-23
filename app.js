/* ========================================================
   CONFIGURACIÓN DE SUPABASE
   ======================================================== */
const SUPABASE_URL = 'https://wgsnjayvreknhsikgqbn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sp0h2Qle7Fj660C0ht9tNA_Q8edhQ68';

let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) { console.error("Error inicializando Supabase:", e); }

/* ========================================================
   NIVELES DE CALIFICACIÓN
   Scores representativos por nivel:
     Insuficiente  < 3.0  → 2.5
     Aceptable  3.0–3.5   → 3.0
     Bueno      3.6–4.5   → 4.0
     Sobresaliente > 4.5  → 5.0
     No aplica             → excluido del cálculo
   ======================================================== */
const SCORE_LEVELS = [
    { key: 'insuficiente',  label: 'Insuficiente',  range: '0.0 – 2.9', cls: 'insuficiente'  },
    { key: 'aceptable',     label: 'Aceptable',     range: '3.0 – 3.5', cls: 'aceptable'     },
    { key: 'bueno',         label: 'Bueno',         range: '3.6 – 4.5', cls: 'bueno'         },
    { key: 'sobresaliente', label: 'Sobresaliente', range: '4.6 – 5.0', cls: 'sobresaliente'  },
    { key: 'na',            label: 'No aplica',     range: '',           cls: 'no-aplica'     }
];

// Almacena la selección actual: { itemId: { level, value } }
const itemSelections = {};

/* ========================================================
   DATOS Y RÚBRICA
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
        items: [
            {
                id: "c_acad", title: "Conocimientos académicos",
                desc: "Nivel de actualización, organización y lectura crítica de la evidencia.",
                weight: 0.25,
                details: {
                    insuficiente:  "Conocimientos desactualizados, desorganizados o inconsistentes para su nivel; no aplica ni contrasta con evidencia científica.",
                    aceptable:     "Conocimientos básicos para su nivel, con aplicabilidad limitada; lectura crítica ocasional de la evidencia.",
                    bueno:         "Según su nivel son adecuados, organizados, consistentes y sólidos; tienen aplicabilidad y están actualizados; hace lectura crítica de la mejor evidencia.",
                    sobresaliente: "Conocimientos que superan lo esperado para su nivel; integra evidencia de vanguardia y la aplica con criterio propio."
                }
            }
        ]
    },
    {
        category: "Habilidad práctica (25%)",
        items: [
            {
                id: "h_historia", title: "Abordaje historia clínica",
                desc: "Metódica, profunda, íntegra, veraz y oportuna.",
                weight: 0.12,
                details: {
                    insuficiente:  "Historia clínica incompleta, desorganizada, omite datos críticos.",
                    aceptable:     "Historia clínica básica, a veces omite detalles relevantes.",
                    bueno:         "Historia metódica, profunda e íntegra.",
                    sobresaliente: "Historia clínica excepcional, veraz, oportuna y enfocada al contexto del paciente."
                }
            },
            {
                id: "h_tecnico", title: "Desempeño técnico",
                desc: "Disposición, oportunidad, ingenio, recursividad, eficiencia.",
                weight: 0.13,
                details: {
                    insuficiente:  "Dificultad evidente en habilidades técnicas básicas.",
                    aceptable:     "Desempeño técnico aceptable pero requiere supervisión constante.",
                    bueno:         "Buen desempeño técnico, recursivo y eficiente.",
                    sobresaliente: "Altamente ingenioso, eficiente y seguro en su desempeño técnico."
                }
            }
        ]
    },
    {
        category: "Criterio clínico (25%)",
        items: [
            {
                id: "cr_anamnesis", title: "Anamnesis y examen clínico",
                desc: "Ordenado, completo, con énfasis en la situación clínica.",
                weight: 0.05,
                details: {
                    insuficiente:  "Examen físico incompleto o sin correlación clínica.",
                    aceptable:     "Examen físico estándar, le falta énfasis en el problema actual.",
                    bueno:         "Examen ordenado y completo, dirigido a la situación.",
                    sobresaliente: "Examen físico exhaustivo, preciso y con excelente razonamiento."
                }
            },
            {
                id: "cr_examenes", title: "Solicitud e interpretación de exámenes",
                desc: "Racionalidad, oportunidad, utilidad y articulación.",
                weight: 0.10,
                details: {
                    insuficiente:  "Solicita exámenes sin justificación o interpreta erróneamente.",
                    aceptable:     "Solicitud adecuada pero le cuesta articular los resultados.",
                    bueno:         "Uso racional y oportuno de ayudas diagnósticas.",
                    sobresaliente: "Excelente utilidad, racionalidad y articulación clínica de los exámenes."
                }
            },
            {
                id: "cr_diagnostico", title: "Impresión diagnóstica y conducta terapéutica",
                desc: "Precisión, claridad, consistencia, responsabilidad.",
                weight: 0.10,
                details: {
                    insuficiente:  "Impresión diagnóstica errada y plan terapéutico inseguro.",
                    aceptable:     "Diagnósticos básicos correctos, plan terapéutico requiere ajustes.",
                    bueno:         "Diagnósticos precisos y conducta terapéutica consistente.",
                    sobresaliente: "Alta precisión diagnóstica y responsabilidad en terapias complejas."
                }
            }
        ]
    },
    {
        category: "Compromiso (25%)",
        items: [
            {
                id: "co_seguridad", title: "Con la seguridad del paciente y su familia",
                desc: "Calidez, consideración, respeto, interés, paciencia.",
                weight: 0.08,
                details: {
                    insuficiente:  "Falta de empatía, irrespeta normas de seguridad.",
                    aceptable:     "Trato cordial, cumple normas básicas de seguridad.",
                    bueno:         "Trato cálido, considerado e interés genuino por el paciente.",
                    sobresaliente: "Modelo a seguir en paciencia, respeto y seguridad del paciente."
                }
            },
            {
                id: "co_equipo", title: "Con el equipo de trabajo",
                desc: "Colaboración, solidaridad, respeto y lealtad.",
                weight: 0.08,
                details: {
                    insuficiente:  "Conflictivo, no colabora con el equipo.",
                    aceptable:     "Relación funcional con el equipo, participación pasiva.",
                    bueno:         "Colaborador, solidario y respetuoso con sus pares y superiores.",
                    sobresaliente: "Líder positivo, fomenta la lealtad y el trabajo en equipo."
                }
            },
            {
                id: "co_academico", title: "Con actividades académicas e investigación",
                desc: "Interés, constancia, creatividad, puntualidad.",
                weight: 0.09,
                details: {
                    insuficiente:  "Impuntual, falta de interés en actividades académicas.",
                    aceptable:     "Asiste a actividades académicas pero participa poco.",
                    bueno:         "Interés constante, puntual y participativo.",
                    sobresaliente: "Aporta creativamente, excelente nivel investigativo y académico."
                }
            }
        ]
    }
];

let selectedSubjectName = "";

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
}
function goBack(stepId) { showStep(stepId); }
function selectYear(year) { if (year === 1) showStep('step-subject'); }

function renderSubjects() {
    const container = document.getElementById('subjects-container');
    container.innerHTML = '';
    subjectsYear1.forEach((subject, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn secondary';
        btn.style.textAlign = 'left';
        btn.innerText = `${index + 1}. ${subject}`;
        btn.onclick = () => selectSubject(subject);
        container.appendChild(btn);
    });
}

async function selectSubject(subject) {
    selectedSubjectName = subject;
    document.getElementById('form-subject-title').innerText = subject;
    // Limpiar selecciones anteriores
    Object.keys(itemSelections).forEach(k => delete itemSelections[k]);
    document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    await loadResidents();
    await loadTeachers(subject);
    showStep('step-form');
}

/* ========================================================
   RÚBRICA — RENDERIZADO CON BOTONES DE NIVEL
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
                        <span class="rubric-item-title">
                            ${item.title}
                            <span class="rubric-item-weight">Peso: ${(item.weight * 100)}%</span>
                        </span>
                        <span class="rubric-item-desc">${item.desc}</span>
                    </div>
                </div>
                <div class="score-buttons" id="btns-${item.id}">
                    ${SCORE_LEVELS.map(level => `
                        <button type="button"
                            class="score-btn ${level.cls}"
                            id="btn-${item.id}-${level.key}"
                            onclick="selectScore('${item.id}', '${level.key}', this)">
                            <strong>${level.label}</strong><br>
                            <span style="font-weight:400; font-size:0.72rem;">${level.range}</span>
                        </button>
                    `).join('')}
                </div>
                <div class="score-input-row hidden" id="input-row-${item.id}"
                     style="padding:10px 15px; background:#f9fbfd; display:flex; align-items:center; gap:12px; border-top:1px solid #eee;">
                    <label style="margin:0; font-size:0.88rem; white-space:nowrap;" for="exact-${item.id}">
                        Nota exacta:
                    </label>
                    <input type="number" id="exact-${item.id}" step="0.5"
                           style="width:100px; padding:8px 12px; font-size:1.1rem; font-weight:700;
                                  text-align:center; border:2px solid var(--primary-color);
                                  border-radius:8px; color:var(--primary-color);"
                           oninput="updateExactScore('${item.id}')">
                    <span id="range-hint-${item.id}" style="font-size:0.82rem; color:#666;"></span>
                </div>
                <div class="item-guide">
                    <strong>Guía:</strong>
                    <span style="color:var(--danger);"> Insuf.: </span>${item.details.insuficiente} &nbsp;|&nbsp;
                    <span style="color:#9a6f00;"> Acep.: </span>${item.details.aceptable} &nbsp;|&nbsp;
                    <span style="color:var(--info);"> Bueno: </span>${item.details.bueno} &nbsp;|&nbsp;
                    <span style="color:#1a6b2e;"> Sobr.: </span>${item.details.sobresaliente}
                </div>
            `;
            container.appendChild(block);
        });
    });
}

// Rangos permitidos por nivel
const LEVEL_RANGES = {
    insuficiente:  { min: 0.0, max: 2.9, step: 0.1, default: 2.0 },
    aceptable:     { min: 3.0, max: 3.5, step: 0.1, default: 3.0 },
    bueno:         { min: 3.6, max: 4.5, step: 0.1, default: 4.0 },
    sobresaliente: { min: 4.6, max: 5.0, step: 0.1, default: 5.0 },
    na:            { min: 0,   max: 0,   step: 0,   default: null }
};

function selectScore(itemId, levelKey, btnEl) {
    // Deseleccionar todos los botones de este ítem
    const btnGroup = document.getElementById(`btns-${itemId}`);
    btnGroup.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
    btnEl.classList.add('selected');

    const inputRow = document.getElementById(`input-row-${itemId}`);
    const exactInput = document.getElementById(`exact-${itemId}`);
    const rangeHint = document.getElementById(`range-hint-${itemId}`);

    if (levelKey === 'na') {
        // No aplica: ocultar input y guardar null
        inputRow.classList.add('hidden');
        inputRow.style.display = 'none';
        itemSelections[itemId] = { level: 'na', value: null };
        return;
    }

    // Mostrar input con el rango correspondiente
    const range = LEVEL_RANGES[levelKey];
    exactInput.min = range.min;
    exactInput.max = range.max;
    exactInput.step = range.step;
    exactInput.value = range.default;
    rangeHint.innerText = `(Rango: ${range.min} – ${range.max})`;

    inputRow.classList.remove('hidden');
    inputRow.style.display = 'flex';
    exactInput.focus();

    // Guardar con valor por defecto
    itemSelections[itemId] = { level: levelKey, value: range.default };
}

function updateExactScore(itemId) {
    const sel = itemSelections[itemId];
    if (!sel || sel.level === 'na') return;

    const exactInput = document.getElementById(`exact-${itemId}`);
    const range = LEVEL_RANGES[sel.level];
    let val = parseFloat(exactInput.value);

    if (isNaN(val)) return;
    if (val < range.min) { val = range.min; exactInput.value = val; }
    if (val > range.max) { val = range.max; exactInput.value = val; }

    // Redondear a 1 décima
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
    const container = document.getElementById('full-rubric-content');
    let html = `<table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
        <thead>
            <tr>
                <th style="padding:10px; border:1px solid #ddd; background:#005A9C; color:white;">Ítem</th>
                <th style="padding:10px; border:1px solid #ddd; background:#dc3545; color:white;">Insuficiente &lt; 3.0</th>
                <th style="padding:10px; border:1px solid #ddd; background:#e6a817; color:white;">Aceptable 3.0–3.5</th>
                <th style="padding:10px; border:1px solid #ddd; background:#17a2b8; color:white;">Bueno 3.6–4.5</th>
                <th style="padding:10px; border:1px solid #ddd; background:#28a745; color:white;">Sobresaliente &gt; 4.5</th>
            </tr>
        </thead><tbody>`;

    rubricStructure.forEach(cat => {
        html += `<tr style="background:#f0f4f8;"><td colspan="5" style="padding:8px; font-weight:bold; text-align:center; color:#005A9C;">${cat.category}</td></tr>`;
        cat.items.forEach(item => {
            html += `<tr>
                <td style="padding:10px; border:1px solid #ddd; font-weight:500;">${item.title}<br><span style="font-size:0.72rem; color:#666;">${item.desc}</span></td>
                <td style="padding:10px; border:1px solid #ddd;">${item.details.insuficiente}</td>
                <td style="padding:10px; border:1px solid #ddd;">${item.details.aceptable}</td>
                <td style="padding:10px; border:1px solid #ddd;">${item.details.bueno}</td>
                <td style="padding:10px; border:1px solid #ddd;">${item.details.sobresaliente}</td>
            </tr>`;
        });
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ========================================================
   BASE DE DATOS: RESIDENTES Y DOCENTES
   ======================================================== */
async function loadResidents() {
    const select = document.getElementById('resident-select');
    select.innerHTML = '<option value="">Seleccione residente...</option>';
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('residentes').select('id, nombre').eq('año', 1);
            if (!error && data && data.length > 0) {
                data.forEach(r => select.add(new Option(r.nombre, r.id)));
                return;
            }
        }
    } catch (e) { console.warn("Fallback residentes:", e); }
    // Fallback
    [{id:1, nombre:'Maria Alejandra Echavarria'}, {id:2, nombre:'Sara Jaramillo'}, {id:3, nombre:'Valeria Naranjo'}]
        .forEach(r => select.add(new Option(r.nombre, r.id)));
}

async function loadTeachers(rotacion) {
    const select = document.getElementById('teacher-select');
    select.innerHTML = '<option value="">Seleccione docente...</option>';
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('docentes').select('id, nombre').eq('rotacion', rotacion);
            if (!error && data && data.length > 0) {
                data.forEach(t => select.add(new Option(t.nombre, t.id)));
            } else { select.add(new Option('Dr. Demo (Local)', '999')); }
        } else { select.add(new Option('Dr. Demo (Local)', '999')); }
    } catch (e) { select.add(new Option('Dr. Demo (Local)', '999')); }
    select.add(new Option('+ Agregar nuevo docente...', 'new'));
}

function checkNewTeacher(sel) {
    if (sel.value === 'new') {
        document.getElementById('new-teacher-modal').classList.remove('hidden');
        sel.value = '';
    }
}
function closeTeacherModal() {
    document.getElementById('new-teacher-modal').classList.add('hidden');
    document.getElementById('new-teacher-name').value = '';
}

async function saveNewTeacher() {
    const name = document.getElementById('new-teacher-name').value.trim();
    if (!name) return closeTeacherModal();
    document.getElementById('loading-overlay').classList.remove('hidden');
    try {
        if (supabaseClient) {
            const { data, error } = await supabaseClient.from('docentes').insert([{ nombre: name, rotacion: selectedSubjectName }]).select();
            if (!error && data && data.length > 0) {
                const select = document.getElementById('teacher-select');
                const opt = new Option(data[0].nombre, data[0].id);
                select.insertBefore(opt, select.options[select.options.length - 1]);
                select.value = data[0].id;
                document.getElementById('loading-overlay').classList.add('hidden');
                return closeTeacherModal();
            }
        }
    } catch (e) { console.warn(e); }
    // Fallback local
    const select = document.getElementById('teacher-select');
    const opt = new Option(name, name);
    select.insertBefore(opt, select.options[select.options.length - 1]);
    select.value = name;
    document.getElementById('loading-overlay').classList.add('hidden');
    closeTeacherModal();
}

/* ========================================================
   CÁLCULO DE RESULTADOS
   ======================================================== */
async function calculateResults() {
    // 1. Recolectar todos los ítems de la rúbrica
    const allItems = rubricStructure.flatMap(cat => cat.items);

    // 2. Separar aplicables y no-aplica
    const applicable = allItems.filter(item => {
        const sel = itemSelections[item.id];
        return sel && sel.level !== 'na' && sel.value !== null;
    });

    // Verificar que todos los ítems tengan una selección
    const unselected = allItems.filter(item => !itemSelections[item.id]);
    if (unselected.length > 0) {
        alert(`Por favor seleccione un nivel (o "No aplica") en todos los ítems.\nFaltan: ${unselected.map(i => i.title).join(', ')}`);
        return;
    }

    // 3. Calcular nota final redistribuyendo pesos de "No aplica"
    let totalApplicableWeight = applicable.reduce((sum, item) => sum + item.weight, 0);

    let finalScore = 0;
    if (totalApplicableWeight > 0) {
        applicable.forEach(item => {
            const normalizedWeight = item.weight / totalApplicableWeight;
            finalScore += itemSelections[item.id].value * normalizedWeight;
        });
    }
    finalScore = finalScore.toFixed(2);

    // 4. Datos del formulario
    const residentSelect = document.getElementById('resident-select');
    const teacherSelect  = document.getElementById('teacher-select');
    const eticosNode     = document.querySelector('input[name="eticos"]:checked');
    const eticosVal      = eticosNode ? eticosNode.value : 'NO';
    const fortalezas     = document.getElementById('fortalezas').value;
    const mejoras        = document.getElementById('mejoras').value;
    const residentName   = residentSelect.options[residentSelect.selectedIndex].text;
    const teacherName    = teacherSelect.options[teacherSelect.selectedIndex].text;

    // 5. Clasificación cualitativa
    let qualitative = "";
    if      (finalScore >= 4.5) qualitative = "Sobresaliente";
    else if (finalScore >= 3.6) qualitative = "Bueno";
    else if (finalScore >= 3.0) qualitative = "Aceptable";
    else                         qualitative = "Insuficiente";

    // 6. Mostrar resultados
    document.getElementById('final-score-value').innerText = finalScore;
    document.getElementById('result-resident-info').innerHTML = `
        <p><strong>Residente:</strong> ${residentName}</p>
        <p><strong>Docente:</strong> ${teacherName}</p>
        <p><strong>Rotación:</strong> ${selectedSubjectName}</p>
        <p><strong>Ítems evaluados:</strong> ${applicable.length} de ${allItems.length}</p>
    `;

    let feedback = `<p>El desempeño en la rotación de <strong>${selectedSubjectName}</strong> se clasifica como <strong>${qualitative.toUpperCase()}</strong>, con una nota definitiva de <strong>${finalScore} / 5.0</strong>.</p>`;
    if (applicable.length < allItems.length) {
        const naCount = allItems.length - applicable.length;
        feedback += `<p style="color:#757575;">ℹ️ ${naCount} ítem(s) marcado(s) como "No aplica" fueron excluidos del cálculo. La nota se normalizó sobre los ítems evaluados.</p>`;
    }
    if (eticosVal === 'NO') {
        feedback += `<p style="color:var(--danger); font-weight:bold;">⚠️ ATENCIÓN: Incumplimiento en aspectos éticos reportado. Requiere análisis del comité.</p>`;
    }
    if (fortalezas) feedback += `<p><strong>Fortalezas:</strong> ${fortalezas}</p>`;
    if (mejoras)    feedback += `<p><strong>Por mejorar:</strong> ${mejoras}</p>`;

    document.getElementById('generated-feedback').innerHTML = feedback;

    const scoreUI = document.getElementById('final-score-value');
    if      (finalScore < 3.0) scoreUI.style.color = 'var(--danger)';
    else if (finalScore < 3.6) scoreUI.style.color = 'var(--warning)';
    else if (finalScore < 4.5) scoreUI.style.color = 'var(--info)';
    else                        scoreUI.style.color = 'var(--success)';

    // 7. Guardar en Supabase
    try {
        if (supabaseClient) {
            document.getElementById('loading-overlay').classList.remove('hidden');
            await supabaseClient.from('evaluaciones').insert([{
                residente_id: residentSelect.value,
                docente_id: teacherSelect.value,
                rotacion: selectedSubjectName,
                nota_final: finalScore,
                aspectos_eticos: (eticosVal === 'SI'),
                fortalezas,
                por_mejorar: mejoras
            }]);
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    } catch (e) {
        console.error("Error guardando:", e);
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showStep('step-results');
}

function resetApp() {
    Object.keys(itemSelections).forEach(k => delete itemSelections[k]);
    document.getElementById('evaluation-form').reset();
    showStep('step-subject');
}
