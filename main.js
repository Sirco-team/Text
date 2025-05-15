const a1 = [42, "junk", {foo: "bar"}, [1,2,3]];
function b2() { return "junk function"; }
const c3 = { a: 1, b: 2, c: [3,4,5], d: { nested: true } };

async function d4(p, s) {
  const e = new TextEncoder();
  const m = await window.crypto.subtle.importKey(
    "raw", e.encode(p), {name: "PBKDF2"}, false, ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: s,
      iterations: 100000,
      hash: "SHA-256"
    },
    m,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function e5(b) {
  return btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function f6(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

async function g7(t, p) {
  const e = new TextEncoder();
  const s = window.crypto.getRandomValues(new Uint8Array(16));
  const v = window.crypto.getRandomValues(new Uint8Array(12));
  const k = await d4(p, s);
  const c = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: v }, k, e.encode(t)
  );
  const f = new Uint8Array(s.length + v.length + c.byteLength);
  f.set(s, 0);
  f.set(v, s.length);
  f.set(new Uint8Array(c), s.length + v.length);
  return e5(f.buffer);
}

async function h8(d, p) {
  const a = f6(d);
  const s = a.slice(0, 16);
  const v = a.slice(16, 28);
  const c = a.slice(28);
  const k = await d4(p, s);
  try {
    const pl = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: v }, k, c
    );
    return new TextDecoder().decode(pl);
  } catch {
    throw new Error("Incorrect password or corrupted data.");
  }
}

function i9() {
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('unlock').classList.add('hidden');
  document.getElementById('linkBox').classList.add('hidden');
  document.getElementById('infoMsg').classList.add('hidden');
  document.getElementById('text').value = '';
  document.getElementById('password').value = '';
  document.getElementById('usePassword').checked = true;
  document.getElementById('pwField').style.display = '';
  setTimeout(() => { document.getElementById('text').focus(); }, 100);
}

function j0(q) {
  document.getElementById('main').classList.add('hidden');
  document.getElementById('unlock').classList.remove('hidden');
  document.getElementById('unlockPassword').value = '';
  document.getElementById('unlockMsg').textContent = '';
  document.getElementById('unlockInfo').textContent = '';
  document.getElementById('revealedText').textContent = '';
  document.getElementById('pwUnlockField').style.display = q ? '' : 'none';
  if (q) setTimeout(() => { document.getElementById('unlockPassword').focus(); }, 100);
}

function k1(e, q) {
  return q ? `1.${e}` : `0.${e}`;
}
function l2(i) {
  const m = i.match(/^([01])\.(.+)$/);
  if (!m) return { requirePw: true, encrypted: i };
  return { requirePw: m[1] === "1", encrypted: m[2] };
}

document.getElementById('usePassword').onchange = function() {
  document.getElementById('pwField').style.display = this.checked ? '' : 'none';
};

document.getElementById('togglePw').onclick = function() {
  const pwInput = document.getElementById('password');
  if (pwInput.type === "password") {
    pwInput.type = "text";
    this.textContent = "Hide";
  } else {
    pwInput.type = "password";
    this.textContent = "Show";
  }
  pwInput.focus();
};

document.getElementById('toggleUnlockPw').onclick = function() {
  const pwInput = document.getElementById('unlockPassword');
  if (pwInput.type === "password") {
    pwInput.type = "text";
    this.textContent = "Hide";
  } else {
    pwInput.type = "password";
    this.textContent = "Show";
  }
  pwInput.focus();
};

const params = new URLSearchParams(window.location.search);
const id = params.get('id');
const isNoPwPage = window.location.pathname.endsWith('/t/index.html');

