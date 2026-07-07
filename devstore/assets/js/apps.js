    async function loadApps() {
      try {
        const res = await fetch('https://raw.githubusercontent.com/judy658/judy658-devstore/main/versions.json?v=' + Date.now());
        if (res.ok) { 
          const data = await res.json(); 
          allApps = data.apps || {}; 
        } else {
          const localRes = await fetch('versions.json');
          if (localRes.ok) {
            const localData = await localRes.json();
            allApps = localData.apps || {};
          }
        }
      } catch (e) { console.error("LoadApps Error:", e); }

      // Supabase app_meta'dan ekstra verileri çek ve birleştir
      try {
        const { data: metaRows } = await supa.from('app_meta').select('*');
        if (metaRows && metaRows.length) {
          metaRows.forEach(meta => {
            const id = meta.app_id;
            // allApps'e force_update, category override vs. uygula
            if (allApps[id]) {
              if (meta.force_update !== null && meta.force_update !== undefined) allApps[id].force_update = meta.force_update;
              if (meta.category) allApps[id].category = meta.category;
              if (meta.version) allApps[id].version = meta.version;
              if (meta.min_version) allApps[id].min_version = meta.min_version;
              if (meta.changelog) allApps[id].changelog = meta.changelog;
            }
            // appExtras'ı Supabase verisiyle güncelle (hardcode'un önüne geç)
            if (!appExtras[id]) appExtras[id] = {};
            if (meta.developer) appExtras[id].developer = meta.developer;
            if (meta.description) appExtras[id].description = meta.description;
            if (meta.filesize) appExtras[id].filesize = meta.filesize;
            if (meta.guest_safe !== null && meta.guest_safe !== undefined) appExtras[id].guest_safe = meta.guest_safe;
            if (meta.screenshots && meta.screenshots.length) appExtras[id].screenshots = meta.screenshots;
            if (meta.is_windows !== null && meta.is_windows !== undefined) {
              appExtras[id].platform = meta.is_windows ? 'windows' : undefined;
            }
            // Eğer bu uygulama sadece Supabase'de var (versions.json'da yok) ekle
            if (!allApps[id] && meta.name) {
              allApps[id] = {
                name: meta.name,
                version: meta.version || '1.0.0',
                min_version: meta.min_version || '1.0.0',
                category: meta.category || 'app',
                force_update: !!meta.force_update,
                changelog: meta.changelog || '',
                download_url: meta.download_url || '#',
                icon: meta.icon || '📦'
              };
            }
          });
        }
      } catch (e) { console.warn("app_meta çekilemedi, hardcode kullanılıyor:", e); }

      updateStats(); 
      renderGrid(currentFilter);
    }

    function updateStats() {
      const list = Object.values(allApps);
      const totalEl = document.getElementById('s-total');
      if(totalEl) totalEl.textContent = list.length;
      const gameEl = document.getElementById('s-game');
      if(gameEl) gameEl.textContent = list.filter(a => a.category === 'game').length;
      const appEl = document.getElementById('s-app');
      if(appEl) appEl.textContent = list.filter(a => a.category === 'app').length;
      const forceEl = document.getElementById('s-force');
      if(forceEl) forceEl.textContent = list.filter(a => a.force_update).length;
    }

    function renderGrid(filter) {
      const grid = document.getElementById('app-grid');
      if (!grid) return;
      const entries = Object.entries(allApps).filter(([id, app]) => filter === 'all' ? true : filter === 'force' ? app.force_update : app.category === filter);
      if (!entries.length) { grid.innerHTML = `<div style="color:var(--muted);grid-column:1/-1;text-align:center;padding:48px 0">Bu filtrede uygulama yok.</div>`; return; }
      grid.innerHTML = entries.map(([id, app], i) => {
        const ex = appExtras[id] || {};
        const isVerifiedDev = ex.developer === 'judy658' || !ex.developer;
        return `
    <div class="app-card" data-app-id="${id}" style="animation-delay:${i * 0.07}s">
      ${isVerifiedDev ? `<div class="dev-verified-tick" title="judy658 tarafından geliştirildi"><svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>` : ''}
      <div class="card-header">
        <div class="app-icon">${app.image ? '<img src="' + app.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">' : (app.icon && app.icon.startsWith('http') ? '<img src="' + app.icon + '" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">' : (app.icon || '📦'))}</div>
        <div>
          <div class="app-name">${app.name}</div>
          <div class="app-version">Versiyon <span class="ver-num">v${app.version}</span></div>
          <div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge ${app.category === 'game' ? 'badge-game' : 'badge-app'}">${app.category === 'game' ? '🎮 Oyun' : '📱 Uygulama'}</span>
            ${app.force_update ? '<span class="badge badge-force">⚠️ Zorunlu</span>' : ''}
            ${ex.platform === 'windows' ? '<span class="badge badge-windows">🖥️ Sadece Windows</span>' : ''}
            ${ex.guest_safe ? '<span class="badge badge-guestsafe">🔓 Oturumsuz</span>' : ''}
          </div>
        </div>
      </div>
      <div class="card-changelog"><strong>Son Güncelleme</strong>${app.changelog}</div>
      <div class="card-footer">
        <button class="detail-btn">🔍 Detayları Gör</button>
        ${app.force_update ? `<span class="force-info">⚠️ Min: v${app.min_version}</span>` : `<span style="font-size:0.75rem;color:var(--muted)">Min: v${app.min_version}</span>`}
      </div>
    </div>`;
      }).join('');
    }

    function filterApps(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if(btn) btn.classList.add('active');
      renderGrid(filter);
    }

    async function copyUrl() {
      const apiUrl = document.getElementById('api-url-text')?.textContent?.trim();
      if (!apiUrl) return;

      try {
        await navigator.clipboard.writeText(apiUrl);
        alert('API linki kopyalandı.');
      } catch (err) {
        const temp = document.createElement('textarea');
        temp.value = apiUrl;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
        alert('API linki kopyalandı.');
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      const grid = document.getElementById('app-grid');
      grid?.addEventListener('click', (e) => {
        const card = e.target.closest('.app-card');
        if (!card) return;
        const id = card.dataset.appId;
        if (id && typeof showDetail === 'function') showDetail(id);
      });

      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterApps(btn.dataset.filter, btn));
      });

      document.getElementById('copy-api-btn')?.addEventListener('click', copyUrl);
    });

