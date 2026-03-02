const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// const VPSFL_CALENDAR_URL = 'https://vpsfl.org/calendar.aspx?month=3&year=2026';
const VPSFL_CALENDAR_URL = 'https://vpsfl.org/calendar.aspx';

const DEBUG = process.env.DEBUG === 'true' || process.argv.includes('--debug');

function log(message, level = 'info') {
  const colors = { info: '', warn: '⚠️ ', error: '❌ ', debug: '🔍 ', success: '✅ ' };
  console.log(`${colors[level]}${message}`);
}

function debugLog(message, data = null) {
  if (DEBUG) {
    log(`[DEBUG] ${message}`, 'debug');
    if (data) console.log(data);
  }
}

function timer(label) {
  const start = Date.now();
  return () => {
    const elapsed = Date.now() - start;
    if (DEBUG) log(`⏱️  ${label}: ${elapsed}ms`, 'debug');
  };
}

function hasNonEmptyEventData(eventData) {
  if (!eventData || typeof eventData !== 'object') {
    return false;
  }

  const fieldsToCheck = [
    eventData.name,
    eventData.date,
    eventData.description,
    eventData.location,
    eventData.specificDate,
    eventData.specificTime,
    eventData.contact,
    eventData.link
  ];

  return fieldsToCheck.some((value) => typeof value === 'string' && value.trim().length > 0);
}

function cleanDescription(value) {
  if (typeof value !== 'string') {
    return 'No description available';
  }

  const lastTabIndex = value.lastIndexOf('\t');
  const cleaned = (lastTabIndex === -1 ? value : value.slice(lastTabIndex + 1)).trim();
  return cleaned || 'No description available';
}

/**
 * Helper function to evaluate XPath and return text content
 */
