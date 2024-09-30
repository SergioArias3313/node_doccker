const express = require('express');
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path'); // Para manejar rutas de archivos

// Cargar el archivo de entorno dependiendo del modo
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config({ path: '.env.test' });
}

const app = express();
app.use(express.json());  // Para poder leer el cuerpo de las solicitudes en formato JSON

// Configurar carpeta de archivos estáticos
app.use(express.static(path.join(__dirname, 'public'))); 

// Conexión a PostgreSQL (usando variables de entorno)
const client = new Client({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// Conectar a la base de datos
client.connect(err => {
  if (err) {
    console.error('Error conectando a PostgreSQL', err);
  } else {
    console.log('Conectado a PostgreSQL');

    // Crear la tabla 'users' si no existe
    client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100)
      );
    `, (err, res) => {
      if (err) {
        console.error('Error creando la tabla', err);
      } else {
        console.log('Tabla users verificada o creada');
      }
    });
  }
});

// Ruta para mostrar todos los usuarios en una tabla HTML (GET /view)
app.get('/view', (req, res) => {
  client.query('SELECT * FROM users', (err, result) => {
    if (err) {
      console.error('Error ejecutando la consulta', err);
      res.status(500).json({ error: 'Error ejecutando la consulta' });
    } else {
      const rows = result.rows;
      let tableHtml = `
        <html>
          <head><title>Usuarios</title></head>
          <body>
            <h1>Usuarios</h1>
            <table border="1">
              <tr><th>ID</th><th>Nombre</th><th>Email</th></tr>`;
      rows.forEach(row => {
        tableHtml += `<tr><td>${row.id}</td><td>${row.name}</td><td>${row.email}</td></tr>`;
      });
      tableHtml += `
            </table>
          </body>
        </html>`;
      res.send(tableHtml);
    }
  });
});

// Ruta para servir el formulario HTML para añadir datos (GET /add)
app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));  // Sirve el formulario HTML
});

// Ruta para añadir un nuevo usuario (POST /add)
app.post('/add', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Por favor, proporciona un nombre y un correo' });
  }

  client.query(
    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
    [name, email],
    (err, result) => {
      if (err) {
        console.error('Error ejecutando la inserción', err);
        res.status(500).json({ error: 'Error insertando los datos' });
      } else {
        res.json(result.rows[0]);
      }
    }
  );
});

app.listen(3000, () => {
  console.log(`Servidor ejecutándose en el entorno ${process.env.NODE_ENV} en http://localhost:3000`);
});
