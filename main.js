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

  // Helper: parse id param for password-protected links
  function parseId(id) {
    const m = id.match(/^([01])\.([^\.]+)(?:\.([-\d]+))?$/);
    if (!m) return { requirePw: true, encrypted: id, pwHash: null };
    return { requirePw: m[1] === "1", encrypted: m[2], pwHash: m[3] || null };
  }

  // Simple hash for password (for demo, not secure)
  function hashPw(pw) {
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      hash = ((hash << 5) - hash) + pw.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const isNoPwPage = window.location.pathname.endsWith('/t/index.html');

  if (id) {
    // Use improved parseId logic
    const { requirePw, encrypted, pwHash } = parseId(id);

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
        // For demo: decode base64
        try {
          const html = decodeURIComponent(escape(atob(encrypted)));
          revealedQuill.root.innerHTML = html;
        } catch (e) {
          document.getElementById('unlockMsg').textContent = 'Invalid or corrupted link.';
        }
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
      let pw = requirePw ? document.getElementById('unlockPassword').value : '.';
      if (requirePw && !pw) {
        document.getElementById('unlockMsg').textContent = 'Please enter the password.';
        document.getElementById('unlockPassword').focus();
        return;
      }
      if (requirePw && hashPw(pw) !== pwHash) {
        document.getElementById('unlockMsg').textContent = 'Incorrect password.';
        return;
      }
      try {
        const html = decodeURIComponent(escape(atob(encrypted)));
        revealedQuill.root.innerHTML = html;
      } catch (e) {
        document.getElementById('unlockMsg').textContent = 'Invalid or corrupted link.';
      }
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
      const encrypted = btoa(unescape(encodeURIComponent(html)));
      let idParam;
      if (usePw) {
        idParam = `1.${encrypted}.${hashPw(password)}`;
      } else {
        idParam = `0.${encrypted}`;
      }
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

  // --- Edit button logic: always copy Delta, always keep text and formatting ---
  document.getElementById('editBtn') && (document.getElementById('editBtn').onclick = function() {
    document.getElementById('editArea').classList.remove('hidden');
    document.getElementById('revealedText').style.display = 'none';
    document.getElementById('editLinkBox').classList.add('hidden');

    // Show a message to the user about copying and pasting
    let msg = document.getElementById('editCopyMsg');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'editCopyMsg';
      msg.style = 'margin-bottom:1em;color:#444;font-size:1.05em;';
      msg.innerHTML = 'To edit: <b>Press the "Copy All" button below</b>, then click into the text box and <b>paste</b> (Ctrl+V or Cmd+V) to start editing.';
      document.getElementById('editArea').insertBefore(msg, document.getElementById('editToolbar'));
    } else {
      msg.style.display = '';
    }

    // Add a "Copy All" button if not present
    let copyAllBtn = document.getElementById('editCopyAllBtn');
    if (!copyAllBtn) {
      copyAllBtn = document.createElement('button');
      copyAllBtn.id = 'editCopyAllBtn';
      copyAllBtn.type = 'button';
      copyAllBtn.style = 'margin-bottom:1em;';
      copyAllBtn.textContent = 'Copy All';
      document.getElementById('editArea').insertBefore(copyAllBtn, document.getElementById('editToolbar'));
    } else {
      copyAllBtn.style.display = '';
    }

    // Copy all content from revealed editor to clipboard when button is clicked
    copyAllBtn.onclick = function() {
      let revealedQuill = null;
      if (window.Quill && document.getElementById('revealedEditor')) {
        revealedQuill = Quill.find(document.getElementById('revealedEditor'));
      }
      let textToCopy = '';
      if (revealedQuill) {
        textToCopy = revealedQuill.root.innerHTML;
      } else {
        textToCopy = document.getElementById('revealedEditor').innerHTML;
      }
      // Use clipboard API if available, else fallback
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(function() {
          copyAllBtn.textContent = 'Copied!';
          setTimeout(() => { copyAllBtn.textContent = 'Copy All'; }, 1500);
        });
      } else {
        // fallback for older browsers
        const temp = document.createElement('textarea');
        temp.value = textToCopy;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        copyAllBtn.textContent = 'Copied!';
        setTimeout(() => { copyAllBtn.textContent = 'Copy All'; }, 1500);
      }
    };

    // Setup edit Quill if not already
    if (!window.editQuill) {
      window.editQuill = new Quill('#editEditor', {
        modules: {
          toolbar: '#editToolbar',
          clipboard: { matchVisual: false }
        },
        theme: 'snow'
      });
    }
    // Clear the edit box for user to paste
    window.editQuill.setContents([{ insert: '\n' }]);
    setTimeout(() => { window.editQuill.focus(); }, 0);

    // Set password UI to match original
    const requirePw = document.getElementById('unlock').classList.contains('hidden');
    document.getElementById('editPassword').value = '';
    document.getElementById('editUsePassword').checked = true;
    document.getElementById('editPwField').style.display = '';
    document.getElementById('saveEditBtn').style.display = 'inline-block';
    document.getElementById('editLinkBox').classList.add('hidden');
    if (requirePw) {
      document.getElementById('pwUnlockField').style.display = '';
      setTimeout(() => { document.getElementById('editPassword').focus(); }, 100);
    } else {
      document.getElementById('pwUnlockField').style.display = 'none';
    }
  });

  // --- Save Edit: scroll to bottom after showing link ---
  document.getElementById('saveEditBtn') && (document.getElementById('saveEditBtn').onclick = function() {
    const html = window.editQuill.root.innerHTML.trim();
    const usePw = document.getElementById('editUsePassword').checked;
    let pw = usePw ? document.getElementById('editPassword').value : '.';
    if (!html || html === '<p><br></p>') {
      alert('Please enter some text.');
      window.editQuill.focus();
      return;
    }
    if (usePw && !pw) {
      alert('Please enter a password.');
      document.getElementById('editPassword').focus();
      return;
    }
    let password = pw;
    if (!usePw) {
      password = '.';
    }
    const encrypted = btoa(unescape(encodeURIComponent(html)));
    let idParam;
    if (usePw) {
      idParam = `1.${encrypted}.${hashPw(password)}`;
    } else {
      idParam = `0.${encrypted}`;
    }
    const link = window.location.origin + window.location.pathname + '?id=' + encodeURIComponent(idParam);
    const linkBox = document.getElementById('editLinkBox');
    linkBox.innerHTML = `
      <input id="editSecretLink" value="${link}" readonly style="width:100%;font-size:1em;margin-top:0.5em;" />
      <button id="editCopyBtn" style="margin-top:0.5em;width:100%;">Copy Link</button>
    `;
    linkBox.classList.remove('hidden');
    document.getElementById('editSecretLink').select();
    document.getElementById('editCopyBtn').onclick = function() {
      const input = document.getElementById('editSecretLink');
      input.select();
      document.execCommand('copy');
      document.getElementById('editCopyBtn').textContent = 'Copied!';
      setTimeout(() => { document.getElementById('editCopyBtn').textContent = 'Copy Link'; }, 1500);
    };
    // Scroll to the bottom of the page to show the link
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 50);
  });

  // --- Generate: scroll to bottom after showing link ---
  document.getElementById('generate').onclick = async function(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    // ...existing code for validation and link creation...
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
    const encrypted = btoa(unescape(encodeURIComponent(html)));
    let idParam;
    if (usePw) {
      idParam = `1.${encrypted}.${hashPw(password)}`;
    } else {
      idParam = `0.${encrypted}`;
    }
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
    // Scroll to the bottom of the page to show the link
    setTimeout(() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }, 50);
  };

  // ...existing code...
});
const m3 = "this is junk data";
function n4() { return 1234567890; }