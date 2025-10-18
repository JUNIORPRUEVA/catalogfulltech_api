import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// CONFIG
const APP_NAME = "FULLTECH-856669664-25-01-31";
const TABLE_NAME = "productos%203";
const BASE_URL = "https://api-catalogo-fulltech-flutterflow-api-catalogo-flutterflow.gcdndd.easypanel.host";
const PORT = process.env.PORT || 8080;

// TEST
app.get("/", (req, res) => {
  res.send("✅ Servidor Proxy Fulltech corriendo perfectamente 🚀");
});

// 🔹 Ruta para obtener la lista de productos
app.get("/productos", async (req, res) => {
  try {
    // 🔧 Aquí debes poner tu API real de productos (por ejemplo, la que tienes en EasyPanel o Supabase)
    // Ejemplo temporal: simulamos algunos productos
    const productos = [
      {
        id: 1,
        titulo: "Cámara Hilook 4MP ColorVu",
        descripcion: "Sistema completo con instalación incluida",
        precio: 16900,
        imagen1: `${BASE_URL}/imagen?file=productos%203_Images/e55ea294.imagen1_archivo.020826.jpg`,
      },
      {
        id: 2,
        titulo: "Taladro 48V Fulltech",
        descripcion: "Incluye 2 baterías, cargador y maletín",
        precio: 3500,
        imagen1: `${BASE_URL}/imagen?file=productos%203_Images/ejemplo2.jpg`,
      },
    ];

    res.json(productos);
  } catch (err) {
    console.error("❌ Error al obtener productos:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// 🔹 Ruta para servir imágenes de AppSheet
app.get("/imagen", async (req, res) => {
  try {
    const file = req.query.file;
    if (!file)
      return res.status(400).json({ error: "Falta el parámetro 'file'" });

    const appsheetUrl = `https://www.appsheet.com/template/gettablefileurl?appName=${APP_NAME}&tableName=${TABLE_NAME}&fileName=${encodeURIComponent(file)}`;

    const response = await fetch(appsheetUrl);
    if (!response.ok)
      return res.status(502).json({ error: "Error al descargar la imagen" });

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("⚠️ Error interno:", error.message);
    res.status(500).json({ error: "Error interno al procesar la imagen." });
  }
});

// START
app.listen(PORT, () => {
  console.log(`🟢 Proxy Fulltech activo en el puerto ${PORT}`);
});
