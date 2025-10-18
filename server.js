// === API FULLTECH - Catálogo de Productos ===
// Autor: Junior Lopez - FULLTECH SRL
// Fecha: 2025
// ---------------------------------------------------

import express from "express";
import pg from "pg";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------
// 🔗 Conexión a PostgreSQL (ajusta tus credenciales reales)
// ---------------------------------------------------
const pool = new pg.Pool({
  host: "gcdndd.easypanel.host",
  port: 5432,
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  database: "fulltechcatalog",
  ssl: false, // EasyPanel usa conexión local, sin SSL
});

// ---------------------------------------------------
// ✅ Ruta principal (verificación rápida)
// ---------------------------------------------------
app.get("/", (req, res) => {
  res.send("🚀 API FULLTECH Catalog funcionando correctamente");
});

// ---------------------------------------------------
// ✅ Obtener todos los productos
// ---------------------------------------------------
app.get("/productos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");

    // 🔄 Agregamos campos de proxy de imagen
    const productos = result.rows.map((p) => ({
      ...p,
      imagen1_proxy: p.imagen1
        ? `https://api_catalogo-fulltech-flutterflow.gcdndd.easypanel.host/imagen?url=${encodeURIComponent(p.imagen1)}`
        : null,
      imagen2_proxy: p.imagen2
        ? `https://api_catalogo-fulltech-flutterflow.gcdndd.easypanel.host/imagen?url=${encodeURIComponent(p.imagen2)}`
        : null,
      imagen3_proxy: p.imagen3
        ? `https://api_catalogo-fulltech-flutterflow.gcdndd.easypanel.host/imagen?url=${encodeURIComponent(p.imagen3)}`
        : null,
    }));

    res.json(productos);
  } catch (error) {
    console.error("❌ Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// ---------------------------------------------------
// ✅ Obtener producto por ID
// ---------------------------------------------------
app.get("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM productos WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const p = result.rows[0];
    const producto = {
      ...p,
      imagen1_proxy: p.imagen1
        ? `https://api_catalogo-fulltech-flutterflow.gcdndd.easypanel.host/imagen?url=${encodeURIComponent(p.imagen1)}`
        : null,
      imagen2_proxy: p.imagen2
        ? `https://api_catalogo-fulltech-flutterflow.gcdndd.easypanel.host/imagen?url=${encodeURIComponent(p.imagen2)}`
        : null,
      imagen3_proxy: p.imagen3
        ? `https://api_catalogo-fulltech-flutterflow.gcdndd.easypanel.host/imagen?url=${encodeURIComponent(p.imagen3)}`
        : null,
    };

    res.json(producto);
  } catch (error) {
    console.error("❌ Error al obtener producto por ID:", error);
    res.status(500).json({ error: "Error al obtener producto" });
  }
});

// ---------------------------------------------------
// ✅ Proxy de imágenes (para evitar bloqueos CORS)
// ---------------------------------------------------
app.get("/imagen", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send("Falta parámetro 'url'");

    // ✅ Usa fetch nativo de Node.js 18 (no necesita import)
    const response = await fetch(url);

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`Error al obtener imagen: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Error cargando imagen:", error);
    res.status(500).send("Error cargando imagen: " + error.message);
  }
});

// ---------------------------------------------------
// 🚀 Inicializar servidor
// ---------------------------------------------------
const PORT = 8080;
app.listen(PORT, () =>
  console.log(`🔥 Servidor FULLTECH corriendo en puerto ${PORT}`)
);
