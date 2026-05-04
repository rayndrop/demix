const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { separateStems } = require('../services/demucs');
const { recognizeSong } = require('../services/shazamio');

// Configure file upload WITH file extension preservation
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// POST /api/recognize
// Full pipeline: receive audio → separate stems → recognize both → return results
router.post('/recognize', upload.single('audio'), async (req, res) => {
  console.log('\n=== NEW RECOGNITION REQUEST ===');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('Audio received:', req.file.filename, `(${(req.file.size / 1024).toFixed(1)} KB)`);

    // STEP 1: Separate stems with Demucs
    console.log('\n[Step 1] Starting Demucs stem separation...');
    const stems = await separateStems(req.file.path, req.file.filename);
    console.log('[Step 1] Stems separated successfully');

    // STEP 2: Recognize vocal stem with ShazamIO
    console.log('\n[Step 2] Recognizing vocal track with ShazamIO...');
    const vocalResult = await recognizeSong(stems.vocalPath);
    console.log('[Step 2] Vocal track:', vocalResult.recognized ? 
      `${vocalResult.title} by ${vocalResult.artist}` : 'Not recognized');

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    // STEP 3: Recognize instrumental stem with ShazamIO
    console.log('\n[Step 3] Recognizing instrumental track with ShazamIO...');
    const instrumentalResult = await recognizeSong(stems.instrumentalPath);
    console.log('[Step 3] Instrumental track:', instrumentalResult.recognized ? 
      `${instrumentalResult.title} by ${instrumentalResult.artist}` : 'Not recognized');

    // STEP 4: Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.log('Note: Could not delete uploaded file');
    }

    // STEP 5: Return combined results
    console.log('\n=== RECOGNITION COMPLETE ===\n');
    
    res.json({
      success: true,
      message: 'Recognition complete',
      vocalTrack: vocalResult,
      instrumentalTrack: instrumentalResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recognition pipeline error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// GET /api/stem?path=...
// Serve stem files for download
router.get('/stem', (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ error: 'No path provided' });
    }
    
    const resolvedPath = path.resolve(filePath);
    const separatedDir = path.resolve('./separated');
    
    if (!resolvedPath.startsWith(separatedDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(resolvedPath);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

