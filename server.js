import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

// === CONFIGURACIÓN ===
const APP_NAME = "FULLTECH-856669664-25-01-31";
const TABLE_NAME = "productos%203"; // ¡Ojo con los espacios codificados!

// Ruta principal (para probar que el server está vivo)
app.get("/", (req, res) => {
  res.send("🟢 Proxy Fulltech funcionando correctamente.");
});

// === PROXY PARA LAS IMÁGENES ===
app.get("/imagen", async (req, res) => {
  try {
    const file = req.query.file;
    if (!file) {
      return res.status(400).json({ error: "Falta el parámetro 'file'." });
    }

    // Construimos el enlace de AppSheet
    const appsheetUrl = `https://www.appsheet.com/template/gettablefileurl?appName=${APP_NAME}&tableName=${TABLE_NAME}&fileName=${encodeURIComponent(file)}`;

    // Descargamos la imagen desde AppSheet
    const response = await fetch(appsheetUrl);
    if (!response.ok) {
      throw new Error(`Error al obtener imagen (${response.status})`);
    }

    // Leemos el contenido binario
    const buffer = await response.arrayBuffer();

    // Asignamos el tipo de contenido original
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.set("Content-Type", contentType);

    // Enviamos la imagen al cliente
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("❌ Error en /imagen:", error.message);
    res.status(500).json({ error: "Error al procesar la imagen." });
  }
});

// === INICIO DEL SERVIDOR ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`👉 Ejemplo: http://localhost:${PORT}/imagen?file=productos%203_Images/e55ea294.imagen1_archivo.020826.jpg`);
});
