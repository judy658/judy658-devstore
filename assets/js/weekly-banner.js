        let weeklyMuted = true;
        function toggleWeeklyMute() {
          const v = document.getElementById('weekly-video');
          const btn = document.getElementById('weekly-mute-btn');
          if (!v || !btn) return;
          weeklyMuted = !weeklyMuted;
          v.muted = weeklyMuted;
          btn.textContent = weeklyMuted ? '🔇 Ses' : '🔊 Ses';
        }
        const bannerBox = document.getElementById('weekly-banner-box');
        const muteBtn = document.getElementById('weekly-mute-btn');
        const playBtn = document.getElementById('weekly-play-btn');
        const video = document.getElementById('weekly-video');

        muteBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleWeeklyMute();
        });

        playBtn?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof showDetail === 'function') showDetail('sportify');
        });

        bannerBox?.addEventListener('click', (e) => {
          if (e.target && e.target.closest('button')) return;
          if (!video) return;
          video.paused ? video.play() : video.pause();
        });
