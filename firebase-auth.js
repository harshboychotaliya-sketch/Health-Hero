// ═══════════════════════════════════════════════════════════════
// MedBuddy — firebase-auth.js (Clerk Edition)
// Real Auth: Google · Email+OTP · Phone OTP — powered by Clerk
// ═══════════════════════════════════════════════════════════════

const CLERK_PUBLISHABLE_KEY = "sk_test_Nt5NGClCQd78fxbM5n4CRn0BMMIUR3gp3x0b1xr7uM";

// ── Load Clerk SDK ────────────────────────────────────────────
(function loadClerk() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
  s.onload  = () => initClerk();
  s.onerror = () => { console.warn('Clerk failed — demo mode'); };
  document.head.appendChild(s);
})();

// ── State ─────────────────────────────────────────────────────
let clerk              = null;
let signUpRes          = null;
let signInRes          = null;
let phoneSignInRes     = null;
let currentUser        = null;

// ── Init ──────────────────────────────────────────────────────
async function initClerk() {
  try {
    clerk = new window.Clerk(CLERK_PUBLISHABLE_KEY);
    await clerk.load();
    if (clerk.user) {
      _onLoginSuccess(clerk.user); // already signed in
    }
    console.log('✅ Clerk ready');
  } catch (e) {
    console.warn('Clerk init error:', e.message);
  }
}

// ════════════════════════════════════════════════════════════
// PANEL NAV
// ════════════════════════════════════════════════════════════
function showPanel(id) {
  clearError();
  document.querySelectorAll('.lg-panel').forEach(p => {
    p.style.display = 'none'; p.style.animation = 'none';
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  void el.offsetWidth;
  el.style.animation = '';
}

// ════════════════════════════════════════════════════════════
// 1. GOOGLE
// ════════════════════════════════════════════════════════════
function loginGoogle() {
  if (!clerk) { _demoLogin('Google User'); return; }
  const btn = document.querySelector('.lg-social.google');
  _setBtnLoading(btn, 'Connecting to Google…');

  clerk.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: window.location.href,
    redirectUrlComplete: window.location.href,
  }).catch(err => {
    _resetGoogleBtn(btn);
    showError('Google sign-in failed. Please try again.');
  });
}