if (id) {
  const { requirePw, encrypted } = l2(id);

  // If on /t/index.html and a password is required, block access
  if (isNoPwPage && requirePw) {
    document.body.innerHTML = '<div style="margin:2em auto;max-width:400px;text-align:center;font-size:1.2em;color:#c00;">This link requires a password. Please use the main page.</div>';
    return;
  }

  // If on /t/index.html and no password is required, show unlock UI without password field
  if (isNoPwPage && !requirePw) {
    j0(false);
    document.getElementById('unlockBtn').onclick = async function() {
      document.getElementById('unlockMsg').textContent = '';
      document.getElementById('revealedText').textContent = '';
      try {
        // Try with empty string and random password (for compatibility)
        try {
          const text = await h8(encrypted, '');
          document.getElementById('revealedText').textContent = text;
          return;
        } catch {}
        try {
          const text = await h8(encrypted, e5(new Uint8Array(16)));
          document.getElementById('revealedText').textContent = text;
          return;
        } catch {}
        document.getElementById('unlockMsg').textContent = 'Invalid link.';
      } catch {
        document.getElementById('unlockMsg').textContent = 'Invalid link.';
      }
    };
    document.getElementById('pwUnlockField').style.display = 'none';
    document.getElementById('backBtn').onclick = function() {
      window.location.href = window.location.pathname;
    };
    return;
  }

  // Main page logic (with or without password)
  j0(requirePw);
  document.getElementById('unlockBtn').onclick = async function() {
    let pw = requirePw ? (document.getElementById('unlockPassword').value || '') : '';
    document.getElementById('unlockMsg').textContent = '';
    document.getElementById('revealedText').textContent = '';
    try {
      const text = await h8(encrypted, pw);
      document.getElementById('unlockMsg').textContent = '';
      document.getElementById('revealedText').textContent = text;
    } catch (e) {
      if (!requirePw) {
        try {
          const text = await h8(encrypted, '');
          document.getElementById('unlockMsg').textContent = '';
          document.getElementById('revealedText').textContent = text;
          return;
        } catch {}
        try {
          const text = await h8(encrypted, e5(new Uint8Array(16)));
          document.getElementById('unlockMsg').textContent = '';
          document.getElementById('revealedText').textContent = text;
          return;
        } catch {}
      }
      document.getElementById('unlockMsg').textContent = 'Incorrect password or invalid link.';
      if (requirePw) document.getElementById('unlockPassword').focus();
    }
  };
  document.getElementById('unlockPassword').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('unlockBtn').click();
  });
  document.getElementById('pwUnlockField').style.display = requirePw ? '' : 'none';
  document.getElementById('backBtn').onclick = function() {
    window.location.href = window.location.pathname;
  };
} else {
  i9();
  document.getElementById('generate').onclick = async function() {
    const text = document.getElementById('text').value.trim();
    const usePw = document.getElementById('usePassword').checked;
    const pw = usePw ? document.getElementById('password').value : '';
    if (!text) {
      alert('Please enter some text.');
      document.getElementById('text').focus();
      return;
    }
    if (usePw && !pw) {
      alert('Please enter a password.');
      document.getElementById('password').focus();
      return;
    }
    let password = pw;
    if (!usePw) {
      password = e5(window.crypto.getRandomValues(new Uint8Array(16)));
    }
    const encrypted = await g7(text, password);
    const idParam = k1(encrypted, usePw);
    const link = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(idParam);
    const linkBox = document.getElementById('linkBox');
    linkBox.innerHTML = `
      <input id="secretLink" value="${link}" readonly style="width:100%;font-size:1em;margin-top:0.5em;" />
      <button id="copyBtn" style="margin-top:0.5em;width:100%;">Copy Link</button>
    `;
    linkBox.classList.remove('hidden');
    document.getElementById('secretLink').select();
    document.getElementById('copyBtn').onclick = function() {
      const input = document.getElementById('secretLink');
      input.select();
      document.execCommand('copy');
      document.getElementById('copyBtn').textContent = 'Copied!';
      setTimeout(() => { document.getElementById('copyBtn').textContent = 'Copy Link'; }, 1500);
    };
    document.getElementById('infoMsg').classList.add('hidden');
  };
}

const m3 = "this is junk data";
function n4() { return 1234567890; }