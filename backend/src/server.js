import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

async function start() {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      console.log(`API running on http://localhost:${env.PORT}/api`);
      console.log(`Swagger docs at http://localhost:${env.PORT}/api/docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
