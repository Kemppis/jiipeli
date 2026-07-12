const threadsList = document.getElementById('threadsList');
const threadCount = document.getElementById('threadCount');
const topicForm = document.getElementById('topicForm');
const installButton = document.getElementById('installButton');

let beforeInstallPromptEvent = null;

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function renderThreads(threads) {
  threadsList.innerHTML = '';
  threadCount.textContent = `${threads.length} topic${threads.length !== 1 ? 's' : ''}`;

  threads.forEach(thread => {
    const threadCard = document.createElement('article');
    threadCard.className = 'thread-card';
    threadCard.innerHTML = `
      <h3>${thread.title}</h3>
      <p class="thread-meta">posted ${formatTime(thread.created_at)}</p>
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

    thread.replies.forEach(reply => {
      const replyElement = document.createElement('div');
      replyElement.className = 'reply';
      replyElement.innerHTML = `
        <p class="reply-meta">${formatTime(reply.created_at)}</p>
        <p class="reply-body">${reply.message}</p>
      `;
      repliesSection.insertBefore(replyElement, repliesSection.querySelector('.reply-form'));
    });
  });
}

async function fetchThreads() {
  const response = await fetch('/api/threads');
  if (!response.ok) {
    throw new Error('Failed to load threads');
  }
  return response.json();
}

async function createThread(title, message) {
  const response = await fetch('/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, message }),
  });
  if (!response.ok) {
    throw new Error('Failed to create thread');
  }
  return response.json();
}

async function postReply(threadId, message) {
  const response = await fetch(`/api/threads/${threadId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error('Failed to post reply');
  }
  return response.json();
}

async function loadAndRender() {
  try {
    const threads = await fetchThreads();
    renderThreads(threads);
  } catch (error) {
    console.error(error);
    threadsList.innerHTML = '<p class="thread-body">Unable to load discussions. Please try again later.</p>';
  }
}

topicForm.addEventListener('submit', async event => {
  event.preventDefault();
  const title = document.getElementById('topicTitle').value;
  const message = document.getElementById('topicMessage').value;
  if (!title.trim() || !message.trim()) return;

  await createThread(title.trim(), message.trim());
  topicForm.reset();
  await loadAndRender();
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

    await postReply(threadId, message.trim());
    await loadAndRender();
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

loadAndRender();
