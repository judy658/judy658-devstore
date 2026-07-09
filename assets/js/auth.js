    async function checkSession() {
      const { data: { session } } = await supa.auth.getSession();
      if (session) showUserLoggedIn(session.user.email);
      else showUserLoggedOut();
    }

    supa.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) { showUserLoggedIn(session.user.email); closeAuth(); }
      else if (event === 'PASSWORD_RECOVERY') { _showNewPasswordPanel(); }
      else if (event === 'SIGNED_OUT') { showUserLoggedOut(); }
    });

    // ════════════════════════════════════════════════
    //  AUTH FONKSİYONLARI
    // ════════════════════════════════════════════════
    function openAuth() { document.getElementById('auth-overlay').classList.add('open'); }
    function closeAuth() {
      document.getElementById('auth-overlay').classList.remove('open');
      document.getElementById('auth-msg').className = 'auth-msg';
      document.getElementById('auth-msg').textContent = '';
    }
    function handleOverlayClick(e) { if (e.target === document.getElementById('auth-overlay')) closeAuth(); }
    function switchTab(tab) {
      document.querySelectorAll('.auth-tab').forEach((t, i) => t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1)));
      document.getElementById('auth-login').style.display = tab === 'login' ? 'block' : 'none';
      document.getElementById('auth-register').style.display = tab === 'register' ? 'block' : 'none';
      document.getElementById('auth-msg').className = 'auth-msg';
    }
    function showMsg(msg, type) { const el = document.getElementById('auth-msg'); el.textContent = msg; el.className = 'auth-msg ' + type; }

    async function doLogin() {
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value;
      if (!email || !pass) return showMsg('E-posta ve şifre gir!', 'error');
      const btn = document.querySelector('#auth-login .auth-submit');
      btn.disabled = true; btn.textContent = 'Giriş yapılıyor...';

      const { error } = await supa.auth.signInWithPassword({ email, password: pass });

      if (error) {
        btn.disabled = false; btn.textContent = 'Giriş Yap';
        return showMsg('Hata: ' + error.message, 'error');
      }

      // Yasaklı kullanıcı kontrolü
      const { data: presence } = await supa.from('user_presence').select('is_banned').eq('email', email).maybeSingle();
      if (presence && presence.is_banned) {
        await supa.auth.signOut();
        btn.disabled = false; btn.textContent = 'Giriş Yap';
        return showMsg('Hesabınız kalıcı olarak yasaklanmıştır! 🚫', 'error');
      }

      btn.disabled = false; btn.textContent = 'Giriş Yap';
      showMsg('Giriş başarılı! ✓', 'success');
      showUserLoggedIn(email);
      setTimeout(closeAuth, 1200);
    }

    async function doRegister() {
      const email = document.getElementById('reg-email').value.trim();
      const pass = document.getElementById('reg-pass').value;
      const pass2 = document.getElementById('reg-pass2').value;
      if (!email || !pass) return showMsg('Tüm alanları doldur!', 'error');
      if (pass !== pass2) return showMsg('Şifreler eşleşmiyor!', 'error');
      if (pass.length < 6) return showMsg('Şifre en az 6 karakter olmalı!', 'error');
      const btn = document.querySelector('#reg-step1 .auth-submit');
      btn.disabled = true; btn.textContent = 'Gönderiliyor...';
      const { error } = await supa.auth.signUp({ email, password: pass, options: { emailRedirectTo: null } });
      btn.disabled = false; btn.textContent = 'Kod Gönder 📧';
      if (error) return showMsg('Hata: ' + error.message, 'error');
      document.getElementById('reg-step1').style.display = 'none';
      document.getElementById('reg-step2').style.display = 'block';
      document.getElementById('auth-msg').className = 'auth-msg';
      showMsg('Kod e-postana gönderildi!', 'success');
    }

    async function verifyOTP() {
      const email = document.getElementById('reg-email').value.trim();
      const token = document.getElementById('reg-otp').value.trim();
      if (token.length < 6) return showMsg('6 haneli kodu gir!', 'error');
      const btn = document.querySelector('#reg-step2 .auth-submit');
      btn.disabled = true; btn.textContent = 'Doğrulanıyor...';
      const { error } = await supa.auth.verifyOtp({ email, token, type: 'signup' });
      btn.disabled = false; btn.textContent = 'Hesabı Onayla ✓';
      if (error) return showMsg('Hata: ' + error.message, 'error');
      showMsg('Hesap doğrulandı! ✓', 'success');
      const { data: { session } } = await supa.auth.getSession();
      if (session) { showUserLoggedIn(session.user.email); setTimeout(closeAuth, 1200); }
    }

    function backToReg() {
      document.getElementById('reg-step1').style.display = 'block';
      document.getElementById('reg-step2').style.display = 'none';
      document.getElementById('auth-msg').className = 'auth-msg';
    }

    async function doSignOut() { await supa.auth.signOut(); showUserLoggedOut(); showHome(); }

    async function sendPasswordReset() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { openAuth(); return; }
      const btn = document.getElementById('pass-reset-btn');
      const msg = document.getElementById('pass-msg');
      msg.className = 'profile-msg'; msg.textContent = '';
      btn.disabled = true; btn.textContent = 'Gönderiliyor...';
      const { error } = await supa.auth.resetPasswordForEmail(session.user.email, { redirectTo: window.location.href });
      btn.disabled = false; btn.textContent = '📧 Sıfırlama Maili Gönder';
      if (error) { msg.textContent = 'Hata: ' + error.message; msg.className = 'profile-msg error'; }
      else { msg.textContent = 'Mail gönderildi! ✓'; msg.className = 'profile-msg success'; setTimeout(() => { msg.className = 'profile-msg'; msg.textContent = ''; }, 5000); }
    }

    function _showNewPasswordPanel() {
      if (document.getElementById('new-pass-overlay')) return;
      const o = document.createElement('div');
      o.id = 'new-pass-overlay';
      o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:600;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px)';
      o.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:40px;width:100%;max-width:420px;margin:20px">
    <div style="text-align:center;font-size:2rem;margin-bottom:16px">🔒</div>
    <div style="font-family:Syne,sans-serif;font-size:1.4rem;font-weight:800;text-align:center;margin-bottom:24px">Yeni Şifre</div>
    <div style="margin-bottom:14px"><label style="display:block;font-size:0.8rem;color:var(--muted);margin-bottom:6px;font-weight:500">Yeni Şifre</label>
    <input type="password" id="new-pass-input" placeholder="En az 6 karakter" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-family:DM Sans,sans-serif;font-size:0.9rem;outline:none;box-sizing:border-box"/></div>
    <div style="margin-bottom:20px"><label style="display:block;font-size:0.8rem;color:var(--muted);margin-bottom:6px;font-weight:500">Şifre Tekrar</label>
    <input type="password" id="new-pass-input2" placeholder="••••••••" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;color:var(--text);font-family:DM Sans,sans-serif;font-size:0.9rem;outline:none;box-sizing:border-box"/></div>
    <div id="new-pass-msg" style="text-align:center;font-size:0.82rem;margin-bottom:12px;min-height:20px"></div>
    <button id="new-pass-btn" style="width:100%;background:linear-gradient(135deg,var(--accent),#9b7eff);color:#fff;border:none;border-radius:12px;padding:13px;font-family:DM Sans,sans-serif;font-size:0.95rem;font-weight:600;cursor:pointer">Şifreyi Kaydet</button>
  </div>`;
      document.body.appendChild(o);
      document.getElementById('new-pass-btn')?.addEventListener('click', _submitNewPassword);
    }

    async function _submitNewPassword() {
      const pass = document.getElementById('new-pass-input').value;
      const pass2 = document.getElementById('new-pass-input2').value;
      const btn = document.getElementById('new-pass-btn');
      const msg = document.getElementById('new-pass-msg');
      msg.style.color = 'var(--accent2)';
      if (!pass || pass.length < 6) { msg.textContent = 'Şifre en az 6 karakter olmalı!'; return; }
      if (pass !== pass2) { msg.textContent = 'Şifreler eşleşmiyor!'; return; }
      btn.disabled = true; btn.textContent = 'Kaydediliyor...';
      const { error } = await supa.auth.updateUser({ password: pass });
      btn.disabled = false; btn.textContent = 'Şifreyi Kaydet';
      if (error) { msg.textContent = 'Hata: ' + error.message; }
      else { msg.style.color = 'var(--green)'; msg.textContent = 'Şifre güncellendi ✓'; setTimeout(() => document.getElementById('new-pass-overlay')?.remove(), 1500); }
    }

    // ════════════════════════════════════════════════
    //  PRESENCE
    // ════════════════════════════════════════════════
    async function startPresence() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) return;
      const uid = session.user.id, email = session.user.email;
      await _pingPresence(uid, email, true); // İlk ping: isInitial = true
      if (_presenceTimer) clearInterval(_presenceTimer);
      _presenceTimer = setInterval(() => _pingPresence(uid, email, false), 30000);
      window.addEventListener('beforeunload', () => _setOffline(uid));
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) _pingPresence(uid, email);
        // Sekme gizlendiğinde hemen offline yapma (Smart Tracker zaten 90sn sonra halledecek)
      });
    }
    async function _pingPresence(uid, email, isInitial = false) {
      // Ban ve Mevcut Bilgi Kontrolü
      const { data: presence } = await supa.from('user_presence').select('is_banned, first_device').eq('email', email).maybeSingle();

      if (presence && presence.is_banned === true) {
        console.log('[Presence] Hesap banlı. Oturum kapatılıyor...');
        alert('Hesabınız sistemden kalıcı olarak yasaklanmıştır. 🚫');
        doSignOut();
        return;
      }

      // Eğer ilk ping değilse ve kayıt hiç yoksa (silinmişse) çıkış yap
      if (!isInitial && !presence) {
        doSignOut();
        return;
      }

      const deviceName = _getDeviceName();
      const upsertData = {
        user_id: uid,
        email,
        last_seen: new Date().toISOString(),
        is_online: true,
        is_dead: false,
        current_app: 'devstore',
        last_device: deviceName
      };

      // Eğer ilk cihaz bilgisi yoksa (yeni kullanıcı veya eski kayıt), doldur
      if (!presence || !presence.first_device) {
        upsertData.first_device = deviceName;
      }

      // Sadece ilk cihaz dolmuyorsa, created_at de ekleyelim
      if (!presence) {
        upsertData.created_at = new Date().toISOString();
      }

      await supa.from('user_presence').upsert(upsertData, { onConflict: 'email' });
    }

    function _getDeviceName() {
      const ua = navigator.userAgent;
      if (/Android/i.test(ua)) return "📱 Android";
      if (/iPhone|iPad|iPod/i.test(ua)) return "🍎 iOS Device";
      if (/Windows/i.test(ua)) return "💻 Windows PC";
      if (/Macintosh/i.test(ua)) return "🍎 Mac";
      if (/Linux/i.test(ua)) return "🐧 Linux PC";
      return "🌐 Web Tarayıcı";
    }
    async function _setOffline(uid) {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) return;
      await supa.from('user_presence').update({ is_online: false, last_seen: new Date().toISOString() }).eq('email', session.user.email);
    }
    function stopPresence() { if (_presenceTimer) { clearInterval(_presenceTimer); _presenceTimer = null; } }

    // ════════════════════════════════════════════════
    //  İLETİŞİM FORMU
    // ════════════════════════════════════════════════
    async function checkContactAuth() {
      const { data: { session } } = await supa.auth.getSession();
      const note = document.getElementById('contact-login-note');
      const form = document.getElementById('contact-form-inner');
      if (!note || !form) return;
      if (session) { note.style.display = 'none'; form.style.display = 'block'; }
      else { note.style.display = 'block'; form.style.display = 'none'; }
    }
    async function sendContact() {
      const { data: { session } } = await supa.auth.getSession();
      if (!session) { openAuth(); return; }
      const name = document.getElementById('c-name').value.trim();
      const subject = document.getElementById('c-subject').value;
      const message = document.getElementById('c-message').value.trim();
      if (!name || !message) { alert('Lütfen ad soyad ve mesaj alanlarını doldur!'); return; }
      const btn = document.getElementById('contact-btn');
      btn.disabled = true; btn.textContent = 'Gönderiliyor...';
      try {
        await Promise.all([
          fetch('https://formspree.io/f/xnjgjwqd', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ name, email: session.user.email, subject, message }) }),
          supa.from('contact_messages').insert({ name, email: session.user.email, type: subject, message, created_at: new Date().toISOString() })
        ]);
        document.getElementById('contact-success').style.display = 'block';
        document.getElementById('c-name').value = ''; document.getElementById('c-message').value = '';
        btn.textContent = '✅ Gönderildi';
      } catch (e) { alert('Bağlantı hatası!'); btn.disabled = false; btn.textContent = '📨 Gönder'; }
    }

    // ════════════════════════════════════════════════
    //  ADMİN PANELİ
    // ════════════════════════════════════════════════
    // ════════════════════════════════════════════════
    //  BİLDİRİM SİSTEMİ
    // ════════════════════════════════════════════════
    let _notifTag = '🆕 Yeni Uygulama';
    let _notifRecipients = 'all';

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('auth-overlay')?.addEventListener('click', handleOverlayClick);
      document.querySelectorAll('.auth-tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
      document.getElementById('auth-login-btn')?.addEventListener('click', doLogin);
      document.getElementById('auth-register-btn')?.addEventListener('click', doRegister);
      document.getElementById('auth-verify-btn')?.addEventListener('click', verifyOTP);
      document.getElementById('auth-back-btn')?.addEventListener('click', backToReg);
      document.getElementById('contact-btn')?.addEventListener('click', sendContact);
    });

