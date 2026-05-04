const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Add this new function after separateStems
async function convertToShazamFormat(inputWav, outputPath) {
  // Convert to 44.1kHz, mono, high-quality MP3 for better Shazam recognition
  // Shazam works best with:
  // - 44.1kHz sample rate (CD quality)
  // - Mono (removes stereo artifacts)
  // - Some compression to remove background noise
  const command = `ffmpeg -i "${inputWav}" -ar 44100 -ac 1 -b:a 320k "${outputPath}" -y`;
  
  await execPromise(command);
  console.log('Converted to Shazam-optimized format:', outputPath);
  
  return outputPath;
}

async function separateStems(audioFilePath, originalFileName) {
  try {
    console.log('Starting Demucs separation (2 stems: vocals + instrumental)...');
    console.log('Input file:', audioFilePath);

    const absoluteAudioPath = path.resolve(audioFilePath);
    const outputDir = path.resolve('./separated');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Use --two-stems=vocals for cleaner separation
    // This creates: vocals.wav and no_vocals.wav (instrumental)
    const args = [
      '-n', 'htdemucs_ft',           // Fine-tuned model (best quality)
      '--two-stems', 'vocals',        // Only separate vocals vs everything else
      '--float32',                    // Higher quality output
      '--clip-mode', 'rescale',       // Better handling of clipping
      '-o', outputDir,
      absoluteAudioPath
    ];
    
    console.log('Running: demucs', args.join(' '));
    console.log('Using fine-tuned model for maximum quality...');
    console.log('This will take 30-90 seconds...');

    await runDemucs(args);

    console.log('Demucs finished successfully!');

    const baseFileName = path.basename(audioFilePath, path.extname(audioFilePath));
    const stemDir = path.join(outputDir, 'htdemucs_ft', baseFileName);

    if (!fs.existsSync(stemDir)) {
      throw new Error(`Output directory not found: ${stemDir}`);
    }

    // With --two-stems=vocals, Demucs creates:
    // - vocals.wav (vocal track)
    // - no_vocals.wav (instrumental: drums + bass + other combined)
    const vocalPath = path.join(stemDir, 'vocals.wav');
    const instrumentalPath = path.join(stemDir, 'no_vocals.wav');

    if (!fs.existsSync(vocalPath) || !fs.existsSync(instrumentalPath)) {
      throw new Error('Stem files not created');
    }

    // Convert to Shazam-optimized format
    console.log('Converting stems to Shazam-optimized format...');
    const vocalOptimized = path.join(stemDir, 'vocals_optimized.mp3');
    const instrumentalOptimized = path.join(stemDir, 'instrumental_optimized.mp3');
    
    await convertToShazamFormat(vocalPath, vocalOptimized);
    await convertToShazamFormat(instrumentalPath, instrumentalOptimized);

    console.log('✓ Vocal stem (optimized):', vocalOptimized);
    console.log('✓ Instrumental stem (optimized):', instrumentalOptimized);

    return {
      vocalPath: vocalOptimized,        // Optimized for Shazam
      instrumentalPath: instrumentalOptimized,
      vocalPathRaw: vocalPath,           // Original WAV if needed
      instrumentalPathRaw: instrumentalPath
    };

  } catch (error) {
    console.error('Demucs error:', error.message);
    throw new Error('Failed to separate stems: ' + error.message);
  }
}

// Helper function to run Demucs with proper output handling
function runDemucs(args) {
  return new Promise((resolve, reject) => {
    const demucs = spawn('demucs', args);
    
    let stdoutData = '';
    let stderrData = '';

    // Capture stdout (normal output)
    demucs.stdout.on('data', (data) => {
      const output = data.toString();
      stdoutData += output;
      // Log progress bars and info
      if (output.includes('%') || output.includes('Separated')) {
        process.stdout.write(output);
      }
    });

    // Capture stderr (includes warnings AND progress bars)
    demucs.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;
      // Log progress but don't treat as error
      process.stdout.write(output);
    });

    // Handle process completion
    demucs.on('close', (code) => {
      if (code === 0) {
        // Success!
        resolve({ stdout: stdoutData, stderr: stderrData });
      } else {
        // Actual error (non-zero exit code)
        reject(new Error(`Demucs exited with code ${code}: ${stderrData}`));
      }
    });

    // Handle process errors
    demucs.on('error', (err) => {
      reject(new Error(`Failed to start Demucs: ${err.message}`));
    });
  });
}

module.exports = { separateStems };