function _resetGoogleBtn(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg> Continue with Google`;
}

// ════════════════════════════════════════════════════════════
// 2. EMAIL + VERIFICATION OTP
// ════════════════════════════════════════════════════════════
function validateEmail() {
  const email = document.getElementById('inp-email').value.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const btn   = document.getElementById('email-next-btn');
  const pwf   = document.getElementById('pw-field');
  if (valid) { pwf.style.display = 'block'; btn.textContent = 'Continue'; }
  else       { pwf.style.display = 'none'; }
  btn.disabled = !valid;
}

async function emailNext() {
  if (!clerk) { _demoLogin('Email User'); return; }

  const email = document.getElementById('inp-email').value.trim();
  const pw    = document.getElementById('inp-pw').value;
  const btn   = document.getElementById('email-next-btn');
  clearError();

  if (!pw || pw.length < 8) { showError('Password must be at least 8 characters.'); return; }
  _setBtnLoading(btn, 'Please wait…');

  // ── Try sign-in first ──
  try {
    signInRes = await clerk.client.signIn.create({ identifier: email, password: pw });
    if (signInRes.status === 'complete') {
      await clerk.setActive({ session: signInRes.createdSessionId });
      _onLoginSuccess(clerk.user);
    } else {
      _resetBtn(btn, 'Continue');
      showError('Something went wrong. Please try again.');
    }
    return;
  } catch (e) {
    // Not found or wrong pw → try sign-up below
    if (!['form_identifier_not_found','form_password_incorrect',
          'form_password_validation_failed'].includes(e.errors?.[0]?.code)) {
      _resetBtn(btn, 'Continue');
      showError(e.errors?.[0]?.longMessage || e.errors?.[0]?.message || 'Sign-in failed.');
      return;
    }
  }

  // ── Try sign-up ──
  try {
    signUpRes = await clerk.client.signUp.create({ emailAddress: email, password: pw });
    await signUpRes.prepareEmailAddressVerification({ strategy: 'email_code' });
    _resetBtn(btn, 'Continue');
    _showEmailOTPScreen(email);
  } catch (e) {
    _resetBtn(btn, 'Continue');
    const msgs = {
      'form_identifier_exists':             'Account exists — check your password.',
      'form_password_pwned':                'This password is too common. Choose a stronger one.',
      'form_password_length_too_short':     'Password too short — minimum 8 characters.',
    };
    showError(msgs[e.errors?.[0]?.code] || e.errors?.[0]?.longMessage || 'Sign-up failed.');
  }
}

function _showEmailOTPScreen(email) {
  document.getElementById('panel-email').innerHTML = `
    <div style="text-align:center;padding:6px 0;">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#ede8f8,#dceef7);border-radius:14px;margin:0 auto 13px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;">📧</div>
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:600;color:#2e2640;margin-bottom:6px;">Check your inbox</h3>
      <p style="font-size:.81rem;color:#5a5070;line-height:1.6;margin-bottom:4px;">We sent a 6-digit code to<br><strong style="color:#7c6a9e;">${email}</strong></p>
      <p style="font-size:.75rem;color:#9990b0;margin-bottom:18px;">Enter it below to verify your email.</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;">
        <input class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="eOtpMove(this,0)" onkeydown="eOtpKey(event,0)" style="width:42px;aspect-ratio:1;text-align:center;border:1.5px solid rgba(176,157,207,.38);border-radius:11px;background:rgba(255,255,255,.9);font-size:1.2rem;font-weight:600;color:#7c6a9e;outline:none;font-family:DM Sans,sans-serif;"/>
        <input class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="eOtpMove(this,1)" onkeydown="eOtpKey(event,1)" style="width:42px;aspect-ratio:1;text-align:center;border:1.5px solid rgba(176,157,207,.38);border-radius:11px;background:rgba(255,255,255,.9);font-size:1.2rem;font-weight:600;color:#7c6a9e;outline:none;font-family:DM Sans,sans-serif;"/>
        <input class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="eOtpMove(this,2)" onkeydown="eOtpKey(event,2)" style="width:42px;aspect-ratio:1;text-align:center;border:1.5px solid rgba(176,157,207,.38);border-radius:11px;background:rgba(255,255,255,.9);font-size:1.2rem;font-weight:600;color:#7c6a9e;outline:none;font-family:DM Sans,sans-serif;"/>
        <input class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="eOtpMove(this,3)" onkeydown="eOtpKey(event,3)" style="width:42px;aspect-ratio:1;text-align:center;border:1.5px solid rgba(176,157,207,.38);border-radius:11px;background:rgba(255,255,255,.9);font-size:1.2rem;font-weight:600;color:#7c6a9e;outline:none;font-family:DM Sans,sans-serif;"/>
        <input class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="eOtpMove(this,4)" onkeydown="eOtpKey(event,4)" style="width:42px;aspect-ratio:1;text-align:center;border:1.5px solid rgba(176,157,207,.38);border-radius:11px;background:rgba(255,255,255,.9);font-size:1.2rem;font-weight:600;color:#7c6a9e;outline:none;font-family:DM Sans,sans-serif;"/>
        <input class="otp-box" type="text" inputmode="numeric" maxlength="1" oninput="eOtpMove(this,5)" onkeydown="eOtpKey(event,5)" style="width:42px;aspect-ratio:1;text-align:center;border:1.5px solid rgba(176,157,207,.38);border-radius:11px;background:rgba(255,255,255,.9);font-size:1.2rem;font-weight:600;color:#7c6a9e;outline:none;font-family:DM Sans,sans-serif;"/>
      </div>
      <button class="lg-btn" id="email-otp-btn" onclick="verifyEmailOTP()" disabled>Verify &amp; Sign In</button>
      <p style="font-size:.72rem;color:#9990b0;margin-top:12px;">
        Didn't get it? <a href="#" onclick="resendEmailOTP();return false;" style="color:#9b87c5;text-decoration:none;">Resend code</a>
        &nbsp;·&nbsp;
        <a href="#" onclick="backToEmailPanel();return false;" style="color:#9b87c5;text-decoration:none;">Go back</a>
      </p>
    </div>`;
  setTimeout(() => { const f = document.querySelector('#panel-email .otp-box'); if(f) f.focus(); }, 120);
}

function eOtpMove(el, idx) {
  el.value = el.value.replace(/\D/g,'');
  const b = document.querySelectorAll('#panel-email .otp-box');
  if (el.value && idx < 5) b[idx+1].focus();
  const code = [...b].map(x=>x.value).join('');
  const btn = document.getElementById('email-otp-btn');
  if (btn) btn.disabled = code.length < 6;
}
function eOtpKey(e, idx) {
  if (e.key === 'Backspace') {
    const b = document.querySelectorAll('#panel-email .otp-box');
    if (!b[idx].value && idx > 0) { b[idx-1].focus(); b[idx-1].value=''; }
  }
}

async function verifyEmailOTP() {
  if (!signUpRes) return;
  const b    = document.querySelectorAll('#panel-email .otp-box');
  const code = [...b].map(x=>x.value).join('');
  const btn  = document.getElementById('email-otp-btn');
  clearError();
  _setBtnLoading(btn, 'Verifying…');
  try {
    const r = await signUpRes.attemptEmailAddressVerification({ code });
    if (r.status === 'complete') {
      await clerk.setActive({ session: r.createdSessionId });
      _onLoginSuccess(clerk.user);
    } else {
      _resetBtn(btn, 'Verify & Sign In');
      showError('Verification incomplete. Please try again.');
    }
  } catch (e) {
    _resetBtn(btn, 'Verify & Sign In');
    const msgs = { 'form_code_incorrect':'Wrong code. Try again.', 'verification_expired':'Code expired. Resend it.' };
    showError(msgs[e.errors?.[0]?.code] || e.errors?.[0]?.message || 'Verification failed.');
  }
}

async function resendEmailOTP() {
  if (!signUpRes) return;
  try {
    await signUpRes.prepareEmailAddressVerification({ strategy: 'email_code' });
    showError('✅ New code sent!');
    setTimeout(() => clearError(), 3000);
  } catch (e) { showError('Could not resend. Try again.'); }
}

function backToEmailPanel() {
  signUpRes = null; signInRes = null;
  document.getElementById('panel-email').innerHTML = `
    <button class="lg-back" onclick="showPanel('panel-choose')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Back
    </button>
    <div class="lg-field-group">
      <div class="lg-field">
        <label>Email address</label>
        <input type="email" id="inp-email" placeholder="you@example.com" oninput="validateEmail()"/>
      </div>
      <div class="lg-field" id="pw-field" style="display:none;">
        <label>Password</label>
        <div class="pw-wrap">
          <input type="password" id="inp-pw" placeholder="Min 8 characters"/>
          <button class="pw-eye" onclick="togglePw()" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
    <button class="lg-btn" id="email-next-btn" onclick="emailNext()" disabled>Continue</button>
    <p class="lg-alt">No account? We'll create one automatically.</p>`;
}

