let questionsData = [];
let previousQuestionCount = 0;  // Track previous number of questions
let refreshInterval;
let isConnected = false;

const apiKey = 'YOUR-API-KEY'; // Replace this with your real API key

const connectBtn = document.getElementById('connect-btn');
const statusEl = document.getElementById('status');
const questionsList = document.getElementById('questions-list');

document.addEventListener('DOMContentLoaded', () => {
  const configHeader = document.querySelector('.config-header');
  const configContent = document.querySelector('.config-content');

  configHeader.addEventListener('click', () => {
      configHeader.classList.toggle('collapsed');
      configContent.classList.toggle('collapsed');
  });
});

connectBtn.addEventListener('click', connectToSheet);
document.getElementById('sort-method').addEventListener('change', renderQuestions);

function connectToSheet() {
  const sheetId = document.getElementById('sheet-id').value.trim();
  const sheetTab = 'Form Responses 1';
  
  if (!sheetId) {
    updateStatus('Please enter a valid Google Sheet ID', 'error');
    return;
  }
  
  updateStatus('Connecting to Google Sheet...', 'connecting');
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTab)}?key=${apiKey}`;
  
  fetch(apiUrl)
    .then(res => {
      if (!res.ok) {
        throw new Error(`API returned status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      // Check if we have data values at all
      if (!data.values || data.values.length === 0) {
        updateStatus('Connected, but the sheet appears to be empty.', 'warning');
        handleEmptySheet(sheetId, sheetTab);
        return;
      }
      
      // Success case - we have headers and at least one row of data
      handleSuccessfulConnection(sheetId, sheetTab);
    })
    .catch(err => {
      console.error('Connection error:', err);
      updateStatus(`Error: ${err.message}`, 'error');
    });
}


function handleEmptySheet(sheetId, sheetTab) {
  // Still mark as connected but with no data
  isConnected = true;
  questionsData = [];
  renderQuestions(); // Render an empty state
  
  // Set up polling in case data gets added later
  const refreshRate = parseInt(document.getElementById('refresh-rate').value) || 5;
  clearInterval(refreshInterval);
  refreshInterval = setInterval(fetchQuestions, refreshRate * 500);
  
  // Maybe show a helpful message in the UI
  updateStatus('Connected to Google Sheet! Questions will refresh automatically.', 'connected');

}

function handleSuccessfulConnection(sheetId, sheetTab) {
  isConnected = true;
  updateStatus('Connected to Google Sheet! Questions will refresh automatically.', 'connected');
  fetchQuestions();

  const refreshRate = parseInt(document.getElementById('refresh-rate').value) || 5;
  clearInterval(refreshInterval);
  refreshInterval = setInterval(fetchQuestions, refreshRate * 500);
}

