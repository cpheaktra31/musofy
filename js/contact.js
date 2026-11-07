(() => {
  'use strict';
  // REQUIRED: enter your own destination email before publishing.
  const CONTACT_EMAIL = ''; // e.g. 'hello@yourdomain.com'
  const form = document.getElementById('contactForm');
  if (!form) return;
  const feedback = document.getElementById('contactFeedback');
  const rules = {
    contactName: ['Please enter your full name.', 2],
    contactEmail: ['Please enter a valid email address.', 0],
    contactSubject: ['Please enter a subject (at least 3 characters).', 3],
    contactMessage: ['Please enter a message (at least 10 characters).', 10]
  };
  function validate(input) {
    const [message, min] = rules[input.id];
    const val = input.value.trim();
    const valid = val.length >= min && (input.id !== 'contactEmail' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val));
    const error = document.getElementById(input.id + 'Error');
    input.setAttribute('aria-invalid', String(!valid));
    if (error) error.textContent = valid ? '' : message;
    return valid;
  }
  Object.keys(rules).forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('blur', () => { if (input.value) validate(input); });
    input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') validate(input); });
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const inputs = Object.keys(rules).map(id => document.getElementById(id));
    const results = inputs.map(validate);
    if (results.some(ok => !ok)) {
      feedback.textContent = 'Please correct the highlighted fields.';
      inputs[results.indexOf(false)].focus();
      return;
    }
    if (!CONTACT_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT_EMAIL)) {
      feedback.textContent = 'Contact form is not configured yet. Add your receiving email in contact.js.';
      return;
    }
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();
    const body = `From: ${name}\nReply-to: ${email}\n\n${message}`;
    const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    feedback.textContent = 'Opening your email application. Review and send the drafted message there.';
    window.location.href = href;
  });
  if (window.lucide?.createIcons) window.lucide.createIcons();
})();
