document.addEventListener('DOMContentLoaded', () => {
  const CSRF_TOKEN = (document.querySelector('meta[name="csrf-token"]') || {}).content || null;
  const BATCH_PRICE = 200;
  const EDITS_PER_BATCH = 5;
  const ORIGINAL_PRICE = 300;

  const profileForm = document.getElementById('profileForm');
  const photoInput = document.getElementById('photoInput');
  const photoPreview = document.getElementById('photoPreview');
  const batchCountEl = document.getElementById('batchCount');
  const batchMinus = document.getElementById('batchMinus');
  const batchPlus = document.getElementById('batchPlus');
  const batchTotalPrice = document.getElementById('batchTotalPrice');
  const batchTotalEdits = document.getElementById('batchTotalEdits');
  const btnBuyEdits = document.getElementById('btnBuyEdits');
  const passwordToggle = document.getElementById('passwordToggle');
  const passwordPanel = document.getElementById('passwordPanel');
  const btnSavePassword = document.getElementById('btnSavePassword');

  let batches = 1;

  function updateBatchDisplay() {
    const total = batches * BATCH_PRICE;
    const edits = batches * EDITS_PER_BATCH;
    if (batchCountEl) batchCountEl.textContent = batches;
    if (batchTotalPrice) {
      batchTotalPrice.innerHTML = `₦${total.toLocaleString()} <small>₦${(batches * ORIGINAL_PRICE).toLocaleString()}</small> / <span id="batchTotalEdits" style="font-weight: 400;">${edits} edits</span> total`;
    }
    if (batchMinus) batchMinus.disabled = batches <= 1;
    if (batchPlus) batchPlus.disabled = batches >= 10;
  }

  if (batchMinus) {
    batchMinus.addEventListener('click', () => {
      if (batches > 1) { batches -= 1; updateBatchDisplay(); }
    });
  }

  if (batchPlus) {
    batchPlus.addEventListener('click', () => {
      if (batches < 10) { batches += 1; updateBatchDisplay(); }
    });
  }

  updateBatchDisplay();

  document.querySelectorAll('[data-edit-field]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.getAttribute('data-edit-field');
      const valueEl = document.getElementById(`${field}Value`);
      const inputEl = document.getElementById(`${field}Input`);
      if (!valueEl || !inputEl) return;

      const editing = btn.getAttribute('data-editing') === 'true';
      if (editing) {
        const next = inputEl.value.trim() || valueEl.textContent;
        valueEl.textContent = next;
        inputEl.value = next;
        valueEl.classList.remove('hidden');
        inputEl.classList.add('hidden');
        btn.textContent = 'Edit';
        btn.setAttribute('data-editing', 'false');
      } else {
        inputEl.value = valueEl.textContent.trim();
        valueEl.classList.add('hidden');
        inputEl.classList.remove('hidden');
        inputEl.focus();
        btn.textContent = 'Done';
        btn.setAttribute('data-editing', 'true');
      }
    });
  });

  if (photoInput && photoPreview) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      photoPreview.src = URL.createObjectURL(file);
    });
  }

  if (passwordToggle && passwordPanel) {
    passwordToggle.addEventListener('click', () => {
      const open = passwordToggle.getAttribute('aria-expanded') === 'true';
      passwordToggle.setAttribute('aria-expanded', String(!open));
      passwordPanel.classList.toggle('open', !open);
    });
  }

  if (btnSavePassword) {
    btnSavePassword.addEventListener('click', async () => {
      const oldPassword = document.getElementById('oldPassword')?.value || '';
      const newPassword = document.getElementById('newPassword')?.value || '';
      if (!oldPassword || !newPassword) {
        alert('Please fill in both password fields.');
        return;
      }
      if (newPassword.length < 6) {
        alert('New password must be at least 6 characters.');
        return;
      }
      btnSavePassword.disabled = true;
      try {
        const res = await fetch('/dashboard/password/update', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': CSRF_TOKEN },
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not update password');
        alert('Password updated successfully.');
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        passwordToggle.setAttribute('aria-expanded', 'false');
        passwordPanel.classList.remove('open');
      } catch (err) {
        alert(err.message || 'Could not update password.');
      } finally {
        btnSavePassword.disabled = false;
      }
    });
  }

  if (btnBuyEdits) {
    btnBuyEdits.addEventListener('click', async () => {
      btnBuyEdits.disabled = true;
      btnBuyEdits.textContent = 'Opening checkout…';
      try {
        const res = await fetch('/payments/initiate', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': CSRF_TOKEN },
          body: JSON.stringify({ batches })
        });
        const data = await res.json();
        if (!res.ok || !data.authorization_url) throw new Error(data.error || 'Payment failed to start');
        window.location.href = data.authorization_url;
      } catch (err) {
        alert(err.message || 'Could not start payment.');
        btnBuyEdits.disabled = false;
        btnBuyEdits.textContent = 'Buy edits';
      }
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      document.querySelectorAll('[data-edit-field]').forEach((btn) => {
        const field = btn.getAttribute('data-edit-field');
        const valueEl = document.getElementById(`${field}Value`);
        const inputEl = document.getElementById(`${field}Input`);
        if (valueEl && inputEl && btn.getAttribute('data-editing') === 'true') {
          inputEl.value = inputEl.value.trim() || valueEl.textContent.trim();
        }
      });

      const usernameInput = document.getElementById('usernameInput');
      const usernameValue = document.getElementById('usernameValue');
      const originalUsername = profileForm.dataset.originalUsername;
      const currentUsername = usernameInput && !usernameInput.classList.contains('hidden')
        ? usernameInput.value.trim()
        : (usernameValue ? usernameValue.textContent.trim() : '');

      if (currentUsername !== originalUsername) {
        const editsLeft = parseInt(profileForm.dataset.editsLeft, 10) || 0;
        if (editsLeft <= 0) {
          e.preventDefault();
          alert('No edits left. Buy more edits to change your username.');
          return;
        }
        if (!confirm(`Changing your username uses 1 edit. You have ${editsLeft} edit(s) left. Continue?`)) {
          e.preventDefault();
        }
      }
    });
  }
});
