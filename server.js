// ===============================================
// ✅ FULLTECH API PROXY (SIN node-fetch NECESARIO)
// ===============================================

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// 🔧 CONFIGURACIÓN PRINCIPAL
// ===============================
const APP_NAME = "FULLTECH-856669664-25-01-31";
const TABLE_NAME = "productos%203";
const BASE_URL = "https://api-catalogo-fulltech-flutterflow-api-catalogo-flutterflow.gcdndd.easypanel.host";
const PORT = process.env.PORT || 8080;

// ===============================
// 🧠 FUNCIÓN: Generar URL de imagen AppSheet
// ===============================
const generarImagenUrl = (fileName) => {
  if (!fileName) return null;
  return `${BASE_URL}/imagen?file=${encodeURIComponent(fileName)}`;
};

// ===============================
// 🚀 RUTA TEST
// ===============================
app.get("/", (req, res) => {
  res.send("✅ Servidor Proxy Fulltech corriendo perfectamente 🚀");
});

// ===============================
// 📦 RUTA PRINCIPAL DE PRODUCTOS
// ===============================
app.get("/productos", async (req, res) => {
  try {
    // ⚠️ Datos simulados (puedes conectar aquí tu base real)
    const productos = [
      {
        id: "001",
        codigo: "HLK-4MP",
        descripcion: "Cámara Hilook 4MP ColorVu",
        detalle: "Sistema completo con DVR, cableado e instalación incluida.",
        precio: 16900,
        coste: 11000,
        stock: 8,
        minimo_compra: 1,
        maximo_compra: 10,
        disponible: true,
        categoria: "Seguridad",
        marca: "Hilook",
        imagen1: generarImagenUrl("productos%203_Images/e55ea294.imagen1_archivo.020826.jpg"),
        imagen2: generarImagenUrl("productos%203_Images/e55ea294.imagen2_archivo.jpg"),
        imagen3: generarImagenUrl("productos%203_Images/e55ea294.imagen3_archivo.jpg"),
        fecha_creacion: "2025-10-18T00:00:00Z",
        fecha_actualizacion: "2025-10-18T00:00:00Z",
      },
      {
        id: "002",
        codigo: "TLDR-48V",
        descripcion: "Taladro inalámbrico 48V Fulltech",
        detalle: "Incluye 2 baterías, cargador rápido y maletín resistente.",
        precio: 3500,
        coste: 2600,
        stock: 15,
        minimo_compra: 1,
        maximo_compra: 20,
        disponible: true,
        categoria: "Herramientas",
        marca: "Fulltech",
        imagen1: generarImagenUrl("productos%203_Images/taladro48v_imagen1.jpg"),
        imagen2: generarImagenUrl("productos%203_Images/taladro48v_imagen2.jpg"),
        imagen3: generarImagenUrl("productos%203_Images/taladro48v_imagen3.jpg"),
        fecha_creacion: "2025-10-18T00:00:00Z",
        fecha_actualizacion: "2025-10-18T00:00:00Z",
      },
    ];

    res.json(productos);
  } catch (error) {
    console.error("❌ Error al obtener productos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ===============================
// 🖼️ RUTA PARA SERVIR IMÁGENES DE APPSHEET
// ===============================
app.get("/imagen", async (req, res) => {
  try {
    const file = req.query.file;
    if (!file) return res.status(400).json({ error: "Falta el parámetro 'file'" });

    // 🔗 Construir URL real de AppSheet
    const appsheetUrl = `https://www.appsheet.com/template/gettablefileurl?appName=${APP_NAME}&tableName=${TABLE_NAME}&fileName=${file}`;

    // 👉 Node 18+ ya trae "fetch" nativo
    const response = await fetch(appsheetUrl);
    if (!response.ok) {
      return res.status(502).json({ error: "Error al obtener la imagen desde AppSheet" });
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("⚠️ Error interno:", error.message);
    res.status(500).json({ error: "Error interno al procesar la imagen." });
  }
});

// ===============================
// ▶️ INICIO DEL SERVIDOR
// ===============================
app.listen(PORT, () => {
  console.log(`🟢 Proxy Fulltech activo en el puerto ${PORT}`);
  console.log(`🌍 URL base: ${BASE_URL}`);
});