function togglePw() {
  const i = document.getElementById('inp-pw');
  if (i) i.type = i.type === 'password' ? 'text' : 'password';
}

// ════════════════════════════════════════════════════════════
// 3. PHONE OTP
// ════════════════════════════════════════════════════════════
function validatePhone() {
  const p = document.getElementById('inp-phone').value.replace(/\s/g,'');
  document.getElementById('phone-next-btn').disabled = p.length < 6;
}

async function phoneNext() {
  const visible = document.getElementById('otp-field').style.display === 'block';
  if (!visible) await _sendPhoneOTP(); else await _verifyPhoneOTP();
}

async function _sendPhoneOTP() {
  if (!clerk) { _demoLogin('Phone User'); return; }
  const cc  = document.getElementById('cc-code').textContent.trim();
  const num = document.getElementById('inp-phone').value.replace(/\s/g,'');
  const full = cc + num;
  const btn  = document.getElementById('phone-next-btn');
  clearError();
  _setBtnLoading(btn, 'Sending OTP…');

  try {
    // Try sign-in via phone
    phoneSignInRes = await clerk.client.signIn.create({ identifier: full });
    const factor = phoneSignInRes.supportedFirstFactors?.find(f => f.strategy === 'phone_code');
    if (factor) {
      await phoneSignInRes.prepareFirstFactor({ strategy: 'phone_code', phoneNumberId: factor.phoneNumberId });
    } else {
      throw { errors: [{ code: 'no_phone_factor' }] };
    }
  } catch (e) {
    // Phone not registered → sign up
    try {
      phoneSignInRes = await clerk.client.signUp.create({ phoneNumber: full });
      await phoneSignInRes.preparePhoneNumberVerification({ strategy: 'phone_code' });
      phoneSignInRes._isSignUp = true;
    } catch (e2) {
      _resetBtn(btn, 'Send OTP');
      showError(e2.errors?.[0]?.longMessage || e2.errors?.[0]?.message || 'Could not send OTP.');
      return;
    }
  }

  _resetBtn(btn, 'Verify OTP');
  btn.disabled = true;
  document.getElementById('otp-field').style.display = 'block';
  document.getElementById('otp-num').textContent = full;
  document.getElementById('phone-alt').innerHTML =
    `<a href="#" onclick="resendOtp();return false;" style="color:#9b87c5;">Resend OTP</a>`;
  setTimeout(() => { const f = document.querySelector('#panel-phone .otp-box'); if(f) f.focus(); }, 100);
}

