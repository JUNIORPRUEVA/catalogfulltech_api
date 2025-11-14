// === API FULLTECH - Memoria Semántica Inteligente ===
// Desarrollado por Junior López - FULLTECH SRL

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 💾 Conexión PostgreSQL
// =========================================================
const pool = new Pool({
  host: "postgresql_postgres-vector",
  port: 5432,
  database: "vector_memory",
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});

// =========================================================
// 🔑 Clave de OpenAI
// =========================================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ Falta la variable OPENAI_API_KEY en el entorno.");
}

// =========================================================
// 🧩 Verificación de tablas (crea si no existen)
// =========================================================
async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE EXTENSION IF NOT EXISTS "vector";

      CREATE TABLE IF NOT EXISTS fulltech_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT DEFAULT 'Conversación sin título',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fulltech_messages (
        id BIGSERIAL PRIMARY KEY,
        conversation_id UUID REFERENCES fulltech_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding VECTOR(1536),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_embedding_vector
      ON fulltech_messages
      USING ivfflat (embedding vector_l2_ops)
      WITH (lists = 100);
    `);
    console.log("✅ Tablas verificadas correctamente.");
  } catch (err) {
    console.error("❌ Error creando/verificando tablas:", err.message);
  } finally {
    client.release();
  }
}

// =========================================================
// 🧠 Generar embeddings con OpenAI
// =========================================================
async function generarEmbedding(texto) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("⚠️ No hay OPENAI_API_KEY configurada.");
      return [];
    }
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: texto,
        model: "text-embedding-3-small",
      }),
    });

    const data = await response.json();
    if (!data?.data?.[0]?.embedding) {
      console.error("⚠️ Embedding vacío o error:", data);
      return [];
    }
    return data.data[0].embedding;
  } catch (err) {
    console.error("❌ Error generando embedding:", err.message);
    return [];
  }
}

// =========================================================
// 🤖 Generar respuesta IA con memoria contextual
// =========================================================
async function generarRespuestaIA(pregunta, recuerdos) {
  const contexto =
    recuerdos && recuerdos.length
      ? recuerdos.map(r => `${r.role}: ${r.content}`).join("\n")
      : "Sin recuerdos previos relevantes.";

  const prompt = `
Eres Fulltech AI Dev 🧠, un asistente profesional y técnico creado por Junior López.
Tu tarea es recordar información relevante de la conversación y responder de forma natural y precisa.

=== CONTEXTO RELEVANTE ===
${contexto}

=== MENSAJE ACTUAL ===
Usuario: ${pregunta}

=== INSTRUCCIONES ===
- Si el usuario menciona un nombre, recuerda ese nombre en futuras respuestas.
- Si el usuario pregunta algo relacionado con información previa, usa los recuerdos para responder.
- No digas "no tengo memoria" si el dato está en el contexto.
- Mantén un tono amable, profesional y natural.
  `;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres un asistente técnico inteligente de Fulltech SRL." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!data?.choices?.[0]?.message?.content) {
      console.error("⚠️ Respuesta inválida de OpenAI:", data);
      return "No pude generar respuesta por un error interno.";
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("❌ Error generando respuesta IA:", err.message);
    return "Error generando respuesta desde OpenAI.";
  }
}

// =========================================================
// 🟢 ENDPOINTS BASE
// =========================================================
app.get("/ping", (_, res) => {
  res.json({ status: "✅ Servidor activo y corriendo correctamente" });
});

app.post("/conversations", async (req, res) => {
  try {
    const { title } = req.body;
    const r = await pool.query(
      "INSERT INTO fulltech_conversations (title) VALUES ($1) RETURNING *",
      [title || "Nueva conversación"]
    );
    res.json(r.rows[0]);
  } catch (err) {
    console.error("❌ Error creando conversación:", err.message);
    res.status(500).json({ error: "Error creando conversación" });
  }
});

app.get("/messages/:conversation_id", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM fulltech_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [req.params.conversation_id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("❌ Error obteniendo mensajes:", err.message);
    res.status(500).json({ error: "Error obteniendo mensajes" });
  }
});

app.post("/messages", async (req, res) => {
  try {
    const { conversation_id, role, content } = req.body;
    if (!conversation_id || !content)
      return res.status(400).json({ error: "Faltan datos requeridos" });

    const emb = await generarEmbedding(content);
    const vec = emb.length ? `[${emb.join(",")}]` : null;

    const query = vec
      ? `INSERT INTO fulltech_messages (conversation_id, role, content, embedding)
         VALUES ($1, $2, $3, $4::vector)`
      : `INSERT INTO fulltech_messages (conversation_id, role, content)
         VALUES ($1, $2, $3)`;

    const params = vec
      ? [conversation_id, role || "user", content, vec]
      : [conversation_id, role || "user", content];

    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error guardando mensaje:", err.message);
    res.status(500).json({ error: "Error guardando mensaje" });
  }
});

// =========================================================
// 💬 CHAT COMPLETO CON MEMORIA SEMÁNTICA (optimizado)
// =========================================================
app.post("/chat", async (req, res) => {
  const { conversation_id, user_message } = req.body;

  if (!conversation_id || !user_message)
    return res.status(400).json({ success: false, error: "Faltan datos requeridos." });

  try {
    console.log("==========================================");
    console.log("🧠 NUEVO CHAT DE USUARIO");
    console.log("🆔 Conversación:", conversation_id);
    console.log("💬 Mensaje:", user_message);

    // 1️⃣ Generar embedding del usuario
    const embUsuario = await generarEmbedding(user_message);
    if (!embUsuario.length) throw new Error("Embedding del usuario vacío o inválido.");

    // 2️⃣ Buscar recuerdos relevantes
    const embTexto = `[${embUsuario.join(",")}]`;
    const recuerdosRes = await pool.query(
      `SELECT role, content FROM fulltech_messages
       WHERE conversation_id = $1 AND embedding IS NOT NULL
       ORDER BY embedding <-> $2::vector
       LIMIT 5`,
      [conversation_id, embTexto]
    );
    const recuerdos = recuerdosRes.rows;
    console.log(`📚 Recuerdos usados: ${recuerdos.length}`);

    // 3️⃣ Generar respuesta IA
    const respuestaIA = await generarRespuestaIA(user_message, recuerdos);

    // 4️⃣ Guardar mensaje del usuario
    await pool.query(
      "INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, $2, $3, $4::vector)",
      [conversation_id, "user", user_message, embTexto]
    );

    // 5️⃣ Guardar mensaje del asistente
    const embIA = await generarEmbedding(respuestaIA);
    if (!embIA.length) throw new Error("Embedding del asistente vacío o inválido.");
    const embTextoIA = `[${embIA.join(",")}]`;

    await pool.query(
      "INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, $2, $3, $4::vector)",
      [conversation_id, "assistant", respuestaIA, embTextoIA]
    );

    // 6️⃣ Responder al cliente
    console.log("✅ Respuesta generada correctamente.");
    res.json({
      success: true,
      assistant_message: respuestaIA,
      recuerdos_usados: recuerdos.length,
    });
  } catch (err) {
    console.error("🚨 Error interno en /chat:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Error procesando conversación.",
    });
  }
});

// =========================================================
// 🚀 Iniciar servidor
// =========================================================
const PORT = process.env.PORT || 9090;
app.listen(PORT, "0.0.0.0", async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo correctamente en puerto ${PORT}`);
});

export default app;
