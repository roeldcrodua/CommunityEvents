/**
 * Listicle App - Vanilla JavaScript
 * Fetches events from the server and displays them dynamically
 */

let allEvents = [];

// Fetch and display events on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndDisplayEvents();
  initializeSearch();
});

/**
 * Fetch events from the API and display them
 */
async function loadAndDisplayEvents() {
  try {
    const container = document.getElementById('events-container');
    
    // Fetch events from the API
    const response = await fetch('/api/events');
    
    if (!response.ok) {
      throw new Error('Failed to load events');
    }

    const events = await response.json();
    allEvents = sortEventsByMostRecent(Array.isArray(events) ? events : []);

    if (allEvents.length === 0) {
      container.innerHTML = `
        <div class="no-events">
          <h2>No events found</h2>
          <p>Check back soon for upcoming community events!</p>
        </div>
      `;
      return;
    }

    renderEvents(allEvents);

    console.log(`✅ Loaded ${allEvents.length} events`);

  } catch (error) {
    console.error('Error loading events:', error);
    document.getElementById('events-container').innerHTML = `
      <div class="no-events">
        <h2>Error Loading Events</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function initializeSearch() {
  const attributeSelect = document.getElementById('search-attribute');
  const queryInput = document.getElementById('search-query');

  if (!attributeSelect || !queryInput) {
    return;
  }

  const onSearchChange = () => {
    const selectedAttribute = attributeSelect.value;
    const query = queryInput.value.trim().toLowerCase();
    const filtered = filterEvents(selectedAttribute, query);
    renderEvents(filtered);
  };

  attributeSelect.addEventListener('change', onSearchChange);
  queryInput.addEventListener('input', onSearchChange);
}

function parseEventDate(event) {
  const candidate = (event?.date || event?.dateTime || '').replace(/\u00a0/g, ' ').trim();
  const timestamp = Date.parse(candidate);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function sortEventsByMostRecent(events) {
  return [...events].sort((firstEvent, secondEvent) => {
    return parseEventDate(secondEvent) - parseEventDate(firstEvent);
  });
}

function filterEvents(attribute, query) {
  if (!query) {
    return allEvents;
  }

  return allEvents.filter((event) => {
    const value = event?.[attribute];
    if (value === null || value === undefined) {
      return false;
    }

    return String(value).toLowerCase().includes(query);
  });
}

function renderEvents(events) {
  const container = document.getElementById('events-container');

  if (!container) {
    return;
  }

  if (!Array.isArray(events) || events.length === 0) {
    container.innerHTML = `
      <div class="no-events">
        <h2>No matching events found</h2>
        <p>Try a different search term or attribute.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  events.forEach((event) => {
    const card = createEventCard(event);
    container.appendChild(card);
  });
}

/**
 * Create an event card element
 * @param {Object} event - Event object containing id, name, dateTime, location, description
 * @returns {HTMLElement} Event card element
 */
function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'event-card';
  
  // Sanitize event data
  const name = escapeHtml(event.name || 'Untitled Event');
  const dateTime = escapeHtml(event.dateTime || 'Date TBA');
  const location = escapeHtml(event.location || 'Location TBA');
  const description = escapeHtml(event.description || 'No description available');
  const image = escapeHtml(event.image || '');

  // Build image HTML if image exists
  const imageHtml = image ? `<img src="${image}" alt="${name}" class="event-image" />` : '';

  card.innerHTML = `
    ${imageHtml}
    <h3>${name}</h3>
    
    <div class="event-meta">
      <div class="event-meta-item">
        <span class="event-meta-label">📅 When:</span>
        <span class="event-meta-value">${dateTime}</span>
      </div>
      <div class="event-meta-item">
        <span class="event-meta-label">📍 Where:</span>
        <span class="event-meta-value">${location}</span>
      </div>
    </div>

    <p class="event-description">${description}</p>

    <a href="/event/${event.id}" class="button">View Details →</a>
  `;

  return card;
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
