const projectCards = [
  {
    title: 'Augmented Reality Tool Assembly Guidance:',
    description: 'Research, Development and Evaluation of AR Gaze UI, 3D In-Situ Assembly Animations and AR UI Gaze Selection Techniques',
    url: 'projects/ar/',
    image: 'assets/ar-tool-assembly.webp',
    imageClass: 'contain top',
    span: 6,
    categories: ['arxr'],
    tags: ['Augmented Reality', 'Interaction Design', 'User Experience', 'Unity', 'HoloLens 2', 'Magic Leap 2']
  },
  {
    title: 'Augmented Reality 3D Viewer:',
    description: 'A Zero-to-One Web Augmented Reality Experience in a Museum',
    url: 'projects/everllence/',
    image: 'assets/everllence-ar-viewer.gif',
    imageClass: 'cover',
    span: 6,
    categories: ['arxr', 'product'],
    tags: ['Augmented Reality', 'UI Design', 'Web', 'Smartphone']
  },
  {
    title: 'DuckXR:',
    description: 'A Mixed Reality ideation experience based on rubber-duck-debugging',
    url: 'https://duckxr.framer.website/',
    image: 'assets/duckxr.avif',
    imageClass: 'cover',
    span: 4,
    categories: ['arxr', 'product'],
    tags: ['Mixed Reality', 'User Experience', 'Figma', 'Unity', 'Meta Quest 3']
  },
  {
    title: 'VR Hand Rehabilitation Exergame:',
    description: 'VR mini-exergames and data dashboard for therapists',
    url: 'projects/vr-rehab/',
    image: 'assets/vr-hand-rehab.png',
    imageClass: 'contain',
    span: 4,
    categories: ['arxr'],
    tags: ['Virtual Reality', 'User Experience', 'Figma', 'Power BI', 'Data Visualisation']
  },
  {
    title: 'Mean Hand Symbols:',
    description: 'A mathematical symbol system written by no single hand',
    url: 'projects/mean-hand-symbols/',
    image: 'assets/mean-hand-symbols/regular.svg',
    imageClass: 'contain',
    span: 4,
    categories: ['graphic'],
    tags: ['Experimental Typeface', 'Python', 'ChatGPT Codex', 'AI Coding Assistant']
  },
  {
    title: 'Public Transport Map Design',
    description: 'Bangalore Metro and Bus network map design',
    image: 'assets/portfolio-map-wide.svg',
    imageClass: 'contain wip',
    wipLabel: 'WIP',
    span: 3,
    categories: ['graphic'],
    tags: ['Map Visualisation', 'Figma', 'Python']
  }
];

const experimentCards = [
  {
    title: 'WTFire!?',
    description: 'Have you ever played "Smash your PC"? We\'ve made a MxR experience where you throw virtual objects into a bonfire',
    url: 'projects/wtfire/',
    image: 'assets/wtfire.avif',
    imageClass: 'contain wip',
    tags: ['Mixed Reality', 'Gamification', 'WebXR']
  },
  {
    title: 'City Saviours:',
    description: 'Metaverse game to learn how to make more green everyday choices',
    url: 'projects/city-saviours/',
    image: 'assets/city-saviours.webp',
    avatar: 'assets/avatar-trophy.avif',
    imageClass: 'contain wip',
    tags: ['Metaverse', 'Gamification', 'Roblox']
  },
  {
    title: 'Solar Panel Digital Twin',
    description: 'Designed and Built a DigitalTwin of a house and connected it with real-time solar panel data',
    image: 'assets/digitaltwin.gif',
    imageClass: 'cover wip',
    wipLabel: 'WIP',
    tags: ['Digital Twin', 'Unity', 'Hackathon']
  },
  {
    title: 'Here & Now:',
    description: 'Social app to connect BMW car owners',
    url: 'projects/bmw/',
    image: 'assets/bmw-cover.webp',
    imageClass: 'contain',
    tags: ['UX Design', 'UX Research', 'UI Design', 'Figma']
  },
  {
    title: 'Lost & Found:',
    description: 'Crate-tracking concept for Schaeffler, winner of the Best Use Case prize',
    url: 'projects/hackbay/',
    image: 'assets/hackbay-cover.png',
    avatar: 'assets/avatar-trophy.avif',
    imageClass: 'cover',
    tags: ['UX Research', 'Brand Design', 'Data Visualisation']
  },
  {
    title: 'Content Design: PfA Data Visualization and Content Design',
    url: 'projects/pfa/',
    image: 'assets/pfa-content.webp',
    imageClass: 'contain',
    tags: ['Data Visualisation', 'Power BI', 'Figma']
  }
];

