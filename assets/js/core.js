    // ════════════════════════════════════════════════
    //  SUPABASE & SABİTLER — tek yerde
    // ════════════════════════════════════════════════
    const SUPA_URL = "https://jnuckqaiutmkiquptvzu.supabase.co";
    const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudWNrcWFpdXRta2lxdXB0dnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MDgzMTAsImV4cCI6MjA4ODk4NDMxMH0.sP_FoTrYOFWiIS7PdaFYtR1JbP5vGf_KLgc_jh7zhZY";
    const supa = supabase.createClient(SUPA_URL, SUPA_KEY);
    const ADMIN_EMAIL = 'geceninhakimistudio@gmail.com';

    // ════════════════════════════════════════════════
    //  GLOBAL STATE
    // ════════════════════════════════════════════════
    let allApps = {};
    let currentFilter = 'all';
    let currentUserEmail = null;
    let currentUserId = null;
    let currentAppId = null;
    let selectedRating = 0;
    let _presenceTimer = null;
    let isVIP = false;

    // ════════════════════════════════════════════════
    //  UYGULAMA EKSTRA BİLGİLERİ
    // ════════════════════════════════════════════════
    const appExtras = {
      sportify: {
        developer: "judy658",
        description: "Sportify, GitHub üzerinden MP3 dosyalarını doğrudan stream eden kişisel bir müzik uygulamasıdır. 129 şarkılık geniş kütüphanesiyle Türkçe pop, yabancı müzik, arabesk ve daha fazlasını tek bir yerde dinleyebilirsiniz.\n\nÇalma listeleri oluşturabilir, favori şarkılarınızı kaydedebilir ve en çok dinlediklerinizi takip edebilirsiniz.",
        screenshots: [
          "./assets/media/sportify_ss1.png",
          "./assets/media/sportify_ss2.png",
          "./assets/media/sportify_ss3.png"
        ],
        changelog_history: [
          { version: "V12", text: "Yeni şarkılar eklendi (HITLER, Bir Baskedir). 6 dakika üzeri 5 şarkı kaldırıldı. Performans iyileştirmeleri yapıldı." },
          { version: "V11", text: "Şarkı listesi güncellendi, yeni özellikler eklendi." },
          { version: "V10", text: "İlk stabil sürüm yayınlandı." }
        ]
      },
      sportify_downloader: {
        developer: "judy658",
        platform: "windows",
        description: "Sportify Downloader, YouTube'dan MP3 ve video indirmenizi sağlayan masaüstü uygulamasıdır.\n\nŞarkı adı veya YouTube linki girerek tek tek ya da toplu indirme yapabilirsiniz. YouTube playlist desteği sayesinde tüm bir çalma listesini tek seferde indirebilirsiniz.\n\nİndirilen MP3\'lere otomatik olarak kapak fotoğrafı ve etiket bilgileri eklenir. Windows için hazır, kurulum gerektirmez.",
        screenshots: [
          "./assets/media/downloader_ss1.png",
          "./assets/media/downloader_ss2.png",
          "./assets/media/downloader_ss3.png"
        ],
        changelog_history: [
          { version: "V1", text: "YouTube'dan MP3/MP4 indirme, playlist desteği, otomatik etiket düzenleme, kapak fotoğrafı gömme." }
        ]
      },
      kirosub: {
        developer: "judy658",
        platform: "windows",
        description: "KiroSub, OpenAI Whisper yapay zekası ile ses ve video dosyalarından otomatik altyazı üreten ücretsiz bir masaüstü uygulamasıdır.\n\nTüm işlemler tamamen yerel olarak çalışır — hiçbir ses veya video verisi sunucuya gönderilmez.\n\nÖzellikler:\n• OpenAI Whisper & faster-whisper motoru (GPU desteği)\n• 20+ dile otomatik çeviri\n• Görsel altyazı editörü — zamanlamaları düzenle, segmentleri böl/birleştir\n• Chatterbox TTS ile otomatik dublaj (ses klonlama desteği)\n• YouTube ve 1000+ platformdan video indirme\n• SRT, ASS, TXT formatlarında dışa aktarma\n• Demucs ile vokal ayırma (şarkılar için)\n\nKurulum gerektirmez. ZIP'i aç, KiroSub.exe'yi çalıştır.",
        screenshots: [],
        changelog_history: [
          { version: "V2.3.0", text: "İlk public sürüm. GPU desteği (NVIDIA CUDA), faster-whisper motoru, altyazı editörü, Chatterbox TTS dublaj, YouTube indirme, 20+ dil çevirisi." }
        ]
      },
      pixelforge: {
        developer: "judy658",
        platform: "windows",
        guest_safe: true,
        description: "PixelForge, toplu resim işlemleri için geliştirilmiş ücretsiz bir Windows masaüstü uygulamasıdır.\n\nTek seferde onlarca fotoğrafı boyutlandırabilir, formatlarını değiştirebilir ve watermark ekleyebilirsiniz.\n\nÖzellikler:\n• Toplu boyutlandırma — piksel veya yüzde ile, en-boy oranı korumalı veya serbest\n• Format dönüştürme — PNG, JPG, WebP, BMP arası geçiş\n• Watermark — özel metin filigranı, ayarlanabilir boyut/konum/opaklık\n• Drag & drop — resimleri sürükle bırak\n• Kalite kontrolü — JPG/WebP için sıkıştırma ayarı\n\nKurulum gerektirmez. Tek başına çalışır, hesap açmaya gerek yok.",
        screenshots: [
          "./assets/media/pixsel1.png",
          "./assets/media/pixsel2.png",
          "./assets/media/pixsel3.png"
        ],
        changelog_history: [
          { version: "V1.0.0", text: "Toplu boyutlandırma, format dönüştürme, watermark ekleme, drag-drop desteği." }
        ]
      },
      nexsus: {
        developer: "judy658",
        platform: "windows",
        description: "Nexsus, Fooocus 2.5.5 tabanlı gelişmiş bir görsel üretim aracıdır. Mor/siyah temalı arayüzü, Türkçe dil desteği ve Supabase ile entegre kullanıcı sistemi sayesinde yapay zeka görsel üretimini herkes için erişilebilir kılar.\n\nÖzellikler:\n• SDXL ve SD 1.5/2.x destekli çoklu mimari\n• Gelişmiş maskeleme ve inpaint/outpaint araçları\n• LoRA, ControlNet ve IP-Adapter desteği\n• Model yöneticisi ile tek tıkla model indirme\n• Supabase ile kullanıcı girişi ve VIP yönetimi\n• Mor/siyah özel tema\n\nKurulum gerektirmez. ZIP'i aç, Nexsus.exe'yi çalıştır.",
        screenshots: [
          "./assets/media/nexsus1.png",
          "./assets/media/nexsus2.png",
          "./assets/media/nexsus3.png",
          "./assets/media/nexsus4.png"
        ],
        changelog_history: [
          { version: "V1.0.0", text: "Fooocus 2.5.5 tabanlı ilk sürüm. Mor/siyah tema, Türkçe dil desteği, kullanıcı sözleşmesi, Supabase kimlik doğrulama, VIP üyelik sistemi, online durum takibi, model yöneticisi." }
        ]
      }
    };

    // ════════════════════════════════════════════════
    //  SAYFA GEÇİŞLERİ
    // ════════════════════════════════════════════════
    function showHome() {
      document.getElementById('detail-page').classList.remove('active');
      document.getElementById('profile-page').classList.remove('active');
      document.getElementById('admin-page').classList.remove('active');
      document.getElementById('dev-page').classList.remove('active');
      document.getElementById('home-page').style.display = 'block';
    }

    async function showProfile() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { openAuth(); return; }
      document.getElementById('profile-email-display').textContent = session.user.email;
      document.getElementById('profile-email-input').value = session.user.email;
      if (session.user.created_at) {
        const d = new Date(session.user.created_at);
        document.getElementById('profile-since').textContent = 'Üyelik: ' + d.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      const msg = document.getElementById('pass-msg');
      msg.className = 'profile-msg'; msg.textContent = '';
      const btn = document.getElementById('pass-reset-btn');
      if (btn) { btn.disabled = false; btn.textContent = '📧 Sıfırlama Maili Gönder'; }
      document.getElementById('home-page').style.display = 'none';
      document.getElementById('detail-page').classList.remove('active');
      document.getElementById('admin-page').classList.remove('active');
      document.getElementById('profile-page').classList.add('active');
      document.getElementById('profile-page').scrollTop = 0;
    }

    async function showAdminPanel() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session || session.user.email !== ADMIN_EMAIL) return;
      document.getElementById('home-page').style.display = 'none';
      document.getElementById('detail-page').classList.remove('active');
      document.getElementById('profile-page').classList.remove('active');
      document.getElementById('admin-page').classList.add('active');
      document.getElementById('admin-page').scrollTop = 0;

      // Pro Dashboard Init
      const dashBtn = document.querySelector('.admin-tab[data-tab="dashboard"]');
      if (dashBtn) switchAdminTab('dashboard', dashBtn);
      initAdminRealtime();
    }

    function initAdminRealtime() {
      if (window.adminChannel) return;

      const feed = document.getElementById('admin-live-feed');
      window.adminChannel = supa.channel('admin-presence-all')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, payload => {
          console.log('[AdminFeed] Veri alındı:', payload);
          _handlePresenceUpdate(payload);
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (feed && feed.querySelector('.admin-empty')) feed.querySelector('.admin-empty').remove();
            const statusItem = document.createElement('div');
            statusItem.style = "font-size:0.7rem;color:var(--green);opacity:0.7;margin-bottom:8px;padding-left:4px";
            statusItem.innerHTML = `<i class="fas fa-check-circle"></i> Canlı bağlantı aktif.`;
            feed?.prepend(statusItem);

            // Akıllı Çevrimdışı Takipçisini Başlat
            _startSmartOfflineTracker();
          }
        });
    }

    const _lastLogStatus = {};
    let _smartTrackerStarted = false;

    function _startSmartOfflineTracker() {
      if (_smartTrackerStarted) return;
      _smartTrackerStarted = true;

      setInterval(async () => {
        // Sadece Dashboard aktifse veya User listesi aktifse kontrol et
        const dashboard = document.getElementById('admin-dashboard');
        const usersTab = document.getElementById('admin-users');
        if ((dashboard && dashboard.classList.contains('active')) ||
          (usersTab && usersTab.classList.contains('active'))) {

          const now = Date.now();
          const { data: presence } = await supa.from('user_presence').select('email, last_seen, is_online');

          if (presence) {
            presence.forEach(u => {
              const lastTs = new Date(u.last_seen).getTime();
              const isActuallyOnline = (now - lastTs) < 95000; // 95 saniye tolerans
              const wasOnline = _lastLogStatus[u.email];

              if (!isActuallyOnline && wasOnline === true) {
                // Yapay olarak offline logu üret
                _handlePresenceUpdate({
                  eventType: 'UPDATE',
                  new: { ...u, is_online: false },
                  old: { ...u, is_online: true },
                  isSmartLog: true
                });
              }
            });
          }
        }
      }, 25000);
    }

    const _lastLogStatus_dummy = {}; // Dummy to avoid conflict with existing line if needed, but I'll replace the existing one

    function _handlePresenceUpdate(payload) {
      const feed = document.getElementById('admin-live-feed');
      if (!feed) return;

      const empty = feed.querySelector('.admin-empty');
      if (empty) empty.remove();

      const data = payload.new || payload.old;
      const email = data.email || 'Bilinmeyen Kullanıcı';

      let msg = '';
      let icon = 'fa-info-circle';
      let color = 'var(--accent)';

      // Durum Takibi ve Filtreleme
      const prevState = _lastLogStatus[email];
      const currentState = payload.new?.is_online;
      const currentApp = payload.new?.current_app;

      if (payload.eventType === 'INSERT') {
        msg = `<b>${email}</b> sisteme katıldı! 🚀`;
        icon = 'fa-user-plus';
        color = 'var(--green)';
      } else if (payload.eventType === 'UPDATE') {
        // Sadece gerçekten durum değişmişse mesaj yaz
        if (currentState === true && prevState !== true) {
          msg = `<b>${email}</b> şu an online. 🟢`;
          icon = 'fa-plug';
          color = 'var(--green)';
        } else if (currentState === false && prevState === true) {
          msg = `<b>${email}</b> çevrimdışı oldu. ⚫ ${payload.isSmartLog ? '<small>(Zaman Aşımı)</small>' : ''}`;
          icon = 'fa-power-off';
          color = 'var(--muted)';
        } else if (currentApp !== _lastLogStatus[email + '_app'] && currentState !== false) {
          msg = `<b>${email}</b> geçti: <b>${currentApp}</b>`;
          icon = 'fa-exchange-alt';
        } else if (payload.new.is_banned && !payload.old?.is_banned) {
          msg = `<b>${email}</b> yasaklandı! 🚫`;
          icon = 'fa-ban';
          color = 'var(--accent2)';
        }
      }

      // Hafızayı güncelle
      if (payload.new) {
        _lastLogStatus[email] = currentState;
        _lastLogStatus[email + '_app'] = currentApp;
      }

      if (!msg) return;

      // Listenin otomatik tazelenmesini tetikle
      if (document.getElementById('admin-users').classList.contains('active')) {
        loadAdminUsers();
      }

      const item = document.createElement('div');
      item.style = `background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:10px 14px;font-size:0.82rem;display:flex;align-items:center;gap:12px;animation:fadeUp 0.3s ease both`;
      item.innerHTML = `<i class="fas ${icon}" style="color:${color}"></i><span>${msg}</span><span style="margin-left:auto;font-size:0.7rem;color:var(--muted)">${new Date().toLocaleTimeString()}</span>`;

      feed.prepend(item);
      if (feed.children.length > 20) feed.lastChild.remove();

      updateDashboardAnalytics();
    }

    async function updateDashboardAnalytics() {
      const { data: all } = await supa.from('user_presence').select('current_app, is_banned, is_dead, is_online');
      if (!all) return;

      const sportify = all.filter(u => u.current_app === 'sportify').length;
      const devstore = all.filter(u => u.current_app === 'devstore').length;
      const nexsus = all.filter(u => u.current_app === 'nexsus').length;
      const banned = all.filter(u => u.is_banned).length;
      const dead = all.filter(u => u.is_dead).length;
      const active = all.filter(u => !u.is_banned && !u.is_dead).length;

      const chartConfig = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#e8e8f0', font: { family: 'DM Sans', size: 11 } } } }
      };

      const ctx1 = document.getElementById('app-dist-chart');
      if (ctx1) {
        if (window.chart1) window.chart1.destroy();
        window.chart1 = new Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels: ['Sportify', 'DevStore', '⬡ Nexsus'],
            datasets: [{ data: [sportify, devstore, nexsus], backgroundColor: ['#7c5cfc', '#fc5c7d', '#8b3dff'], borderWidth: 0, hoverOffset: 4 }]
          },
          options: chartConfig
        });
      }

      const ctx2 = document.getElementById('status-dist-chart');
      if (ctx2) {
        if (window.chart2) window.chart2.destroy();
        window.chart2 = new Chart(ctx2, {
          type: 'pie',
          data: {
            labels: ['Aktif', 'Banlı', 'Ölü'],
            datasets: [{ data: [active, banned, dead], backgroundColor: ['#3ddc97', '#ff4646', '#6b6b85'], borderWidth: 0, hoverOffset: 4 }]
          },
          options: chartConfig
        });
      }
    }

    // ════════════════════════════════════════════════
    //  KULLANICI OTURUMU
    // ════════════════════════════════════════════════
    async function showUserLoggedIn(email) {
      currentUserEmail = email;
      document.getElementById('login-btn').style.display = 'none';
      const info = document.getElementById('user-info');
      info.style.display = 'flex';
      
      // Fetch nickname
      let displayName = email.split('@')[0];
      try {
        const { data: presence } = await supa.from('user_presence').select('nickname').eq('email', email).maybeSingle();
        if (presence && presence.nickname) {
          displayName = presence.nickname;
        }
      } catch (e) {
        console.warn('[Nickname] Fetch error (is column missing?):', e);
      }
      
      const isVerified = email === ADMIN_EMAIL;
      document.getElementById('user-email-short').innerHTML = (displayName.length > 15 ? displayName.substring(0, 12) + '...' : displayName) + (isVerified ? ' <svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#00d2ff;margin-left:2px;vertical-align:middle"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"></path></svg>' : '');
      const nickInput = document.getElementById('profile-nickname-input');
      if(nickInput && displayName !== email.split('@')[0]) nickInput.value = displayName;

      if (email === ADMIN_EMAIL && !document.getElementById('admin-nav-btn')) {
        const btn = document.createElement('button');
        btn.id = 'admin-nav-btn'; btn.className = 'user-btn';
        btn.style.cssText = 'background:rgba(124,92,252,0.15);border-color:rgba(124,92,252,0.4);color:var(--accent)';
        btn.textContent = '🛡️ Admin'; btn.addEventListener('click', showAdminPanel);
        document.getElementById('nav-user-area').prepend(btn);
      }

      // Developer butonu kontrolü
      if (email !== ADMIN_EMAIL && !document.getElementById('dev-nav-btn')) {
        const { data: presence } = await supa.from('user_presence').select('is_developer').eq('email', email).maybeSingle();
        if (presence && presence.is_developer) {
          const btn = document.createElement('button');
          btn.id = 'dev-nav-btn'; btn.className = 'user-btn';
          btn.style.cssText = 'background:rgba(61,220,151,0.12);border-color:rgba(61,220,151,0.3);color:var(--green)';
          btn.textContent = '🧑‍💻 Panel'; btn.addEventListener('click', showDevPanel);
          document.getElementById('nav-user-area').prepend(btn);
        }
      }
      // VIP kontrolü
      const { data: vipRow } = await supa.from('vip_members').select('email').eq('email', email).maybeSingle();
      isVIP = !!vipRow;
      const vipBtn = document.getElementById('vip-nav-btn');
      if (isVIP && vipBtn) {
        vipBtn.classList.add('vip-active');
        vipBtn.title = 'VIP Üyesin! 👑';
      } else if (vipBtn) {
        vipBtn.classList.remove('vip-active');
        vipBtn.title = 'VIP Hakkında';
      }

      startPresence();
      checkContactAuth();
      if (typeof initJarvisMemory === 'function') initJarvisMemory(email, false);
    }

    async function saveNickname() {
      const { data: { session } } = await supa.auth.getSession();
      if(!session) { alert('Oturumun süresi dolmuş, lütfen tekrar giriş yap!'); return; }
      
      const nick = document.getElementById('profile-nickname-input').value.trim();
      if(!nick) { alert('Lütfen geçerli bir takma ad gir!'); return; }
      
      const btn = document.getElementById('nick-save-btn');
      btn.disabled = true; btn.textContent = '⏳...';
      
      try {
        console.log('[Nickname] Güncelleniyor:', nick, 'Kullanıcı:', session.user.email);
        const { error } = await supa.from('user_presence').update({ nickname: nick }).eq('email', session.user.email);
        
        if(error) {
          console.error('[Supabase Error]', error);
          throw error;
        }
        
        alert('Takma ad başarıyla güncellendi! ✓');
        // Refresh display immediately
        await showUserLoggedIn(session.user.email);
        if (currentAppId) loadComments(currentAppId);
      } catch(e) { 
        console.error('[Nickname Save Fail]', e);
        alert('Hata: ' + (e.message || 'Veritabanına kaydedilemedi. Sütun eksik olabilir mi? Lütfen SQL kodunu çalıştırdığınızdan emin olun.')); 
      }
      finally { btn.disabled = false; btn.textContent = 'Kaydet'; }
    }

    function showUserLoggedOut() {
      currentUserEmail = null; currentUserId = null;
      isVIP = false;
      document.getElementById('login-btn').style.display = 'flex';
      document.getElementById('user-info').style.display = 'none';
      document.getElementById('admin-nav-btn')?.remove();
      document.getElementById('dev-nav-btn')?.remove();
      const vipBtn = document.getElementById('vip-nav-btn');
      if (vipBtn) { vipBtn.classList.remove('vip-active'); vipBtn.title = 'VIP Hakkında'; }
      stopPresence();
      checkContactAuth();
      if (typeof initJarvisMemory === 'function') initJarvisMemory(null, true);
    }

    window.addEventListener('DOMContentLoaded', () => {
      document.querySelector('.logo')?.addEventListener('click', showHome);
      document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', showHome));
      document.getElementById('login-btn')?.addEventListener('click', () => {
        if (typeof openAuth === 'function') openAuth();
      });
      document.getElementById('user-info')?.addEventListener('click', showProfile);
      document.querySelectorAll('.open-auth-btn').forEach(btn => btn.addEventListener('click', () => {
        if (typeof openAuth === 'function') openAuth();
      }));
      document.getElementById('nick-save-btn')?.addEventListener('click', saveNickname);
      document.getElementById('pass-reset-btn')?.addEventListener('click', () => {
        if (typeof sendPasswordReset === 'function') sendPasswordReset();
      });
      document.getElementById('signout-btn')?.addEventListener('click', () => {
        if (typeof doSignOut === 'function') doSignOut();
      });

      document.getElementById('vip-nav-btn')?.addEventListener('click', () => {
        document.getElementById('vip-overlay').classList.add('open');
      });
      document.getElementById('vip-close-btn')?.addEventListener('click', () => {
        document.getElementById('vip-overlay').classList.remove('open');
      });
      document.getElementById('vip-overlay')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('vip-overlay')) {
          document.getElementById('vip-overlay').classList.remove('open');
        }
      });
    });

