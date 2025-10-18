/**
 * ==========================================
 *  SERVER FULLTECH PROXY (versión liviana)
 * ==========================================
 * Autor: Junior Lopez (Fulltech SRL)
 * Descripción:
 * Proxy para servir imágenes de AppSheet en FlutterFlow
 * evitando errores CORS y mostrando las imágenes sin bloqueo.
 */

import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ⚙️ CONFIGURACIÓN DEL APP DE APPSHEET
const APP_NAME = "FULLTECH-856669664-25-01-31"; // Nombre de tu app en AppSheet
const TABLE_NAME = "productos%203"; // Nombre de la tabla (con espacio codificado)
const PORT = process.env.PORT || 3000;

// 🟢 RUTA PRINCIPAL PARA PRUEBA
app.get("/", (req, res) => {
  res.send("✅ Servidor Proxy Fulltech corriendo perfectamente 🚀");
});

// 🖼️ RUTA PRINCIPAL PARA IMÁGENES
app.get("/imagen", async (req, res) => {
  try {
    const file = req.query.file;
    if (!file) {
      return res.status(400).json({
        error: "Falta el parámetro 'file'. Ejemplo: /imagen?file=productos%203_Images/archivo.jpg",
      });
    }

    // Construimos la URL real de AppSheet
    const appsheetUrl = `https://www.appsheet.com/template/gettablefileurl?appName=${APP_NAME}&tableName=${TABLE_NAME}&fileName=${encodeURIComponent(file)}`;

    console.log("📡 Solicitando imagen desde AppSheet:", appsheetUrl);

    // Usamos el fetch nativo de Node 18+
    const response = await fetch(appsheetUrl);

    if (!response.ok) {
      console.error("❌ Error al obtener la imagen:", response.statusText);
      return res.status(502).json({
        error: `Error al descargar la imagen (${response.status})`,
      });
    }

    // Obtenemos los datos binarios (buffer)
    const buffer = await response.arrayBuffer();

    // Detectamos tipo MIME (jpg, png, etc.)
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);

    // Enviamos la imagen directamente al navegador / FlutterFlow
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("⚠️ Error interno:", error.message);
    res.status(500).json({ error: "Error interno al procesar la imagen." });
  }
});

// 🚀 INICIO DEL SERVIDOR
app.listen(PORT, () => {
  console.log(`🟢 Proxy Fulltech activo en el puerto ${PORT}`);
  console.log(`🌎 Ejemplo: http://localhost:${PORT}/imagen?file=productos%203_Images/tu_imagen.jpg`);
});
