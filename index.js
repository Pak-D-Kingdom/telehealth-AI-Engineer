const express = require('express');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
  });
});

app.listen(port, () => {
  console.log(`Telehealth API is running on http://localhost:${port}`);
});
