document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('player');
    const videoCards = document.getElementById('videoCards');
    const spinner = document.getElementById('spinner');
    const pipButton = document.getElementById('pipButton');
    const loadingContainer = document.getElementById('loadingContainer');

    const player = new Plyr(video, {
        controls: [
            'play-large', 'restart', 'rewind', 'play', 'fast-forward', 
            'progress', 'current-time', 'duration', 'mute', 'volume', 
            'captions', 'settings', 'pip', 'airplay', 'fullscreen'
        ],
        settings: ['captions', 'quality', 'speed', 'loop'],
        fullscreen: { enabled: true, fallback: true, iosNative: true } // Enable full-screen support
    });

    // Function to fetch and play the latest real-time stream
    const playLatestStream = () => {
        // Replace this URL with the actual URL of your latest real-time stream
        const latestStreamUrl = 'https://example.com/latest-stream.m3u8';
        
        // Update the video source and play the stream
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(latestStreamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(error => console.error('Error playing video:', error));
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = latestStreamUrl;
            video.play().catch(error => console.error('Error playing video:', error));
        } else {
            console.error('No support for HLS streams.');
        }
    };

    // Add custom "Live" button to Plyr controls
    const liveButton = document.createElement('button');
    liveButton.className = 'plyr__controls__item plyr__controls__item--live';
    liveButton.innerText = 'Live';
    liveButton.addEventListener('click', playLatestStream);

    // Add the "Live" button to the Plyr controls
    const controls = document.querySelector('.plyr__controls');
    if (controls) {
        controls.appendChild(liveButton);
    }

    // Detect when the player is paused and show the "Live" button
    video.addEventListener('pause', () => {
        liveButton.style.display = 'inline-block';
    });

    // Detect when the player is playing and hide the "Live" button
    video.addEventListener('play', () => {
        liveButton.style.display = 'none';
    });

    // Function to create and add video cards
    const createVideoCards = () => {
        videoSources.forEach(source => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.innerHTML = `
                <img src="${source.logo || 'thumbnail.jpg'}" alt="${source.label}" />
                <div class="card-content">
                    <p>${source.label}</p>
                </div>
            `;
            card.addEventListener('click', () => {
                initializePlayer(source.type, source.url);
            });
            videoCards.appendChild(card);
        });

        // Play the first available channel by default
        if (videoSources.length > 0) {
            initializePlayer(videoSources[0].type, videoSources[0].url);
        }
    };

    // Show loading animation
    const showLoading = () => {
        loadingContainer.style.display = 'flex';
    };

    // Hide loading animation
    const hideLoading = () => {
        loadingContainer.style.display = 'none';
    };

    // Wait for videoSources to be populated
    const waitForSources = () => {
        if (videoSources.length > 2) { // Adjust this if more static sources are added
            hideLoading();
            createVideoCards();
        } else {
            setTimeout(waitForSources, 500);
        }
    };

    showLoading();
    waitForSources();

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
});