function getXPathValue(xpathStr) {
  try {
    const result = document.evaluate(
      xpathStr,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const node = result.singleNodeValue;
    if (!node) return '';
    
    // Handle different node types
    if (node.nodeType === Node.ATTRIBUTE_NODE) {
      return node.value;
    } else if (node.tagName === 'IMG') {
      return node.src;
    } else {
      return node.textContent.trim();
    }
  } catch (error) {
    return '';
  }
}

/**
 * Scrape the VPSFL calendar to get event links
 */
async function getEventLinks(page) {
  try {
    const t = timer('Calendar page load');
    log('📅 Fetching VPSFL calendar page...', 'warn');
    debugLog(`URL: ${VPSFL_CALENDAR_URL}`);
    
    await page.goto(VPSFL_CALENDAR_URL, { waitUntil: 'networkidle2' });
    t();
    
    debugLog('Searching for <a> tags with text "More Details" and extracting href values');

    const eventLinks = await page.evaluate((debugMode, baseUrl) => {
      const results = [];
      const anchors = Array.from(document.querySelectorAll('a'));
      console.log(`ANCHOR: Found ${anchors.length} <a> tags on the page`, anchors);
      anchors.forEach((anchor) => {
        const text = (anchor.textContent || '').trim();
        if (text.includes('Details')) {
          const href = anchor.getAttribute('href') || '';
          if (!href) {
            return;
          }

          let absoluteHref = '';
          try {
            absoluteHref = new URL(href, baseUrl).href;
          } catch (error) {
            absoluteHref = href;
          }

          if (!results.includes(absoluteHref)) {
            results.push(absoluteHref);
          }
        }
      });

      if (debugMode) {
        console.log(`[DEBUG] Found ${results.length} unique "More Details" links`);
      }
      console.log(`RESULTS: Found ${results.length} unique "More Details" links`, results);
      return results;
    }, DEBUG, VPSFL_CALENDAR_URL);
    
    console.log(`✅ Found ${eventLinks.length} event links from "More Details" anchors`);
    return eventLinks;
  } catch (error) {
    console.error('Error getting event links:', error.message);
    return [];
  }
}

/**
 * Scrape event details from an event page
 */
async function scrapeEventDetails(page, eventUrl, eventId) {
  try {
    console.log(`🔗 Scraping event ${eventId}: ${eventUrl}`);
    
    await page.goto(eventUrl, { waitUntil: 'domcontentloaded' });

    const detailPageReady = await page.waitForFunction(() => {
      const hasTextAtSelector = (selector) => {
        try {
          const element = document.querySelector(selector);
          return !!(element && element.textContent && element.textContent.trim().length > 0);
        } catch (error) {
          return false;
        }
      };

      return (
        hasTextAtSelector('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_eventTitle') ||
        hasTextAtSelector('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_eventDate') ||
        hasTextAtSelector('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_detailBody > div.fr-view > p')
      );
    }, { timeout: 15000 }).catch(() => null);

    if (!detailPageReady) {
      debugLog(`Event ${eventId} detail fields did not load within timeout`);
    }
    const eventData = await page.evaluate((debugMode) => {
      window.DEBUG_MODE = debugMode;
      const getValue = (selector) => {
        
        try {
          const element = document.querySelector(selector);
          if (!element) {
            console.log(`[DEBUG] Selector not found: ${selector}`);
            return '';
          }
          
          console.log(`[DEBUG] Found element for selector: ${selector}`);
          
          if (element.tagName === 'IMG') {
            const src = element.getAttribute('src') || '';
            if (!src) return '';
            // Convert relative URLs to absolute URLs
            try {
              return new URL(src, window.location.href).href;
            } catch {
              return src;
            }
          }
          if (element.tagName === 'A') {
            return element.href || element.getAttribute('href') || '';
          }
          
          const text = element.textContent.trim();
          console.log(`[DEBUG] Retrieved text (${selector.substring(0, 50)}...): ${text.substring(0, 100)}`);
          return text;
        } catch (e) {
          console.log(`[DEBUG] Error with selector ${selector}: ${e.message}`);
          return '';
        }
      };

      // Special handler for description div with itemprop
      const getDescriptionFromITempProp = () => {
        const descDiv = document.querySelector('div[itemprop="description"]');
        if (!descDiv) {
          // Try alternative selectors for description
          const altDesc = 
            document.querySelector('div.detailDesc') ||
            document.querySelector('[itemprop="description"]') ||
            document.querySelector('div.eventDescription');
          
          if (altDesc && altDesc !== document.querySelector('div.detailDateDesc')) {
            console.log('[DEBUG] Found alt description element');
            return altDesc.textContent.trim();
          }
          
          console.log('[DEBUG] No description div found');
          return '';
        }
        
        console.log('[DEBUG] Found div[itemprop="description"]');
        
        // Get all text content from this specific div (not children)
        const directChildren = Array.from(descDiv.childNodes)
          .filter(node => node.nodeType === Node.ELEMENT_NODE)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0 && text !== 'Saturday' && !text.match(/^\d+.*\d+/))
          .join(' ');
        
        if (directChildren && directChildren.length > 20) {
          console.log('[DEBUG] Description from children:', directChildren.substring(0, 200));
          return directChildren;
        }
        
        // Fallback to all text content
        const fullText = descDiv.textContent.trim();
        if (fullText && fullText.length > 20) {
          console.log('[DEBUG] Description from full text:', fullText.substring(0, 200));
          return fullText;
        }
        
        return '';
      };

      return {
        name: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_eventTitle'),
        date: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_eventDate'),
        description: getDescriptionFromITempProp() || getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_detailBody > div.fr-view > p') || getValue('div.detailDateDesc'),
        image: (() => {
          const imgElement =
            document.querySelector('div.specificDetailImage img[src*="ImageRepository/Document"]') ||
            document.querySelector('img#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_eventImage[src*="ImageRepository/Document"]') ||
            document.querySelector('img[itemprop="image"][src*="ImageRepository/Document"]') ||
            document.querySelector('img[src*="/ImageRepository/Document?documentID="]');
          if (imgElement) {
            const src = imgElement.getAttribute('src') || imgElement.getAttribute('data-src');
            if (src) {
              try {
                const absoluteUrl = new URL(src, window.location.href).href;
                // Trim URL to keep only up to documentID parameter
                const match = absoluteUrl.match(/^([^&]*documentID=[^&]*)/);
                return match ? match[1] : absoluteUrl;
              } catch (e) {
                return src;
              }
            }
          }
          return '';
        })(),
        location: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_divAddress > div.specificDetailItem > span'),
        specificDate: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_dateDiv'),
        specificTime: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_time > div.specificDetailItem'),
        contact: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_contactDiv'),
        link: getValue('#ctl00_ctl00_MainContent_ModuleContent_ctl00_ctl04_lnkLink')
      };
    });

    if (!hasNonEmptyEventData(eventData)) {
      debugLog(`Event ${eventId} returned empty data payload`);
      return null;
    }

    return eventData;
  } catch (error) {
    console.error(`Error scraping event ${eventId}:`, error.message);
    return null;
  }
}

