// === API FULLTECH - Catálogo de Productos ===
// Junior Lopez - FULLTECH SRL

import express from "express";
import pg from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Conexión a PostgreSQL (ajusta tus datos reales)
const pool = new pg.Pool({
  host: "gcdndd.easypanel.host",  // ✅ tu host externo de PostgreSQL
  port: 5432,
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  database: "fulltechcatalog",
  ssl: { rejectUnauthorized: false } // evita error de SSL
});



// ✅ Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 API FULLTECH Catalog corriendo correctamente");
});

// ✅ Obtener todos los productos
app.get("/productos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Buscar producto por ID
app.get("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM productos WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 8080;
app.listen(PORT, () => console.log(`🔥 Servidor corriendo en puerto ${PORT}`));
