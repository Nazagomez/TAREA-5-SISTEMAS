# Tarea 5 — Bookstore con una lista de Redis

`bookInsert`, `bookUpdate` y `bookDelete` no escriben la base de datos. Cada una agrega un JSON al final de la lista `bookstore` en Redis Cloud. `bookTasks` recorre esa lista con `LRANGE bookstore 0 -1`, invoca la función batch que corresponde y quita de la lista solo las actualizaciones de libros ya aplicadas.

Autores y editoriales siguen el mismo patrón. Sus mensajes llevan `"resource":"author"` o `"resource":"publisher"`. `authorTasks` y `publisherTasks` procesan únicamente los suyos y dejan el resto en la lista.

## 1. Redis Cloud

1. Cree una cuenta en [Redis Cloud](https://redis.io/cloud/) y una base gratuita.
2. En la configuración de la base copie host, puerto, usuario y contraseña. El usuario suele ser `default`. Active TLS.
3. En Redis Insight, conecte esa base. La lista no existe vacía: Redis la crea en el primer `RPUSH`.
4. Desde el frontend guarde un libro y, antes de pulsar **Procesar bookTasks**, ejecute:

```text
LRANGE bookstore 0 -1
```

Un cambio de libro se ve así:

```json
{"method":"UPDATE","id":1,"body":{"title":"Nuevo titulo"}}
```

Después de `bookTasks`, esa entrada desaparece. Las de autores y editoriales siguen ahí hasta ejecutar su función de tareas.

## 2. Base de datos

Cree una base PostgreSQL (Neon sirve) y ejecute `schema.sql`. Copie la cadena de conexión a `DATABASE_URL`.

## 3. Variables en Netlify

Publique solo este backend. En el panel del sitio:

| Variable | Valor |
| --- | --- |
| `REDIS_HOST` | host de Redis Cloud |
| `REDIS_PORT` | puerto de Redis Cloud |
| `REDIS_USERNAME` | usuario, normalmente `default` |
| `REDIS_PASSWORD` | contraseña de Redis Cloud |
| `REDIS_TLS` | `true` |
| `DATABASE_URL` | conexión PostgreSQL |
| `FUNCTIONS_BASE_URL` | `https://SU-SITIO.netlify.app/.netlify/functions/` |

`netlify.toml` publica la carpeta `public` y las funciones de `netlify/functions`. El frontend no va en ese sitio.

## 4. Frontend

```bash
cd frontend
npm install
VITE_API_BASE=https://SU-SITIO.netlify.app npm run build
```

Publique el contenido de `frontend/dist` en GitHub Pages, Vercel u otro hosting estático. `VITE_API_BASE` debe ser el sitio de Netlify, sin barra final.

## 5. Prueba manual

1. Abra un libro, cambie el título y pulse **Guardar en la lista**. La pantalla sigue mostrando el título anterior.
2. En Redis Insight ejecute `LRANGE bookstore 0 -1` y confirme el `UPDATE`.
3. Abra `https://SU-SITIO.netlify.app/.netlify/functions/bookTasks`.
4. Recargue el frontend. El título nuevo viene de la base de datos.
5. Repita el flujo con un autor (`authorTasks`) y una editorial (`publisherTasks`).

## Ejecución local

```bash
npm install
npm test
npm run dev:api
npm run dev:web
```

Sin `DATABASE_URL`, la API local usa `data/store.json`. Sin `REDIS_HOST`, la lista `bookstore` queda en memoria para poder probar la interfaz; la entrega usa Redis Cloud. Para probar contra su base real, copie `.env.example` a `.env` y complete las variables. `.env` no se sube al zip.

## Entrega

El zip incluye el frontend y el backend, sin `node_modules` ni secretos. Súbalo al Aula Virtual.