/**
 * Main scraping function
 */
async function scrapeCalendarEvents() {
  let browser;
  const startTime = Date.now();
  
  try {
    log('🚀 Starting web scraper...', 'success');
    if (DEBUG) {
      log('DEBUG MODE ENABLED - Detailed logs will be shown', 'debug');
      debugLog(`Target URL: ${VPSFL_CALENDAR_URL}`);
    }
    
    const t = timer('Browser launch');
    browser = await puppeteer.launch({ headless: true });
    t();
    
    const page = await browser.newPage();
    debugLog('Page created successfully');
    
    // Get event links from the calendar
    const eventLinks = await getEventLinks(page);
    
    if (eventLinks.length === 0) {
      console.log('⚠️  No event links found. Using fallback sample data...');
      return getSampleEvents();
    }
    
    const events = [];
    
    // Scrape each event
    for (let i = 0; i < eventLinks.length; i++) {
      const eventData = await scrapeEventDetails(page, eventLinks[i], i + 1);
      
      if (hasNonEmptyEventData(eventData)) {
        events.push({
          id: i + 1,
          name: eventData.name || 'Untitled Event',
          dateTime: `${eventData.specificDate} ${eventData.specificTime}`.trim(),
          date: eventData.date,
          description: cleanDescription(eventData.description),
          location: eventData.location || 'Location TBA',
          image: eventData.image || '',
          url: eventData.link || eventLinks[i],
          contact: eventData.contact || ''
        });
      } else {
        debugLog(`Skipping event ${i + 1} because data is empty`);
      }
    }
    
    await browser.close();
    
    if (events.length === 0) {
      console.log('⚠️  No events scraped. Using fallback sample data...');
      return getSampleEvents();
    }
    
    return events;
  } catch (error) {
    console.error('Fatal error during scraping:', error.message);
    if (browser) {
      await browser.close();
    }
    return getSampleEvents();
  }
}

/**
 * Fallback sample data
 */
function getSampleEvents() {
  return [
    {
      id: 1,
      name: "Artist Portfolio Exhibition",
      dateTime: "February 1, 2026 - 10:00 AM",
      description: "Showcase of local artists' work featuring paintings, sculptures, and digital art.",
      location: "Downtown Arts Center, Miami, FL",
      image: "",
      url: ""
    },
    {
      id: 2,
      name: "Community Clean-up Drive",
      dateTime: "February 8, 2026 - 8:00 AM",
      description: "Join us for a community-wide effort to clean local parks and beaches.",
      location: "Bayfront Park, Miami, FL",
      image: "",
      url: ""
    },
    {
      id: 3,
      name: "Tech Workshop: Web Development",
      dateTime: "February 15, 2026 - 2:00 PM",
      description: "Learn the basics of HTML, CSS, and JavaScript from industry professionals.",
      location: "Innovation Hub, Downtown Miami, FL",
      image: "",
      url: ""
    },
    {
      id: 4,
      name: "Jazz Night Live Performance",
      dateTime: "February 21, 2026 - 7:00 PM",
      description: "Enjoy an evening of smooth jazz with the Miami Jazz Collective.",
      location: "Blue Moon Jazz Club, Miami Beach, FL",
      image: "",
      url: ""
    },
    {
      id: 5,
      name: "Spring Festival & Market Fair",
      dateTime: "February 28, 2026 - 11:00 AM",
      description: "Local vendors, food trucks, live music, and family activities. Free admission!",
      location: "Coconut Grove Park, Miami, FL",
      image: "",
      url: ""
    },
    {
      id: 6,
      name: "Sustainable Living Workshop",
      dateTime: "March 1, 2026 - 3:00 PM",
      description: "Learn about eco-friendly practices, composting, and sustainable home improvements.",
      location: "Environmental Center, Miami, FL",
      image: "",
      url: ""
    }
  ];
}

async function main() {
  const events = await scrapeCalendarEvents();
  
  const dataPath = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  const jsonPath = path.join(dataPath, 'events.json');
  fs.writeFileSync(jsonPath, JSON.stringify(events, null, 2));
  
  console.log(`
✅ Scraping complete!
📊 ${events.length} events saved to ${jsonPath}
`);
  
  return events;
}

// Export the main function for use in other modules
module.exports = main;

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
