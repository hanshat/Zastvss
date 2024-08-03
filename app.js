document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('player');
    const videoCards = document.getElementById('videoCards');
    const spinner = document.getElementById('spinner');
    const pipButton = document.getElementById('pipButton');
    
    const player = new Plyr(video, {
        controls: [
            'play-large', 'restart', 'rewind', 'play', 'fast-forward', 
            'progress', 'current-time', 'duration', 'mute', 'volume', 
            'captions', 'settings', 'pip', 'airplay', 'download', 'fullscreen'
        ],
        settings: ['captions', 'quality', 'speed', 'loop'],
    });

    // Function to create and add video cards
    const createVideoCards = () => {
        videoSources.forEach(source => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <img src="thumbnail.jpg" alt="${source.label}" />
                <div class="card-content">
                    <p>${source.label}</p>
                </div>
            `;
            card.addEventListener('click', () => {
                initializePlayer(source.type, source.url);
            });
            videoCards.appendChild(card);
        });
    };

    // Call the function to create video cards
    createVideoCards();

    const initializePlayer = (type, url) => {
        spinner.style.display = 'block';
        video.style.display = 'none';

        if (type === 'mpd' && typeof dashjs !== 'undefined' && dashjs.MediaPlayer) {
            const dashPlayer = dashjs.MediaPlayer().create();
            dashPlayer.initialize(video, url, true);
            dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                spinner.style.display = 'none';
                video.style.display = 'block';
                video.play().catch(error => console.error('Error playing video:', error));
            });
            dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e) => {
                console.error('Dash.js error:', e);
                spinner.style.display = 'none';
                alert('Failed to load DASH stream.');
            });
        } else if (type === 'm3u8' && typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                spinner.style.display = 'none';
                video.style.display = 'block';
                video.play().catch(error => console.error('Error playing video:', error));
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('Hls.js fatal error:', data);
                    spinner.style.display = 'none';
                    alert('Failed to load HLS stream.');
                }
            });
        } else if (type === 'm3u8' && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.addEventListener('loadedmetadata', () => {
                spinner.style.display = 'none';
                video.style.display = 'block';
                video.play().catch(error => console.error('Error playing video:', error));
            });
            video.addEventListener('error', () => {
                spinner.style.display = 'none';
                alert('Failed to load HLS stream.');
            });
        } else {
            spinner.style.display = 'none';
            alert('No supported stream type found.');
        }
    };

    pipButton.addEventListener('click', async () => {
        try {
            if (video !== document.pictureInPictureElement) {
                await video.requestPictureInPicture();
            } else {
                await document.exitPictureInPicture();
            }
        } catch (error) {
            console.error('Error trying to initiate Picture-in-Picture:', error);
        }
    });

    video.addEventListener('enterpictureinpicture', () => {
        console.log('Entered Picture-in-Picture mode.');
    });

    video.addEventListener('leavepictureinpicture', () => {
        console.log('Exited Picture-in-Picture mode.');
    });

    // Fetch and display M3U channels
    fetch('https://iptv-org.github.io/iptv/countries/my.m3u')
        .then(response => response.text())
        .then(data => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data, 'text/plain');
            const urls = doc.match(/^https?.*/gm);
            const names = doc.match(/^#EXTINF:.*?,(.*)/gm).map(line => line.replace(/^#EXTINF:.*?,/, ''));
            
            urls.forEach((url, index) => {
                const card = document.createElement('div');
                card.classList.add('card');
                card.innerHTML = `
                    <div class="card-content">
                        <p>${names[index]}</p>
                    </div>
                `;
                card.addEventListener('click', () => {
                    initializePlayer('m3u8', url);
                });
                videoCards.appendChild(card);
            });
        })
        .catch(error => console.error('Error fetching M3U playlist:', error));
});