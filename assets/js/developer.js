    function calcAvgRating(comments) {
      if (!comments || !comments.length) return 0;
      const sum = comments.reduce((acc, c) => acc + (c.rating || 0), 0);
      return (sum / comments.length).toFixed(1);
    }
    async function getDownloads(appId) {
      try {
        const { data } = await supa.from('app_stats').select('downloads').eq('app_id', appId).maybeSingle();
        return data ? data.downloads : 0;
      } catch (e) { return 0; }
    }
    async function incrementDownload(appId) {
      try {
        const { data } = await supa.from('app_stats').select('downloads').eq('app_id', appId).maybeSingle();
        const count = (data ? data.downloads : 0) + 1;
        await supa.from('app_stats').upsert({ app_id: appId, downloads: count }, { onConflict: 'app_id' });
        const el = document.getElementById('d-dl-count');
        if (el) el.textContent = count;
      } catch (e) { console.warn("Supabase indirme sayısı güncellenemedi."); }
    }

    // ════════════════════════════════════════════════
    //  DEVELOPER SİSTEMİ
    // ════════════════════════════════════════════════

    let _devUserSearchCache = [];
    let _selectedDevUserEmail = null;

    async function showDevPanel() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { openAuth(); return; }
      document.getElementById('home-page').style.display = 'none';
      document.getElementById('detail-page').classList.remove('active');
      document.getElementById('profile-page').classList.remove('active');
      document.getElementById('admin-page').classList.remove('active');
      document.getElementById('dev-page').classList.add('active');
      document.getElementById('dev-page').scrollTop = 0;

      const email = session.user.email;
      const namePart = email.split('@')[0];
      document.getElementById('dev-welcome-name').textContent = namePart;

      // Bu developer'ın uygulamalarını yükle
      const { data: apps } = await supa.from('app_meta').select('*').eq('owner_email', email);

      const formEl = document.getElementById('dev-edit-form');
      const noAppEl = document.getElementById('dev-no-app');
      const selectorEl = document.getElementById('dev-app-selector');
      const selectEl = document.getElementById('dev-app-select');

      if (!apps || !apps.length) {
        formEl.style.display = 'none';
        noAppEl.style.display = 'block';
        selectorEl.style.display = 'none';
        return;
      }

      noAppEl.style.display = 'none';
      formEl.style.display = 'block';

      if (apps.length > 1) {
        selectorEl.style.display = 'block';
        selectEl.innerHTML = apps.map(a => `<option value="${a.app_id}">${a.name || a.app_id}</option>`).join('');
      } else {
        selectorEl.style.display = 'none';
      }

      loadDevApp(apps[0].app_id);
    }

    async function loadDevApp(appId) {
      const { data } = await supa.from('app_meta').select('*').eq('app_id', appId).maybeSingle();
      if (!data) return;

      document.getElementById('dev-app-id-display').value = data.app_id;
      document.getElementById('dev-dl-url-display').value = data.download_url || '(Admin tarafından belirlenir)';
      document.getElementById('dev-name').value = data.name || '';
      document.getElementById('dev-icon').value = data.icon || '';
      document.getElementById('dev-version').value = data.version || '';
      document.getElementById('dev-changelog').value = data.changelog || '';
      document.getElementById('dev-description').value = data.description || '';
      document.getElementById('dev-filesize').value = data.filesize || '';

      // Tags
      document.getElementById('dev-tag-game').checked = data.category === 'game';
      document.getElementById('dev-tag-app').checked = data.category === 'app';
      document.getElementById('dev-tag-windows').checked = !!data.is_windows;
      document.getElementById('dev-tag-force').checked = !!data.force_update;
      document.getElementById('dev-tag-guestsafe').checked = !!data.guest_safe;
      document.getElementById('dev-tag-vip').checked = !!data.is_vip;

      // Screenshots array → textarea'ya satır satır
      const ssField = document.getElementById('dev-screenshots');
      if (data.screenshots && Array.isArray(data.screenshots)) {
        ssField.value = data.screenshots.join('\n');
      } else {
        ssField.value = '';
      }

      document.getElementById('dev-save-btn').dataset.appId = appId;
      document.getElementById('dev-save-status').textContent = '';
    }

    async function saveDevApp() {
      const btn = document.getElementById('dev-save-btn');
      const status = document.getElementById('dev-save-status');
      const appId = btn.dataset.appId;
      if (!appId) return;

      btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...';
      status.textContent = '';

      const screenshotsRaw = document.getElementById('dev-screenshots').value.trim();
      const screenshots = screenshotsRaw ? screenshotsRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

      const isGame = document.getElementById('dev-tag-game').checked;
      const isApp = document.getElementById('dev-tag-app').checked;
      const hasWindows = document.getElementById('dev-tag-windows').checked;
      const hasForce = document.getElementById('dev-tag-force').checked;
      const hasGuest = document.getElementById('dev-tag-guestsafe').checked;
      const hasVip = document.getElementById('dev-tag-vip').checked;

      const category = isGame ? 'game' : (isApp ? 'app' : null);

      const updates = {
        name: document.getElementById('dev-name').value.trim(),
        icon: document.getElementById('dev-icon').value.trim(),
        version: document.getElementById('dev-version').value.trim(),
        changelog: document.getElementById('dev-changelog').value.trim(),
        filesize: document.getElementById('dev-filesize').value.trim(),
        description: document.getElementById('dev-description').value.trim(),
        screenshots: screenshots,
        category,
        is_windows: hasWindows,
        force_update: hasForce,
        guest_safe: hasGuest,
        is_vip: hasVip,
        updated_at: new Date().toISOString()
        // download_url ve owner_email kasıtlı olarak burada YOK
      };

      const { data: { session } } = await supa.auth.getSession();
      const { error } = await supa.from('app_meta')
        .update(updates)
        .eq('app_id', appId)
        .eq('owner_email', session.user.email); // ekstra güvenlik

      if (error) {
        status.textContent = '❌ ' + error.message;
        status.style.color = 'var(--accent2)';
        btn.disabled = false; btn.textContent = '💾 Kaydet';
        return;
      }

      status.textContent = '✅ Kaydedildi!';
      status.style.color = 'var(--green)';
      btn.textContent = '✅ Kaydedildi';

      // Lokal cache güncelle
      if (appExtras[appId]) {
        appExtras[appId].description = updates.description;
        appExtras[appId].screenshots = screenshots;
        appExtras[appId].filesize = updates.filesize;
        appExtras[appId].platform = hasWindows ? 'windows' : undefined;
        appExtras[appId].guest_safe = hasGuest;
      }
      if (allApps[appId]) {
        allApps[appId].version = updates.version;
        allApps[appId].changelog = updates.changelog;
        allApps[appId].icon = updates.icon;
        allApps[appId].category = category;
        allApps[appId].force_update = hasForce;
        allApps[appId].is_vip = hasVip;
      }

      setTimeout(() => { btn.disabled = false; btn.textContent = '💾 Kaydet'; }, 2000);
    }

    // ─── Admin: Developer Listesi ───
    async function loadDeveloperList() {
      const el = document.getElementById('dev-list');
      el.innerHTML = '<div class="admin-empty">Yükleniyor...</div>';

      const { data: devs } = await supa.from('user_presence')
        .select('email, nickname, is_developer, is_online, last_seen')
        .eq('is_developer', true)
        .order('email', { ascending: true });

      if (!devs || !devs.length) {
        el.innerHTML = '<div class="admin-empty">Henüz hiç developer yok.</div>';
        return;
      }

      // Her developer'ın uygulamalarını da çek
      const emails = devs.map(d => d.email);
      const { data: devApps } = await supa.from('app_meta')
        .select('app_id, name, owner_email')
        .in('owner_email', emails);

      el.innerHTML = devs.map(dev => {
        const apps = (devApps || []).filter(a => a.owner_email === dev.email);
        const appBadges = apps.map(a => `<span style="background:rgba(124,92,252,0.12);color:var(--accent);border-radius:7px;padding:2px 10px;font-size:0.72rem;font-weight:600">${a.name || a.app_id}</span>`).join(' ');
        const initial = (dev.nickname || dev.email)[0].toUpperCase();
        const isOnline = dev.is_online;

        return `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2ab574);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;font-family:Syne,sans-serif;flex-shrink:0">${initial}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:0.9rem;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px">
              ${dev.email}
              <span style="width:8px;height:8px;border-radius:50%;background:${isOnline ? 'var(--green)' : 'var(--muted)'};display:inline-block;flex-shrink:0"></span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${appBadges || '<span style="font-size:0.75rem;color:var(--muted)">Uygulama yok</span>'}</div>
          </div>
          <button data-action="revoke-dev" data-email="${dev.email}" style="background:rgba(252,92,125,0.1);border:1px solid rgba(252,92,125,0.25);color:var(--accent2);border-radius:9px;padding:7px 16px;font-family:DM Sans,sans-serif;font-size:0.8rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s">🚫 Yetkiyi Al</button>
        </div>`;
      }).join('');
    }

    // ─── Admin: Developer kullanıcı arama (dropdown) ───
    async function searchDevUser() {
      const query = document.getElementById('dev-user-search').value.trim().toLowerCase();
      const dropdown = document.getElementById('dev-user-dropdown');
      if (query.length < 2) { dropdown.style.display = 'none'; return; }

      if (!_devUserSearchCache.length) {
        const { data } = await supa.from('user_presence').select('email, nickname').eq('is_banned', false).eq('is_dead', false);
        _devUserSearchCache = data || [];
      }

      const filtered = _devUserSearchCache.filter(u =>
        u.email && u.email.toLowerCase().includes(query)
      ).slice(0, 8);

      if (!filtered.length) { dropdown.style.display = 'none'; return; }

      dropdown.style.display = 'block';
      dropdown.innerHTML = filtered.map(u => `
        <div class="dev-user-option" data-action="select-dev-user" data-email="${u.email}" style="padding:10px 14px;cursor:pointer;font-size:0.88rem;border-bottom:1px solid var(--border);transition:background 0.15s">
          ${u.email} ${u.nickname ? `<span style="color:var(--muted);font-size:0.78rem">(${u.nickname})</span>` : ''}
        </div>`).join('');
    }

    function selectDevUser(email) {
      _selectedDevUserEmail = email;
      document.getElementById('dev-user-search').value = email;
      document.getElementById('dev-user-dropdown').style.display = 'none';
      document.getElementById('dev-selected-user').style.display = 'block';
      document.getElementById('dev-selected-user').textContent = '✓ Seçildi: ' + email;
      // Developer adını otomatik doldur
      if (!document.getElementById('new-dev-name').value) {
        document.getElementById('new-dev-name').value = email.split('@')[0];
      }
    }

    function openCreateDevModal() {
      _selectedDevUserEmail = null;
      _devUserSearchCache = [];
      document.getElementById('dev-user-search').value = '';
      document.getElementById('dev-user-dropdown').style.display = 'none';
      document.getElementById('dev-selected-user').style.display = 'none';
      document.getElementById('new-app-id').value = '';
      document.getElementById('new-app-name').value = '';
      document.getElementById('new-app-version').value = '1.0.0';
      document.getElementById('new-app-dlurl').value = '';
      document.getElementById('new-dev-name').value = '';
      document.getElementById('create-dev-status').textContent = '';
      document.getElementById('create-dev-btn').disabled = false;
      document.getElementById('create-dev-btn').textContent = '✅ Oluştur & Yetki Ver';
      document.getElementById('create-dev-modal').style.display = 'flex';
    }

    function closeCreateDevModal() {
      document.getElementById('create-dev-modal').style.display = 'none';
    }

    async function createDeveloper() {
      const btn = document.getElementById('create-dev-btn');
      const status = document.getElementById('create-dev-status');

      if (!_selectedDevUserEmail) {
        status.textContent = '⚠️ Bir kullanıcı seç!';
        status.style.color = 'var(--accent2)'; return;
      }
      const appId = document.getElementById('new-app-id').value.trim();
      const appName = document.getElementById('new-app-name').value.trim();
      const dlUrl = document.getElementById('new-app-dlurl').value.trim();
      const devName = document.getElementById('new-dev-name').value.trim() || _selectedDevUserEmail.split('@')[0];

      if (!appId || !appName || !dlUrl) {
        status.textContent = '⚠️ Uygulama ID, adı ve indirme linki zorunlu!';
        status.style.color = 'var(--accent2)'; return;
      }

      btn.disabled = true; btn.textContent = '⏳ İşleniyor...';
      status.textContent = '';

      try {
        // 1) app_meta'ya yeni uygulama ekle
        const { error: appErr } = await supa.from('app_meta').insert({
          app_id: appId,
          name: appName,
          category: document.getElementById('new-app-category').value,
          version: document.getElementById('new-app-version').value.trim() || '1.0.0',
          min_version: '1.0.0',
          developer: devName,
          download_url: dlUrl,
          owner_email: _selectedDevUserEmail,
          changelog: 'İlk sürüm.',
          description: appName + ' uygulaması.',
          is_windows: false,
          force_update: false,
          guest_safe: false,
          updated_at: new Date().toISOString()
        });

        if (appErr) {
          if (appErr.code === '23505') {
            status.textContent = '❌ Bu uygulama ID zaten var!';
          } else {
            status.textContent = '❌ ' + appErr.message;
          }
          status.style.color = 'var(--accent2)';
          btn.disabled = false; btn.textContent = '✅ Oluştur & Yetki Ver';
          return;
        }

        // 2) Kullanıcıya developer yetkisi ver
        const { error: presErr } = await supa.from('user_presence')
          .update({ is_developer: true })
          .eq('email', _selectedDevUserEmail);

        if (presErr) console.warn('Developer flag set error:', presErr);

        status.textContent = '✅ Developer oluşturuldu!';
        status.style.color = 'var(--green)';
        btn.textContent = '✅ Tamamlandı';

        setTimeout(() => {
          closeCreateDevModal();
          loadDeveloperList();
          loadApps(); // ana sayfayı güncelle
        }, 1500);

      } catch (e) {
        status.textContent = '❌ Hata: ' + e.message;
        status.style.color = 'var(--accent2)';
        btn.disabled = false; btn.textContent = '✅ Oluştur & Yetki Ver';
      }
    }

    async function revokeDevAccess(email) {
      if (!confirm(email + ' kullanıcısının developer yetkisini almak istediğinden emin misin?')) return;
      const { error } = await supa.from('user_presence').update({ is_developer: false }).eq('email', email);
      if (error) { alert('Hata: ' + error.message); return; }
      loadDeveloperList();
    }

    // ════════════════════════════════════════════════
    //  UYGULAMA YÖNETİCİSİ (ADMİN)
    // ════════════════════════════════════════════════
    let _editingAppId = null;

    async function loadAppManager() {
      const el = document.getElementById('app-manager-list');
      el.innerHTML = '<div class="admin-empty">Yükleniyor...</div>';

      const { data, error } = await supa.from('app_meta').select('*').order('app_id', { ascending: true });
      if (error || !data || !data.length) {
        el.innerHTML = '<div class="admin-empty">Henüz uygulama verisi yok. Supabase\'e seed yapman gerekiyor.</div>';
        return;
      }

      el.innerHTML = data.map(app => {
        const tags = [];
        if (app.category === 'game') tags.push('<span class="badge badge-game">🎮 Oyun</span>');
        else tags.push('<span class="badge badge-app">📱 Uygulama</span>');
        if (app.is_windows) tags.push('<span class="badge badge-windows">🖥️ Windows</span>');
        if (app.force_update) tags.push('<span class="badge badge-force">⚠️ Zorunlu</span>');
        if (app.guest_safe) tags.push('<span class="badge badge-guestsafe">🔓 Oturumsuz</span>');

        return `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:200px">
            <div style="font-size:2rem;width:52px;height:52px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${app.icon && app.icon.startsWith('http') ? '<img src="'+app.icon+'" style="width:100%;height:100%;object-fit:cover;border-radius:11px;">' : (app.icon || '📦')}</div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;margin-bottom:4px">${app.name || app.app_id}</div>
              <div style="font-size:0.75rem;color:var(--muted);margin-bottom:8px;font-family:monospace">${app.app_id} · v${app.version || '?'} · min v${app.min_version || '?'}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap">${tags.join('')}</div>
            </div>
          </div>
          <button data-action="edit-app" data-app-id="${app.app_id}" style="background:linear-gradient(135deg,var(--accent),#9b7eff);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-family:DM Sans,sans-serif;font-size:0.85rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:all 0.2s">✏️ Düzenle</button>
        </div>`;
      }).join('');
    }

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('dev-app-select')?.addEventListener('change', (e) => {
        const appId = e.target.value;
        if (appId) loadDevApp(appId);
      });
      document.getElementById('dev-save-btn')?.addEventListener('click', saveDevApp);

      // Oyun/Uygulama checkbox'ları — yalnızca biri seçilebilir
      document.getElementById('dev-tag-game')?.addEventListener('change', function () {
        if (this.checked) document.getElementById('dev-tag-app').checked = false;
      });
      document.getElementById('dev-tag-app')?.addEventListener('change', function () {
        if (this.checked) document.getElementById('dev-tag-game').checked = false;
      });

      document.getElementById('open-create-dev-btn')?.addEventListener('click', openCreateDevModal);
      document.getElementById('close-create-dev-btn')?.addEventListener('click', closeCreateDevModal);
      document.getElementById('create-dev-btn')?.addEventListener('click', createDeveloper);

      document.getElementById('dev-user-search')?.addEventListener('input', searchDevUser);

      document.getElementById('dev-user-dropdown')?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-action="select-dev-user"]');
        if (!item) return;
        selectDevUser(item.dataset.email);
      });

      document.getElementById('dev-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="revoke-dev"]');
        if (!btn) return;
        revokeDevAccess(btn.dataset.email);
      });

      document.getElementById('app-manager-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="edit-app"]');
        if (!btn) return;
        openAppEditModal(btn.dataset.appId);
      });

      document.getElementById('app-edit-save-btn')?.addEventListener('click', saveAppEdits);
      document.getElementById('app-edit-cancel-btn')?.addEventListener('click', closeAppEditModal);

      document.getElementById('create-dev-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('create-dev-modal')) closeCreateDevModal();
      });
      document.getElementById('app-edit-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('app-edit-modal')) closeAppEditModal();
      });
    });

    async function openAppEditModal(appId) {
      _editingAppId = appId;
      const { data, error } = await supa.from('app_meta').select('*').eq('app_id', appId).maybeSingle();
      if (error || !data) { alert('Uygulama verisi alınamadı.'); return; }

      document.getElementById('app-edit-id-display').textContent = 'ID: ' + appId;
      document.getElementById('tag-game').checked = data.category === 'game';
      document.getElementById('tag-app').checked = data.category === 'app';
      document.getElementById('tag-windows').checked = !!data.is_windows;
      document.getElementById('tag-force').checked = !!data.force_update;
      document.getElementById('tag-guestsafe').checked = !!data.guest_safe;
      document.getElementById('tag-vip').checked = !!data.is_vip;
      document.getElementById('edit-version').value = data.version || '';
      document.getElementById('edit-min-version').value = data.min_version || '';
      document.getElementById('edit-developer').value = data.developer || '';
      document.getElementById('edit-filesize').value = data.filesize || '';
      document.getElementById('edit-changelog').value = data.changelog || '';
      document.getElementById('edit-description').value = data.description || '';
      document.getElementById('app-edit-status').textContent = '';
      document.getElementById('app-edit-save-btn').disabled = false;
      document.getElementById('app-edit-save-btn').textContent = '💾 Kaydet';

      const modal = document.getElementById('app-edit-modal');
      modal.style.display = 'flex';
      setTimeout(() => modal.querySelector('div').style.animation = 'slideUp 0.3s ease both', 10);
    }

    function closeAppEditModal() {
      document.getElementById('app-edit-modal').style.display = 'none';
      _editingAppId = null;
    }

    async function saveAppEdits() {
      if (!_editingAppId) return;
      const btn = document.getElementById('app-edit-save-btn');
      const status = document.getElementById('app-edit-status');
      btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...';
      status.textContent = '';

      const isGame = document.getElementById('tag-game').checked;
      const isApp = document.getElementById('tag-app').checked;
      const category = isGame ? 'game' : (isApp ? 'app' : null);

      const updates = {
        category,
        is_windows: document.getElementById('tag-windows').checked,
        force_update: document.getElementById('tag-force').checked,
        guest_safe: document.getElementById('tag-guestsafe').checked,
        is_vip: document.getElementById('tag-vip').checked,
        version: document.getElementById('edit-version').value.trim(),
        min_version: document.getElementById('edit-min-version').value.trim(),
        developer: document.getElementById('edit-developer').value.trim(),
        filesize: document.getElementById('edit-filesize').value.trim(),
        changelog: document.getElementById('edit-changelog').value.trim(),
        description: document.getElementById('edit-description').value.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supa.from('app_meta').update(updates).eq('app_id', _editingAppId);

      if (error) {
        status.textContent = '❌ Hata: ' + error.message;
        status.style.color = 'var(--accent2)';
        btn.disabled = false; btn.textContent = '💾 Kaydet';
        return;
      }

      status.textContent = '✅ Kaydedildi!';
      status.style.color = 'var(--green)';
      btn.textContent = '✅ Kaydedildi';

      // Lokal cache'i de güncelle
      if (allApps[_editingAppId]) {
        allApps[_editingAppId].version = updates.version;
        allApps[_editingAppId].min_version = updates.min_version;
        allApps[_editingAppId].force_update = updates.force_update;
        allApps[_editingAppId].is_vip = updates.is_vip;
        allApps[_editingAppId].changelog = updates.changelog;
      }
      if (appExtras[_editingAppId]) {
        appExtras[_editingAppId].developer = updates.developer;
        appExtras[_editingAppId].description = updates.description;
        appExtras[_editingAppId].platform = updates.is_windows ? 'windows' : undefined;
        appExtras[_editingAppId].guest_safe = updates.guest_safe;
        appExtras[_editingAppId].filesize = updates.filesize || undefined;
      } else {
        appExtras[_editingAppId] = {
          developer: updates.developer,
          description: updates.description,
          platform: updates.is_windows ? 'windows' : undefined,
          guest_safe: updates.guest_safe,
          filesize: updates.filesize || undefined
        };
      }

      setTimeout(() => {
        closeAppEditModal();
        loadAppManager();
        renderGrid(currentFilter);
      }, 1200);
    }

    // ════════════════════════════════════════════════
    //  UYGULAMA LİSTESİ
    // ════════════════════════════════════════════════
