const apiUrl = './api/forum.php';
const statusEl = document.getElementById('status');
const postsEl = document.getElementById('posts');
const postForm = document.getElementById('post-form');

function getDeviceId() {
  let id = localStorage.getItem('jiipeliDeviceId');
  if (!id) {
    id = crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('jiipeliDeviceId', id);
  }
  return id;
}

function showStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? '#dc2626' : '#2563eb';
  setTimeout(() => { if (statusEl.textContent === message) statusEl.textContent = ''; }, 4000);
}

async function request(payload) {
  const response = await fetch(apiUrl + (payload?.action ? `?action=${payload.action}` : ''), {
    method: payload ? 'POST' : 'GET',
    headers: payload ? { 'Content-Type': 'application/json' } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || 'Server error');
  }
  return response.json();
}

function renderPosts(posts) {
  if (!posts.length) {
    postsEl.innerHTML = '<div class="card"><p>No posts yet. Start the conversation!</p></div>';
    return;
  }

  console.log('Testing');
  console.log('Rendering posts:', posts);
  console.log('Post IDs:', posts.map(post => post.post_id));

  postsEl.innerHTML = posts.map(post => `
    <article class="post" data-post-id="${post.post_id}">
      <div class="post-header">
        <div>
          <h3 class="post-title">${escapeHtml(post.title)}</h3>
          <p class="post-meta">Posted by ${maskDevice(post.device)} · ${formatTimestamp(post.created_at)}</p>
        </div>
      </div>
      <p class="post-body">${escapeHtml(post.body)}</p>

      <section>
        <h4>Comments</h4>
        <ul class="comment-list">
          ${post.comments.map(comment => `
            <li class="comment">
              <p class="comment-body">${escapeHtml(comment.body || '')}</p>
              ${comment.image ? `<img class="comment-image" src="${escapeHtml(comment.image)}" alt="comment image" />` : ''}
              <p class="comment-meta">${maskDevice(comment.device)} · ${formatTimestamp(comment.created_at)}</p>
            </li>
          `).join('')}
        </ul>
      </section>

      <form class="comment-form" data-post-id="${post.post_id}" enctype="multipart/form-data">
        <label>
          Add reply
          <textarea name="body" rows="3" placeholder="Reply to this post"></textarea>
        </label>
        <label>
          Attach image
          <input type="file" name="image" accept="image/*" capture="environment">
        </label>
        <button type="submit">Comment</button>
      </form>
    </article>
  `).join('');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function maskDevice(deviceId) {
  return `@${deviceId.slice(0, 8)}`;
}

function formatTimestamp(value) {
  const date = new Date(value);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadPosts() {
  try {
    const data = await request();
    renderPosts(data.posts);
  } catch (error) {
    showStatus(error.message, true);
  }
}

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(postForm);
  const payload = {
    action: 'post',
    title: formData.get('title').trim(),
    body: formData.get('body').trim(),
    device: getDeviceId(),
  };

  if (!payload.title || !payload.body) {
    showStatus('Fill in both title and message.', true);
    return;
  }

  try {
    await request(payload);
    postForm.reset();
    showStatus('Post sent successfully.');
    loadPosts();
  } catch (error) {
    showStatus(error.message, true);
  }
});

postsEl.addEventListener('submit', async (event) => {
  if (!event.target.matches('.comment-form')) return;
  event.preventDefault();
  const form = event.target;
  const body = (form.body?.value || '').trim();
  const post_id = form.closest('.post')?.dataset.postId;

  if (!body && !(form.image && form.image.files && form.image.files.length)) {
    showStatus('Comment cannot be empty.', true);
    return;
  }
  if (!post_id) {
    showStatus('Comment target not found.', true);
    return;
  }

  // send as multipart/form-data so images can be uploaded (camera-friendly)
  const fd = new FormData(form);
  fd.append('action', 'comment');
  fd.append('post_id', post_id);
  fd.append('device', getDeviceId());

  try {
    const response = await fetch(apiUrl + '?action=comment', { method: 'POST', body: fd });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || 'Server error');
    form.reset();
    showStatus('Comment added.');
    loadPosts();
  } catch (error) {
    showStatus(error.message, true);
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .catch(() => {
        console.warn('Service worker registration failed');
      });
  });
}

loadPosts();

// Navigation / views
const bottomNav = document.querySelectorAll('.bottom-nav__item');
const profileSection = document.getElementById('profile');
const myPostsEl = document.getElementById('my-posts');
const deviceIdEl = document.getElementById('device-id');
const postSection = postForm.closest('section');

function showView(view) {
  if (view === 'profile') {
    document.querySelector('.hero').hidden = true;
    postSection.hidden = true;
    postsEl.hidden = true;
    profileSection.hidden = false;
    bottomNav.forEach(b => b.classList.toggle('active', b.dataset.view === 'profile'));
    renderProfile();
  } else {
    document.querySelector('.hero').hidden = false;
    postSection.hidden = false;
    postsEl.hidden = false;
    profileSection.hidden = true;
    bottomNav.forEach(b => b.classList.toggle('active', b.dataset.view === 'home'));
    loadPosts();
  }
}

async function renderProfile() {
  deviceIdEl.textContent = getDeviceId();
  try {
    const data = await request();
    const my = (data.posts || []).filter(p => p.device === getDeviceId());
    if (!my.length) {
      myPostsEl.innerHTML = '<p>No posts from this device yet.</p>';
      return;
    }
    myPostsEl.innerHTML = my.map(p => `
      <article class="post">
        <h4 class="post-title">${escapeHtml(p.title)}</h4>
        <p class="post-body">${escapeHtml(p.body)}</p>
        <p class="post-meta">${formatTimestamp(p.created_at)}</p>
      </article>
    `).join('');
  } catch (e) {
    myPostsEl.innerHTML = '<p>Unable to load your posts.</p>';
  }
}

bottomNav.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));

// default view
showView('home');
