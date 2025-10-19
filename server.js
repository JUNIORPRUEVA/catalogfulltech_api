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
  host: "gcdndd.easypanel.host",
  port: 5432,
  user: "n8n_user",
  password: "Ayleen10.yahaira",
  database: "fulltechcatalog",
  ssl: false,
});

// ✅ Ruta de prueba
app.get("/", (req, res) => {
  res.send("🚀 API FULLTECH Catalog corriendo correctamente");
});

// ✅ Proxy para mostrar imágenes externas (con decodificación de URLs)
app.get("/imagen", async (req, res) => {
  try {
    let imageUrl = req.query.url;
    if (!imageUrl) return res.status(400).send("Falta el parámetro 'url'");

    // 🔑 Solución: decodificar URL por si viene doblemente codificada
    imageUrl = decodeURIComponent(imageUrl);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("⚠️ Error al obtener imagen:", response.status, response.statusText);
      return res.status(404).send("No se pudo obtener la imagen");
    }

    const contentType = response.headers.get("content-type");
    const arrayBuffer = await response.arrayBuffer();

    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("❌ Error al cargar imagen:", error);
    res.status(500).send("Error al cargar imagen");
  }
});

// ✅ Obtener todos los productos (con URLs proxificadas)
app.get("/productos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");

    const proxyBase = "https://api-catalogo-fulltech-flutterflow-api-catalogo-flutterflow.gcdndd.easypanel.host/imagen?url=";

    const productos = result.rows.map((p) => {
      const proxificar = (url) => {
        if (!url) return null;
        if (url.startsWith(proxyBase)) return url;
        return proxyBase + encodeURIComponent(url);
      };

      return {
        ...p,
        imagen1: proxificar(p.imagen1),
        imagen2: proxificar(p.imagen2),
        imagen3: proxificar(p.imagen3),
      };
    });

    res.json(productos);
  } catch (error) {
    console.error("❌ Error en /productos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Buscar producto por ID (también con URLs proxificadas)
app.get("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM productos WHERE id = $1", [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });

    const proxyBase = "https://api-catalogo-fulltech-flutterflow-api-catalogo-flutterflow.gcdndd.easypanel.host/imagen?url=";
    const p = result.rows[0];

    const proxificar = (url) => {
      if (!url) return null;
      if (url.startsWith(proxyBase)) return url;
      return proxyBase + encodeURIComponent(url);
    };

    const producto = {
      ...p,
      imagen1: proxificar(p.imagen1),
      imagen2: proxificar(p.imagen2),
      imagen3: proxificar(p.imagen3),
    };

    res.json(producto);
  } catch (error) {
    console.error("❌ Error en /productos/:id:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 8080;
app.listen(PORT, () => console.log(`🔥 Servidor corriendo en puerto ${PORT}`));
