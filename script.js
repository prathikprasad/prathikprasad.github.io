const projectCards = [
  {
    title: 'Augmented Reality Tool Assembly Guidance:',
    description: 'Research, Development and Evaluation of AR Gaze UI, 3D In-Situ Assembly Animations and AR UI Gaze Selection Techniques',
    url: 'https://prathikprasad.webflow.io/projects/ar',
    image: 'assets/ar-tool-assembly.webp',
    imageClass: 'contain top',
    span: 6,
    categories: ['arxr'],
    tags: ['Augmented Reality', 'Interaction Design', 'User Experience', 'Unity', 'HoloLens 2', 'Magic Leap 2']
  },
  {
    title: 'Augmented Reality 3D Viewer:',
    description: 'View 3D models in AR using a smartphone',
    url: 'projects/everllence/',
    image: 'assets/everllence-ar-viewer.gif',
    imageClass: 'cover',
    span: 6,
    categories: ['arxr', 'product'],
    tags: ['Augmented Reality', 'UI Design', 'Web', 'Unity', 'Meta Quest 3']
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
    url: 'https://prathikprasad.webflow.io/projects/master-project-vr',
    image: 'assets/vr-hand-rehab.png',
    imageClass: 'contain',
    span: 4,
    categories: ['arxr'],
    tags: ['Virtual Reality', 'User Experience', 'Figma', 'Power BI', 'Data Visualisation']
  },
  {
    title: 'Here & Now:',
    description: 'Social app to connect BMW car owners',
    url: 'https://prathikprasad.webflow.io/projects/bmw-innovation-challenge',
    image: 'assets/bmw-cover.webp',
    imageClass: 'contain',
    span: 3,
    categories: ['product'],
    tags: ['UX Design', 'UX Research', 'UI Design', 'Figma']
  },
  {
    title: 'Lost & Found:',
    description: '',
    url: 'https://prathikprasad.webflow.io/projects/hack-bay-24',
    image: 'assets/hackbay-cover.png',
    avatar: 'assets/avatar-trophy.avif',
    imageClass: 'cover',
    span: 3,
    categories: ['product'],
    tags: ['UX Research', 'Brand Design', 'Data Visualisation']
  },
  {
    title: 'Content Design: PfA Data Visualization and Content Design',
    description: '',
    url: 'https://prathikprasad.webflow.io/projects/pfa-content-design',
    image: 'assets/pfa-content.webp',
    imageClass: 'contain',
    span: 3,
    categories: ['graphic'],
    tags: ['Data Visualisation', 'Power BI', 'Figma']
  },
  {
    title: 'Public Transport Map Design',
    description: 'Bangalore Metro and Bus network map design',
    url: '#',
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
    title: 'City Saviours:',
    description: 'Metaverse game to learn how to make more green everyday choices',
    url: 'https://prathikprasad.webflow.io/projects/mataverse-hackathon-game',
    image: 'assets/city-saviours.webp',
    avatar: 'assets/avatar-trophy.avif',
    imageClass: 'contain wip',
    tags: ['Metaverse', 'Gamification', 'Roblox']
  },
  {
    title: 'WTFire!?',
    description: 'Have you ever played "Smash your PC"? We\'ve made a MxR experience where you throw virtual objects into a bonfire',
    url: '#',
    image: 'assets/wtfire.avif',
    imageClass: 'contain wip',
    wipLabel: 'WIP',
    tags: ['Mixed Reality', 'Gamification', 'WebXR']
  },
  {
    title: 'Solar Panel Digital Twin',
    description: 'Designed and Built a DigitalTwin of a house and connected it with real-time solar panel data',
    url: '#',
    image: 'assets/digitaltwin.gif',
    imageClass: 'cover wip',
    wipLabel: 'WIP',
    tags: ['Digital Twin', 'Unity', 'Hackathon']
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
  const external = card.url.startsWith('http') && !card.url.includes('prathikprasad.webflow.io');
  const targetAttrs = external ? ' target="_blank" rel="noreferrer"' : '';
  return `
    <a class="card${spanClass}${compact}" href="${card.url}"${targetAttrs} data-categories="${(card.categories || []).join(' ')}">
      ${mediaMarkup(card)}
      <div class="card-body">
        <h3>${card.title}</h3>
        ${card.description ? `<p class="desc">${card.description}</p>` : ''}
        ${createTags(card.tags)}
      </div>
    </a>`;
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
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      const filter = button.dataset.filter;
      projectGrid.classList.toggle('is-filtered', filter !== 'all');
      document.querySelectorAll('#projectGrid .card').forEach(card => {
        const categories = card.dataset.categories.split(' ');
        card.hidden = filter !== 'all' && !categories.includes(filter);
      });
    });
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
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
    cursor.classList.toggle('is-clickable', Boolean(event.target.closest(clickableSelector)));
  });

  window.addEventListener('pointerleave', () => {
    cursor.classList.remove('is-clickable');
  });
}

if (siteHeader && menuToggle && primaryNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = siteHeader.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  primaryNav.addEventListener('click', event => {
    if (event.target.closest('a')) {
      siteHeader.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
    }
  });
}
