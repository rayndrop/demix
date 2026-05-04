import asyncio
import sys
import json
from shazamio import Shazam, Serialize

async def recognize(file_path):
    try:
        shazam = Shazam()
        result = await shazam.recognize(file_path)

        # Check if a match was found
        if not result.get('matches'):
            return {
                'recognized': False,
                'title': 'Not Recognized',
                'artist': 'Unknown',
                'album': None,
                'artworkUrl': None,
                'appleMusicUrl': None,
                'spotifyUrl': None,
                'genres': []
            }

        # Extract track info from result
        track = result.get('track', {})
        
        # Get artwork URL
        artwork_url = None
        images = track.get('images', {})
        if images:
            artwork_url = images.get('coverarthq') or images.get('coverart')

        # Get Apple Music URL
        apple_music_url = None
        hub = track.get('hub', {})
        actions = hub.get('actions', [])
        for action in actions:
            if action.get('type') == 'uri':
                apple_music_url = action.get('uri')
                break

        # Get Spotify URL from providers
        spotify_url = None
        providers = track.get('hub', {}).get('providers', [])
        for provider in providers:
            if provider.get('caption') == 'Open in Spotify':
                spotify_actions = provider.get('actions', [])
                for action in spotify_actions:
                    if action.get('uri'):
                        spotify_url = action.get('uri')
                        break

        # Get genres
        genres = []
        genres_data = track.get('genres', {})
        if genres_data.get('primary'):
            genres.append(genres_data.get('primary'))

        song_info = {
            'recognized': True,
            'title': track.get('title', 'Unknown Title'),
            'artist': track.get('subtitle', 'Unknown Artist'),
            'album': track.get('sections', [{}])[0].get('metadata', [{}])[0].get('text') if track.get('sections') else None,
            'artworkUrl': artwork_url,
            'appleMusicUrl': apple_music_url,
            'spotifyUrl': spotify_url,
            'genres': genres,
            'shazamId': track.get('key')
        }

        return song_info

    except Exception as e:
        return {
            'recognized': False,
            'error': str(e),
            'title': 'Recognition Failed',
            'artist': 'Unknown',
            'album': None,
            'artworkUrl': None,
            'appleMusicUrl': None,
            'spotifyUrl': None,
            'genres': []
        }

if __name__ == '__main__':
    # Called from Node.js with file path as argument
    if len(sys.argv) < 2:
        print(json.dumps({'recognized': False, 'error': 'No file path provided'}))
        sys.exit(1)

    file_path = sys.argv[1]
    
    # Run the async function
    result = asyncio.run(recognize(file_path))
    
    # Print JSON result (Node.js will read this)
    print(json.dumps(result))

    