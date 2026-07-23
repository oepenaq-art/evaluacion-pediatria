/* ========================================================
   CONFIGURACIÓN DE SUPABASE (BASE DE DATOS)
   ======================================================== */
// NOTA PARA EL USUARIO: Reemplaza estas dos líneas con las claves de tu proyecto en Supabase
const SUPABASE_URL = 'https://wgsnjayvreknhsikgqbn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sp0h2Qle7Fj660C0ht9tNA_Q8edhQ68';

// Inicializar cliente de Supabase
let supabaseClient = null;
try {
    if (SUPABASE_URL !== 'AQUI_VA_TU_URL' && typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (e) {
    console.error("Error inicializando Supabase:", e);
}

/* ========================================================
   DATOS ESTÁTICOS Y RÚBRICA EXACTA
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
            { id: "c_acad", title: "Conocimientos académicos", desc: "Nivel de actualización, organización y lectura crítica de la evidencia.", weight: 0.25 }
        ]
    },
    {
        category: "Habilidad práctica (25%)",
        items: [
            { id: "h_historia", title: "Abordaje historia clínica", desc: "Metódica, profunda, íntegra, veraz y oportuna.", weight: 0.12 },
            { id: "h_tecnico", title: "Desempeño técnico", desc: "Disposición, oportunidad, ingenio, recursividad, eficiencia.", weight: 0.13 }
        ]
    },
    {
        category: "Criterio clínico (25%)",
        items: [
            { id: "cr_anamnesis", title: "Anamnesis y examen clínico", desc: "Ordenado, completo, con énfasis en la situación clínica.", weight: 0.05 },
            { id: "cr_examenes", title: "Solicitud e interpretación de exámenes", desc: "Racionalidad, oportunidad, utilidad y articulación.", weight: 0.10 },
            { id: "cr_diagnostico", title: "Impresión diagnóstica y conducta terapéutica", desc: "Precisión, claridad, consistencia, responsabilidad.", weight: 0.10 }
        ]
    },
    {
        category: "Compromiso (25%)",
        items: [
            { id: "co_seguridad", title: "Con la seguridad del paciente y su familia", desc: "Calidez, consideración, respeto, interés, paciencia.", weight: 0.08 },
            { id: "co_equipo", title: "Con el equipo de trabajo", desc: "Colaboración, solidaridad, respeto y lealtad.", weight: 0.08 },
            { id: "co_academico", title: "Con actividades académicas e investigación", desc: "Interés, constancia, creatividad, puntualidad.", weight: 0.09 }
        ]
    }
];

let selectedSubjectName = "";

/* ========================================================
   LÓGICA DE LA INTERFAZ
   ======================================================== */
document.addEventListener('DOMContentLoaded', () => {
    renderSubjects();
    renderRubric();
});

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(el => el.classList.add('hidden'));
    document.getElementById(stepId).classList.remove('hidden');
}
function goBack(stepId) { showStep(stepId); }

function selectYear(year) {
    if (year === 1) { showStep('step-subject'); }
}

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
    
    // Cargar datos de base de datos o mockup
    await loadResidents();
    await loadTeachers(subject);
    
    showStep('step-form');
}

/* ========================================================
   BASE DE DATOS: RESIDENTES Y DOCENTES
   ======================================================== */
async function loadResidents() {
    const select = document.getElementById('resident-select');
    select.innerHTML = '<option value="">Seleccione residente...</option>';
    
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('residentes').select('id, nombre').eq('año', 1);
        if (!error && data) {
            data.forEach(r => select.add(new Option(r.nombre, r.id)));
            return;
        }
    }
    
    // Fallback Local
    const locales = [{id: 1, nombre: 'Maria Alejandra Echavarria'}, {id: 2, nombre: 'Sara Jaramillo'}, {id: 3, nombre: 'Valeria Naranjo'}];
    locales.forEach(r => select.add(new Option(r.nombre, r.id)));
}

async function loadTeachers(rotacion) {
    const select = document.getElementById('teacher-select');
    select.innerHTML = '<option value="">Seleccione docente...</option>';
    
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('docentes').select('id, nombre').eq('rotacion', rotacion);
        if (!error && data) {
            data.forEach(t => select.add(new Option(t.nombre, t.id)));
        }
    } else {
        // Fallback Local
        select.add(new Option('Dr. Demo (Local)', '999'));
    }
    
    select.add(new Option('+ Agregar nuevo docente...', 'new'));
}

