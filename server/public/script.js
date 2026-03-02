/**
 * Listicle App - Vanilla JavaScript
 * Fetches events from the server and displays them dynamically
 */

// Fetch and display events on page load
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndDisplayEvents();
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

    if (events.length === 0) {
      container.innerHTML = `
        <div class="no-events">
          <h2>No events found</h2>
          <p>Check back soon for upcoming community events!</p>
        </div>
      `;
      return;
    }

    // Clear loading state
    container.innerHTML = '';

    // Create and append event cards
    events.forEach(event => {
      const card = createEventCard(event);
      container.appendChild(card);
    });

    console.log(`✅ Loaded ${events.length} events`);

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
