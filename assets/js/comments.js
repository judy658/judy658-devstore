    async function loadComments(appId) {
      currentAppId = appId;
      try {
        const { data: { session } } = await supa.auth.getSession();
        currentUserId = session ? session.user.id : null;
        currentUserEmail = session ? session.user.email : null;
        const form = document.getElementById('comment-form');
        const note = document.getElementById('comment-login-note');
        const alreadyNote = document.getElementById('already-commented-note');
        
        const { data } = await supa.from('comments').select('*').eq('app_id', appId).order('created_at', { ascending: false });
        
        // Fetch Nicknames for all commenters
        const emails = [...new Set(data.map(c => c.email))];
        const { data: profiles } = await supa.from('user_presence').select('email, nickname').in('email', emails);
        const nickMap = {};
        if(profiles) profiles.forEach(p => { if(p.nickname) nickMap[p.email] = p.nickname; });

        const hasCommented = data && currentUserId && data.some(c => c.user_id === currentUserId);
        
        if(form) form.style.display = (session && !hasCommented) ? 'block' : 'none';
        if(note) note.style.display = session ? 'none' : 'block';
        if(alreadyNote) alreadyNote.style.display = hasCommented ? 'block' : 'none';
        
        const list = document.getElementById('comment-list');
        const countEl = document.getElementById('comment-count');
        if (!list) return;
        if (!data || !data.length) { 
          if(countEl) countEl.textContent = ''; 
          list.innerHTML = '<div class="no-comments">Henüz yorum yok. İlk yorumu sen yap! 🎉</div>'; 
          return; 
        }
        const avg = calcAvgRating(data);
        if(countEl) countEl.textContent = '(' + data.length + ' yorum' + (avg ? ' · ★ ' + avg : '') + ')';
        const avgEl = document.getElementById('d-avg-rating');
        if (avgEl) avgEl.textContent = avg ? '★ ' + avg : '—';
        const isAdmin = currentUserEmail === ADMIN_EMAIL;
        list.innerHTML = data.map(c => {
          const stars = '★'.repeat(c.rating || 0) + '☆'.repeat(5 - (c.rating || 0));
          const date = new Date(c.created_at).toLocaleDateString('tr-TR');
          const isOwn = currentUserId && c.user_id === currentUserId;
          
          const displayName = nickMap[c.email] || (c.email ? c.email.split('@')[0] : 'Misafir');
          const isVerified = c.email === ADMIN_EMAIL;
          const verifiedBadge = isVerified ? '<svg viewBox="0 0 24 24" style="width:14px;height:14px;fill:#00d2ff;margin-left:4px;vertical-align:middle"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM10 17l-5-5 1.4-1.4 3.6 3.6 7.6-7.6L19 8l-9 9z"></path></svg>' : '';
          
          const replyHtml = c.reply ? `
            <div style="margin-top:15px; padding:12px; background:rgba(100,100,255,0.05); border-left:3px solid var(--accent); border-radius:8px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <span style="font-size:0.8rem; font-weight:700; color:var(--accent);">👨‍💻 Geliştirici Yanıtı</span>
                ${isAdmin ? `<button data-action="delete-reply" data-comment-id="${c.id}" style="background:none; border:none; color:#ff4646; cursor:pointer; font-size:0.8rem;">🗑 Sil</button>` : ''}
              </div>
              <div style="font-size:0.85rem; color:var(--text); line-height:1.4;">${c.reply}</div>
            </div>` : '';
            
          const adminReplyBtn = (isAdmin && !c.reply) ? `<button data-action="post-reply" data-comment-id="${c.id}" style="padding:6px 12px; border-radius:6px; border:1px solid var(--accent); background:none; color:var(--accent); cursor:pointer; font-size:0.75rem;">💬 Yanıtla</button>` : '';
          const deleteBtn = (isAdmin || isOwn) ? `<button data-action="delete-comment" data-comment-id="${c.id}" style="padding:6px 12px; border-radius:6px; border:1px solid #ff4646; background:none; color:#ff4646; cursor:pointer; font-size:0.75rem;">🗑 Sil</button>` : '';
          
          return `
            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; margin-bottom:15px; position:relative; transition:all 0.3s hover; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg, var(--accent), var(--accent2)); display:flex; align-items:center; justify-content:center; color:white; font-weight:700; font-size:1.1rem;">${displayName[0].toUpperCase()}</div>
                  <div>
                    <div style="font-weight:700; font-size:0.95rem; color:var(--text);">${displayName}${verifiedBadge}</div>
                    <div style="color:var(--yellow); font-size:0.8rem; letter-spacing:1px;">${stars}</div>
                  </div>
                </div>
                <span style="font-size:0.75rem; color:var(--muted);">${date}</span>
              </div>
              <div style="font-size:0.9rem; color:var(--text); line-height:1.6; margin-bottom:15px; color:rgba(255,255,255,0.85);">${c.content}</div>
              ${replyHtml}
              <div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">
                ${adminReplyBtn}
                ${deleteBtn}
              </div>
            </div>`;
        }).join('');
      } catch (e) { console.warn("Yorumlar yüklenemedi."); }
    }

    async function submitComment(e) {
      if(e) e.preventDefault();
      const content = document.getElementById('comment-input').value.trim();
      const rating = parseInt(document.getElementById('comment-rating').value || "5");
      if (!content || !currentAppId || !currentUserId) return;

      // Duplicate Check
      const { data: existing } = await supa.from('comments').select('id').eq('app_id', currentAppId).eq('user_id', currentUserId).maybeSingle();
      if (existing) { alert('Bu uygulamaya zaten yorum yapmışsınız!'); return; }
      
      const btn = (e && e.target && e.target.tagName === 'BUTTON') ? e.target : document.querySelector('.comment-submit');
      if(btn) { btn.disabled = true; btn.textContent = '⏳ Gönderiliyor...'; }
      
      try {
        const { error } = await supa.from('comments').insert({
          app_id: currentAppId,
          user_id: currentUserId,
          email: currentUserEmail,
          content,
          rating
        });
        if (error) throw error;
        document.getElementById('comment-input').value = '';
        setRating(5); 
        loadComments(currentAppId);
      } catch (err) { alert('Hata: ' + err.message); }
      finally { 
        if(btn) { btn.disabled = false; btn.textContent = '🚀 Yorumu Yayınla'; }
      }
    }

    function setRating(n) {
      const input = document.getElementById('comment-rating');
      if(input) input.value = n;
      document.querySelectorAll('.star-select').forEach((s, i) => {
        s.style.color = i < n ? 'var(--yellow)' : 'var(--muted)';
      });
    }

    async function deleteComment(id) {
      if (!confirm('Bu yorumu silmek istediğine emin misin?')) return;
      await supa.from('comments').delete().eq('id', id);
      loadComments(currentAppId);
    }
    async function postReply(id) {
      const msg = prompt('Yanıtınızı yazın:');
      if (!msg) return;
      await supa.from('comments').update({ reply: msg }).eq('id', id);
      loadComments(currentAppId);
    }
    async function deleteReply(id) {
      if (!confirm('Yanıtı silmek istediğine emin misin?')) return;
      await supa.from('comments').update({ reply: null }).eq('id', id);
      loadComments(currentAppId);
    }

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('stars-row')?.addEventListener('click', (e) => {
        const star = e.target.closest('.star-select');
        if (!star) return;
        const n = Number(star.dataset.rating || '0');
        if (n) setRating(n);
      });

      document.getElementById('comment-submit-btn')?.addEventListener('click', submitComment);

      const input = document.getElementById('comment-input');
      const charEl = document.getElementById('comment-char');
      input?.addEventListener('input', () => {
        if (!charEl) return;
        charEl.textContent = `${input.value.length} / 500 Karakter`;
      });

      document.getElementById('comment-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.dataset.commentId;
        if (!id) return;

        if (btn.dataset.action === 'delete-comment') deleteComment(id);
        if (btn.dataset.action === 'post-reply') postReply(id);
        if (btn.dataset.action === 'delete-reply') deleteReply(id);
      });

      setRating(5);
    });
