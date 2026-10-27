(() => {
  'use strict';

  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menuButton');
  const scrim = document.getElementById('mobileScrim');
  const nav = document.getElementById('guideNav');
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const search = document.getElementById('guideSearch');
  const sections = [...document.querySelectorAll('.doc-section[id]')];
  const dialog = document.getElementById('imageDialog');
  const dialogImage = dialog.querySelector('img');

  function setMenuOpen(open) {
    sidebar.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    scrim.hidden = !open;
  }

  menuButton.addEventListener('click', () => {
    setMenuOpen(!sidebar.classList.contains('open'));
  });
  scrim.addEventListener('click', () => setMenuOpen(false));
  links.forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 840 && sidebar.classList.contains('open')) setMenuOpen(false);
  });

  function normalize(value) {
    return value.toLocaleLowerCase().replace(/\s+/g, '');
  }

  const searchable = new Map(sections.map(section => [section.id, normalize(`${section.dataset.title || ''} ${section.innerText}`)]));
  search.addEventListener('input', () => {
    const term = normalize(search.value.trim());
    links.forEach(link => {
      const sectionId = link.getAttribute('href').slice(1);
      link.hidden = Boolean(term) && !searchable.get(sectionId)?.includes(term);
    });
  });

  document.addEventListener('keydown', event => {
    const editable = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
    if (event.key === '/' && !editable && !event.altKey && !event.ctrlKey && !event.metaKey && !dialog.open) {
      event.preventDefault();
      if (window.innerWidth <= 840) setMenuOpen(true);
      search.focus();
    }
    if (event.key === 'Escape') {
      if (sidebar.classList.contains('open')) setMenuOpen(false);
      if (document.activeElement === search && search.value) {
        search.value = '';
        search.dispatchEvent(new Event('input'));
      }
    }
  });

  function activate(id) {
    links.forEach(link => {
      const selected = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length) activate(visible[0].target.id);
    }, { rootMargin: '-100px 0px -63% 0px', threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }

  const initialId = location.hash.slice(1);
  activate(sections.some(section => section.id === initialId) ? initialId : 'overview');
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (sections.some(section => section.id === id)) activate(id);
  });

  document.querySelectorAll('a[data-lightbox]').forEach(link => {
    link.addEventListener('click', event => {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      const source = link.querySelector('img');
      dialogImage.src = link.href;
      dialogImage.alt = source?.alt || 'EKMAME 화면 이미지';
      dialog.showModal();
    });
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target === dialogImage) dialog.close();
  });
  dialog.addEventListener('close', () => {
    dialogImage.removeAttribute('src');
  });
})();
