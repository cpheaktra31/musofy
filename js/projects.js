(() => {
  'use strict';

  const grid = document.getElementById('projectsGrid');
  const button = document.getElementById('projectsToggle');
  const status = document.getElementById('projectsStatus');
  if (!grid || !button) return;

  const INITIAL_COUNT = 4; // Four projects initially, regardless of viewport width.
  let projects = [];
  let expanded = false;

  function createCard(project, index) {
    const article = document.createElement('article');
    article.className = 'project-card';

    const media = document.createElement('div');
    media.className = 'project-card-media';

    const img = document.createElement('img');
    img.src = project.thumbnail || '';
    img.alt = `Thumbnail for ${project.name || 'Untitled project'}`;
    img.loading = index < INITIAL_COUNT ? 'eager' : 'lazy';
    img.decoding = 'async';
    media.appendChild(img);

    const body = document.createElement('div');
    body.className = 'project-card-body';
    const number = document.createElement('span');
    number.className = 'project-card-index';
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('h3');
    title.className = 'project-card-title';
    title.textContent = project.name || 'Untitled project';
    body.append(number, title);
    article.append(media, body);

    // Available for Phase 2, if you later implement a detail/gallery modal.
    article.dataset.projectId = String(project.id ?? index);
    article.hidden = !expanded && index >= INITIAL_COUNT;
    return article;
  }

  function updateVisibility() {
    const cards = grid.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
      card.hidden = !expanded && index >= INITIAL_COUNT;
    });
    button.hidden = projects.length <= INITIAL_COUNT;
    button.textContent = expanded ? 'Show Less ↑' : 'Show More ↓';
    button.setAttribute('aria-expanded', String(expanded));
    if (status) status.textContent = `Showing ${expanded ? projects.length : Math.min(INITIAL_COUNT, projects.length)} of ${projects.length} projects`;
  }

  button.addEventListener('click', () => {
    expanded = !expanded;
    updateVisibility();
  });

  async function init() {
    grid.setAttribute('aria-busy', 'true');
    try {
      const url = 'assets/data/projects.json';
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Projects JSON must be an array');
      projects = data;
      grid.replaceChildren(...projects.map(createCard));
      updateVisibility();
    } catch (error) {
      console.error('Failed to load projects:', error);
      if (status) status.textContent = 'Unable to load projects. Check the JSON path and web server.';
      button.hidden = true;
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  init();
})();
