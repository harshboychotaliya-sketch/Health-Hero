// ═══════════════════════════════════════════════════════════════
// MedBuddy — firebase-auth.js
// Real Firebase Authentication: Google · Email+Verify · Phone OTP
//
// SETUP:
//   1. Replace firebaseConfig values below with yours from:
//      Firebase Console → Project Settings → General → Your Apps
//   2. Enable in Firebase Console → Authentication → Sign-in method:
//      ✅ Google   ✅ Email/Password   ✅ Phone
//   3. For Phone auth — add your domain to:
//      Firebase Console → Authentication → Settings → Authorised domains
// ═══════════════════════════════════════════════════════════════

// ── 🔑 YOUR FIREBASE CONFIG — fill these in ─────────────────
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
// ────────────────────────────────────────────────────────────

// ── Init ─────────────────────────────────────────────────────
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ── State ─────────────────────────────────────────────────────
let currentUser        = null;
let confirmationResult = null;   // Phone OTP result
let recaptchaVerifier  = null;   // reCAPTCHA instance

// ── Auto-login if already signed in ──────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    console.log('🔓 Already signed in:', user.email || user.phoneNumber);
    currentUser = user;
    _hideLoginShowApp(user.displayName || user.email || user.phoneNumber);
  }
});

// ════════════════════════════════════════════════════════════
// PANEL NAVIGATION
// ════════════════════════════════════════════════════════════
function showPanel(id) {
  clearError();
  document.querySelectorAll('.lg-panel').forEach(p => {
    p.style.display = 'none';
    p.style.animation = 'none';
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  void el.offsetWidth; // force reflow for animation restart
  el.style.animation = '';
}

// ════════════════════════════════════════════════════════════
// 1. GOOGLE LOGIN
// ════════════════════════════════════════════════════════════
function loginGoogle() {
  const btn = document.querySelector('.lg-social.google');
  _setBtnLoading(btn, 'Connecting to Google…');

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');

  auth.signInWithPopup(provider)
    .then(result => {
      console.log('✅ Google OK:', result.user.displayName);
      _onLoginSuccess(result.user);
    })
    .catch(err => {
      _resetGoogleBtn(btn);
      if (err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request') return;
      const msgs = {
        'auth/popup-blocked':
          'Popup was blocked. Please allow popups for this site.',
        'auth/network-request-failed':
          'Network error. Check your connection.',
      };
      showError(msgs[err.code] || 'Google sign-in failed: ' + err.message);
    });
}

function _resetGoogleBtn(btn) {
  btn.disabled = false;
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
    Continue with Google`;
}

// ════════════════════════════════════════════════════════════
// 2. EMAIL + PASSWORD + EMAIL VERIFICATION
// ════════════════════════════════════════════════════════════
function validateEmail() {
  const email = document.getElementById('inp-email').value.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const btn   = document.getElementById('email-next-btn');
  const pwField = document.getElementById('pw-field');

  if (valid) {
    pwField.style.display = 'block';
    btn.textContent = 'Sign In / Sign Up';
  } else {
    pwField.style.display = 'none';
    btn.textContent = 'Continue';
  }
  btn.disabled = !valid;
}

function emailNext() {
  const email = document.getElementById('inp-email').value.trim();
  const pw    = document.getElementById('inp-pw').value;
  const btn   = document.getElementById('email-next-btn');

  clearError();

  if (!pw || pw.length < 6) {
    showError('Password must be at least 6 characters.');
    return;
  }

  _setBtnLoading(btn, 'Please wait…');

  // Try sign-in first; if user not found → sign up
  auth.signInWithEmailAndPassword(email, pw)
    .then(result => {
      const user = result.user;
      if (!user.emailVerified) {
        // Signed in but email not verified — show verification screen
        _showEmailVerifyScreen(user, btn);
      } else {
        _onLoginSuccess(user);
      }
    })
    .catch(err => {
      if (err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/invalid-email') {
        // Create new account
        auth.createUserWithEmailAndPassword(email, pw)
          .then(result => {
            // Send verification email for new accounts
            result.user.sendEmailVerification()
              .then(() => _showEmailVerifyScreen(result.user, btn))
              .catch(() => _onLoginSuccess(result.user)); // fallback: skip verify
          })
          .catch(createErr => {
            _resetBtn(btn, 'Sign In / Sign Up');
            const msgs = {
              'auth/email-already-in-use': 'Account exists. Check your password.',
              'auth/weak-password':        'Password must be at least 6 characters.',
              'auth/invalid-email':        'Please enter a valid email address.',
            };
            showError(msgs[createErr.code] || createErr.message);
          });
      } else {
        _resetBtn(btn, 'Sign In / Sign Up');
        const msgs = {
          'auth/wrong-password':    'Incorrect password. Try again.',
          'auth/too-many-requests': 'Too many attempts. Wait a moment or reset password.',
          'auth/user-disabled':     'This account has been disabled.',
        };
        showError(msgs[err.code] || err.message);
      }
    });
}

function _showEmailVerifyScreen(user, btn) {
  _resetBtn(btn, 'Sign In / Sign Up');

  // Replace panel content with verification message
  const panel = document.getElementById('panel-email');
  panel.innerHTML = `
    <div style="text-align:center;padding:10px 0;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,#ede8f8,#dceef7);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:1.6rem;">📧</div>
      <h3 style="font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:600;color:#2e2640;margin-bottom:8px;">Verify your email</h3>
      <p style="font-size:.83rem;color:#5a5070;line-height:1.6;margin-bottom:6px;">
        We sent a verification link to<br>
        <strong style="color:#7c6a9e;">${user.email}</strong>
      </p>
      <p style="font-size:.78rem;color:#9990b0;margin-bottom:24px;">Open the email and click the link, then come back here.</p>

      <button class="lg-btn" id="verify-check-btn" onclick="checkEmailVerified()">
        I've verified — Continue
      </button>

      <p style="font-size:.74rem;color:#9990b0;margin-top:14px;">
        Didn't get it?
        <a href="#" onclick="resendVerification();return false;" style="color:#9b87c5;text-decoration:none;">Resend email</a>
        &nbsp;·&nbsp;
        <a href="#" onclick="backToEmailPanel();return false;" style="color:#9b87c5;text-decoration:none;">Use different email</a>
      </p>
    </div>
  `;

  // Store user ref for verification check
  window._pendingEmailUser = user;
}

function checkEmailVerified() {
  const user = window._pendingEmailUser;
  const btn  = document.getElementById('verify-check-btn');
  if (!user) return;

  _setBtnLoading(btn, 'Checking…');

  // Reload user to get fresh emailVerified status
  user.reload()
    .then(() => {
      if (firebase.auth().currentUser?.emailVerified) {
        _onLoginSuccess(firebase.auth().currentUser);
      } else {
        _resetBtn(btn, "I've verified — Continue");
        showError('Email not verified yet. Please click the link in your inbox.');
      }
    })
    .catch(e => {
      _resetBtn(btn, "I've verified — Continue");
      showError('Could not check verification. Try again.');
    });
}

function resendVerification() {
  const user = window._pendingEmailUser;
  if (!user) return;
  user.sendEmailVerification()
    .then(() => {
      // Brief feedback
      const hint = document.querySelector('#panel-email p:last-child a');
      const orig = document.querySelector('#panel-email').innerHTML;
      showError('Verification email resent! Check your inbox.');
    })
    .catch(e => showError('Could not resend: ' + e.message));
}

function backToEmailPanel() {
  window._pendingEmailUser = null;
  // Rebuild email panel
  document.getElementById('panel-email').innerHTML = `
    <button class="lg-back" onclick="showPanel('panel-choose')">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      Back
    </button>
    <div class="lg-field-group">
      <div class="lg-field">
        <label>Email address</label>
        <input type="email" id="inp-email" placeholder="you@example.com" oninput="validateEmail()"/>
      </div>
      <div class="lg-field" id="pw-field" style="display:none;">
        <label>Password</label>
        <div class="pw-wrap">
          <input type="password" id="inp-pw" placeholder="Enter password (min 6 chars)"/>
          <button class="pw-eye" onclick="togglePw()" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
    <button class="lg-btn" id="email-next-btn" onclick="emailNext()" disabled>Continue</button>
    <p class="lg-alt">No account? Just sign up with a new password.</p>
  `;
}

function togglePw() {
  const inp = document.getElementById('inp-pw');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ════════════════════════════════════════════════════════════
// 3. PHONE + OTP (Firebase Phone Auth)
// ════════════════════════════════════════════════════════════
function validatePhone() {
  const phone = document.getElementById('inp-phone').value.replace(/\s/g, '');
  document.getElementById('phone-next-btn').disabled = phone.length < 6;
}

function phoneNext() {
  const otpVisible = document.getElementById('otp-field').style.display === 'block';
  if (!otpVisible) {
    _sendOTP();
  } else {
    _verifyOTP();
  }
}

function _sendOTP() {
  const cc  = document.getElementById('cc-code').textContent.trim();
  const num = document.getElementById('inp-phone').value.replace(/\s/g, '');
  const full = cc + num;
  const btn  = document.getElementById('phone-next-btn');

  clearError();
  _setBtnLoading(btn, 'Sending OTP…');

  // Destroy old reCAPTCHA if exists
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch(e) {}
    recaptchaVerifier = null;
  }

  // Create invisible reCAPTCHA — anchored to the div#phone-recaptcha
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier('phone-recaptcha', {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => {
      recaptchaVerifier = null;
      showError('reCAPTCHA expired. Please try again.');
      _resetBtn(btn, 'Send OTP');
    },
  });

  auth.signInWithPhoneNumber(full, recaptchaVerifier)
    .then(result => {
      confirmationResult = result;
      _resetBtn(btn, 'Verify OTP');
      btn.disabled = true;

      // Show OTP input boxes
      const otpField = document.getElementById('otp-field');
      otpField.style.display = 'block';
      document.getElementById('otp-num').textContent = full;
      document.getElementById('phone-alt').innerHTML =
        `<a href="#" onclick="resendOtp();return false;" style="color:#9b87c5;">Resend OTP</a>`;

      // Focus first box
      setTimeout(() => {
        const firstBox = document.querySelector('.otp-box');
        if (firstBox) firstBox.focus();
      }, 100);

      console.log('📱 OTP sent to', full);
    })
    .catch(err => {
      _resetBtn(btn, 'Send OTP');
      // Reset reCAPTCHA on failure
      if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch(e) {}
        recaptchaVerifier = null;
      }
      const msgs = {
        'auth/invalid-phone-number':  'Invalid phone number. Use format: +91XXXXXXXXXX',
        'auth/too-many-requests':     'Too many attempts. Please wait a few minutes.',
        'auth/quota-exceeded':        'SMS quota exceeded. Try email login instead.',
        'auth/captcha-check-failed':  'reCAPTCHA failed. Refresh the page and try again.',
      };
      showError(msgs[err.code] || 'Could not send OTP: ' + err.message);
    });
}

function _verifyOTP() {
  const otp = [...document.querySelectorAll('.otp-box')]
              .map(b => b.value.trim()).join('');
  const btn = document.getElementById('phone-next-btn');

  clearError();

  if (otp.length !== 6) {
    showError('Please enter all 6 digits of the OTP.');
    return;
  }
  if (!confirmationResult) {
    showError('Session expired. Please request a new OTP.');
    return;
  }

  _setBtnLoading(btn, 'Verifying…');

  confirmationResult.confirm(otp)
    .then(result => {
      console.log('✅ Phone OK:', result.user.phoneNumber);
      _onLoginSuccess(result.user);
    })
    .catch(err => {
      _resetBtn(btn, 'Verify OTP');
      const msgs = {
        'auth/invalid-verification-code': 'Wrong OTP. Please check and try again.',
        'auth/code-expired':              'OTP expired. Tap Resend OTP.',
        'auth/session-expired':           'Session expired. Tap Resend OTP.',
      };
      showError(msgs[err.code] || 'Verification failed: ' + err.message);
    });
}

function otpMove(el, idx) {
  // Allow only digits
  el.value = el.value.replace(/\D/g, '');
  const boxes = document.querySelectorAll('.otp-box');

  // Auto-advance
  if (el.value && idx < 5) {
    boxes[idx + 1].focus();
  }
  // Handle backspace — go back
  if (!el.value && idx > 0) {
    boxes[idx - 1].focus();
  }

  // Enable verify btn when all 6 filled
  const otp = [...boxes].map(b => b.value).join('');
  document.getElementById('phone-next-btn').disabled = otp.length < 6;
}

function resendOtp() {
  // Reset OTP boxes
  document.querySelectorAll('.otp-box').forEach(b => b.value = '');
  document.getElementById('otp-field').style.display = 'none';
  document.getElementById('phone-alt').innerHTML = '';
  confirmationResult = null;

  const btn = document.getElementById('phone-next-btn');
  _resetBtn(btn, 'Send OTP');
  btn.disabled = false;

  // Slight delay then resend
  setTimeout(() => _sendOTP(), 300);
}

// ════════════════════════════════════════════════════════════
// COUNTRY CODE DROPDOWN
// ════════════════════════════════════════════════════════════
function toggleCountry() {
  const dd = document.getElementById('cc-dropdown');
  if (!dd) return;
  dd.style.display = (dd.style.display === 'block') ? 'none' : 'block';
}
function setCC(flag, code) {
  document.getElementById('cc-flag').textContent = flag;
  document.getElementById('cc-code').textContent = code;
  document.getElementById('cc-dropdown').style.display = 'none';
}
// Close dropdown when clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('.country-code')) {
    const dd = document.getElementById('cc-dropdown');
    if (dd) dd.style.display = 'none';
  }
});

// ════════════════════════════════════════════════════════════
// SIGN OUT
// ════════════════════════════════════════════════════════════
function signOut() {
  auth.signOut().then(() => {
    currentUser = null;
    window.MEDBUDDY_USER = null;
    window.location.reload();
  });
}

// ════════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════════

function _onLoginSuccess(user) {
  currentUser = user;
  window.MEDBUDDY_USER = {
    uid:    user.uid,
    email:  user.email         || null,
    phone:  user.phoneNumber   || null,
    name:   user.displayName || user.email || user.phoneNumber || 'User',
    photo:  user.photoURL      || null,
  };

  // Optional: verify token with backend
  user.getIdToken().then(token => {
    fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    })
    .then(r => r.json())
    .then(d => { if (d.ok) window.MEDBUDDY_USER = { ...window.MEDBUDDY_USER, ...d.user }; })
    .catch(() => {}); // silent — static hosting won't have this endpoint
  });

  _hideLoginShowApp(window.MEDBUDDY_USER.name);
}

function _hideLoginShowApp(userName) {
  const lp = document.getElementById('login-page');
  if (!lp || lp.style.display === 'none') return; // already hidden

  lp.style.transition = 'opacity .45s ease, transform .45s ease';
  lp.style.opacity    = '0';
  lp.style.transform  = 'scale(1.03)';

  setTimeout(() => {
    lp.style.display = 'none';

    const appEl = document.querySelector('.app');
    if (appEl) {
      appEl.style.opacity    = '0';
      appEl.style.display    = 'block';
      requestAnimationFrame(() => {
        appEl.style.transition = 'opacity .5s ease';
        appEl.style.opacity    = '1';
      });
    }

    // Show sign-out button
    const soBtn = document.getElementById('signout-btn');
    if (soBtn) soBtn.style.display = 'block';

    // Welcome toast
    _showToast('👋 Welcome, ' + (userName || 'User').split('@')[0] + '!');
  }, 450);
}

function enterApp() {
  // Legacy stub — calls _hideLoginShowApp
  _hideLoginShowApp(window.MEDBUDDY_USER?.name || 'User');
}

// Button loading state helpers
function _setBtnLoading(btn, text) {
  if (!btn) return;
  btn.disabled = true;
  btn.dataset.orig = btn.textContent;
  btn.innerHTML = `<span class="auth-spinner"></span> ${text}`;
}
function _resetBtn(btn, text) {
  if (!btn) return;
  btn.disabled  = false;
  btn.textContent = text || btn.dataset.orig || 'Continue';
}

// Error display
function showError(msg) {
  clearError();
  const el = document.createElement('p');
  el.id = 'auth-error';
  el.textContent = msg;
  el.style.cssText = `
    font-size:.78rem;color:#b05e7a;text-align:center;margin-top:12px;
    padding:9px 14px;background:rgba(212,134,156,.1);
    border-radius:10px;border:1px solid rgba(212,134,156,.28);
    animation:panelIn .25s ease both;
  `;
  const panel = [...document.querySelectorAll('.lg-panel')]
    .find(p => p.style.display !== 'none' && !p.style.display.includes('none'))
    || document.getElementById('panel-choose');
  if (panel) panel.appendChild(el);
}
function clearError() {
  const el = document.getElementById('auth-error');
  if (el) el.remove();
}

// Welcome toast
function _showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = `
    position:fixed;bottom:28px;left:50%;
    transform:translateX(-50%) translateY(20px);
    background:linear-gradient(135deg,#9b87c5,#7c6a9e);
    color:#fff;padding:11px 22px;border-radius:50px;
    font-size:.84rem;font-weight:500;letter-spacing:.01em;
    box-shadow:0 6px 24px rgba(124,106,158,.4);z-index:9999;
    opacity:0;transition:all .4s cubic-bezier(.34,1.56,.64,1);
    font-family:'DM Sans',sans-serif;white-space:nowrap;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity   = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    t.style.opacity   = '0';
    t.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => t.remove(), 400);
  }, 3200);
}