async function _verifyPhoneOTP() {
  const otp = [...document.querySelectorAll('#panel-phone .otp-box')].map(b=>b.value.trim()).join('');
  const btn = document.getElementById('phone-next-btn');
  clearError();
  if (otp.length !== 6) { showError('Enter all 6 digits.'); return; }
  if (!phoneSignInRes)  { showError('Session expired. Request a new OTP.'); return; }
  _setBtnLoading(btn, 'Verifying…');
  try {
    let r;
    if (phoneSignInRes._isSignUp) {
      r = await phoneSignInRes.attemptPhoneNumberVerification({ code: otp });
    } else {
      r = await phoneSignInRes.attemptFirstFactor({ strategy: 'phone_code', code: otp });
    }
    if (r.status === 'complete') {
      await clerk.setActive({ session: r.createdSessionId });
      _onLoginSuccess(clerk.user);
    } else {
      _resetBtn(btn, 'Verify OTP');
      showError('Verification incomplete. Try again.');
    }
  } catch (e) {
    _resetBtn(btn, 'Verify OTP');
    const msgs = { 'form_code_incorrect':'Wrong OTP. Try again.', 'verification_expired':'OTP expired. Tap Resend.' };
    showError(msgs[e.errors?.[0]?.code] || e.errors?.[0]?.message || 'Verification failed.');
  }
}

function otpMove(el, idx) {
  el.value = el.value.replace(/\D/g,'');
  const b = document.querySelectorAll('#panel-phone .otp-box');
  if (el.value && idx < 5) b[idx+1].focus();
  const otp = [...b].map(x=>x.value).join('');
  document.getElementById('phone-next-btn').disabled = otp.length < 6;
}
function otpKey(e, idx) {
  if (e.key === 'Backspace') {
    const b = document.querySelectorAll('#panel-phone .otp-box');
    if (!b[idx].value && idx > 0) { b[idx-1].focus(); b[idx-1].value=''; }
  }
}
async function resendOtp() {
  document.querySelectorAll('#panel-phone .otp-box').forEach(b=>b.value='');
  document.getElementById('otp-field').style.display = 'none';
  document.getElementById('phone-alt').innerHTML = '';
  phoneSignInRes = null;
  const btn = document.getElementById('phone-next-btn');
  _resetBtn(btn, 'Send OTP'); btn.disabled = false;
  setTimeout(() => _sendPhoneOTP(), 300);
}

