# Demix

Music recognition that works on noisy, real-world audio. Instead of sending raw audio to Shazam directly, Demix first runs [Demucs](https://github.com/facebookresearch/demucs) to separate vocals and instrumentals, then fingerprints both stems independently. This significantly improves match rates on recordings with background noise, crowd chatter, or layered audio.

---

## How It Works

```
Audio Input -> Demucs Stem Separation -> ShazamIO Recognition -> Song Info
                    |                          |
              vocals.wav               vocalResult
              no_vocals.wav            instrumentalResult (fallback)
```

1. Audio is uploaded and stored temporarily
2. Demucs (`htdemucs_ft` fine-tuned model) separates it into vocal and instrumental stems
3. Both stems are converted to 44.1kHz mono MP3 for optimal Shazam fingerprinting
4. ShazamIO runs recognition on each stem
5. Results are returned with title, artist, album, artwork, Apple Music and Spotify links

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Stem Separation | Demucs (Python, PyTorch) |
| Song Recognition | ShazamIO (Python async) |
| Audio Conversion | FFmpeg |
| File Upload | Multer |
| Frontend | HTML/CSS/JS |

---

## Prerequisites

- Node.js v18+
- Python 3.9+
- FFmpeg on PATH
- `pip install demucs shazamio`

---

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/demix.git
cd demix
npm install
pip install demucs shazamio
mkdir -p uploads separated
node server.js
```

---

## Project Structure

```
stemshazam/
├── frontend/
│   └── index.html
├── src/
│   ├── routes/
│   │   └── recognize.js    # POST /api/recognize
│   └── services/
│       ├── demucs.js       # Stem separation
│       ├── shazamio.js     # Node -> Python bridge
│       └── recognize.py    # ShazamIO recognition
├── uploads/                # Temp audio storage
├── separated/              # Demucs stem output
├── server.js
└── package.json
```

---

## API

### `POST /api/recognize`

**Request:** `multipart/form-data`, field name `audio`

**Response:**
```json
{
  "success": true,
  "vocalTrack": {
    "recognized": true,
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "artworkUrl": "https://...",
    "appleMusicUrl": "https://...",
    "spotifyUrl": "spotify:track:...",
    "genres": ["Pop"],
    "shazamId": "12345"
  },
  "instrumentalTrack": { ... },
  "timestamp": "2026-05-03T00:00:00.000Z"
}
```

### `GET /api/stem?path=<path>`

Serves a separated stem file. Access is restricted to the `./separated` directory.

---

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgements

- [Demucs](https://github.com/facebookresearch/demucs) by Meta Research
- [ShazamIO](https://github.com/dotX12/ShazamIO) by dotX12
