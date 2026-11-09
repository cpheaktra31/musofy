(() => {
  'use strict';

  const grid = document.getElementById('projectsGrid');
  const button = document.getElementById('projectsToggle');
  const status = document.getElementById('projectsStatus');
  const modal = document.getElementById('projectModal');
  const modalDialog = modal?.querySelector('.project-modal-dialog');
  const modalClose = document.getElementById('projectModalClose');
  const modalNumber = document.getElementById('projectModalNumber');
  const modalTitle = document.getElementById('projectModalTitle');
  const modalDescription = document.getElementById('projectModalDescription');
  const modalGalleryStage = modal?.querySelector('.project-gallery-stage');
  const modalGalleryImage = document.getElementById('projectGalleryImage');
  const modalGalleryPrevious = document.getElementById('projectGalleryPrevious');
  const modalGalleryNext = document.getElementById('projectGalleryNext');
  const modalGalleryCounter = document.getElementById('projectGalleryCounter');
  const modalGalleryThumbnails = document.getElementById('projectGalleryThumbnails');
  const modalGalleryMeta = document.getElementById('projectModalGalleryMeta');
  if (!grid || !button) return;

  const INITIAL_COUNT = 4;
  let projects = [];
  let expanded = false;
  let activeProject = null;
  let activeImageIndex = 0;
  let activeImages = [];
  let modalTrigger = null;

  function getProjectImages(project) {
    const gallery = Array.isArray(project.gallery)
      ? project.gallery
      : (Array.isArray(project.galery) ? project.galery : []);

    return [...new Set([project.thumbnail, ...gallery]
      .filter((source) => typeof source === 'string' && source.trim())
      .map((source) => source.trim()))];
  }

  function createCard(project, index) {
    const article = document.createElement('article');
    article.className = 'project-card';
    article.dataset.projectId = String(project.id ?? index);

    const trigger = document.createElement('button');
    trigger.className = 'project-card-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'projectModal');
    trigger.setAttribute('aria-label', `View details and gallery for ${project.name || 'Untitled project'}`);

    const media = document.createElement('span');
    media.className = 'project-card-media';

    const img = document.createElement('img');
    if (project.thumbnail) img.src = project.thumbnail;
    img.alt = `Thumbnail for ${project.name || 'Untitled project'}`;
    img.loading = index < INITIAL_COUNT ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => article.classList.add('has-media-error'), { once: true });
    media.appendChild(img);

    const body = document.createElement('span');
    body.className = 'project-card-body';

    const heading = document.createElement('span');
    heading.className = 'project-card-heading';

    const number = document.createElement('span');
    number.className = 'project-card-index';
    number.textContent = String(index + 1).padStart(2, '0');

    const action = document.createElement('span');
    action.className = 'project-card-action';
    action.innerHTML = '<span>View gallery</span><i class="bi bi-arrow-up-right" aria-hidden="true"></i>';
    heading.append(number, action);

    const title = document.createElement('span');
    title.className = 'project-card-title';
    title.textContent = project.name || 'Untitled project';

    body.append(heading, title);
    trigger.append(media, body);
    trigger.addEventListener('click', () => openProjectModal(project, index, trigger));
    article.appendChild(trigger);
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
    if (status) {
      const visibleCount = expanded ? projects.length : Math.min(INITIAL_COUNT, projects.length);
      status.textContent = `Showing ${visibleCount} of ${projects.length} projects`;
    }
  }

  function updateGalleryImage(index) {
    if (!activeImages.length) {
      activeImageIndex = 0;
      modalGalleryImage.hidden = true;
      modalGalleryImage.removeAttribute('src');
      modalGalleryStage?.classList.add('is-empty');
      modalGalleryCounter.textContent = '0 / 0';
      return;
    }

    activeImageIndex = (index + activeImages.length) % activeImages.length;
    modalGalleryImage.hidden = false;
    modalGalleryImage.src = activeImages[activeImageIndex];
    modalGalleryImage.alt = `${activeProject?.name || 'Project'} image ${activeImageIndex + 1} of ${activeImages.length}`;
    modalGalleryStage?.classList.remove('is-empty');
    modalGalleryCounter.textContent = `${activeImageIndex + 1} / ${activeImages.length}`;

    modalGalleryThumbnails.querySelectorAll('.project-gallery-thumbnail').forEach((thumbnail, thumbnailIndex) => {
      const isActive = thumbnailIndex === activeImageIndex;
      thumbnail.classList.toggle('is-active', isActive);
      thumbnail.setAttribute('aria-current', isActive ? 'true' : 'false');
      if (isActive) thumbnail.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  function renderGallery() {
    modalGalleryThumbnails.replaceChildren();
    activeImages.forEach((source, index) => {
      const thumbnail = document.createElement('button');
      thumbnail.className = 'project-gallery-thumbnail';
      thumbnail.type = 'button';
      thumbnail.setAttribute('aria-label', `Show image ${index + 1} of ${activeImages.length}`);

      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      thumbnail.appendChild(image);
      thumbnail.addEventListener('click', () => updateGalleryImage(index));
      modalGalleryThumbnails.appendChild(thumbnail);
    });

    const hasMultipleImages = activeImages.length > 1;
    modalGalleryPrevious.hidden = !hasMultipleImages;
    modalGalleryNext.hidden = !hasMultipleImages;
    modalGalleryThumbnails.hidden = !hasMultipleImages;
    modalGalleryMeta.textContent = `${activeImages.length} ${activeImages.length === 1 ? 'image' : 'images'}`;
    updateGalleryImage(0);
  }

  function openProjectModal(project, index, trigger) {
    if (!modal) return;

    activeProject = project;
    activeImages = getProjectImages(project);
    modalTrigger = trigger;

    modalNumber.textContent = `PROJECT ${String(index + 1).padStart(2, '0')}`;
    modalTitle.textContent = project.name || 'Untitled project';
    modalDescription.textContent = project.description || 'No project description is available yet.';
    renderGallery();

    modal.hidden = false;
    document.body.classList.add('project-modal-open');
    modalDialog.scrollTop = 0;
    requestAnimationFrame(() => modalClose.focus({ preventScroll: true }));
  }

  function closeProjectModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('project-modal-open');
    modalTrigger?.focus({ preventScroll: true });
    modalTrigger = null;
    activeProject = null;
    activeImages = [];
  }

  function showPreviousImage() {
    updateGalleryImage(activeImageIndex - 1);
  }

  function showNextImage() {
    updateGalleryImage(activeImageIndex + 1);
  }

  function trapModalFocus(event) {
    const focusable = Array.from(modalDialog.querySelectorAll(
      'button:not([disabled]):not([hidden]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null);

    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && (document.activeElement === first || document.activeElement === modalDialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  button.addEventListener('click', () => {
    expanded = !expanded;
    updateVisibility();
  });

  modalClose?.addEventListener('click', closeProjectModal);
  modalGalleryPrevious?.addEventListener('click', showPreviousImage);
  modalGalleryNext?.addEventListener('click', showNextImage);
  modal?.querySelector('[data-project-modal-close]')?.addEventListener('click', closeProjectModal);

  document.addEventListener('keydown', (event) => {
    if (!modal || modal.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeProjectModal();
    } else if (event.key === 'ArrowLeft' && activeImages.length > 1) {
      event.preventDefault();
      showPreviousImage();
    } else if (event.key === 'ArrowRight' && activeImages.length > 1) {
      event.preventDefault();
      showNextImage();
    } else if (event.key === 'Tab') {
      trapModalFocus(event);
    }
  });

  async function init() {
    grid.setAttribute('aria-busy', 'true');
    try {
      const url = grid.dataset.projectsSrc || 'assets/data/projects.json';
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
