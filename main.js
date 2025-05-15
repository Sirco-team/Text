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

document.addEventListener('DOMContentLoaded', function() {
  // Quill toolbar options (all features)
  const quillModules = {
    toolbar: '#toolbar',
    clipboard: { matchVisual: false }
  };

  // Initialize Quill editor for main page with all features
  const quill = new Quill('#editor', {
    modules: {
      toolbar: '#toolbar',
      clipboard: { matchVisual: false }
    },
    theme: 'snow'
  });

  // Initialize Quill editor for revealed text (read-only)
  let revealedQuill = null;
  if (document.getElementById('revealedEditor')) {
    revealedQuill = new Quill('#revealedEditor', {
      readOnly: true,
      theme: 'snow',
      modules: { toolbar: false }
    });
    document.getElementById('revealedEditor').style.pointerEvents = 'none';
  }

  function i9() {
    document.getElementById('main').classList.remove('hidden');
    document.getElementById('unlock').classList.add('hidden');
    document.getElementById('linkBox').classList.add('hidden');
    document.getElementById('infoMsg').classList.add('hidden');
    quill.setContents([{ insert: '\n' }]);
    document.getElementById('password').value = '';
    document.getElementById('usePassword').checked = true;
    document.getElementById('pwField').style.display = '';
    setTimeout(() => { quill.focus(); }, 100);
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

  // Helper: decode base64 and set HTML in revealedQuill
  function showDecodedHtml(encoded) {
    try {
      const html = decodeURIComponent(escape(atob(encoded)));
      if (revealedQuill) {
        revealedQuill.root.innerHTML = html;
      } else {
        // fallback: show as plain text
        document.getElementById('revealedText').innerHTML = html;
      }
    } catch (e) {
      document.getElementById('unlockMsg').textContent = 'Invalid or corrupted link.';
    }
  }

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
      document.getElementById('unlockBtn').onclick = function() {
        document.getElementById('unlockMsg').textContent = '';
        if (revealedQuill) revealedQuill.setContents([{ insert: '\n' }]);
        showDecodedHtml(encrypted);
      };
      document.getElementById('pwUnlockField').style.display = 'none';
      document.getElementById('unlockInfo').textContent = 'If the person told you there is no password, type "." as the password.';
      document.getElementById('backBtn').onclick = function() {
        window.location.href = window.location.pathname;
      };
      return;
    }

    // Main page logic (with or without password)
    j0(requirePw);
    document.getElementById('unlockBtn').onclick = function() {
      document.getElementById('unlockMsg').textContent = '';
      if (revealedQuill) revealedQuill.setContents([{ insert: '\n' }]);
      // For demo: always try to decode base64 (no password support)
      showDecodedHtml(encrypted);
    };
    document.getElementById('unlockPassword').addEventListener('keydown', function(e) {
      if (e.key === 'Enter') document.getElementById('unlockBtn').click();
    });
    document.getElementById('pwUnlockField').style.display = requirePw ? '' : 'none';
    if (!requirePw) {
      document.getElementById('unlockInfo').textContent = 'If the person told you there is no password, type "." as the password.';
    }
    document.getElementById('backBtn').onclick = function() {
      window.location.href = window.location.pathname;
    };
    return;
  }

  i9();
  // Fix: ensure the "generate" button is not inside a <form> that submits/reloads the page
  // Add this to prevent default form submission if it exists
  const generateBtn = document.getElementById('generate');
  if (generateBtn.form) {
    generateBtn.form.onsubmit = function(e) { e.preventDefault(); return false; };
  }

  document.getElementById('generate').onclick = async function(e) {
    // Prevent default if inside a form
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Debug: show alert if button is clicked
    // alert('Generate button clicked!');

    try {
      const html = quill.root.innerHTML.trim();
      const usePw = document.getElementById('usePassword').checked;
      let pw = usePw ? document.getElementById('password').value : '.';
      if (!html || html === '<p><br></p>') {
        alert('Please enter some text.');
        quill.focus();
        return;
      }
      if (usePw && !pw) {
        alert('Please enter a password.');
        document.getElementById('password').focus();
        return;
      }
      let password = pw;
      if (!usePw) {
        password = '.';
      }
      const encrypted = await g7(html, password);
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
    } catch (err) {
      alert('An error occurred while creating the link: ' + (err && err.message ? err.message : err));
    }
  };
});
const m3 = "this is junk data";
function n4() { return 1234567890; }