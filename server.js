// ✅ Obtener todos los productos (ahora con URLs de imagen proxificadas)
app.get("/productos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY id DESC");

    const proxyBase = "https://api-catalogo-fulltech-flutterflow-api-catalogo-flutterflow.gcdndd.easypanel.host/imagen?url=";

    const productos = result.rows.map(p => {
      // Función que agrega el proxy a cada imagen
      const proxificar = (url) => {
        if (!url) return null;
        if (url.startsWith(proxyBase)) return url; // evitar duplicados
        return proxyBase + encodeURIComponent(url);
      };

      return {
        ...p,
        imagen1: proxificar(p.imagen1),
        imagen2: proxificar(p.imagen2),
        imagen3: proxificar(p.imagen3)
      };
    });

    res.json(productos);
  } catch (error) {
    console.error("❌ Error en /productos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Buscar producto por ID (también con imágenes proxificadas)
app.get("/productos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM productos WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

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
      imagen3: proxificar(p.imagen3)
    };

    res.json(producto);
  } catch (error) {
    console.error("❌ Error en /productos/:id:", error);
    res.status(500).json({ error: error.message });
  }
});