function fetchQuestions() {
  if (!isConnected) return;

  const sheetId = document.getElementById('sheet-id').value.trim();
  const sheetTab = 'Form Responses 1';
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTab)}?key=${apiKey}`;

  fetch(apiUrl)
    .then(res => res.json())
    .then(data => processQuestions(data.values))
    .catch(err => {
      console.error(err);
      updateStatus(`Error: ${err.message}`, 'error');
    });
}

function processQuestions(rows) {
  const questionColumn = document.getElementById('question-column').value.trim() || 'Your question';
  const timestampColumn = 'Timestamp';

  const headers = rows[0];
  const questionIndex = headers.indexOf(questionColumn);
  const timestampIndex = headers.indexOf(timestampColumn);

  if (questionIndex === -1) {
    updateStatus(`Error: Column "${questionColumn}" not found.`, 'error');
    return;
  }

  // Store the previous questions to compare with new data
  const prevQuestionMap = new Map();
  questionsData.forEach(q => {
    const key = getQuestionKey(q);
    prevQuestionMap.set(key, q);
  });

  // Keep track of removed questions
  const removedQuestions = new Set();
  questionsData.forEach(q => {
    if (q.removed) removedQuestions.add(getQuestionKey(q));
  });

  // Process the current data from the sheet
  const newQuestionsData = rows.slice(1).map((row, i) => {
    const question = row[questionIndex] || '';
    const timestamp = row[timestampIndex] || new Date().toISOString();

    const key = getQuestionKey({question, timestamp});
    const existing = prevQuestionMap.get(key);

    // Preserve removed status
    const isRemoved = removedQuestions.has(key);

    return {
      id: i,
      question,
      timestamp,
      votes: existing ? existing.votes : 0,
      answered: existing ? existing.answered : false,
      isNew: !existing && prevQuestionMap.size > 0, // Mark as new if not in previous data
      removed: isRemoved || (existing ? existing.removed : false)
    };
  }).filter(q => q.question && !q.removed); // Don't include removed questions

  // Check if we have new entries
  const newEntries = newQuestionsData.filter(q => q.isNew);
  if (newEntries.length > 0) {
    updateStatus(`Connected! ${newEntries.length} new question(s) received.`, 'new-entries');
    playNotificationSound();
  }

  // Update the global questionsData
  questionsData = newQuestionsData;

  renderQuestions();
}

function getQuestionKey(question) {
  return `${question.question}_${question.timestamp}`;
}

let isFirstLoad = true;

function renderQuestions() {
  if (questionsData.length === 0) {
    questionsList.innerHTML = '<div class="no-questions">No questions found. Questions will appear here when submitted.</div>';
    return;
  }

  const sortMethod = document.getElementById('sort-method').value;

  const sorted = [...questionsData].sort((a, b) => {
    // Move unanswered questions to the top
    if (a.answered && !b.answered) return 1;
    if (!a.answered && b.answered) return -1;

    // Within same answered status, sort by timestamp
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);

    if (sortMethod === 'newest') {
      return dateB - dateA;
    } else if (sortMethod === 'oldest') {
      return dateA - dateB;
    }

    return 0;
  });

  // Create HTML
  questionsList.innerHTML = sorted.map((q, index) => {
    const time = new Date(q.timestamp);
    const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const initialLoadClass = isFirstLoad ? 'init-load' : '';

    return `
      <div class="question ${q.answered ? 'answered' : ''} ${q.isNew ? 'new-entry' : ''} ${initialLoadClass}"
           data-id="${q.id}""
           style="${q.isNew ? 'opacity: 0; transform: translateY(-20px);' : ''}">
        <div class="question-text">${escapeHtml(q.question)}</div>
        <div class="question-meta">
          ${q.isNew ? '<span class="new-badge">New</span>' : ''}
          <span class="question-time">${formattedDate} at ${formattedTime}</span>
        </div>
        <div class="admin-actions">
          <i class="fa-solid fa-minus" onclick="toggleAnswered(${q.id}, event)" title="${q.answered ? 'Mark as unanswered' : 'Mark as answered'}"></i>
        </div>
      </div>
    `;
  }).join('');

  // Animations and event listeners
  setTimeout(() => {
    document.querySelectorAll('.new-entry').forEach(el => {
      el.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    if (isFirstLoad) {
      document.querySelectorAll('.question.init-load').forEach((el, i) => {
        const delay = 50 + (i * 100);
        setTimeout(() => {
          el.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          setTimeout(() => el.classList.remove('init-load'), 500);
        }, delay);
      });
      isFirstLoad = false;
    }

    setTimeout(() => {
      questionsData.forEach(q => {
        if (q.isNew) q.isNew = false;
      });
    }, 2000);

    addQuestionClickListeners();
  }, 50);
}

// Function to add click event listeners to all question cards
function addQuestionClickListeners() {
  const questionCards = document.querySelectorAll('.question');

  questionCards.forEach(card => {
    card.addEventListener('click', function(event) {
      // Don't open modal if clicking on admin actions
      if (!event.target.closest('.admin-actions')) {
        const questionId = parseInt(this.getAttribute('data-id'));
        const questionData = questionsData.find(q => q.id === questionId);

        openQuestionModal(questionData);
      }
    });
  });
}

function updateStatus(msg, type) {
   statusEl.textContent = msg;
   statusEl.className = `status ${type}`;
}

// Keep track of elements being animated
let animatingElements = new Set();

// Get the height of an element including margins
function getElementHeight(el) {
  const styles = window.getComputedStyle(el);
  const marginTop = parseFloat(styles.marginTop);
  const marginBottom = parseFloat(styles.marginBottom);
  return el.offsetHeight + marginTop + marginBottom;
}

// Modified toggle function that adds animation
function toggleAnswered(id, event) {
  // Stop event propagation
  if (event) {
    event.stopPropagation();
  }
  
  // Find the element
  const questionEl = document.querySelector(`.question[data-id="${id}"]`);
  if (!questionEl) return;

  // If element is already being animated, ignore the click
  if (animatingElements.has(id)) return;

  // Mark this element as being animated
  animatingElements.add(id);

  // Get element's height and position
  const questionHeight = getElementHeight(questionEl);
  const questionRect = questionEl.getBoundingClientRect();

  // Find all elements below this one that need to move up
  const container = questionEl.closest('.questions-container') || questionEl.parentElement;
  const otherQuestions = Array.from(container.querySelectorAll('.question:not(.answered)'))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.top > questionRect.top && el.getAttribute('data-id') != id;
    });

  // Start animation process
  if (!questionEl.classList.contains('answered')) {
    // Animate other questions to move up
    otherQuestions.forEach(el => {
      // Add class for animation
      el.classList.add('moving-up');

      // Store original transform to restore later
      const originalTransform = window.getComputedStyle(el).transform;
      el._originalTransform = originalTransform === 'none' ? '' : originalTransform;

      // Apply transform to move up by the height of the question being removed
      el.style.transform = `translateY(-${questionHeight}px)`;
    });

    // Start fade-out animation for target question
    questionEl.classList.add('animating-out');

    // Wait for animation to complete
    setTimeout(() => {
      // Update the data
      const q = questionsData.find(q => q.id === parseInt(id));
      if (q) q.answered = !q.answered;

      // Re-render everything
      renderQuestions();

      // Find the element again (it will be a new element after re-render)
      const newQuestionEl = document.querySelector(`.question[data-id="${id}"]`);
      if (newQuestionEl) {
        // Apply fade-in animation to the new element
        newQuestionEl.style.opacity = '0';
        newQuestionEl.style.transform = 'translateY(20px)';

        // Force a reflow to ensure the animation plays
        void newQuestionEl.offsetWidth;

        // Remove the manual styling to let CSS transitions take over
        setTimeout(() => {
          newQuestionEl.style.opacity = '';
          newQuestionEl.style.transform = '';

          // Remove from tracking after animation completes
          setTimeout(() => {
            animatingElements.delete(id);
          }, 500);
        }, 50);
      } else {
        // If element wasn't found, just clean up
        animatingElements.delete(id);
      }
    }, 500); // Match this to your CSS transition duration
  } else {
    // For un-marking as answered, simplify the animation
    questionEl.classList.add('animating-out');

    setTimeout(() => {
      // Update the data
      const q = questionsData.find(q => q.id === parseInt(id));
      if (q) q.answered = !q.answered;

      // Re-render
      renderQuestions();

      // Find the element again
      const newQuestionEl = document.querySelector(`.question[data-id="${id}"]`);
      if (newQuestionEl) {
        newQuestionEl.style.opacity = '0';

        setTimeout(() => {
          newQuestionEl.style.opacity = '';
          animatingElements.delete(id);
        }, 50);
      } else {
        animatingElements.delete(id);
      }
    }, 750);
  }
}

function removeQuestion(id) {
  const q = questionsData.find(q => q.id === id);
  if (q) {
    q.removed = true;
    questionsData = questionsData.filter(question => !question.removed);
    renderQuestions();
    updateStatus('Question removed', 'connected');
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function playNotificationSound() {
  // Create and play a simple notification sound
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLHPM7tW3iCUEKXrV+N7SxKZ/VTgpWZOzs8vn/P/9/e+3RC9lzejWg9aeYCp1Lm9OL7HGi1dlZn2dsdPaztDfz8SwhXN1zdy3ye3/w1AMOSS1yta0dz47I2P4//zgSRM0d9b5znD/7+PRnP/hnRxS3MOip2hDR47atMThwOO9tG2AoS6xUH67daLxx7nKlF47JVnJ7a5fnC1Yl4qdT1E1Yt3aq3A5JSU5PDN5uYd77efL0r8/KSXOvpNDNkZokaydPUBZjcr+68vGooFlh8Td156IhF86QUx+uYux0dLMq1s5OzRwrtX038rGpF5CRF6TvNTq28C0j2RAQWij1N/j0L6OWz9TX6DY8OI=');
    audio.play();
  } catch (e) {
    console.log('Sound notification not supported in this browser');
  }
}

// Open question modal
function openQuestionModal(question) {
  if (!question) return;
  
  const modal = document.getElementById('questionModal');
  const modalQuestionText = document.getElementById('modalQuestionText');
  const modalQuestionTime = document.getElementById('modalQuestionTime');

  // Set question text
  modalQuestionText.textContent = question.question;

  // Format time information
  const time = new Date(question.timestamp);
  const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
  modalQuestionTime.textContent = `Submitted on ${formattedDate} at ${formattedTime}`;

  // Show modal with animation
  modal.style.display = 'flex';

  // Trigger fade-in animation
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
}

// Close modal when clicking the X
document.querySelector('.close').addEventListener('click', function() {
  closeModal();
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('questionModal');
  if (event.target === modal) {
    closeModal();
  }
});

// Function to close modal with animation
function closeModal() {
  const modal = document.getElementById('questionModal');
  modal.classList.remove('show');

  // Wait for animation to complete before hiding
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Initialize the questions display
renderQuestions();