(() => {
  'use strict';

  const section = document.getElementById('skills');
  const grid = document.getElementById('skillsGrid');
  if (!section || !grid) return;

  // Paths in fetch() are resolved relative to the HTML page, not this script.
  // Override with <div id="skillsGrid" data-skills-src="assets/json/skills.json">.
  const skillsUrl = grid.dataset.skillsSrc || 'assets/data/skills.json';
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let revealObserver = null;

  const element = (tag, className, content) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  };

  const renderSkills = (categories) => {
    if (!Array.isArray(categories)) throw new Error('skills.json must contain an array');

    const cards = categories.map((category, index) => {
      const card = element('article', 'skill-card');
      card.style.setProperty('--skill-order', index);

      const heading = element('div', 'skill-card-heading');
      const number = String(category.id ?? index + 1).padStart(2, '0');
      heading.append(
        element('span', '', number),
        element('h3', '', category.name || 'Untitled category')
      );

      const list = element('ul', 'skill-list');
      (category.skills || []).forEach((skill) => {
        const item = element('li', 'skill-item');
        if (skill.icon) {
          const icon = element('i', 'skill-icon');
          icon.setAttribute('data-lucide', skill.icon);
          icon.setAttribute('aria-hidden', 'true');
          item.append(icon);
        }
        item.append(element('span', 'skill-name', skill.name || ''));
        list.append(item);
      });

      card.append(heading, list);
      return card;
    });

    grid.replaceChildren(...cards);
    // Lucide must initialize AFTER dynamic HTML is rendered.
    if (window.lucide?.createIcons) {
      window.lucide.createIcons({ attrs: { 'stroke-width': 1.8 } });
    } else {
      console.warn('Lucide not loaded; skill labels remain visible. Add the Lucide CDN script before skills.js.');
    }
  };

  const setupCardReveal = () => {
    revealObserver?.disconnect();
    const cards = [...grid.querySelectorAll('.skill-card')];
    cards.forEach((card, index) => card.style.setProperty('--skill-order', index));

    if (reduceMotion || !('IntersectionObserver' in window)) {
      section.classList.remove('skills-motion-ready');
      cards.forEach((card) => card.classList.add('is-visible'));
      return;
    }

    section.classList.add('skills-motion-ready');
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    cards.forEach((card) => revealObserver.observe(card));
  };

  const loadSkills = async () => {
    grid.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(skillsUrl);
      if (!response.ok) throw new Error(`Could not load ${skillsUrl}: HTTP ${response.status}`);
      renderSkills(await response.json());
    } catch (error) {
      console.warn('Skills JSON could not be loaded; original HTML cards are retained.', error);
    } finally {
      grid.setAttribute('aria-busy', 'false');
      setupCardReveal();
    }
  };

  // Animate original static fallback cards too, while JSON loads.
  setupCardReveal();
  loadSkills();
})();
