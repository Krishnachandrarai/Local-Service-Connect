const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

const serviceFilter = document.getElementById('serviceFilter');
const locationFilter = document.getElementById('locationFilter');
const searchInput = document.getElementById('searchInput');
const cards = document.querySelectorAll('.service-card');
const STORAGE_KEYS = {
  bookings: 'localServiceBookings',
  contacts: 'localServiceContacts',
};

function applyFilters() {
  const serviceValue = serviceFilter ? serviceFilter.value : 'all';
  const locationValue = locationFilter ? locationFilter.value : 'all';
  const searchValue = searchInput ? searchInput.value.trim().toLowerCase() : '';

  cards.forEach((card) => {
    const category = card.dataset.category;
    const location = card.dataset.location;
    const name = card.dataset.name.toLowerCase();
    const matchesService = serviceValue === 'all' || category === serviceValue;
    const matchesLocation = locationValue === 'all' || location === locationValue;
    const matchesSearch = !searchValue || name.includes(searchValue);

    card.classList.toggle('hidden', !(matchesService && matchesLocation && matchesSearch));
  });
}

function readStoredItems(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveStoredItems(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
}

function createSubmissionEntry(type, payload) {
  const key = type === 'booking' ? STORAGE_KEYS.bookings : STORAGE_KEYS.contacts;
  const items = readStoredItems(key);
  const prefix = type === 'booking' ? 'LSC-B' : 'LSC-C';
  const entry = {
    id: `${prefix}-${String(items.length + 1).padStart(3, '0')}`,
    status: 'To Do',
    createdAt: new Date().toISOString(),
    ...payload,
  };

  items.push(entry);
  saveStoredItems(key, items);
  return entry;
}

function renderSubmissionSummary(type) {
  const countElement = document.getElementById(`${type}SubmissionCount`);
  const listElement = document.getElementById(`${type}SubmissionList`);
  if (!countElement || !listElement) return;

  const key = type === 'booking' ? STORAGE_KEYS.bookings : STORAGE_KEYS.contacts;
  const items = readStoredItems(key);

  countElement.textContent = items.length === 0
    ? 'No requests stored yet.'
    : `${items.length} ${type === 'booking' ? 'booking' : 'contact'} request(s) stored locally.`;

  if (items.length === 0) {
    listElement.innerHTML = '<li class="submission-empty">No submissions yet.</li>';
    return;
  }

  const recentItems = [...items].slice(-3).reverse();
  listElement.innerHTML = recentItems.map((item) => {
    const summary = type === 'booking'
      ? `${item.service || 'Service'} • ${item.name}`
      : `${item.email || 'Email'} • ${item.name}`;
    return `<li><strong>${item.id}</strong><span>${summary}</span><small>${formatTimestamp(item.createdAt)} • ${item.status}</small></li>`;
  }).join('');
}

function getAllIssues() {
  const bookingItems = readStoredItems(STORAGE_KEYS.bookings).map((item) => ({ ...item, type: 'Booking' }));
  const contactItems = readStoredItems(STORAGE_KEYS.contacts).map((item) => ({ ...item, type: 'Contact' }));
  return [...bookingItems, ...contactItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function updateIssueStatus(id, newStatus) {
  const allIssues = getAllIssues();
  const target = allIssues.find((item) => item.id === id);
  if (!target) return;

  const storageKey = target.type === 'Booking' ? STORAGE_KEYS.bookings : STORAGE_KEYS.contacts;
  const items = readStoredItems(storageKey).map((item) => (item.id === id ? { ...item, status: newStatus } : item));
  saveStoredItems(storageKey, items);
  renderBoard();
  renderSubmissionSummary(target.type === 'Booking' ? 'booking' : 'contact');
}

function renderBoard() {
  const board = document.getElementById('jiraBoard');
  if (!board) return;

  const issues = getAllIssues();
  if (issues.length === 0) {
    board.innerHTML = '<p class="submission-count">No Jira issues yet.</p>';
    return;
  }

  board.innerHTML = issues.map((issue) => `
    <article class="jira-card">
      <header>
        <strong>${issue.id}</strong>
        <span>${issue.type}</span>
      </header>
      <p>${issue.name || issue.email || 'Request'}</p>
      <small>${issue.service || issue.message || 'No details'}</small>
      <label>
        <span>Status</span>
        <select data-issue-id="${issue.id}">
          <option value="To Do" ${issue.status === 'To Do' ? 'selected' : ''}>To Do</option>
          <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Done" ${issue.status === 'Done' ? 'selected' : ''}>Done</option>
        </select>
      </label>
    </article>
  `).join('');

  board.querySelectorAll('select[data-issue-id]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const targetId = event.target.getAttribute('data-issue-id');
      updateIssueStatus(targetId, event.target.value);
    });
  });
}

if (serviceFilter && locationFilter && searchInput) {
  [serviceFilter, locationFilter, searchInput].forEach((element) => {
    element.addEventListener('input', applyFilters);
    element.addEventListener('change', applyFilters);
  });
}

const bookingForm = document.getElementById('bookingForm');
const contactForm = document.getElementById('contactForm');

function showMessage(element, text) {
  if (element) {
    element.textContent = text;
  }
}

if (bookingForm) {
  bookingForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const message = document.getElementById('bookingMessage');
    const formData = new FormData(bookingForm);
    const name = formData.get('name')?.toString().trim() || '';
    const phone = formData.get('phone')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const service = formData.get('service')?.toString().trim() || '';
    const date = formData.get('date')?.toString().trim() || '';
    const time = formData.get('time')?.toString().trim() || '';
    const notes = formData.get('notes')?.toString().trim() || '';

    if (!name || !phone || !email || !service || !date || !time) {
      showMessage(message, 'Please complete all required booking details.');
      return;
    }

    const entry = createSubmissionEntry('booking', { name, phone, email, service, date, time, notes });
    showMessage(message, `Booking saved. Jira issue ${entry.id} created and moved to To Do.`);
    bookingForm.reset();
    renderSubmissionSummary('booking');
    renderBoard();
  });
}

if (contactForm) {
  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const message = document.getElementById('contactMessage');
    const formData = new FormData(contactForm);
    const name = formData.get('name')?.toString().trim() || '';
    const email = formData.get('email')?.toString().trim() || '';
    const messageText = formData.get('message')?.toString().trim() || '';

    if (!name || !email || !messageText) {
      showMessage(message, 'Please complete all required contact details.');
      return;
    }

    const entry = createSubmissionEntry('contact', { name, email, message: messageText });
    showMessage(message, `Thanks ${name}! Your inquiry was stored and linked to Jira issue ${entry.id}.`);
    contactForm.reset();
    renderSubmissionSummary('contact');
    renderBoard();
  });
}

renderSubmissionSummary('booking');
renderSubmissionSummary('contact');
renderBoard();
