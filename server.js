// === API FULLTECH - Catálogo de Productos ===
// Junior Lopez - FULLTECH SRL

import express from "express";
import pg from "pg";
import cors from "cors";
import fetch from "node-fetch"; // 👈 NECESARIO PARA CARGAR LAS IMÁGENES EXTERNAS

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Conexión a PostgreSQL (ajusta tus datos reales)
const pool = new pg.Pool({
  host: "gcdndd.easypanel.host",  // tu host externo
  port: 5432,
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  database: "fulltechcatalog",
  ssl: false // 🚫 Desactiva SSL, ya que PostgreSQL no lo soporta
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

// ✅ NUEVA RUTA: Proxy para mostrar imágenes externas (AppSheet)
app.get("/imagen", async (req, res) => {
  try {
    const imageUrl = req.query.url; // ej: ?url=https://www.appsheet.com/template/gettablefileurl...
    if (!imageUrl) {
      return res.status(400).send("Falta el parámetro 'url'");
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(404).send("No se pudo obtener la imagen");
    }

    // Detectar tipo MIME automáticamente
    const contentType = response.headers.get("content-type");
    const buffer = await response.arrayBuffer();

    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error al cargar imagen:", error);
    res.status(500).send("Error al cargar imagen");
  }
});

const PORT = 8080;
app.listen(PORT, () => console.log(`🔥 Servidor corriendo en puerto ${PORT}`));