function checkNewTeacher(selectElement) {
    if (selectElement.value === 'new') {
        document.getElementById('new-teacher-modal').classList.remove('hidden');
        selectElement.value = ''; 
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
    
    if (supabaseClient) {
        const { data, error } = await supabaseClient.from('docentes').insert([{ nombre: name, rotacion: selectedSubjectName }]).select();
        if (!error && data) {
            const select = document.getElementById('teacher-select');
            const option = new Option(data[0].nombre, data[0].id);
            select.insertBefore(option, select.options[select.options.length - 1]);
            select.value = data[0].id;
        }
    } else {
        // Fallback Local
        const select = document.getElementById('teacher-select');
        const option = new Option(name, name);
        select.insertBefore(option, select.options[select.options.length - 1]);
        select.value = name;
    }
    
    document.getElementById('loading-overlay').classList.add('hidden');
    closeTeacherModal();
}

/* ========================================================
   RENDERIZAR RÚBRICA Y CALCULAR
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
            const row = document.createElement('div');
            row.className = 'rubric-item-row';
            
            row.innerHTML = `
                <div class="rubric-item-desc">
                    <span class="rubric-item-title">${item.title} <span class="rubric-item-weight">Peso: ${(item.weight * 100)}%</span></span>
                    <span class="help-text" style="margin:0;">${item.desc}</span>
                </div>
                <div class="rubric-item-input">
                    <input type="number" id="input-${item.id}" min="0" max="5" step="0.1" required placeholder="0.0" 
                           onchange="validateScore(this)" onkeyup="validateScore(this)">
                </div>
            `;
            container.appendChild(row);
        });
    });
}

function validateScore(input) {
    if (input.value > 5) input.value = 5.0;
    if (input.value < 0) input.value = 0.0;
}

async function calculateResults() {
    // 1. Obtener los valores ingresados y calcular
    let totalScore = 0;
    
    for (const cat of rubricStructure) {
        for (const item of cat.items) {
            const val = parseFloat(document.getElementById(`input-${item.id}`).value) || 0;
            totalScore += (val * item.weight);
        }
    }
    
    // Redondear a 2 decimales
    const finalScore = totalScore.toFixed(2);
    
    // 2. Extraer otros datos del formulario
    const residentSelect = document.getElementById('resident-select');
    const teacherSelect = document.getElementById('teacher-select');
    const eticosNode = document.querySelector('input[name="eticos"]:checked');
    const eticosVal = eticosNode ? eticosNode.value : 'NO';
    const fortalezas = document.getElementById('fortalezas').value;
    const mejoras = document.getElementById('mejoras').value;

    const residentName = residentSelect.options[residentSelect.selectedIndex].text;
    const teacherName = teacherSelect.options[teacherSelect.selectedIndex].text;
    
    // Mostrar UI de Resultados Localmente
    document.getElementById('final-score-value').innerText = finalScore;
    document.getElementById('result-resident-info').innerHTML = `
        <p><strong>Residente:</strong> ${residentName}</p>
        <p><strong>Docente:</strong> ${teacherName}</p>
        <p><strong>Rotación:</strong> ${selectedSubjectName}</p>
    `;

    // Generar Retroalimentación textual
    let qualitative = "";
    if (finalScore >= 4.25) qualitative = "sobresaliente";
    else if (finalScore >= 3.75) qualitative = "bueno";
    else if (finalScore >= 3.0) qualitative = "aceptable";
    else qualitative = "insuficiente";

    let feedback = `<p>El desempeño clínico y académico en la rotación de <strong>${selectedSubjectName}</strong> se clasifica como <strong>${qualitative.toUpperCase()}</strong>, obteniendo una nota definitiva de ${finalScore} / 5.0.</p>`;
    
    if (eticosVal === 'NO') {
        feedback += `<p style="color:var(--danger); font-weight:bold;">⚠️ ATENCIÓN: Se reporta incumplimiento en aspectos éticos. Este resultado debe ser analizado por el comité y el tutor de forma independiente al puntaje.</p>`;
    }
    if (fortalezas) feedback += `<p><strong>Fortalezas:</strong> ${fortalezas}</p>`;
    if (mejoras) feedback += `<p><strong>Aspectos por Mejorar:</strong> ${mejoras}</p>`;

    document.getElementById('generated-feedback').innerHTML = feedback;

    // Cambiar color
    const scoreUI = document.getElementById('final-score-value');
    if (finalScore < 3.0) scoreUI.style.color = 'var(--danger)';
    else if (finalScore < 3.75) scoreUI.style.color = 'var(--warning)';
    else if (finalScore < 4.25) scoreUI.style.color = 'var(--info)';
    else scoreUI.style.color = 'var(--success)';

    // 3. Guardar en Base de Datos (Si está configurado)
    if (supabaseClient) {
        document.getElementById('loading-overlay').classList.remove('hidden');
        const insertData = {
            residente_id: residentSelect.value,
            docente_id: teacherSelect.value,
            rotacion: selectedSubjectName,
            nota_final: finalScore,
            aspectos_eticos: (eticosVal === 'SI'),
            fortalezas: fortalezas,
            por_mejorar: mejoras
        };
        
        await supabaseClient.from('evaluaciones').insert([insertData]);
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    showStep('step-results');
}

function resetApp() {
    renderRubric();
    document.getElementById('evaluation-form').reset();
    showStep('step-subject'); 
}
