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

// Conexión PostgreSQL
const pool = new Pool({
  host: "postgresql_postgres-vector",
  port: 5432,
  database: "vector_memory",
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});

// Clave de OpenAI (variable de entorno)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ Falta la variable OPENAI_API_KEY en el entorno.");
}

// Crear tablas si no existen
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

async function generarEmbedding(texto) {
  try {
    if (!OPENAI_API_KEY) return [];
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ input: texto, model: "text-embedding-3-small" }),
    });
    const data = await response.json();
    return data?.data?.[0]?.embedding || [];
  } catch (err) {
    console.error("❌ Error generando embedding:", err.message);
    return [];
  }
}

// Rutas básicas
app.get("/ping", (req, res) => {
  res.json({ status: "✅ Servidor activo y corriendo correctamente" });
});

app.post("/conversations", async (req, res) => {
  const { title } = req.body;
  const result = await pool.query(
    "INSERT INTO fulltech_conversations (title) VALUES ($1) RETURNING *",
    [title || "Nueva conversación"]
  );
  res.json(result.rows[0]);
});

app.post("/messages", async (req, res) => {
  const { conversation_id, role, content } = req.body;
  if (!conversation_id || !content) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }
  const embedding = await generarEmbedding(content);
  const vector = embedding.length ? `[${embedding.join(",")}]` : null;
  const query = vector
    ? `INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, $2, $3, $4::vector)`
    : `INSERT INTO fulltech_messages (conversation_id, role, content) VALUES ($1, $2, $3)`;
  const params = vector
    ? [conversation_id, role || "user", content, vector]
    : [conversation_id, role || "user", content];
  await pool.query(query, params);
  res.json({ success: true });
});

app.get("/messages/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;
  const result = await pool.query(
    "SELECT * FROM fulltech_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
    [conversation_id]
  );
  res.json(result.rows);
});

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

app.post("/chat", async (req, res) => {
  const { conversation_id, user_message } = req.body;
  if (!conversation_id || !user_message) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }
  // Guarda mensaje del usuario
  const embUser = await generarEmbedding(user_message);
  const vecUser = `[${embUser.join(",")}]`;
  await pool.query(
    "INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, 'user', $2, $3::vector)",
    [conversation_id, user_message, vecUser]
  );
  // Busca contexto
  const { rows: contextRows } = await pool.query(
    `
    SELECT content
    FROM fulltech_messages
    WHERE conversation_id = $1 AND embedding IS NOT NULL
    ORDER BY embedding <-> $2::vector
    LIMIT 5
    `,
    [conversation_id, vecUser]
  );
  const context = contextRows.map(r => r.content).join("\n");
  // Construye prompt y llama a OpenAI
  const prompt = `
Eres Fulltech AI, un asistente técnico y vendedor de Fulltech SRL.
Responde de forma clara y profesional.

Contexto previo:
${context}

Usuario dice:
${user_message}
`;
  const chatResp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Eres Fulltech AI." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const data = await chatResp.json();
  const assistant_message = data?.choices?.[0]?.message?.content || "Lo siento, no pude generar una respuesta.";
  // Guarda respuesta de IA
  const embAI = await generarEmbedding(assistant_message);
  const vecAI = `[${embAI.join(",")}]`;
  await pool.query(
    "INSERT INTO fulltech_messages (conversation_id, role, content, embedding) VALUES ($1, 'assistant', $2, $3::vector)",
    [conversation_id, assistant_message, vecAI]
  );
  res.json({ success: true, reply: assistant_message });
});

// Inicia servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
