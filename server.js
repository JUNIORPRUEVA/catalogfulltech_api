// ==========================
//  SERVER FULLTECH PROXY
// ==========================
// Autor: Junior Lopez (Fulltech SRL)
// Descripción: Proxy para servir imágenes de AppSheet a FlutterFlow sin bloqueo CORS.

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// === CONFIGURACIÓN GENERAL ===
app.use(cors());
app.use(express.json());

// === CONFIGURACIÓN DEL APP DE APPSHEET ===
const APP_NAME = "FULLTECH-856669664-25-01-31"; // Nombre exacto del app de AppSheet
const TABLE_NAME = "productos%203";              // El nombre de la tabla (codificado los espacios)
const PORT = process.env.PORT || 3000;

// === RUTA PRINCIPAL (Prueba rápida) ===
app.get("/", (req, res) => {
  res.send("✅ Servidor Proxy Fulltech funcionando correctamente 🚀");
});

// === RUTA PRINCIPAL PARA LAS IMÁGENES ===
// Ejemplo de uso:
// https://tu-dominio/imagen?file=productos%203_Images/e55ea294.imagen1_archivo.020826.jpg
app.get("/imagen", async (req, res) => {
  try {
    const file = req.query.file;
    if (!file) {
      return res.status(400).json({
        error: "Falta el parámetro 'file'. Ejemplo: /imagen?file=productos%203_Images/archivo.jpg"
      });
    }

    // Construimos la URL real de AppSheet
    const appsheetUrl = `https://www.appsheet.com/template/gettablefileurl?appName=${APP_NAME}&tableName=${TABLE_NAME}&fileName=${encodeURIComponent(file)}`;

    console.log("📡 Solicitando imagen desde:", appsheetUrl);

    // Hacemos la solicitud a AppSheet
    const response = await fetch(appsheetUrl);
    if (!response.ok) {
      console.error("❌ Error al obtener la imagen:", response.statusText);
      return res.status(502).json({
        error: `Error al descargar la imagen (${response.status})`
      });
    }

    // Leemos el contenido binario (imagen)
    const buffer = await response.arrayBuffer();

    // Detectamos el tipo de contenido (si AppSheet lo envía)
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.set("Content-Type", contentType);

    // Enviamos la imagen directamente al cliente (FlutterFlow)
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error("⚠️ Error interno del servidor:", error.message);
    res.status(500).json({ error: "Error interno del proxy al procesar la imagen." });
  }
});

// === INICIO DEL SERVIDOR ===
app.listen(PORT, () => {
  console.log(`🟢 Proxy Fulltech activo en el puerto ${PORT}`);
  console.log(`🌎 Ejemplo: http://localhost:${PORT}/imagen?file=productos%203_Images/tu_imagen.jpg`);
});
