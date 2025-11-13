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
// 💾 Conexión PostgreSQL (nombre real de la base)
// =========================================================
const pool = new Pool({
  host: "postgresql_postgres-vector", // nombre del servicio en EasyPanel
  port: 5432,
  database: "vector_memory", // nombre exacto de la BD
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});

// =========================================================
// 🔑 Clave de OpenAI (desde variable de entorno)
// =========================================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ Advertencia: Falta la variable OPENAI_API_KEY en el entorno.");
}

// =========================================================
// 🧩 Verificación y creación de tablas vectoriales
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
    console.log("✅ Tablas verificadas y listas (con soporte vectorial).");
  } catch (err) {
    console.error("❌ Error al crear/verificar tablas:", err.message);
  } finally {
    client.release();
  }
}

// =========================================================
// 🧠 Generar Embeddings con OpenAI
// =========================================================
async function generarEmbedding(texto) {
  try {
    if (!OPENAI_API_KEY) return [];

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
      console.error("⚠️ Respuesta inesperada de OpenAI:", data);
      return [];
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("❌ Error generando embedding:", error.message);
    return [];
  }
}

// =========================================================
// 🟢 ENDPOINTS BÁSICOS
// =========================================================

// Ruta de prueba
app.get("/ping", (req, res) => {
  res.json({ status: "✅ Servidor activo y corriendo correctamente" });
});

// Crear nueva conversación
app.post("/conversations", async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO fulltech_conversations (title) VALUES ($1) RETURNING *",
      [title || "Nueva conversación"]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("⚠️ Error creando conversación:", err.message);
    res.status(500).json({ error: "Error al crear conversación" });
  }
});

// =========================================================
// 💬 Guardar mensaje con embedding vectorial
// =========================================================
app.post("/messages", async (req, res) => {
  const { conversation_id, role, content } = req.body;
  try {
    if (!conversation_id || !content) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const embedding = await generarEmbedding(content);
    const vector = Array.isArray(embedding) && embedding.length
      ? `[${embedding.join(",")}]`
      : null;

    const query = vector
      ? `INSERT INTO fulltech_messages (conversation_id, role, content, embedding)
         VALUES ($1, $2, $3, $4::vector)`
      : `INSERT INTO fulltech_messages (conversation_id, role, content)
         VALUES ($1, $2, $3)`;

    const params = vector
      ? [conversation_id, role || "user", content, vector]
      : [conversation_id, role || "user", content];

    await pool.query(query, params);

    console.log(`💾 Mensaje guardado (${role || "user"}): ${content}`);
    res.json({ success: true });
  } catch (err) {
    console.error("⚠️ Error guardando mensaje:", err.message);
    res.status(500).json({ error: "Error al guardar mensaje" });
  }
});

// =========================================================
// 📜 Obtener historial de conversación
// =========================================================
app.get("/messages/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM fulltech_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [conversation_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("⚠️ Error obteniendo mensajes:", err.message);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

// =========================================================
// 🔍 Búsqueda semántica (recuperar contexto relevante)
// =========================================================
app.post("/memory/search", async (req, res) => {
  const { conversation_id, embedding, limit = 5 } = req.body;
  try {
    const result = await pool.query(
      `
        SELECT role, content, created_at
        FROM fulltech_messages
        WHERE conversation_id = $1
        AND embedding IS NOT NULL
        ORDER BY embedding <-> $2
        LIMIT $3
      `,
      [conversation_id, embedding, limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("⚠️ Error en búsqueda semántica:", err.message);
    res.status(500).json({ error: "Error al buscar memoria" });
  }
});

// =========================================================
// 🤖 NUEVO ENDPOINT /chat (IA con memoria vectorial)
// =========================================================
app.post("/chat", async (req, res) => {
  try {
    const { conversation_id, user_message } = req.body;

    if (!conversation_id || !user_message) {
      return res.status(400).json({ error: "Faltan datos: conversation_id o user_message" });
    }

    // 1️⃣ Guardar mensaje del usuario
    const userEmbedding = await generarEmbedding(user_message);
    const vectorUser = `[${userEmbedding.join(",")}]`;

    await pool.query(
      "INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, 'user', $2, $3::vector)",
      [conversation_id, user_message, vectorUser]
    );

    // 2️⃣ Buscar los 5 mensajes más parecidos (contexto)
    const { rows: contextRows } = await pool.query(
      `
      SELECT content
      FROM fulltech_messages
      WHERE conversation_id = $1
      AND embedding IS NOT NULL
      ORDER BY embedding <-> $2::vector
      LIMIT 5
      `,
      [conversation_id, vectorUser]
    );

    const context = contextRows.map(r => r.content).join("\n");

    // 3️⃣ Crear prompt con contexto
    const fullPrompt = `
Eres Fulltech AI, asistente técnico y vendedor de Fulltech SRL.
Responde de forma clara, profesional y con tono dominicano si aplica.

Contexto previo:
${context}

Cliente dice:
${user_message}
`;

    // 4️⃣ Llamar a OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Eres Fulltech AI, un asistente técnico profesional de Fulltech SRL." },
          { role: "user", content: fullPrompt },
        ],
      }),
    });

    const data = await response.json();
    const assistant_message =
      data?.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta.";

    // 5️⃣ Guardar respuesta de la IA
    const aiEmbedding = await generarEmbedding(assistant_message);
    const vectorAI = `[${aiEmbedding.join(",")}]`;

    await pool.query(
      "INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, 'assistant', $2, $3::vector)",
      [conversation_id, assistant_message, vectorAI]
    );

    // 6️⃣ Devolver respuesta al cliente
    res.json({
      success: true,
      reply: assistant_message,
      context_used: contextRows.length,
    });

    console.log(`🤖 Respuesta IA: ${assistant_message}`);
  } catch (error) {
    console.error("❌ Error en /chat:", error.message);
    res.status(500).json({ error: "Error interno en /chat", details: error.message });
  }
});

// =========================================================
// 🚀 Iniciar servidor
// =========================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo con memoria vectorial e IA en puerto ${PORT}`);
});
