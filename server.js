// === API FULLTECH - Memoria de conversaciones ===
// Junior López - FULLTECH SRL

import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// 💾 Conexión PostgreSQL
const pool = new Pool({
  host: "postgresql_postgres-n8n",
  port: 5432,
  database: "n8n",
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});

// ✅ Crear tablas si no existen
async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log("✅ Tablas verificadas correctamente.");
  } catch (err) {
    console.error("❌ Error al crear/verificar tablas:", err);
  } finally {
    client.release();
  }
}

// 🟢 ENDPOINTS

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

// Guardar mensaje
app.post("/api/messages", async (req, res) => {
  const { conversation_id, role, content } = req.body;
  try {
    await pool.query(
      "INSERT INTO fulltech_messages (conversation_id, role, content) VALUES ($1, $2, $3)",
      [conversation_id, role, content]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("⚠️ Error guardando mensaje:", err);
    res.status(500).json({ error: "Error al guardar mensaje" });
  }
});

// Obtener mensajes por conversación
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

// 🚀 Iniciar servidor
const PORT = 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
