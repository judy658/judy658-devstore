    function selectNotifTag(btn, tag) {
      _notifTag = tag;
      document.querySelectorAll('#notif-tags .notif-tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    function selectRecipients(type) {
      _notifRecipients = type;
      document.getElementById('rcpt-all').classList.toggle('active', type === 'all');
      document.getElementById('rcpt-online').classList.toggle('active', type === 'online');
      document.getElementById('rcpt-select').classList.toggle('active', type === 'select');
      const listEl = document.getElementById('rcpt-user-list');
      if (type === 'select') {
        listEl.style.display = 'block';
        loadRcptUserList();
      } else {
        listEl.style.display = 'none';
      }
    }

    async function loadRcptUserList() {
      const box = document.getElementById('rcpt-user-checkboxes');
      box.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">Yükleniyor...</div>';
      const { data: presence } = await supa.from('user_presence').select('email, nickname').order('email', { ascending: true });
      if (!presence || !presence.length) { box.innerHTML = '<div style="color:var(--muted);font-size:0.82rem">Kullanıcı bulunamadı.</div>'; return; }
      box.innerHTML = presence.map(u => `
    <label class="rcpt-user-item" style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:7px 10px;border-radius:8px;transition:background 0.15s;">
      <input type="checkbox" value="${u.email}" style="accent-color:var(--accent);width:15px;height:15px;cursor:pointer;">
      <span style="font-size:0.85rem;color:var(--text)">${u.email}</span>
    </label>
  `).join('');
    }

    async function loadNotifData() {
      // Alıcı sayısını göster
      const { data: presence } = await supa.from('user_presence').select('email, is_online, last_seen');
      if (presence) {
        const now = Date.now();
        const online = presence.filter(u => (now - new Date(u.last_seen).getTime()) / 1000 < 60);
        document.getElementById('notif-rcpt-count').textContent =
          `Toplam ${presence.length} kullanıcı · ${online.length} şu an online`;
      }
      // Geçmişi yükle
      loadNotifHistory();
    }

    async function loadNotifHistory() {
      const { data: notifs } = await supa.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
      const el = document.getElementById('notif-history');
      if (!notifs || !notifs.length) { el.innerHTML = '<div class="admin-empty">Henüz bildirim gönderilmedi.</div>'; return; }
      el.innerHTML = notifs.map(n => {
        const date = new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const to = n.sent_to === 'all' ? '👥 Tüm kullanıcılar' : n.sent_to === 'online' ? '🟢 Online kullanıcılar' : '☑️ Seçili kullanıcılar';
        return `<div class="notif-history-item">
      <span class="notif-history-tag">${n.tag || '📢'}</span>
      <div style="font-size:0.88rem;font-weight:600;color:var(--text);margin-bottom:4px">${n.title}</div>
      <div style="font-size:0.82rem;color:var(--muted)">${n.content}</div>
      <div style="font-size:0.75rem;color:var(--muted);margin-top:6px">${to} · ${date}</div>
    </div>`;
      }).join('');
    }

    async function sendNotification() {
      const title = document.getElementById('notif-title').value.trim();
      const content = document.getElementById('notif-content').value.trim();
      const status = document.getElementById('notif-status');
      const btn = document.getElementById('notif-send-btn');

      if (!title) { status.textContent = '⚠️ Başlık boş olamaz!'; status.style.color = 'var(--accent2)'; return; }
      if (!content) { status.textContent = '⚠️ İçerik boş olamaz!'; status.style.color = 'var(--accent2)'; return; }

      btn.disabled = true; btn.textContent = '⏳ Gönderiliyor...';
      status.textContent = '';

      try {
        // Alıcıları belirle
        let emails = [];
        if (_notifRecipients === 'online') {
          const { data: presence } = await supa.from('user_presence').select('email, last_seen');
          const now = Date.now();
          emails = (presence || [])
            .filter(u => (now - new Date(u.last_seen).getTime()) / 1000 < 60)
            .map(u => u.email);
        } else if (_notifRecipients === 'select') {
          const checkboxes = document.querySelectorAll('#rcpt-user-checkboxes input[type=checkbox]:checked');
          emails = Array.from(checkboxes).map(cb => cb.value);
          if (!emails.length) {
            status.textContent = '⚠️ En az bir kullanıcı seç!';
            status.style.color = 'var(--accent2)';
            btn.disabled = false; btn.textContent = '📢 Bildirimi Gönder';
            return;
          }
        } else {
          const { data: users } = await supa.from('user_emails').select('email');
          emails = (users || []).map(u => u.email);
        }

        if (!emails.length) {
          status.textContent = '⚠️ Gönderilecek kullanıcı bulunamadı!';
          status.style.color = 'var(--accent2)';
          btn.disabled = false; btn.textContent = '📢 Bildirimi Gönder';
          return;
        }

        // EmailJS ile her kullanıcıya mail at
        const EMAILJS_PUBLIC_KEY = 'r8ASbmPn5vAERuB8C';
        const EMAILJS_SERVICE_ID = 'service_tf1icj3';
        const EMAILJS_TEMPLATE_ID = 'template_3s3ggrq';

        emailjs.init(EMAILJS_PUBLIC_KEY);

        let sent = 0;
        for (const email of emails) {
          try {
            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
              to_email: email,
              title: title,
              message: content,
              tag: _notifTag
            });
            sent++;
            status.textContent = `⏳ ${sent}/${emails.length} gönderiliyor...`;
            status.style.color = 'var(--muted)';
          } catch (e) {
            console.error('Mail gönderilemedi:', email, e);
          }
        }

        // Bildirimi geçmişe kaydet
        await supa.from('notifications').insert({
          title, content, tag: _notifTag,
          recipients: _notifRecipients,
          sent_count: sent,
          total_count: emails.length
        });

        status.textContent = `✅ ${sent}/${emails.length} kullanıcıya gönderildi!`;
        status.style.color = 'var(--green)';
        document.getElementById('notif-title').value = '';
        document.getElementById('notif-content').value = '';
        loadNotifHistory();

      } catch (e) {
        status.textContent = '✗ Hata: ' + e.message;
        status.style.color = 'var(--accent2)';
      }

      btn.disabled = false; btn.textContent = '📢 Bildirimi Gönder';
    }

    function switchAdminTab(tab, btn) {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.getElementById('admin-' + tab).classList.add('active');

      if (tab === 'dashboard') updateDashboardAnalytics();
      if (tab === 'deadaccounts') loadDeadAccounts();
      if (tab === 'users') loadAdminUsers();
      if (tab === 'messages') loadAdminMessages();
      if (tab === 'notifications') loadNotifData();
      if (tab === 'banned') loadBannedUsers();
      if (tab === 'vip') loadVipMembers();
      if (tab === 'appmanager') loadAppManager();
      if (tab === 'developers') loadDeveloperList();
    }

    // ═══════════════════════════════════════
    // Ölü Hesap Yönetimi
    // ═══════════════════════════════════════
    let _deadList = [];
    let _deadFilter = 'all';

    async function loadDeadAccounts() {
      const el = document.getElementById('dead-account-list');
      el.innerHTML = '<div class="admin-empty">Yükleniyor...</div>';
      const now = new Date();
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const { data: dead } = await supa.from('user_presence').select('user_id, email, last_seen, warned_at').eq('is_dead', true).order('last_seen', { ascending: true });
      const { data: active } = await supa.from('user_presence').select('email').gte('last_seen', sevenDaysAgo.toISOString());
      _deadList = dead ?? [];
      const toWarn = _deadList.filter(u => !u.warned_at);
      const warned = _deadList.filter(u => u.warned_at);
      document.getElementById('da-warn-count').textContent = toWarn.length;
      document.getElementById('da-warned-count').textContent = warned.length;
      document.getElementById('da-safe-count').textContent = (active ?? []).length;
      renderDeadList();
    }

    function filterDeadList(filter, btn) {
      _deadFilter = filter;
      document.querySelectorAll('[id^="da-filter-"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDeadList();
    }

    function renderDeadList() {
      const el = document.getElementById('dead-account-list');
      const now = new Date();
      const warnCutoff = new Date(now - 24 * 60 * 60 * 1000);
      let list = _deadList;
      if (_deadFilter === 'warn') list = list.filter(u => !u.warned_at);
      else if (_deadFilter === 'warned') list = list.filter(u => u.warned_at);
      if (!list.length) { el.innerHTML = '<div class="admin-empty">Bu kategoride kullanici yok. 🎉</div>'; return; }
      el.innerHTML = list.map(u => {
        const lastSeen = new Date(u.last_seen);
        const daysInactive = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));
        const isDeletePending = u.warned_at && new Date(u.warned_at) < warnCutoff;
        const isWarned = u.warned_at && !isDeletePending;
        const hoursLeft = u.warned_at ? Math.max(0, Math.ceil((new Date(u.warned_at).getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / (1000 * 60 * 60))) : null;
        const warnedDate = u.warned_at ? new Date(u.warned_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
        let statusBadge = '';
        if (isDeletePending) statusBadge = '<span style="background:rgba(252,92,125,0.2);color:var(--accent2);border-radius:8px;padding:3px 10px;font-size:0.72rem;font-weight:700">🗑️ SILINECEK</span>';
        else if (isWarned) statusBadge = '<span style="background:rgba(255,209,102,0.15);color:var(--yellow);border-radius:8px;padding:3px 10px;font-size:0.72rem;font-weight:700">📧 UYARILDI · ' + hoursLeft + 's kaldi</span>';
        else statusBadge = '<span style="background:rgba(107,107,133,0.2);color:var(--muted);border-radius:8px;padding:3px 10px;font-size:0.72rem;font-weight:700">⏳ UYARI BEKLIYOR</span>';
        const userChar = u.email ? u.email[0].toUpperCase() : '?';
        return '<div style="background:var(--surface);border:1px solid ' + (isDeletePending ? 'rgba(252,92,125,0.3)' : isWarned ? 'rgba(255,209,102,0.2)' : 'var(--border)') + ';border-radius:14px;padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
          + '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,' + (isDeletePending ? '#fc5c7d,#ff9a3c' : isWarned ? '#ffd166,#f7971e' : 'var(--surface2),var(--bg)') + ');display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;font-weight:700;color:' + (isDeletePending || isWarned ? '#fff' : 'var(--muted)') + '">' + userChar + '</div>'
          + '<div style="flex:1;min-width:180px"><div style="font-size:0.9rem;font-weight:600;margin-bottom:3px">' + (u.email || 'Bilinmiyor') + '</div>'
          + '<div style="font-size:0.75rem;color:var(--muted)">Son görülme: <strong style="color:var(--text)">' + lastSeen.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) + '</strong> · <strong style="color:var(--accent2)">' + daysInactive + ' gün</strong> önce · Uyari: <strong style="color:var(--text)">' + warnedDate + '</strong></div></div>'
          + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + statusBadge
          + '<button data-action="revive-dead" data-user-id="' + u.user_id + '" data-email="' + u.email + '" style="background:rgba(61,220,151,0.1);border:1px solid rgba(61,220,151,0.3);color:var(--green);border-radius:8px;padding:6px 14px;font-family:\'DM Sans\',sans-serif;font-size:0.78rem;cursor:pointer;transition:all 0.2s">✨ Canlandır</button>'
          + '<button data-action="delete-dead" data-user-id="' + u.user_id + '" data-email="' + u.email + '" style="background:rgba(252,92,125,0.12);border:1px solid rgba(252,92,125,0.3);color:var(--accent2);border-radius:8px;padding:6px 14px;font-family:\'DM Sans\',sans-serif;font-size:0.78rem;cursor:pointer;transition:all 0.2s">🗑️ Sil</button></div></div>';
      }).join('');
    }

    async function toggleDeadStatus(userId, email, status, btn) {
      const actionText = status ? 'ölü olarak işaretlemek' : 'canlandırmak';
      if (!confirm('"' + email + '" kullanıcısını ' + actionText + ' istediğine emin misin?')) return;
      btn.disabled = true; btn.textContent = '...';
      try {
        await supa.from('user_presence').update({ is_dead: status }).eq('user_id', userId);
        if (document.getElementById('admin-deadaccounts').classList.contains('active')) loadDeadAccounts();
        else loadAdminUsers();
      } catch (e) { btn.disabled = false; btn.textContent = status ? '💀 Ölü İşaretle' : '✨ Canlandır'; alert('Hata: ' + e.message); }
    }

    async function deleteDeadAccount(userId, email, btn) {
      if (!confirm('"' + email + '" hesabini kalici olarak silmek istedigine emin misin?')) return;
      btn.disabled = true; btn.textContent = 'Siliniyor...';
      try {
        await supa.from('comments').delete().eq('user_id', userId);
        await supa.from('contact_messages').delete().eq('email', email);
        await supa.from('user_presence').delete().eq('user_id', userId);

        // Auth silecek anahtara sahip değilse hata fırlatabilir, bu yüzden try-catch içine alıyoruz
        try {
          await supa.auth.admin.deleteUser(userId);
        } catch (authE) {
          console.warn('Auth kullanıcısı silinemedi (yetki kısıtı olabilir), ancak veritabanından başarıyla silindi.', authE);
        }

        _deadList = _deadList.filter(u => u.user_id !== userId);
        renderDeadList();
        document.getElementById('da-warn-count').textContent = _deadList.filter(u => !u.warned_at).length;
        document.getElementById('da-warned-count').textContent = _deadList.filter(u => u.warned_at).length;
      } catch (e) { btn.disabled = false; btn.textContent = '🗑️ Sil'; alert('Hata: ' + e.message); }
    }

    async function runCleanerNow() {
      const btn = document.getElementById('run-cleaner-btn');
      btn.disabled = true; btn.textContent = '⏳ Çalışıyor...';
      try {
        const { data: { session } } = await supa.auth.getSession();
        const res = await fetch('https://jnuckqaiutmkiquptvzu.supabase.co/functions/v1/dead-account-cleaner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token },
          body: '{}'
        });
        const result = await res.json();
        if (result.success) {
          const { warned = [], deleted = [], errors = [] } = result.results;
          const lastRunEl = document.getElementById('da-last-run');
          lastRunEl.style.display = 'block';
          document.getElementById('da-last-run-text').textContent = new Date().toLocaleTimeString('tr-TR') + ' — ' + warned.length + ' uyari gönderildi, ' + deleted.length + ' hesap silindi' + (errors.length ? ', ' + errors.length + ' hata' : '');
          await loadDeadAccounts();
        } else { alert('Hata: ' + result.error); }
      } catch (e) { alert('Baglanti hatasi: ' + e.message); }
      btn.disabled = false; btn.textContent = '▶ Şimdi Çalıştır';
    }
    let _cachedUsers = [];
    async function loadAdminUsers() {
      const el = document.getElementById('user-list');
      el.innerHTML = '<div class="admin-empty">Yükleniyor...</div>';
      const [presRes, vipRes] = await Promise.all([
        supa.from('user_presence').select('*').eq('is_banned', false).eq('is_dead', false).order('is_online', { ascending: false }).order('last_seen', { ascending: false }),
        supa.from('vip_members').select('*')
      ]);

      const presence = presRes.data;
      _vipMembers = vipRes.data || [];
      if (!presence || !presence.length) {
        el.innerHTML = '<div class="admin-empty">Henüz kayıtlı kullanıcı yok.</div>';
        document.getElementById('a-total-users').textContent = '0';
        document.getElementById('a-online-users').textContent = '0';
        return;
      }

      _cachedUsers = presence;
      renderUserList(_cachedUsers);
    }

    function filterUserList() {
      const query = document.getElementById('admin-user-search').value.toLowerCase();
      const app = document.getElementById('admin-app-filter').value;

      const filtered = _cachedUsers.filter(u => {
        const matchSearch = (u.email && u.email.toLowerCase().includes(query)) || (u.user_id && u.user_id.toLowerCase().includes(query));
        const matchApp = app === 'all' || u.current_app === app;
        return matchSearch && matchApp;
      });

      renderUserList(filtered);
    }

    async function renderUserList(list) {
      const now = Date.now();
      const onlineCount = list.filter(u => (now - new Date(u.last_seen).getTime()) / 1000 < 60).length;
      document.getElementById('a-total-users').textContent = list.length;
      document.getElementById('a-online-users').textContent = onlineCount;

      if (!list.length) {
        document.getElementById('user-list').innerHTML = '<div class="admin-empty">Aranan kriterlere uygun kullanıcı bulunamadı.</div>';
        return;
      }

      const vipEmails = new Set(_vipMembers.map(v => v.email));

      document.getElementById('user-list').innerHTML = list.map(u => {
        const isOnline = (now - new Date(u.last_seen).getTime()) / 1000 < 60;
        const isVerified = u.email === ADMIN_EMAIL;
        const isMe = u.email === ADMIN_EMAIL;
        const isVip = vipEmails.has(u.email);
        const verifiedBadge = isVerified ? '<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#00d2ff;margin-left:4px;vertical-align:middle"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"></path></svg>' : '';
        const vipBadge = isVip ? '<span class="vip-badge-small">👑 VIP</span>' : '';
        return `<div class="user-row ${isOnline ? 'online' : ''}" data-user-id="${u.user_id}">
      <div class="user-avatar">${u.email ? u.email[0].toUpperCase() : '?'}</div>
      <div class="user-info">
        <div class="user-email-text">${u.nickname || u.email}${verifiedBadge}${vipBadge}${isMe ? ' 👑' : ''}</div>
        <div class="user-meta">${u.nickname ? u.email + ' · ' : ''}${isOnline ? '🟢 Şu an aktif' + (u.current_app ? ' · ' + (u.current_app === 'sportify' ? '🎵 Sportify' : u.current_app === 'nexsus' ? '<span style="color:#a855f7;text-shadow:0 0 8px rgba(168,85,247,0.6)">⬡ Nexsus</span>' : '🌐 DevStore') : '') : '⚫ Son görülme: ' + _timeAgo(u.last_seen)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="online-dot ${isOnline ? 'active' : ''}"></div>
        <span class="online-badge ${isOnline ? 'on' : 'off'}">${isOnline ? 'Online' : 'Offline'}</span>
        <div style="display:flex;align-items:center;gap:8px">
          ${!isMe ? `<button data-action="mark-dead" data-user-id="${u.user_id}" data-email="${u.email}" style="background:rgba(255,209,102,0.1);color:var(--yellow);border:1px solid rgba(255,209,102,0.3);padding:6px 12px;border-radius:8px;font-size:0.75rem;cursor:pointer;transition:all 0.2s">💀</button>` : ''}
          ${!isMe ? `<button data-action="ban-user" data-user-id="${u.user_id}" data-email="${u.email}" style="background:rgba(255,70,70,0.1);color:#ff4646;border:1px solid rgba(255,70,70,0.3);padding:6px 12px;border-radius:8px;font-size:0.75rem;cursor:pointer;transition:all 0.2s">🚫</button>` : ''}
        </div>
      </div>
    </div>`;
      }).join('');
    }

    function showUserDetail(userId) {
      const user = _cachedUsers.find(u => u.user_id === userId);
      if (!user) return;

      const modal = document.getElementById('admin-user-modal');
      const avatarText = user.nickname ? user.nickname[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : '?');
      document.getElementById('m-user-avatar').textContent = avatarText;
      const isVerified = user.email === ADMIN_EMAIL;
      const verifiedBadge = isVerified ? '<svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:#00d2ff;margin-left:4px;vertical-align:middle"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"></path></svg>' : '';
      document.getElementById('m-user-email').innerHTML = user.nickname ? `<div style="color:var(--accent)">${user.nickname}${verifiedBadge}</div><div style="font-size:0.8rem;opacity:0.6">${user.email}</div>` : `<div>${user.email}${verifiedBadge}</div>`;
      document.getElementById('m-user-id').textContent = user.user_id;
      document.getElementById('m-user-nickname').textContent = user.nickname || '—';

      const isOnline = (Date.now() - new Date(user.last_seen).getTime()) / 1000 < 60;
      document.getElementById('m-user-status').innerHTML = isOnline ? '<span style="color:var(--green)">Online</span>' : '<span style="color:var(--muted)">Offline</span>';
      document.getElementById('m-user-app').innerHTML = user.current_app === 'sportify' ? '🎵 Sportify' : user.current_app === 'nexsus' ? '<span style="color:#a855f7;text-shadow:0 0 8px rgba(168,85,247,0.6)">⬡ Nexsus</span>' : '🌐 DevStore';
      document.getElementById('m-user-lastseen').textContent = _timeAgo(user.last_seen) + ' (' + new Date(user.last_seen).toLocaleString() + ')';
      document.getElementById('m-user-firstdevice').textContent = user.first_device || 'Bilinmiyor';
      document.getElementById('m-user-lastdevice').textContent = user.last_device || 'Bilinmiyor';

      const banBtn = document.getElementById('m-ban-btn');
      banBtn.textContent = user.is_banned ? '🔓 Yasağı Kaldır' : '🚫 Yasakla';
      banBtn.dataset.userId = user.user_id;
      banBtn.dataset.email = user.email;
      banBtn.dataset.isBanned = user.is_banned ? '1' : '0';

      const deadBtn = document.getElementById('m-dead-btn');
      deadBtn.textContent = user.is_dead ? '✨ Canlandır' : '💀 Ölü İşaretle';
      deadBtn.dataset.userId = user.user_id;
      deadBtn.dataset.email = user.email;
      deadBtn.dataset.isDead = user.is_dead ? '1' : '0';

      modal.classList.add('open');
    }

    async function banUser(userId, email, btn) {
      if (email === ADMIN_EMAIL) return;
      if (!confirm('"' + email + '" kullanıcısını yasaklamak istediğine emin misin?')) return;
      btn.disabled = true; btn.textContent = '⏱...';
      try {
        const { error } = await supa.from('user_presence').upsert({ user_id: userId, email, is_banned: true, last_seen: '1990-01-01T00:00:00+00:00', is_online: false }, { onConflict: 'email' });
        if (error) throw error;
        await loadAdminUsers();
      } catch (e) { btn.disabled = false; btn.textContent = '🚫 Yasakla'; alert('Hata: ' + e.message); }
    }

    async function loadBannedUsers() {
      const el = document.getElementById('banned-user-list');
      el.innerHTML = '<div class="admin-empty">Yükleniyor...</div>';
      const { data: banned } = await supa.from('user_presence').select('*').eq('is_banned', true).order('email', { ascending: true });
      if (!banned || !banned.length) {
        el.innerHTML = '<div class="admin-empty">🎉 Hiç banlı kullanıcı yok!</div>';
        return;
      }
      el.innerHTML = banned.map(u => `
    <div style="background:var(--surface);border:1px solid rgba(252,92,125,0.3);border-radius:14px;padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#fc5c7d,#ff9a3c);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0">${u.email[0].toUpperCase()}</div>
      <div style="flex:1;min-width:180px">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:3px">${u.email}</div>
        <div style="font-size:0.75rem;color:var(--accent2);font-weight:600">🚫 Kalıcı olarak yasaklandı</div>
      </div>
      <button data-action="unban-user" data-user-id="${u.user_id}" data-email="${u.email}" style="background:rgba(61,220,151,0.1);color:var(--green);border:1px solid rgba(61,220,151,0.3);padding:8px 16px;border-radius:8px;font-size:0.78rem;cursor:pointer;transition:all 0.2s">🔓 Yasağı Kaldır</button>
    </div>
  `).join('');
    }

    async function unbanUser(userId, email, btn) {
      if (!confirm('"' + email + '" kullanıcısının yasağını kaldırmak istediğine emin misin?')) return;
      btn.disabled = true; btn.textContent = 'Kaldırılıyor...';
      try {
        const { error } = await supa.from('user_presence').upsert({ user_id: userId, email: email, is_banned: false, last_seen: new Date().toISOString(), is_online: false }, { onConflict: 'email' });
        if (error) throw error;

        if (document.getElementById('admin-banned').classList.contains('active')) {
          await loadBannedUsers();
        } else {
          await loadAdminUsers();
        }
      } catch (e) { btn.disabled = false; btn.textContent = '🔓 Yasağı Kaldır'; alert('Hata: ' + e.message); }
    }
    async function loadAdminMessages() {
      document.getElementById('msg-list').innerHTML = '<div class="admin-empty">Yükleniyor...</div>';
      const { data: msgs } = await supa.from('contact_messages').select('*').order('created_at', { ascending: false });
      if (!msgs || !msgs.length) {
        document.getElementById('msg-list').innerHTML = '<div class="admin-empty">Henüz mesaj yok.</div>';
        document.getElementById('a-total-msgs').textContent = '0';
        return;
      }
      document.getElementById('a-total-msgs').textContent = msgs.length;
      const tagMap = { suggest: { label: '💡 Öneri', cls: 'msg-tag-suggest' }, bug: { label: '🐛 Hata', cls: 'msg-tag-bug' }, song: { label: '🎵 Şarkı', cls: 'msg-tag-song' }, general: { label: '💬 Genel', cls: 'msg-tag-general' } };
      document.getElementById('msg-list').innerHTML = msgs.map(m => {
        const tag = tagMap[m.type] || tagMap.general;
        const dateStr = new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return `<div class="msg-card" id="msg-${m.id}">
      <div class="msg-header">
        <div class="msg-from">${m.name || 'İsimsiz'} <span style="color:var(--muted);font-weight:400;font-size:0.82rem">&lt;${m.email || '—'}&gt;</span></div>
        <div style="display:flex;align-items:center;gap:10px"><div class="msg-date">${dateStr}</div><button class="msg-delete" data-action="delete-msg" data-msg-id="${m.id}">🗑</button></div>
      </div>
      <span class="msg-tag ${tag.cls}">${tag.label}</span>
      <div class="msg-body">${m.message || ''}</div>
    </div>`;
      }).join('');
    }
    async function deleteMsg(id) {
      if (!confirm('Bu mesajı silmek istediğine emin misin?')) return;
      await supa.from('contact_messages').delete().eq('id', id);
      document.getElementById('msg-' + id)?.remove();
      const r = document.querySelectorAll('.msg-card').length;
      document.getElementById('a-total-msgs').textContent = r;
      if (r === 0) document.getElementById('msg-list').innerHTML = '<div class="admin-empty">Henüz mesaj yok.</div>';
    }
    async function resetWholeSystem() {
      if (!confirm('DİKKAT: Tüm banlar kalkacak ve herkesin son görülme tarihi 1 dakika önceye alınacak. Sistemsel hataları temizlemek için bu işlem gerekli. Emin misin?')) return;
      const btn = document.getElementById('reset-system-btn');
      if (!btn) return;
      btn.disabled = true; btn.textContent = '⏳ Sıfırlanıyor...';
      try {
        const oneMinAgo = new Date(Date.now() - 60000).toISOString();
        // Tüm kullanıcıları güncelle
        const { error } = await supa.from('user_presence').update({
          is_banned: false,
          is_dead: false,
          last_seen: oneMinAgo,
          warned_at: null,
          is_online: false
        }).neq('user_id', 'placeholder-value-to-affect-all'); // Filter that affects all rows correctly in Supabase

        if (error) throw error;

        alert('Sistem başarıyla sıfırlandı! ✅ Tüm kullanıcılar aktif ve temizlendi.');
        loadAdminUsers();
        if (document.getElementById('admin-deadaccounts').classList.contains('active')) loadDeadAccounts();
        if (document.getElementById('admin-banned').classList.contains('active')) loadBannedUsers();
      } catch (e) {
        alert('Sıfırlama hatası: ' + e.message);
      }
      btn.disabled = false; btn.textContent = '🔄 Tüm Sistemi Sıfırla (Arındır)';
    }

    function _timeAgo(dateStr) {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return diff + ' sn önce';
      if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
      if (diff < 86400) return Math.floor(diff / 3600) + ' sa önce';
      return Math.floor(diff / 86400) + ' gün önce';
    }

    // ════════════════════════════════════════════════
    //  YARDIMCI FONKSİYONLAR
    // ════════════════════════════════════════════════
    function maskEmail(email) {
      if (!email) return 'Gizli Kullanıcı';
      const [u, d] = email.split('@');
      return u.slice(0, 3) + '***@' + d;
    }

    window.addEventListener('DOMContentLoaded', () => {
      document.querySelector('.admin-tabs')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.admin-tab');
        if (!btn) return;
        const tab = btn.dataset.tab;
        if (!tab) return;
        switchAdminTab(tab, btn);
      });

      document.getElementById('admin-user-search')?.addEventListener('input', filterUserList);
      document.getElementById('admin-app-filter')?.addEventListener('change', filterUserList);

      document.getElementById('run-cleaner-btn')?.addEventListener('click', runCleanerNow);
      document.getElementById('reset-system-btn')?.addEventListener('click', resetWholeSystem);

      document.querySelectorAll('[id^="da-filter-"]').forEach(btn => {
        btn.addEventListener('click', () => filterDeadList(btn.dataset.filter, btn));
      });

      document.getElementById('user-list')?.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('button[data-action]');
        if (actionBtn) {
          const userId = actionBtn.dataset.userId;
          const email = actionBtn.dataset.email;
          if (actionBtn.dataset.action === 'mark-dead') toggleDeadStatus(userId, email, true, actionBtn);
          if (actionBtn.dataset.action === 'ban-user') banUser(userId, email, actionBtn);
          return;
        }

        const row = e.target.closest('.user-row');
        if (!row) return;
        const userId = row.dataset.userId;
        if (userId) showUserDetail(userId);
      });

      document.getElementById('dead-account-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const userId = btn.dataset.userId;
        const email = btn.dataset.email;
        if (btn.dataset.action === 'revive-dead') toggleDeadStatus(userId, email, false, btn);
        if (btn.dataset.action === 'delete-dead') deleteDeadAccount(userId, email, btn);
      });

      document.getElementById('banned-user-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="unban-user"]');
        if (!btn) return;
        unbanUser(btn.dataset.userId, btn.dataset.email, btn);
      });

      document.getElementById('msg-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="delete-msg"]');
        if (!btn) return;
        deleteMsg(btn.dataset.msgId);
      });

      document.getElementById('m-ban-btn')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const modal = document.getElementById('admin-user-modal');
        modal?.classList.remove('open');
        const isBanned = btn.dataset.isBanned === '1';
        if (isBanned) unbanUser(btn.dataset.userId, btn.dataset.email, btn);
        else banUser(btn.dataset.userId, btn.dataset.email, btn);
      });

      document.getElementById('m-dead-btn')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const modal = document.getElementById('admin-user-modal');
        modal?.classList.remove('open');
        const isDead = btn.dataset.isDead === '1';
        toggleDeadStatus(btn.dataset.userId, btn.dataset.email, !isDead, btn);
      });

      document.getElementById('admin-banned')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="unban-user"]');
        if (!btn) return;
        unbanUser(btn.dataset.userId, btn.dataset.email, btn);
      });

      document.getElementById('admin-users-refresh')?.addEventListener('click', loadAdminUsers);
      document.getElementById('admin-messages-refresh')?.addEventListener('click', loadAdminMessages);
      document.getElementById('dead-refresh-btn')?.addEventListener('click', loadDeadAccounts);

      document.getElementById('notif-tags')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.notif-tag-btn');
        if (!btn) return;
        const tag = btn.dataset.tag;
        if (tag) selectNotifTag(btn, tag);
      });
      document.getElementById('rcpt-all')?.addEventListener('click', () => selectRecipients('all'));
      document.getElementById('rcpt-online')?.addEventListener('click', () => selectRecipients('online'));
      document.getElementById('rcpt-select')?.addEventListener('click', () => selectRecipients('select'));
      document.getElementById('notif-send-btn')?.addEventListener('click', sendNotification);

      // VIP event listeners
      document.getElementById('vip-refresh-btn')?.addEventListener('click', loadVipMembers);
      document.getElementById('open-add-vip-btn')?.addEventListener('click', openAddVipModal);
      document.getElementById('close-add-vip-btn')?.addEventListener('click', closeAddVipModal);
      document.getElementById('add-vip-btn')?.addEventListener('click', addVipMember);
      document.getElementById('vip-user-search')?.addEventListener('input', searchVipUser);
      document.getElementById('vip-user-dropdown')?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-action="select-vip-user"]');
        if (!item) return;
        selectVipUser(item.dataset.email);
      });
      document.getElementById('add-vip-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('add-vip-modal')) closeAddVipModal();
      });
      document.getElementById('vip-member-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="remove-vip"]');
        if (!btn) return;
        removeVipMember(btn.dataset.email);
      });
    });

    // ═══════════════════════════════════════
    // VIP YÖNETİMİ
    // ═══════════════════════════════════════
    let _vipSearchCache = [];
    let _selectedVipEmail = null;
    let _vipMembers = [];

    async function loadVipMembers() {
      const el = document.getElementById('vip-member-list');
      el.innerHTML = '<div class="admin-empty">Yükleniyor...</div>';

      const { data: members } = await supa.from('vip_members').select('*').order('granted_at', { ascending: false });
      _vipMembers = members || [];
      document.getElementById('vip-total-count').textContent = _vipMembers.length;

      if (!_vipMembers.length) {
        el.innerHTML = '<div class="admin-empty">Henüz VIP üye yok.</div>';
        return;
      }

      el.innerHTML = _vipMembers.map(m => {
        const date = new Date(m.granted_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
        return `
        <div style="background:var(--surface);border:1px solid rgba(240,185,11,0.2);border-radius:14px;padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#f0b90b,#e69a00);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0">👑</div>
          <div style="flex:1;min-width:180px">
            <div style="font-size:0.9rem;font-weight:600;margin-bottom:3px">${m.email}</div>
            <div style="font-size:0.75rem;color:var(--muted)">${m.reason || 'Sebep belirtilmedi'} · ${date}</div>
          </div>
          <button data-action="remove-vip" data-email="${m.email}" style="background:rgba(252,92,125,0.1);border:1px solid rgba(252,92,125,0.25);color:var(--accent2);border-radius:9px;padding:7px 16px;font-family:DM Sans,sans-serif;font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s">👑 VIP'yi Kaldır</button>
        </div>`;
      }).join('');
    }

    function openAddVipModal() {
      _selectedVipEmail = null;
      _vipSearchCache = [];
      document.getElementById('vip-user-search').value = '';
      document.getElementById('vip-user-dropdown').style.display = 'none';
      document.getElementById('vip-selected-user').style.display = 'none';
      document.getElementById('vip-reason').value = '';
      document.getElementById('add-vip-status').textContent = '';
      document.getElementById('add-vip-btn').disabled = false;
      document.getElementById('add-vip-btn').textContent = '👑 VIP Yap';
      document.getElementById('add-vip-modal').style.display = 'flex';
    }

    function closeAddVipModal() {
      document.getElementById('add-vip-modal').style.display = 'none';
    }

    async function searchVipUser() {
      const query = document.getElementById('vip-user-search').value.trim().toLowerCase();
      const dropdown = document.getElementById('vip-user-dropdown');
      if (query.length < 2) { dropdown.style.display = 'none'; return; }

      if (!_vipSearchCache.length) {
        const { data } = await supa.from('user_presence').select('email, nickname').eq('is_banned', false);
        _vipSearchCache = data || [];
      }

      const filtered = _vipSearchCache.filter(u =>
        u.email && u.email.toLowerCase().includes(query) && !_vipMembers.some(v => v.email === u.email)
      ).slice(0, 8);

      if (!filtered.length) { dropdown.style.display = 'none'; return; }

      dropdown.style.display = 'block';
      dropdown.innerHTML = filtered.map(u => `
        <div data-action="select-vip-user" data-email="${u.email}" style="padding:10px 14px;cursor:pointer;font-size:0.88rem;border-bottom:1px solid var(--border);transition:background 0.15s">
          ${u.email} ${u.nickname ? `<span style="color:var(--muted);font-size:0.78rem">(${u.nickname})</span>` : ''}
        </div>`).join('');
    }

    function selectVipUser(email) {
      _selectedVipEmail = email;
      document.getElementById('vip-user-search').value = email;
      document.getElementById('vip-user-dropdown').style.display = 'none';
      document.getElementById('vip-selected-user').style.display = 'block';
      document.getElementById('vip-selected-user').textContent = '✓ Seçildi: ' + email;
    }

    async function addVipMember() {
      const btn = document.getElementById('add-vip-btn');
      const status = document.getElementById('add-vip-status');

      if (!_selectedVipEmail) {
        status.textContent = '⚠️ Bir kullanıcı seç!';
        status.style.color = 'var(--accent2)'; return;
      }

      btn.disabled = true; btn.textContent = '⏳ Ekleniyor...';
      status.textContent = '';

      try {
        const { data: { session } } = await supa.auth.getSession();
        const reason = document.getElementById('vip-reason').value.trim() || 'DevStore destekçisi';

        const { data: pres } = await supa.from('user_presence').select('user_id').eq('email', _selectedVipEmail).maybeSingle();
        const userId = pres ? pres.user_id : 'unknown';

        const { error } = await supa.from('vip_members').insert({
          user_id: userId,
          email: _selectedVipEmail,
          granted_by: session.user.email,
          reason: reason
        });

        if (error) {
          if (error.code === '23505') {
            status.textContent = '❌ Bu kullanıcı zaten VIP!';
          } else {
            status.textContent = '❌ ' + error.message;
          }
          status.style.color = 'var(--accent2)';
          btn.disabled = false; btn.textContent = '👑 VIP Yap';
          return;
        }

        status.textContent = '✅ VIP eklendi!';
        status.style.color = 'var(--green)';
        btn.textContent = '✅ Tamamlandı';

        setTimeout(() => {
          closeAddVipModal();
          loadVipMembers();
        }, 1200);

      } catch (e) {
        status.textContent = '❌ Hata: ' + e.message;
        status.style.color = 'var(--accent2)';
        btn.disabled = false; btn.textContent = '👑 VIP Yap';
      }
    }

    async function removeVipMember(email) {
      if (!confirm(email + ' kullanıcısının VIP üyeliğini kaldırmak istediğine emin misin?')) return;
      const { error } = await supa.from('vip_members').delete().eq('email', email);
      if (error) { alert('Hata: ' + error.message); return; }
      loadVipMembers();
    }

    // ═══════════════════════════════════
    // Nexsus'u app_meta'ya ekle
    // ═══════════════════════════════════
    document.getElementById('add-nexsus-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('add-nexsus-btn');
      if (!confirm('Nexsus uygulamasını veritabanına eklemek istediğine emin misin?')) return;
      btn.disabled = true; btn.textContent = '⏳ Ekleniyor...';
      try {
        const { error } = await supa.from('app_meta').insert({
          app_id: 'nexsus',
          name: 'Nexsus',
          icon: '⬡',
          category: 'app',
          version: '1.0.0',
          min_version: '1.0.0',
          download_url: 'https://huggingface.co/Judy658/nexsus/resolve/main/nexsus.zip',
          developer: 'judy658',
          is_windows: true,
          force_update: false,
          guest_safe: false,
          is_vip: false,
          filesize: '4.1 GB',
          changelog: 'Fooocus 2.5.5 tabanlı ilk sürüm. Mor/siyah tema, Türkçe dil desteği, kullanıcı sözleşmesi, Supabase kimlik doğrulama, VIP üyelik sistemi, online durum takibi, model yöneticisi.',
          description: 'Nexsus, Fooocus 2.5.5 tabanlı gelişmiş bir görsel üretim aracıdır. SDXL/SD1.5 desteği, LoRA, ControlNet, mor/siyah tema ve Supabase entegrasyonu ile gelişmiş görsel üretim deneyimi.',
          updated_at: new Date().toISOString()
        });
        if (error) {
          if (error.code === '23505') {
            alert('✅ Nexsus zaten veritabanında mevcut! Sayfayı yenile.');
          } else {
            alert('❌ Hata: ' + error.message);
          }
        } else {
          alert('✅ Nexsus başarıyla eklendi! Sayfayı yeniliyorum...');
          location.reload();
        }
      } catch (e) {
        alert('❌ Hata: ' + e.message);
      }
      btn.disabled = false; btn.textContent = '⬡ Nexsus Ekle';
    });
