    async function showDetail(id) {
      const app = allApps[id], extra = appExtras[id] || {};
      if (!app) return;
      document.getElementById('d-nav-title').textContent = app.name;
      const iconEl = document.getElementById('d-icon');
      if (app.image) {
        iconEl.innerHTML = '<img src="' + app.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:22px;">';
      } else if (app.icon && app.icon.startsWith('http')) {
        iconEl.innerHTML = '<img src="' + app.icon + '" style="width:100%;height:100%;object-fit:cover;border-radius:22px;">';
      } else {
        iconEl.textContent = app.icon || '📦';
      }
      document.getElementById('d-name').textContent = app.name;
      const devName = extra.developer || 'judy658';
      const isVerifiedDev = devName === 'judy658';
      const verifiedTickHtml = isVerifiedDev ? `<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#1877f2;vertical-align:middle;margin-left:5px;flex-shrink:0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"/></svg>` : '';
      document.getElementById('d-dev').innerHTML = '👤 ' + devName + verifiedTickHtml;
      document.getElementById('d-ver').textContent = 'v' + app.version;
      document.getElementById('d-minver').textContent = 'v' + app.min_version;
      document.getElementById('d-avg-rating').textContent = '—';
      document.getElementById('d-category').textContent = app.category === 'game' ? '🎮 Oyun' : '📱 Uygulama';
      document.getElementById('d-badges').innerHTML = `<span class="badge ${app.category === 'game' ? 'badge-game' : 'badge-app'}">${app.category === 'game' ? '🎮 Oyun' : '📱 Uygulama'}</span>${app.force_update ? '<span class="badge badge-force">⚠️ Zorunlu Güncelleme</span>' : ''}${extra && extra.platform === 'windows' ? '<span class="badge badge-windows">🖥️ Sadece Windows</span>' : ''}${extra && extra.guest_safe ? '<span class="badge badge-guestsafe">🔓 Oturumsuz</span>' : ''}`;
      const dlBtn = document.getElementById('d-dl-btn');
      const dlUrl = app.download_url || '#';
      dlBtn.href = dlUrl;
      if (dlBtn._incHandler) dlBtn.removeEventListener('click', dlBtn._incHandler);
      dlBtn._incHandler = () => incrementDownload(id);
      dlBtn.addEventListener('click', dlBtn._incHandler);
      
      const extra2 = appExtras[id] || {};
      dlBtn.innerHTML = (extra2.platform === 'windows' || dlUrl.endsWith('.zip') || dlUrl.endsWith('.rar') || dlUrl.endsWith('.exe')) ? '⬇ ZIP İndir' : '⬇ APK İndir';

      document.getElementById('d-dl-count').textContent = '...';
      getDownloads(id).then(c => { document.getElementById('d-dl-count').textContent = c; });

      // Dosya boyutu
      const filesizeEl = document.getElementById('d-filesize');
      if (filesizeEl) {
        if (extra.filesize) {
          filesizeEl.textContent = extra.filesize;
        } else if (app.download_url) {
          filesizeEl.textContent = '...';
          fetch(app.download_url, { method: 'HEAD' }).then(r => {
            const bytes = parseInt(r.headers.get('content-length') || '0');
            if (bytes > 0) {
              const mb = (bytes / (1024 * 1024)).toFixed(1);
              filesizeEl.textContent = mb + ' MB';
            } else {
              filesizeEl.textContent = '—';
            }
          }).catch(() => { filesizeEl.textContent = '—'; });
        } else {
          filesizeEl.textContent = '—';
        }
      }
      
      const ssEl = document.getElementById('d-screenshots');
      const screenshots = extra.screenshots || (appExtras[id] && appExtras[id].screenshots) || [];
      ssEl.innerHTML = screenshots.length
        ? screenshots.map(url => `<div class="ss-item"><img src="${url}" alt="" data-action="open-lightbox" data-url="${url}"/></div>`).join('')
        : ['📱', '📱', '📱'].map(e => `<div class="ss-item">${e}<span style="color:var(--muted);font-size:0.75rem">Yakında</span></div>`).join('');
      
      const desc = extra.description || app.changelog;
      document.getElementById('d-desc').innerHTML = desc.split('\n').map(p => p ? `<p style="margin-bottom:10px">${p}</p>` : '').join('');
      const jsonHistory = app.history ? app.history.map(h => ({ version: h.version, text: h.note })) : null;
      const history = jsonHistory || extra.changelog_history || [{ version: 'V' + app.version, text: app.changelog }];
      document.getElementById('d-changelog').innerHTML = history.map(h => `<div class="cl-item"><div class="cl-ver">${h.version}</div><div class="cl-text">${h.text}</div></div>`).join('');
      
      loadComments(id);
      document.getElementById('home-page').style.display = 'none';
      const dp = document.getElementById('detail-page');
      dp.classList.add('active'); dp.scrollTop = 0;
    }

    const JARVIS_SYSTEM = `You are J.A.R.V.I.S., a professional AI assistant created by Captain judy658.
Your primary mission is to explain the DevStore ecosystem to users in NATURAL, FLUENT, and NATIVE TURKISH.

KNOWLEDGE BASE:
- Sportify: A free, ad-free alternative to paid music/video apps. Features 'Sound Lab' for professional audio tweaks, 8D sound, and Bass Boost. Supports song downloading, sharing, and cloud data safety.
- Gravity Watch: A powerful video engine that bypasses YouTube bot protections and restrictions.
- DevStore: The secure central hub for all judy658 apps.

STRICT RESPONSE RULES:
- ALWAYS respond in TURKISH.
- Speak naturally like a native Turkish speaker (Istanbul dialect).
- Do NOT use weird or translated-sounding sentences.
- Keep answers concise and helpful.`;
    const DEV_CLUSTER_NODES = ["https://judy658-devstore.hf.space"];
    let _jarvisHistory = [];

    let jarvisRecognition = null;
    let isJarvisListening = false;
    let jarvisStartupTime = 0;

    function initJarvisEngine() {
      try {
        const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Speech) return;
        jarvisRecognition = new Speech();
        jarvisRecognition.continuous = false;
        jarvisRecognition.lang = 'tr-TR';
        jarvisRecognition.interimResults = false;

        jarvisRecognition.onstart = () => {
          isJarvisListening = true;
          jarvisStartupTime = Date.now();
          updateJarvisMicUI(true);
        };

        jarvisRecognition.onresult = (e) => {
          const text = e.results[0][0].transcript;
          const inputEl = document.getElementById('jarvis-input');
          if (inputEl) {
            inputEl.value = text;
            sendToJarvis();
          }
        };

        jarvisRecognition.onerror = (e) => {
          console.error("J.A.R.V.I.S Engine Error:", e.error);
          isJarvisListening = false;
          updateJarvisMicUI(false);
        };

        jarvisRecognition.onend = () => {
          isJarvisListening = false;
          updateJarvisMicUI(false);
        };
      } catch (err) { console.error("Jarvis Init Error:", err); }
    }

    function updateJarvisMicUI(active) {
      const micBtn = document.getElementById('jarvis-mic-btn');
      if (!micBtn) return;
      micBtn.style.animation = active ? 'pulseJarvisMic 0.8s infinite alternate' : 'none';
      micBtn.innerHTML = active ? '🎙️' : '🎤';
    }

    function startJarvisVoice() {
      if (!jarvisRecognition) initJarvisEngine();
      if (!jarvisRecognition) return;
      if (isJarvisListening) { jarvisRecognition.stop(); return; }
      try { jarvisRecognition.start(); } catch (e) { console.error("Voice Start Error:", e); }
    }

    function toggleJarvis() {
      const p = document.getElementById('jarvis-panel');
      if(!p) { console.warn("Jarvis Panel Not Found"); return; }
      p.classList.toggle('active');
      if (p.classList.contains('active')) {
        const inp = document.getElementById('jarvis-input');
        if(inp) inp.focus();
        sessionStorage.setItem('jarvisSeen', '1');
        hideBubble();
      }
    }

    function hideBubble() {
      const b = document.getElementById('jarvis-bubble');
      if (b) { b.classList.add('hide'); setTimeout(() => b.style.display = 'none', 500); }
    }

    let JARVIS_MODEL = "qwen2.5:0.5b"; 
    const PREFERRED_MODEL = "qwen2.5:1.5b"; 

    async function checkAndUpgradeJarvis() {
      console.log("J.A.R.V.I.S: Sistem kontrol ediliyor...");
      try {
        // Sunucuya zeki modeli indir komutu veriyoruz (zaten varsa bir şey yapmaz)
        const resp = await fetch(`${DEV_CLUSTER_NODES[0]}/api/pull`, {
          method: 'POST',
          body: JSON.stringify({ name: PREFERRED_MODEL, stream: false })
        });
        if (resp.ok) {
          console.log("J.A.R.V.I.S: Beyin nakli başarılı. Yeni model aktif: " + PREFERRED_MODEL);
          JARVIS_MODEL = PREFERRED_MODEL;
        }
      } catch (e) {
        console.warn("J.A.R.V.I.S: Beyin nakli ertelendi (Sunucu hazır değil).");
      }
    }

    // --- LIGHTBOX ---
    function openLightbox(url) {
      const lb = document.getElementById('lightbox');
      const img = document.getElementById('lightbox-img');
      if (!lb || !img) return;
      img.src = url;
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      const lb = document.getElementById('lightbox');
      if (lb) lb.style.display = 'none';
      document.body.style.overflow = 'auto';
    }

    function closeJarvisPlayer() {
      const player = document.getElementById('jarvis-audio-player');
      const audio = document.getElementById('jarvis-audio');
      const playBtn = document.getElementById('jarvis-audio-playbtn');
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (playBtn) playBtn.textContent = '▶';
      if (player) player.style.display = 'none';
    }

    function toggleJarvisPlay() {
      const audio = document.getElementById('jarvis-audio');
      const playBtn = document.getElementById('jarvis-audio-playbtn');
      if (!audio || !playBtn) return;

      if (audio.paused) {
        audio.play().catch(err => console.warn('Jarvis audio oynatılamadı:', err));
        playBtn.textContent = '⏸';
      } else {
        audio.pause();
        playBtn.textContent = '▶';
      }
    }

    function seekJarvisAudio(value) {
      const audio = document.getElementById('jarvis-audio');
      if (!audio || !audio.duration) return;
      audio.currentTime = (Number(value) / 100) * audio.duration;
    }

    function updateJarvisAudioUI() {
      const audio = document.getElementById('jarvis-audio');
      const progress = document.getElementById('jarvis-audio-progress');
      const time = document.getElementById('jarvis-audio-time');
      const playBtn = document.getElementById('jarvis-audio-playbtn');
      if (!audio || !progress || !time || !playBtn) return;

      const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      progress.value = String(percent);

      const mins = Math.floor(audio.currentTime / 60);
      const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
      time.textContent = `${mins}:${secs}`;
      playBtn.textContent = audio.paused ? '▶' : '⏸';
    }

    // --- JARVIS DRAG & RESIZE ---
    let isDraggingJarvis = false;
    let isResizingJarvis = false;
    let jarvisStartX, jarvisStartY, jarvisStartWidth, jarvisStartHeight, jarvisStartTop, jarvisStartLeft;

    function initJarvisMovement() {
      const panel = document.getElementById('jarvis-panel');
      const header = document.querySelector('.jarvis-header');
      if (!panel || !header) return;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.jarvis-close')) return;
        isDraggingJarvis = true;
        jarvisStartX = e.clientX;
        jarvisStartY = e.clientY;
        jarvisStartTop = panel.offsetTop;
        jarvisStartLeft = panel.offsetLeft;
        panel.style.transition = 'none';
        header.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (isDraggingJarvis) {
          const dx = e.clientX - jarvisStartX;
          const dy = e.clientY - jarvisStartY;
          panel.style.top = (jarvisStartTop + dy) + 'px';
          panel.style.left = (jarvisStartLeft + dx) + 'px';
          panel.style.bottom = 'auto';
          panel.style.right = 'auto';
        }
        if (isResizingJarvis) {
          const dx = e.clientX - jarvisStartX;
          const dy = e.clientY - jarvisStartY;
          panel.style.width = Math.max(300, jarvisStartWidth + dx) + 'px';
          panel.style.height = Math.max(400, jarvisStartHeight + dy) + 'px';
        }
      });

      window.addEventListener('mouseup', () => {
        isDraggingJarvis = false;
        isResizingJarvis = false;
        header.style.cursor = 'grab';
      });
      
      // Resizing handle
      const resizer = document.createElement('div');
      resizer.className = 'jarvis-resizer';
      panel.appendChild(resizer);
      resizer.addEventListener('mousedown', (e) => {
        isResizingJarvis = true;
        jarvisStartX = e.clientX;
        jarvisStartY = e.clientY;
        jarvisStartWidth = panel.offsetWidth;
        jarvisStartHeight = panel.offsetHeight;
        panel.style.transition = 'none';
        e.preventDefault();
      });
    }

    async function sendToJarvis() {
      const input = document.getElementById('jarvis-input');
      const chat = document.getElementById('jarvis-chat');
      const typing = document.getElementById('jarvis-typing');
      if(!input || !chat || !typing) return;
      const msg = input.value.trim();
      if (!msg) return;
      chat.innerHTML += `<div class="jarvis-msg user">${msg}</div>`;
      input.value = '';
      typing.style.display = 'block';
      _jarvisHistory.push({ role: 'user', content: msg });
      
      // Dinamik Uygulama Listesi (Sadece İsim ve Versiyon)
      const appListText = Object.values(allApps).map(a => `- ${a.name} (v${a.version})`).join('\n');
      const DYNAMIC_SYSTEM = `${JARVIS_SYSTEM}
      
ÖNEMLİ: Sadece sana verilen bilgileri kullan. Tarih uydurma. Eğer bir bilgi sisteminde yoksa 'Bu konuda bilgim yok' de.
Şu an DevStore'da bulunan uygulamalar:
${appListText}`;

      try {
        const resp = await fetch(`${DEV_CLUSTER_NODES[0]}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            model: JARVIS_MODEL, 
            messages: [{ role: "system", content: DYNAMIC_SYSTEM }, ..._jarvisHistory],
            stream: false
          })
        });
        
        if (!resp.ok) throw new Error("Sunucu Hatası: HTTP " + resp.status);
        
        const rawText = await resp.text();
        let data;
        try {
          const cleanText = rawText.trim().split('\n')[0];
          data = JSON.parse(cleanText);
        } catch (parseErr) {
          const match = rawText.match(/\{.*\}/s);
          if (match) data = JSON.parse(match[0]);
          else throw new Error("Yanıt formatı anlaşılamadı.");
        }
        
        const res = data.message?.content || data.response || "Anlaşılamadı.";
        renderJarvisAI(res);
      } catch (e) { 
        console.error("Jarvis Chat Error:", e);
        typing.style.display = 'none'; 
        chat.innerHTML += `<div class="jarvis-msg ai" style="color:var(--accent2)">Hata: ${e.message}</div>`; 
      }
      chat.scrollTop = chat.scrollHeight;
    }

    function renderJarvisAI(text) {
      const chat = document.getElementById('jarvis-chat');
      const typing = document.getElementById('jarvis-typing');
      if(!chat || !typing) return;
      typing.style.display = 'none';
      chat.innerHTML += `<div class="jarvis-msg ai">${text.replace(/\n/g, '<br>')}</div>`;
      _jarvisHistory.push({ role: 'assistant', content: text });
      chat.scrollTop = chat.scrollHeight;
    }

    // --- INIT ---
    window.addEventListener('load', () => {
      loadApps();
      checkSession();
      checkAndUpgradeJarvis(); // Beyin nakli kontrolü
      initJarvisMovement(); // Sürükleme kontrolü
      setTimeout(() => {
        const b = document.getElementById('jarvis-bubble');
        if (b && !sessionStorage.getItem('jarvisSeen')) b.style.display = 'block';
      }, 1500);
      initJarvisEngine();
    });

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('d-screenshots')?.addEventListener('click', (e) => {
        const img = e.target.closest('img[data-action="open-lightbox"]');
        if (!img) return;
        const url = img.dataset.url;
        if (url) openLightbox(url);
      });

      const lightbox = document.getElementById('lightbox');
      lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      document.getElementById('lightbox-close-btn')?.addEventListener('click', closeLightbox);

      document.getElementById('jarvis-trigger')?.addEventListener('click', toggleJarvis);
      document.getElementById('jarvis-bubble')?.addEventListener('click', toggleJarvis);
      document.getElementById('jarvis-close-btn')?.addEventListener('click', toggleJarvis);
      document.getElementById('jarvis-send-btn')?.addEventListener('click', sendToJarvis);
      document.getElementById('jarvis-mic-btn')?.addEventListener('click', startJarvisVoice);
      document.getElementById('jarvis-input')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendToJarvis();
      });

      document.getElementById('jarvis-audio-close-btn')?.addEventListener('click', closeJarvisPlayer);
      document.getElementById('jarvis-audio-playbtn')?.addEventListener('click', toggleJarvisPlay);
      document.getElementById('jarvis-audio-progress')?.addEventListener('input', (e) => seekJarvisAudio(e.target.value));
      document.getElementById('jarvis-audio')?.addEventListener('timeupdate', updateJarvisAudioUI);
      document.getElementById('jarvis-audio')?.addEventListener('loadedmetadata', updateJarvisAudioUI);
    });
