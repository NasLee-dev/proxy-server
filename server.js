const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

let mainServerActive = true;
const MAIN_SERVER = "http://localhost:4000"
const BACKUP_SERVER = "http://localhost:4001"

const checkServerHealth = async (url) => {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

setInterval(async () => {
  const mainHealth = await checkServerHealth(MAIN_SERVER);
  if (mainHealth !== mainServerActive) {
    mainServerActive = mainHealth;
    console.log(`Switching to ${mainServerActive ? 'Main' : 'Backup'} server`);
  }
}, 3000);

const proxy = createProxyMiddleware({
  target: MAIN_SERVER,
  changeOrigin: true,
  router: () => {
    return mainServerActive ? MAIN_SERVER : BACKUP_SERVER;
  },
  onError: (err, req, res) => {
    console.error(err);
    res.status(500).send('Proxy Error');
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['x-served-by'] = mainServerActive ? 'main' : 'backup';
  },
});

app.get('/health', (req, res) => {
  res.status(200).send('Proxy Server is Healthy');
});

app.use('/', proxy);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong');
});

const PORT = 8082;

app.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
});