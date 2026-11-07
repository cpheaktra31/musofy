(() => {
  const section = document.getElementById('about');
  const content = document.getElementById('meContent');
  if (!section || !content) return;

  const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const formatInlineMarkdown = (value) => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>');

  const renderMarkdown = (markdown) => markdown
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const text = block.trim().replace(/\n/g, ' ');
      const heading = text.match(/^###\s+(.+)$/);

      if (heading) {
        const [title, subtitle = ''] = heading[1].split(/\s+—\s+/, 2);
        const subtitleMarkup = subtitle
          ? `<p><strong>${formatInlineMarkdown(subtitle)}</strong></p>`
          : '';

        return `<h2 id="meHeading">${formatInlineMarkdown(title)}</h2>${subtitleMarkup}`;
      }

      const quoteClass = /^\*\*[\s\S]+\*\*$/.test(text) ? ' class="me-quote"' : '';
      return `<p${quoteClass}>${formatInlineMarkdown(text)}</p>`;
    })
    .join('');

  const loadMeContent = async () => {
    content.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch('assets/md/me.md');
      if (!response.ok) throw new Error(`Unable to load Me content (${response.status})`);

      const markdown = await response.text();
      content.innerHTML = renderMarkdown(markdown);
    } catch (error) {
      // Keep the accessible HTML fallback when the page is opened without a server.
      console.warn(error.message);
    } finally {
      content.setAttribute('aria-busy', 'false');
    }
  };

  const revealItems = [...section.querySelectorAll('.me-reveal')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    section.classList.add('me-motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18 });

    revealItems.forEach((item) => observer.observe(item));
  }

  loadMeContent();
})();
