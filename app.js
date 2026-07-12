const threadsList = document.getElementById('threadsList');
const threadCount = document.getElementById('threadCount');
const topicForm = document.getElementById('topicForm');
const installButton = document.getElementById('installButton');

let beforeInstallPromptEvent = null;
let threads = [];

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function renderThreads() {
  threadsList.innerHTML = '';
  threadCount.textContent = `${threads.length} topic${threads.length !== 1 ? 's' : ''}`;

  if (threads.length === 0) {
    threadsList.innerHTML = '<p class="empty-state">No discussions yet. Start the first topic!</p>';
    return;
  }

  threads.forEach(thread => {
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

async function fetchThreads() {
  try {
    const response = await fetch('/api/threads');
    if (!response.ok) {
      throw new Error(`Failed to load threads: ${response.status}`);
    }

    threads = await response.json();
    renderThreads();
  } catch (error) {
    console.error(error);
    threadCount.textContent = 'Unable to load topics';
    threadsList.innerHTML = '<p class="error">Unable to load discussion topics. Please refresh.</p>';
  }
}

async function postThread(title, message) {
  const response = await fetch('/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, message }),
  });

  if (!response.ok) {
    throw new Error('Unable to create topic.');
  }

  const thread = await response.json();
  threads.unshift(thread);
  renderThreads();
}

async function addReply(threadId, message) {
  const response = await fetch(`/api/threads/${threadId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: message }),
  });

  if (!response.ok) {
    throw new Error('Unable to post reply.');
  }

  const reply = await response.json();
  const target = threads.find(thread => String(thread.id) === String(threadId));
  if (!target) return;

  target.replies.push(reply);
  renderThreads();
}

topicForm.addEventListener('submit', async event => {
  event.preventDefault();
  const title = document.getElementById('topicTitle').value;
  const message = document.getElementById('topicMessage').value;
  if (!title.trim() || !message.trim()) return;

  try {
    await postThread(title.trim(), message.trim());
    topicForm.reset();
  } catch (error) {
    console.error(error);
  }
});

threadsList.addEventListener('click', async event => {
  const action = event.target.dataset.action;
  const threadId = event.target.dataset.id;
  if (!action || !threadId) return;

  if (action === 'toggle-replies') {
    const replies = document.getElementById(`replies-${threadId}`);
    replies.hidden = !replies.hidden;
    return;
  }

  if (action === 'post-reply') {
    const replyInput = document.querySelector(`[data-reply-input="${threadId}"]`);
    if (!replyInput) return;
    const message = replyInput.value;
    if (!message.trim()) return;

    try {
      await addReply(threadId, message.trim());
    } catch (error) {
      console.error(error);
    }
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

fetchThreads();
