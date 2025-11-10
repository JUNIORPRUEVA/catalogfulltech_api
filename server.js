// === API FULLTECH - Conversaciones con PostgreSQL ===
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
  host: "postgresql_postgres-n8n",  // <-- nombre del servicio interno de tu PostgreSQL
  port: 5432,
  database: "n8n",
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  ssl: false
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

// 🟢 Endpoint de prueba
app.get("/", (req, res) => {
  res.send("🚀 API Conversaciones FULLTECH corriendo correctamente");
});

app.get("/ping", (req, res) => {
  res.json({ status: "✅ Servidor activo y corriendo correctamente" });
});

// 🚀 Iniciar servidor
const PORT = 8080;
app.listen(PORT, async () => {
  await ensureTables();
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
