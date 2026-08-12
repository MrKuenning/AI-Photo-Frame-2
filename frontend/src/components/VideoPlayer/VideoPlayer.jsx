import React, { useRef, useState, useEffect, useCallback } from 'react';
import { saveFrame } from '../../utils/api';
import './VideoPlayer.css';

export default function VideoPlayer({ url, item, onLoad }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('media_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('media_muted') === 'true';
  });
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [wasPlayingBeforeScrub, setWasPlayingBeforeScrub] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [captureMessage, setCaptureMessage] = useState('');

  // AI videos are often 8-12fps. Using 10fps (0.1s) ensures Android registers the seek and repaints.
  const FPS = 10;
  const FRAME_TIME = 1 / FPS;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!isScrubbing) {
        setProgress((video.currentTime / video.duration) * 100);
        setCurrentTime(video.currentTime);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      if (onLoad) onLoad();
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [onLoad, isScrubbing]);

  // Apply volume when video mounts or url changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume, url]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video.paused) video.play();
    else video.pause();
  };

  const handleFirstFrame = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const handlePrevFrame = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = Math.max(0, video.currentTime - FRAME_TIME);
    }
  };

  const handleNextFrame = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = Math.min(video.duration, video.currentTime + FRAME_TIME);
    }
  };

  const handleLastFrame = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = Math.max(0, video.duration - FRAME_TIME); // Go to last visible frame
    }
  };

  const handleCaptureFrame = async (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video || !item) return;
    
    const wasPlaying = !video.paused;
    video.pause();
    
    try {
      // Trigger flash immediately for better UX
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      // Save it using the backend API
      const res = await saveFrame(item.id, dataUrl);
      if (res.success) {
        console.log("📸 Frame Captured:", res.filename);
        setCaptureMessage(`Saved: ${res.filename}`);
        setTimeout(() => setCaptureMessage(''), 3000);
      }
    } catch (err) {
      console.error("Failed to capture frame:", err);
      alert(`Error capturing frame: ${err.message}`);
    } finally {
      if (wasPlaying) {
        video.play().catch(err => console.error("Could not resume video:", err));
      }
    }
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error("Error attempting to enable fullscreen:", err));
    } else {
      document.exitFullscreen().catch(err => console.error("Error attempting to exit fullscreen:", err));
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    setVolume(val);
    localStorage.setItem('media_volume', val.toString());
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
    const newMuted = val === 0;
    setIsMuted(newMuted);
    localStorage.setItem('media_muted', newMuted.toString());
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      const newMuted = !video.muted;
      video.muted = newMuted;
      setIsMuted(newMuted);
      localStorage.setItem('media_muted', newMuted.toString());
      if (!newMuted && volume === 0) {
        setVolume(1);
        video.volume = 1;
        localStorage.setItem('media_volume', '1');
      }
    }
  };

  // Realtime scrubbing logic
  const updateScrubPosition = useCallback((clientX) => {
    if (!progressBarRef.current || !videoRef.current || duration === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    let pos = (clientX - rect.left) / rect.width;
    pos = Math.max(0, Math.min(1, pos));
    
    setProgress(pos * 100);
    const newTime = pos * duration;
    setCurrentTime(newTime);
    videoRef.current.currentTime = newTime;
  }, [duration]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    setIsScrubbing(true);
    setWasPlayingBeforeScrub(!videoRef.current.paused);
    videoRef.current.pause();
    
    updateScrubPosition(e.clientX);
    
    const handlePointerMove = (eMove) => updateScrubPosition(eMove.clientX);
    const handlePointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Resume play after scrubbing if it was playing before
  useEffect(() => {
    if (!isScrubbing && wasPlayingBeforeScrub && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setWasPlayingBeforeScrub(false);
    }
  }, [isScrubbing, wasPlayingBeforeScrub]);

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const m = Math.floor(timeInSeconds / 60);
    const s = Math.floor(timeInSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-container" ref={containerRef} onClick={togglePlay}>
      <video
        ref={videoRef}
        src={url}
        className="hero-video"
        autoPlay
        loop
        playsInline
        muted={isMuted}
        crossOrigin="anonymous"
      />
      
      {showFlash && <div className="capture-flash"></div>}
      
      {captureMessage && (
        <div className="capture-toast">
          {captureMessage}
        </div>
      )}
      
      <div className="video-controls glass" onClick={e => e.stopPropagation()}>
        {/* Playback Controls (Left) */}
        <div className="control-group">
          <button className="btn-icon play-btn" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="btn-icon" onClick={handleFirstFrame} title="First Frame">⏮</button>
          <button className="btn-icon" onClick={handlePrevFrame} title="Previous Frame">⏪</button>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container" ref={progressBarRef} onPointerDown={handlePointerDown}>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            <div className="progress-bar-handle" style={{ left: `${progress}%` }}></div>
          </div>
        </div>
        
        {/* Playback Controls (Right) */}
        <div className="control-group">
          <button className="btn-icon" onClick={handleNextFrame} title="Next Frame">⏩</button>
          <button className="btn-icon" onClick={handleLastFrame} title="Last Frame">⏭</button>
        </div>
        
        {/* Time Display */}
        <div className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        
        {/* Utilities */}
        <div className="control-group">
          <button className="btn-icon capture-btn" onClick={handleCaptureFrame} title="Capture Frame">📸</button>
          <div className="volume-control">
            <button className="btn-icon mute-btn" onClick={toggleMute} title="Mute">
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={isMuted ? 0 : volume} 
              onChange={handleVolumeChange}
              className="volume-slider"
              title="Volume"
            />
          </div>
          <button className="btn-icon fullscreen-btn" onClick={toggleFullscreen} title="Full Screen">⛶</button>
        </div>
      </div>
    </div>
  );
}
