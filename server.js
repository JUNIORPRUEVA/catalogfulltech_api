import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// 🔧 Configuración específica
const APP_ID = "FULLTECH-856669664-25-01-31";                // tu AppSheet App ID
const APP_ACCESS_KEY = "YOUR_APP_ACCESS_KEY_HERE";           // clave de API de AppSheet
const TABLE_NAME = "productos 3";                            // nombre exacto de la tabla en AppSheet
const BASE_PROXY_URL = "https://api-catalogo-fulltech-flutterflow-api-catalogo-flutterflow.gcdndd.easypanel.host";

// Función para generar URL de imagen (usando el endpoint /imagen de tu proxy)
const generarImagenUrl = (fileName) => {
  if (!fileName) return null;
  // Asegúrate que `fileName` esté codificado correctamente
  return `${BASE_PROXY_URL}/imagen?file=${encodeURIComponent(fileName)}`;
};

// Ruta principal para los productos
app.get("/productos", async (req, res) => {
  try {
    // Paso 1: Hacer petición a AppSheet API para obtener los registros reales
    const url = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${encodeURIComponent(TABLE_NAME)}/Action`;
    const body = {
      Action: "Find",
      Properties: {
        Locale: "en-US",
      },
      // Puedes agregar filtro en Rows si quieres restringir
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "ApplicationAccessKey": APP_ACCESS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error("AppSheet API error:", await response.text());
      return res.status(502).json({ error: "Error al leer datos de AppSheet" });
    }

    const json = await response.json();
    const rows = json.Rows || [];

    // Paso 2: Mapear los registros al formato que envías a FlutterFlow
    const productos = rows.map((r) => {
      return {
        id: r.id || r._RowNumber.toString(),
        codigo: r.codigo || "",
        descripcion: r.descripcion || "",
        detalle: r.detalle || "",
        precio: r.precio || 0,
        coste: r.coste || 0,
        stock: r.stock || 0,
        minimo_compra: r.minimo_compra || 0,
        maximo_compra: r.maximo_compra || 0,
        disponible: r.disponible === true,
        categoria: r.categoria || "",
        marca: r.marca || "",
        imagen1: generarImagenUrl(r.imagen1_archivo),
        imagen2: generarImagenUrl(r.imagen2_archivo),
        imagen3: generarImagenUrl(r.imagen3_archivo),
        fecha_creacion: r.fecha_creacion || null,
        fecha_actualizacion: r.fecha_actualizacion || null,
      };
    });

    // Paso 3: devolver la lista a FlutterFlow
    res.json(productos);

  } catch (err) {
    console.error("Error en servidor:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Ruta para servir imágenes desde AppSheet
app.get("/imagen", async (req, res) => {
  try {
    const file = req.query.file;
    if (!file) {
      return res.status(400).json({ error: "Falta parámetro file" });
    }
    const appsheetUrl = `https://www.appsheet.com/template/gettablefileurl?appName=${APP_ID}&tableName=${encodeURIComponent(TABLE_NAME)}&fileName=${encodeURIComponent(file)}`;

    const resp = await fetch(appsheetUrl);
    if (!resp.ok) {
      return res.status(502).json({ error: "No se pudo descargar la imagen" });
    }
    const buffer = await resp.arrayBuffer();
    const contentType = resp.headers.get("content-type") || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Error al servir imagen:", err);
    res.status(500).json({ error: "Error interno al procesar imagen" });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor Proxy Fulltech corriendo en puerto ${PORT}`);
});
