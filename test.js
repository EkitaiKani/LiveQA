let questionsData = [];
let previousQuestionCount = 0;  // Track previous number of questions
let refreshInterval;
let isConnected = false;

const apiKey = 'AIzaSyAFlp8symwzIZ7I8oLC2fbWPbbm7kO_4oU'; // Replace this with your real API key

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
  const sheetTab = document.getElementById('sheet-tab').value.trim() || 'Form Responses 1';

  if (!sheetId) {
    updateStatus('Please enter a valid Google Sheet ID', 'error');
    return;
  }

  updateStatus('Connecting to Google Sheet...', 'connecting');
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetTab)}?key=${apiKey}`;

  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      if (!data.values || data.values.length < 2) throw new Error("No data found");
      handleSuccessfulConnection(sheetId, sheetTab);
    })
    .catch(err => {
      console.error(err);
      updateStatus(`Error: ${err.message}`, 'error');
    });
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
  const sheetTab = document.getElementById('sheet-tab').value.trim() || 'Form Responses 1';
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
  const nameColumn = document.getElementById('name-column').value.trim() || 'Your name';
  const timestampColumn = 'Timestamp';

  const headers = rows[0];
  const questionIndex = headers.indexOf(questionColumn);
  const nameIndex = headers.indexOf(nameColumn);
  const timestampIndex = headers.indexOf(timestampColumn);

  if (questionIndex === -1) {
    updateStatus(`Error: Column "${questionColumn}" not found.`, 'error');
    return;
  }
  
  // Store the previous questions to compare with new data
  const prevQuestionMap = new Map();
  questionsData.forEach(q => {
    const key = `${q.question}_${q.author}`;
    prevQuestionMap.set(key, q);
  });
  
  // Process the current data from the sheet
  const newQuestionsData = rows.slice(1).map((row, i) => {
    const question = row[questionIndex] || '';
    const author = row[nameIndex] || 'Anonymous';
    const timestamp = row[timestampIndex] || new Date().toISOString();
    
    const key = `${question}_${author}`;
    const existing = prevQuestionMap.get(key);
    
    return {
      id: i,
      question,
      author,
      timestamp,
      votes: existing ? existing.votes : 0,
      answered: existing ? existing.answered : false,
      isNew: !existing && prevQuestionMap.size > 0 // Mark as new if not in previous data
    };
  }).filter(q => q.question);
  
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
  return `${question.question}_${question.author}`;
}

function renderQuestions() {
    if (questionsData.length === 0) {
      questionsList.innerHTML = '<div class="no-questions">No questions found</div>';
      return;
    }
  
    const sortMethod = document.getElementById('sort-method').value;
    const sorted = [...questionsData];
  
    if (sortMethod === 'newest') {
      sorted.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortMethod === 'votes') {
      sorted.sort((a, b) => b.votes - a.votes);
    }
    
    // Create HTML for all questions
    questionsList.innerHTML = sorted.map(q => {
      const time = new Date(q.timestamp);
      return `
        <div class="question ${q.answered ? 'answered' : ''} ${q.isNew ? 'new-entry' : ''}" data-id="${q.id}" 
             style="${q.isNew ? 'opacity: 0; transform: translateY(-20px);' : ''}">
          <div class="question-text">${escapeHtml(q.question)}</div>
          <div class="question-meta">
            <span class="question-author">${escapeHtml(q.author)}</span>
            ${q.isNew ? '<span class="new-badge">NEW</span>' : ''}
          </div>
          <div class="admin-actions">
            <button class="admin-btn" onclick="toggleAnswered(${q.id})">
              ${q.answered ? 'Answered' : 'Unanswered'}
            </button>
            <div class="question-time">${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Apply animations after a short delay to ensure the DOM has updated
    setTimeout(() => {
      const newQuestionElements = document.querySelectorAll('.new-entry');
      newQuestionElements.forEach(el => {
        // Trigger animation through style changes
        el.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
      
      // Clear the "new" status after animation completes
      setTimeout(() => {
        questionsData.forEach(q => {
          if (q.isNew) q.isNew = false;
        });
      }, 2000);
    }, 50);
}


function updateStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
}

function upvoteQuestion(id) {
  const q = questionsData.find(q => q.id === id);
  if (q) q.votes++;
  renderQuestions();
}

function toggleAnswered(id) {
  const q = questionsData.find(q => q.id === id);
  if (q) q.answered = !q.answered;
  renderQuestions();
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

// Initialize the questions display
renderQuestions();