function createTags(tags) {
  return `<div class="tags">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
}

function mediaMarkup(card) {
  const label = card.wipLabel ? ` data-label="${card.wipLabel}"` : '';
  const wipClass = card.wipLabel ? ' wip' : '';
  const imageClass = card.imageClass ? ` ${card.imageClass}` : '';
  const avatar = card.avatar ? `<span class="avatar-badge"><img src="${card.avatar}" alt="" /></span>` : '';
  return `<div class="card-media${wipClass}${imageClass}"${label}><img src="${card.image}" alt="" loading="lazy" />${avatar}</div>`;
}

function cardMarkup(card, isExperiment = false) {
  const spanClass = isExperiment ? '' : ` span-${card.span}`;
  const compact = card.span === 3 && !isExperiment ? ' compact' : '';
  // Cards without a url (work in progress) are plain blocks, not links to nowhere.
  const tag = card.url ? 'a' : 'div';
  const external = card.url?.startsWith('http') && !card.url.includes('prathikprasad.webflow.io');
  const linkAttrs = card.url ? ` href="${card.url}"${external ? ' target="_blank" rel="noreferrer"' : ''}` : '';
  // Work cards sit directly under the page h1; experiment cards sit under their section's h2.
  const heading = isExperiment ? 'h3' : 'h2';
  return `
    <${tag} class="card${spanClass}${compact}"${linkAttrs} data-categories="${(card.categories || []).join(' ')}">
      ${mediaMarkup(card)}
      <div class="card-body">
        <${heading}>${card.title}</${heading}>
        ${card.description ? `<p class="desc">${card.description}</p>` : ''}
        ${createTags(card.tags)}
      </div>
    </${tag}>`;
}

const projectGrid = document.getElementById('projectGrid');
const experimentGrid = document.getElementById('experimentGrid');
if (projectGrid) {
  projectGrid.innerHTML = projectCards.map(card => cardMarkup(card)).join('');
}
if (experimentGrid) {
  experimentGrid.innerHTML = experimentCards.map(card => cardMarkup(card, true)).join('');
}

if (projectGrid) {
  const filterButtons = document.querySelectorAll('.tab');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
      const filter = button.dataset.filter;
      projectGrid.classList.toggle('is-filtered', filter !== 'all');
      document.querySelectorAll('#projectGrid .card').forEach(card => {
        const categories = card.dataset.categories.split(' ');
        card.hidden = filter !== 'all' && !categories.includes(filter);
      });
    });
  });
}

const marqueeToggle = document.querySelector('.marquee-toggle');
if (marqueeToggle) {
  marqueeToggle.addEventListener('click', () => {
    const paused = marqueeToggle.parentElement.classList.toggle('is-paused');
    marqueeToggle.textContent = paused ? 'Play' : 'Pause';
  });
}

// Visitors who ask for reduced motion get the videos paused on their poster; the controls still play them.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('video[autoplay]').forEach(video => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

const cursorWrapper = document.querySelector('.cursor-wrapper');
const cursor = document.querySelector('.cursor');
const siteHeader = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const primaryNav = document.getElementById('primaryNav');

if (cursorWrapper && cursor) {
  const clickableSelector = 'a, button, [role="button"], [tabindex]:not([tabindex="-1"])';

  window.addEventListener('pointermove', event => {
    cursor.style.translate = `${event.clientX}px ${event.clientY}px`;
    cursor.classList.add('is-active');
    cursor.classList.toggle('is-clickable', Boolean(event.target.closest(clickableSelector)));
  });

  window.addEventListener('pointerleave', () => {
    cursor.classList.remove('is-clickable');
  });
}

if (siteHeader && menuToggle && primaryNav) {
  const isMenuOpen = () => siteHeader.classList.contains('menu-open');
  const setMenu = open => {
    siteHeader.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  };

  menuToggle.addEventListener('click', () => setMenu(!isMenuOpen()));

  primaryNav.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('click', event => {
    if (isMenuOpen() && !siteHeader.contains(event.target)) setMenu(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isMenuOpen()) {
      setMenu(false);
      menuToggle.focus();
    }
  });
}
