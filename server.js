// === API FULLTECH - Memoria Semántica de Conversaciones ===
// Junior López - FULLTECH SRL

import express from "express";
import cors from "cors";
import fetch from "node-fetch"; // ⚡ para llamadas a OpenAI
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// 💾 Conexión PostgreSQL
const pool = new Pool({
  host: "postgresql_postgres-vector", // mismo host que usas en EasyPanel
  port: 5432,
  database: "memoria_vectorial", // 👈 aquí usa el nuevo nombre exacto
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});


// 🔑 Clave de OpenAI (ahora viene de variable de entorno)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =========================================================
// 🧩 CREACIÓN DE TABLAS (con soporte para embeddings vectoriales)
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
        embedding VECTOR(1536), -- 🧠 memoria semántica
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- ⚡ índice para búsqueda vectorial rápida
      CREATE INDEX IF NOT EXISTS idx_embedding_vector
      ON fulltech_messages
      USING ivfflat (embedding vector_l2_ops)
      WITH (lists = 100);
    `);
    console.log("✅ Tablas verificadas correctamente (con vector).");
  } catch (err) {
    console.error("❌ Error al crear/verificar tablas:", err);
  } finally {
    client.release();
  }
}

// =========================================================
// 🧠 Función para generar embeddings (vector semántico)
// =========================================================
async function generarEmbedding(texto) {
  try {
    if (!OPENAI_API_KEY) {
      console.error("❌ ERROR: Falta la variable OPENAI_API_KEY en el entorno.");
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
        model: "text-embedding-3-small", // ✅ modelo eficiente y económico
      }),
    });

    const data = await response.json();
    if (!data?.data?.[0]?.embedding) {
      console.error("⚠️ Respuesta inesperada de OpenAI:", data);
      return [];
    }

    return data.data[0].embedding;
  } catch (error) {
    console.error("❌ Error generando embedding:", error);
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
app.post("/api/conversations", async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO fulltech_conversations (title) VALUES ($1) RETURNING *",
      [title || "Nueva conversación"]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("⚠️ Error creando conversación:", err);
    res.status(500).json({ error: "Error al crear conversación" });
  }
});

// =========================================================
// 💬 GUARDAR MENSAJE con EMBEDDING SEMÁNTICO (VERSIÓN FINAL)
// =========================================================
app.post("/api/messages", async (req, res) => {
  const { conversation_id, role, content } = req.body;
  try {
    if (!conversation_id || !content) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    // 🧠 Genera vector de significado
    const embedding = await generarEmbedding(content);

    // ⚙️ Convierte el array en formato compatible con pgvector
    const vector = Array.isArray(embedding) && embedding.length
      ? `[${embedding.join(",")}]`
      : null;

    // 💾 Inserta el mensaje
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
    console.error("⚠️ Error guardando mensaje:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});


// =========================================================
// 📜 OBTENER HISTORIAL DE UNA CONVERSACIÓN
// =========================================================
app.get("/api/messages/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM fulltech_messages WHERE conversation_id = $1 ORDER BY created_at ASC",
      [conversation_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("⚠️ Error obteniendo mensajes:", err);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

// =========================================================
// 🔍 BÚSQUEDA SEMÁNTICA (recordar contexto por significado)
// =========================================================
app.post("/api/memory/search", async (req, res) => {
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
    console.error("⚠️ Error en búsqueda semántica:", err);
    res.status(500).json({ error: "Error al buscar memoria" });
  }
});

// =========================================================
// 🚀 INICIAR SERVIDOR
// =========================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo con memoria vectorial en puerto ${PORT}`);
});
