process.env.PATH = '/opt/homebrew/bin:' + process.env.PATH;

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const recognizeRoute = require('./src/routes/recognize');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// THIS IS THE KEY LINE - serves your frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

// API Routes
app.use('/api', recognizeRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ message: 'Demix Backend is running!', port: PORT });
});

// Serve frontend for all other routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});

