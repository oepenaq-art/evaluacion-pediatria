const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.generarInformeFinal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debe estar autenticado para realizar esta acción."
    );
  }

  const userDoc = await admin.firestore().collection("users").doc(context.auth.uid).get();
  if (!userDoc.exists || userDoc.data().rol !== "coordinador") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Acceso restringido únicamente a coordinadores."
    );
  }

  const { resName, rotation, avgFinal, itemAverages, fortalezas, mejoras, dateFrom, dateTo, microcurriculo } = data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "La clave GEMINI_API_KEY no ha sido configurada en el servidor."
    );
  }

  let itemsText = "";
  if (itemAverages) {
    Object.values(itemAverages).forEach((ia) => {
      itemsText += `- ${ia.title} (peso ${(ia.weight * 100).toFixed(0)}%): promedio ${ia.avg}/5.0\n`;
    });
  }

  const prompt = `Eres un evaluador académico experto en educación médica de posgrado en Pediatría de la Universidad EIA, Colombia. Genera un informe de retroalimentación académica formal en prosa (4-5 párrafos) para un residente.

DATOS DE LA EVALUACIÓN:
- Residente: ${resName}
- Rotación: ${rotation}
- Período: ${dateFrom} a ${dateTo}
- Nota promedio final: ${avgFinal}/5.0

PROMEDIOS POR COMPETENCIA:
${itemsText}

COMENTARIOS DE LOS DOCENTES:
Fortalezas observadas: ${fortalezas && fortalezas.length > 0 ? fortalezas.join("; ") : "Sin comentarios registrados."}
Aspectos por mejorar: ${mejoras && mejoras.length > 0 ? mejoras.join("; ") : "Sin comentarios registrados."}

OBJETIVOS DEL MICROCURRÍCULO DE REFERENCIA:
${microcurriculo || "Desempeño según competencias estándar de Pediatría EIA."}

INSTRUCCIONES:
1. Redacta en tercera persona y tono académico formal.
2. En el primer párrafo, contextualiza la rotación y el período evaluado.
3. En el segundo párrafo, analiza las fortalezas del residente vinculándolas con los objetivos del microcurrículo.
4. En el tercer párrafo, identifica áreas de mejora específicas.
5. En el cuarto párrafo, proporciona recomendaciones concretas.
6. En el último párrafo, concluye con una valoración global.
7. NO incluyas tablas ni viñetas. Solo párrafos en prosa.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) throw new Error("Google API Error: " + response.statusText);
    const jsonResult = await response.json();
    const resultText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { success: true, text: resultText };
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
