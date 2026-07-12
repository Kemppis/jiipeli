const STORAGE_KEY = 'jiipeli-discussion-threads';
const threadsList = document.getElementById('threadsList');
const threadCount = document.getElementById('threadCount');
const topicForm = document.getElementById('topicForm');
const installButton = document.getElementById('installButton');

let beforeInstallPromptEvent = null;
let threads = [];

function createThread(title, message) {
  return {
    id: Date.now().toString(),
    title: title.trim(),
    message: message.trim(),
    createdAt: new Date().toISOString(),
    replies: [],
  };
}

function saveThreads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
}

function loadThreads() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return [
    createThread('Welcome to Jiipeli', 'Start a new discussion or reply to an existing topic. This forum works offline on supported devices.'),
  ];
}

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
}

function renderThreads() {
  threadsList.innerHTML = '';
  threadCount.textContent = `${threads.length} topic${threads.length !== 1 ? 's' : ''}`;

  threads.slice().reverse().forEach(thread => {
    const threadCard = document.createElement('article');
    threadCard.className = 'thread-card';
    threadCard.innerHTML = `
      <h3>${thread.title}</h3>
      <p class="thread-meta">posted ${formatTime(thread.createdAt)}</p>
      <p class="thread-body">${thread.message}</p>
      <div class="thread-actions">
        <button data-action="toggle-replies" data-id="${thread.id}">View replies (${thread.replies.length})</button>
      </div>
      <div class="replies" id="replies-${thread.id}" hidden>
        <div class="reply-form">
          <label>
            Reply
            <textarea data-reply-input="${thread.id}" placeholder="Write a reply..."></textarea>
          </label>
          <button data-action="post-reply" data-id="${thread.id}">Add reply</button>
        </div>
      </div>
    `;

    threadsList.appendChild(threadCard);
    const repliesSection = threadCard.querySelector(`#replies-${thread.id}`);

    if (thread.replies.length > 0) {
      thread.replies.forEach(reply => {
        const replyElement = document.createElement('div');
        replyElement.className = 'reply';
        replyElement.innerHTML = `
          <p class="reply-meta">${formatTime(reply.createdAt)}</p>
          <p class="reply-body">${reply.body}</p>
        `;
        repliesSection.insertBefore(replyElement, repliesSection.querySelector('.reply-form'));
      });
    }
  });
}

function addReply(threadId, message) {
  const target = threads.find(thread => thread.id === threadId);
  if (!target) return;

  target.replies.push({
    id: Date.now().toString(),
    body: message.trim(),
    createdAt: new Date().toISOString(),
  });
  saveThreads();
  renderThreads();
}

topicForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = document.getElementById('topicTitle').value;
  const message = document.getElementById('topicMessage').value;
  if (!title.trim() || !message.trim()) return;

  threads.push(createThread(title, message));
  saveThreads();
  topicForm.reset();
  renderThreads();
});

threadsList.addEventListener('click', event => {
  const action = event.target.dataset.action;
  const threadId = event.target.dataset.id;
  if (!action || !threadId) return;

  if (action === 'toggle-replies') {
    const replies = document.getElementById(`replies-${threadId}`);
    replies.hidden = !replies.hidden;
  }

  if (action === 'post-reply') {
    const replyInput = document.querySelector(`[data-reply-input="${threadId}"]`);
    if (!replyInput) return;
    const message = replyInput.value;
    if (!message.trim()) return;
    addReply(threadId, message);
  }
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  beforeInstallPromptEvent = event;
  installButton.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!beforeInstallPromptEvent) return;
  beforeInstallPromptEvent.prompt();
  const choice = await beforeInstallPromptEvent.userChoice;
  if (choice.outcome === 'accepted') {
    installButton.hidden = true;
  }
  beforeInstallPromptEvent = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

threads = loadThreads();
renderThreads();