// ════════════════════════════════════════════════════════════
// COUNTRY CODE
// ════════════════════════════════════════════════════════════
function toggleCountry() {
  const dd = document.getElementById('cc-dropdown');
  if (dd) dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
}
function setCC(flag, code) {
  document.getElementById('cc-flag').textContent = flag;
  document.getElementById('cc-code').textContent = code;
  document.getElementById('cc-dropdown').style.display = 'none';
}
document.addEventListener('click', e => {
  if (!e.target.closest('.country-code')) {
    const dd = document.getElementById('cc-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

// ════════════════════════════════════════════════════════════
// SIGN OUT
// ════════════════════════════════════════════════════════════
async function signOut() {
  if (clerk) await clerk.signOut();
  currentUser = null; window.MEDBUDDY_USER = null;
  window.location.reload();
}

// ════════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════════
function _onLoginSuccess(user) {
  if (!user) return;
  currentUser = user;
  window.MEDBUDDY_USER = {
    uid:   user.id,
    name:  user.fullName || user.primaryEmailAddress?.emailAddress || user.primaryPhoneNumber?.phoneNumber || 'User',
    email: user.primaryEmailAddress?.emailAddress || null,
    phone: user.primaryPhoneNumber?.phoneNumber   || null,
    photo: user.imageUrl || null,
  };
  _hideLoginShowApp(window.MEDBUDDY_USER.name);
}

function _hideLoginShowApp(name) {
  const lp = document.getElementById('login-page');
  if (!lp || lp.style.display === 'none') return;
  lp.style.transition = 'opacity .45s ease, transform .45s ease';
  lp.style.opacity = '0'; lp.style.transform = 'scale(1.03)';
  setTimeout(() => {
    lp.style.display = 'none';
    const app = document.querySelector('.app');
    if (app) { app.style.opacity='0'; app.style.display='block'; requestAnimationFrame(()=>{ app.style.transition='opacity .5s ease'; app.style.opacity='1'; }); }
    const sob = document.getElementById('signout-btn'); if(sob) sob.style.display='block';
    _toast('👋 Welcome, ' + (name||'User').split('@')[0] + '!');
  }, 450);
}

function _demoLogin(name) {
  window.MEDBUDDY_USER = { uid:'demo', name, email:'demo@medbuddy.app' };
  _hideLoginShowApp(name);
}
function enterApp() { _hideLoginShowApp(window.MEDBUDDY_USER?.name||'User'); }

function _setBtnLoading(btn, txt) {
  if (!btn) return;
  btn.disabled = true; btn.dataset.orig = btn.innerText;
  btn.innerHTML = `<span class="auth-spinner"></span> ${txt}`;
}
function _resetBtn(btn, txt) {
  if (!btn) return;
  btn.disabled = false; btn.textContent = txt || btn.dataset.orig || 'Continue';
}

function showError(msg) {
  clearError();
  const el = document.createElement('p'); el.id = 'auth-error'; el.textContent = msg;
  el.style.cssText = `font-size:.78rem;color:#b05e7a;text-align:center;margin-top:12px;padding:9px 14px;background:rgba(212,134,156,.1);border-radius:10px;border:1px solid rgba(212,134,156,.28);`;
  const p = [...document.querySelectorAll('.lg-panel')].find(x=>x.style.display!=='none') || document.getElementById('panel-choose');
  if (p) p.appendChild(el);
}
function clearError() { const e = document.getElementById('auth-error'); if(e) e.remove(); }

function _toast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(20px);background:linear-gradient(135deg,#9b87c5,#7c6a9e);color:#fff;padding:11px 22px;border-radius:50px;font-size:.84rem;font-weight:500;box-shadow:0 6px 24px rgba(124,106,158,.4);z-index:9999;opacity:0;transition:all .4s cubic-bezier(.34,1.56,.64,1);font-family:'DM Sans',sans-serif;white-space:nowrap;`;
  t.textContent = msg; document.body.appendChild(t);
  requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='translateX(-50%) translateY(0)'; });
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(-50%) translateY(10px)'; setTimeout(()=>t.remove(),400); }, 3200);
}
