// === API FULLTECH - Conversaciones y Mensajes ===
// Junior López - FULLTECH SRL

import express from "express";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// 💾 Conexión directa a PostgreSQL (mismo servidor Easypanel)
const pool = new Pool({
  host: "postgresql_postgres-n8n",  // servicio interno del contenedor PostgreSQL
  port: 5432,
  database: "n8n",
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false,
});

// 🧱 Crear tablas si no existen
async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS fulltechuiconversation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT DEFAULT 'Conversación Fulltech',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fulltechuimensage (
        id BIGSERIAL PRIMARY KEY,
        conversation_id UUID REFERENCES fulltechuiconversation(id) ON DELETE CASCADE,
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

// 🟢 Endpoint raíz
app.get("/", (req, res) => {
  res.send("🚀 API FULLTECH Conversaciones corriendo correctamente");
});

// 🟢 Endpoint de estado
app.get("/ping", (req, res) => {
  res.json({ status: "✅ Servidor activo y corriendo correctamente" });
});


// =========================
// 🔹 ENDPOINTS CRUD
// =========================

// 🧩 Crear conversación
app.post("/api/conversations", async (req, res) => {
  const { title } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO fulltechuiconversation (title) VALUES ($1) RETURNING *",
      [title || "Nueva conversación"]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("⚠️ Error al crear conversación:", error);
    res.status(500).json({ error: "Error al crear conversación" });
  }
});

// 🧩 Obtener todas las conversaciones
app.get("/api/conversations", async (_, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fulltechuiconversation ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("⚠️ Error al obtener conversaciones:", error);
    res.status(500).json({ error: "Error al obtener conversaciones" });
  }
});

// 🧩 Eliminar conversación (y sus mensajes)
app.delete("/api/conversations/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM fulltechuiconversation WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("⚠️ Error al eliminar conversación:", error);
    res.status(500).json({ error: "Error al eliminar conversación" });
  }
});

// 🧩 Guardar mensaje
app.post("/api/messages", async (req, res) => {
  const { conversation_id, role, content } = req.body;
  try {
    await pool.query(
      "INSERT INTO fulltechuimensage (conversation_id, role, content) VALUES ($1, $2, $3)",
      [conversation_id, role, content]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("⚠️ Error al guardar mensaje:", error);
    res.status(500).json({ error: "Error al guardar mensaje" });
  }
});

// 🧩 Obtener mensajes por conversación
app.get("/api/messages/:conversation_id", async (req, res) => {
  const { conversation_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM fulltechuimensage WHERE conversation_id = $1 ORDER BY created_at ASC",
      [conversation_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("⚠️ Error al obtener mensajes:", error);
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

// =========================
// 🚀 Iniciar servidor
// =========================
const PORT = 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
