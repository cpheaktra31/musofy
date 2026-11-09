(() => {
  'use strict';
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
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const inputs = Object.keys(rules).map(id => document.getElementById(id));
    const results = inputs.map(validate);
    if (results.some(ok => !ok)) {
      feedback.textContent = 'Please correct the highlighted fields.';
      inputs[results.indexOf(false)].focus();
      return;
    }
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const subject = document.getElementById('contactSubject').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    const submitButton = form.querySelector('.contact-submit');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    feedback.textContent = '';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ name, email, subject, message })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not send your message. Please try again.');
      }

      feedback.textContent = result.message || 'Your message was sent successfully.';
      feedback.style.color = '#78d4a1';
      form.reset();
    } catch (error) {
      feedback.textContent = error.message || 'Network error. Please try again later.';
      feedback.style.color = '#ef8585';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });
  if (window.lucide?.createIcons) window.lucide.createIcons();
})();
