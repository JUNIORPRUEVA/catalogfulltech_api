// ===========================================================
// 🧠 FULLTECH AI SERVER - BASE VECTORIAL SIN /chat
// ===========================================================

import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ===========================================================
// 🔌 CONEXIÓN A POSTGRES VECTORIAL
// ===========================================================
const pool = new Pool({
  host: "postgresql_postgres-vector",
  port: 5432,
  database: "vector_memory",
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});

// ===========================================================
// 🔑 CLAVE DE OPENAI
// ===========================================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ Falta la variable OPENAI_API_KEY en el entorno.");
}

// ===========================================================
// 🧱 CREAR TABLAS SI NO EXISTEN
// ===========================================================
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
  } finally {
    client.release();
  }
}

// ===========================================================
// 🔡 FUNCIÓN PARA GENERAR EMBEDDING
// ===========================================================
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
    return data?.data?.[0]?.embedding || [];
  } catch (err) {
    console.error("❌ Error generando embedding:", err.message);
    return [];
  }
}

// ===========================================================
// 🧠 MINI RAZONAMIENTO (simula pensamiento interno de la IA)
// ===========================================================
async function reflexionar(prompt) {
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
          {
            role: "system",
            content: "Eres un motor de razonamiento interno. Responde de forma breve y lógica, sin emociones.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });
    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "Sin reflexión interna.";
  } catch (e) {
    console.error("⚠️ Error en reflexión interna:", e.message);
    return "No se pudo razonar internamente.";
  }
}

// ===========================================================
// 🚀 ENDPOINTS BÁSICOS
// ===========================================================

// 🔹 Test
app.get("/ping", (req, res) => {
  res.json({ status: "✅ Servidor activo y corriendo correctamente" });
});

// 🔹 Crear conversación
app.post("/conversations", async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    "INSERT INTO fulltech_conversations (title) VALUES ($1) RETURNING *",
    [title || "Nueva conversación"]
  );
  res.json(result.rows[0]);
});

// 🔹 Guardar mensaje
app.post("/messages", async (req, res) => {
  const { conversation_id, role, content } = req.body;

  if (!conversation_id || !content) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const embedding = await generarEmbedding(content);
  const vector = embedding.length ? `[${embedding.join(",")}]` : null;

  const query = vector
    ? `INSERT INTO fulltech_messages (conversation_id, role, content, embedding)
       VALUES ($1, $2, $3, $4::vector)`
    : `INSERT INTO fulltech_messages (conversation_id, role, content)
       VALUES ($1, $2, $3)`;

  const params = vector
    ? [conversation_id, role || "user", content, vector]
    : [conversation_id, role || "user", content];

  await pool.query(query, params);

  // 🧩 Reflexión interna (pensamiento del bot)
  if (role === "assistant") {
    const pensamiento = await reflexionar(content);
    console.log("💭 Pensamiento interno:", pensamiento);
  }

  res.json({ success: true });
});

// 🔹 Obtener mensajes
app.get("/messages/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;
  const result = await pool.query(
    "SELECT * FROM fulltech_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [conversation_id]
  );
  res.json(result.rows);
});

// 🔹 Buscar mensajes similares
app.post("/memory/search", async (req, res) => {
  const { conversation_id, embedding, limit = 5 } = req.body;
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
});

// ===========================================================
// 🟢 INICIAR SERVIDOR
// ===========================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo con memoria vectorial en puerto ${PORT}`);
});
