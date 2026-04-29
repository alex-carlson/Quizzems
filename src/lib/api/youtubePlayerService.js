class YouTubePlayerService {
    constructor() {
        this.player = null;
        this.currentContainer = null;

        this.apiReady = false;
        this.apiLoading = false;
        this.youtubeAPILoaded = null;

        this.readyPromise = null;
        this.resolveReady = null;

        this.state = {
            playerReady: false,
            isLoading: false,
            isPlaying: false,
            currentVideoId: null,
            currentInstanceId: null,
            error: null,
            duration: 0,
            currentTime: 0,
            progress: 0,
            isMuted: false
        };

        this.subscribers = new Set();
    }

    log(...args) {
        if (typeof window !== 'undefined') {
            console.log('[YouTubeService]', ...args);
        }
    }

    isBrowser() {
        return typeof window !== 'undefined' && typeof document !== 'undefined';
    }

    subscribe(cb) {
        this.subscribers.add(cb);
        cb(this.state);
        return () => this.subscribers.delete(cb);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.state));
    }

    setState(patch) {
        this.state = { ...this.state, ...patch };
        this.notify();
    }

    async initializeAPI() {
        if (!this.isBrowser()) return;

        if (this.apiReady) return;
        if (this.apiLoading) return this.youtubeAPILoaded;

        this.apiLoading = true;

        this.youtubeAPILoaded = new Promise((resolve) => {
            if (window.YT?.Player) {
                this.apiReady = true;
                this.setState({ playerReady: true });
                resolve();
                return;
            }

            window.onYouTubeIframeAPIReady = () => {
                this.apiReady = true;
                this.setState({ playerReady: true });
                resolve();
            };

            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.body.appendChild(tag);
        });

        return this.youtubeAPILoaded;
    }

    async createPlayer(videoId, container, id) {
        if (!this.isBrowser()) return;
        if (!container) throw new Error('YouTube container not found');

        await this.initializeAPI();

        // 🔥 readiness gate
        this.readyPromise = new Promise((resolve) => {
            this.resolveReady = resolve;
        });

        if (this.player && this.currentContainer !== container) {
            this.player.destroy();
            this.player = null;
        }

        this.currentContainer = container;

        this.setState({
            isLoading: true,
            currentVideoId: videoId,
            currentInstanceId: id,
            error: null
        });

        this.player = new YT.Player(container, {
            height: '1',
            width: '1',
            videoId,
            playerVars: {
                controls: 0,
                playsinline: 1,
                rel: 0,
                modestbranding: 1
            },
            events: {
                onReady: () => {
                    this.setState({
                        playerReady: true,
                        isLoading: false,
                        duration: this.player.getDuration?.() || 0
                    });

                    this.resolveReady?.();
                },

                onStateChange: (e) => {
                    const YTState = window.YT?.PlayerState;

                    this.setState({
                        isPlaying: e.data === YTState.PLAYING
                    });
                },

                onError: (e) => {
                    this.setState({
                        error: `YouTube error: ${e.data}`,
                        isLoading: false
                    });
                }
            }
        });

        this.startProgressLoop();

        await this.readyPromise;
    }

    async loadVideo(videoId, container, id) {
        if (!this.player || this.currentContainer !== container) {
            await this.createPlayer(videoId, container, id);
            return;
        }

        this.setState({
            currentVideoId: videoId,
            currentInstanceId: id,
            isLoading: true,
            error: null
        });

        this.player.loadVideoById(videoId);
    }

    async safePlay() {
        if (!this.player) return;

        await this.readyPromise;

        await new Promise(requestAnimationFrame);

        try {
            this.player.playVideo();
            this.setState({ isPlaying: true });
        } catch (e) {
            console.warn('[YouTubeService] playVideo failed:', e);
            this.setState({
                error: 'Playback failed. Please try again.'
            });
        }
    }

    async pause() {
        if (!this.player) return;

        await this.readyPromise;

        await new Promise(requestAnimationFrame);

        try {
            this.player.pauseVideo();
            this.setState({ isPlaying: false });
        } catch (e) {
            console.warn('[YouTubeService] playVideo failed:', e);
            this.setState({
                error: 'Playback failed. Please try again.'
            });
        }
    }

    async togglePlay(videoId, container, id) {
        if (!container) throw new Error('Missing player container');

        const needsNew =
            !this.player ||
            this.state.currentVideoId !== videoId ||
            this.state.currentInstanceId !== id ||
            this.currentContainer !== container;

        if (needsNew) {
            await this.loadVideo(videoId, container, id);

            // ✅ SAFE FIRST PLAY
            await this.safePlay();
            return;
        }

        if (this.state.isPlaying) {
            this.player.pauseVideo();
            this.setState({ isPlaying: false });
        } else {
            await this.safePlay();
        }
    }

    seek(percent) {
        if (!this.player) return;

        const duration = this.player.getDuration();
        const time = (percent / 100) * duration;

        this.player.seekTo(time, true);
    }

    startProgressLoop() {
        if (this.progressInterval) return;

        this.progressInterval = setInterval(() => {
            if (!this.player || !this.state.isPlaying) return;

            const currentTime = this.player.getCurrentTime?.() || 0;
            const duration = this.player.getDuration?.() || 0;
            const progress = duration ? (currentTime / duration) * 100 : 0;

            this.setState({
                currentTime,
                duration,
                progress
            });
        }, 500);
    }

    destroy() {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }

        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }
}

// singleton
export const youtubePlayerService = new YouTubePlayerService();