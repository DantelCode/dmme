document.addEventListener('DOMContentLoaded', () => {
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  function showLogin() {
    if (loginTab) loginTab.classList.add('active');
    if (signupTab) signupTab.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    if (signupForm) signupForm.classList.remove('active');
  }

  function showSignup() {
    if (signupTab) signupTab.classList.add('active');
    if (loginTab) loginTab.classList.remove('active');
    if (signupForm) signupForm.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
  }

  if (loginTab) loginTab.addEventListener('click', showLogin);
  if (signupTab) signupTab.addEventListener('click', showSignup);

  const showSignupLink = document.getElementById('showSignup');
  const showLoginLink = document.getElementById('showLogin');
  if (showSignupLink) showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
  if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

  const password = document.getElementById('password');
  if (password) password.addEventListener('input', () => {
    const value = password.value || '';
    const elLength = document.getElementById('length');
    const elUpper = document.getElementById('upper');
    const elLower = document.getElementById('lower');
    const elNumber = document.getElementById('number');
    const elSpecial = document.getElementById('special');
    if (elLength) elLength.classList.toggle('valid', value.length >= 8);
    if (elUpper) elUpper.classList.toggle('valid', /[A-Z]/.test(value));
    if (elLower) elLower.classList.toggle('valid', /[a-z]/.test(value));
    if (elNumber) elNumber.classList.toggle('valid', /[0-9]/.test(value));
    if (elSpecial) elSpecial.classList.toggle('valid', /[^A-Za-z0-9]/.test(value));
  });

});
