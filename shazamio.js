const { spawn } = require('child_process');
const path = require('path');

// Call the Python ShazamIO script to recognize a song
function recognizeSong(audioFilePath) {
  return new Promise((resolve, reject) => {
    
    const scriptPath = path.resolve('./src/services/recognize.py');
    
    console.log(`Calling ShazamIO for: ${audioFilePath}`);

    // Spawn Python process
    const python = spawn('python3', [scriptPath, audioFilePath]);

    let outputData = '';
    let errorData = '';

    // Collect output from Python script
    python.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Collect any errors
    python.stderr.on('data', (data) => {
      errorData += data.toString();
      // Log but don't fail - Python warnings go to stderr
      console.log('ShazamIO log:', data.toString());
    });

    // When Python process finishes
    python.on('close', (code) => {
      if (code !== 0 && !outputData) {
        reject(new Error(`ShazamIO failed with code ${code}: ${errorData}`));
        return;
      }

      try {
        // Parse the JSON output from Python
        const result = JSON.parse(outputData.trim());
        console.log(`ShazamIO result: ${result.recognized ? result.title + ' by ' + result.artist : 'No match'}`);
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse ShazamIO output:', outputData);
        // Return empty result instead of crashing
        resolve({
          recognized: false,
          title: 'Not Recognized',
          artist: 'Unknown',
          album: null,
          artworkUrl: null,
          appleMusicUrl: null,
          spotifyUrl: null,
          genres: []
        });
      }
    });

    // Handle process errors
    python.on('error', (err) => {
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
}

module.exports = { recognizeSong };

