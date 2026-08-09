const apiUrl = './api/forum.php';
const statusEl = document.getElementById('status');
const postsEl = document.getElementById('posts');
const postForm = document.getElementById('post-form');
const notifyButton = document.getElementById('notify-button');
const openNewPostButton = document.getElementById('open-new-post');
const backToHomeButton = document.getElementById('back-to-home');
const backToHomeFromPostButton = document.getElementById('back-to-home-from-post');
const homeActions = document.querySelector('.home-actions');
const postDetailSection = document.getElementById('post-detail');
const detailTitleText = document.getElementById('detail-title-text');
const detailMeta = document.getElementById('detail-meta');
const detailBody = document.getElementById('detail-body');
const detailComments = document.getElementById('detail-comments');
const notificationsSection = document.getElementById('notifications');
const notificationListEl = document.getElementById('notification-list');
const newPostSection = document.getElementById('new-post');
let swRegistration = null;
let refreshInterval = null;
let currentPosts = [];
const currentDeviceId = getDeviceId();

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

  currentPosts = posts;

  postsEl.innerHTML = posts.map(post => `
    <article class="post post-preview" data-post-id="${post.post_id}">
      <div class="post-header">
        <div>
          <h3 class="post-title">${escapeHtml(post.title)}</h3>
          <p class="post-meta">Posted by ${maskDevice(post.device)} · ${formatTimestamp(post.created_at)}</p>
        </div>
      </div>
      <p class="post-body">${escapeHtml(post.body)}</p>
      <p class="post-summary">${post.comments.length} comment${post.comments.length === 1 ? '' : 's'}</p>
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

function getNotifications() {
  return JSON.parse(localStorage.getItem('jiipeliNotificationHistory') || '[]');
}

function saveNotifications(items) {
  localStorage.setItem('jiipeliNotificationHistory', JSON.stringify(items));
}

function addNotificationItem(title, body) {
  const notification = {
    id: Date.now(),
    title,
    body: body || '',
    created_at: new Date().toISOString(),
    read: false,
  };
  const history = [notification, ...getNotifications()].slice(0, 50);
  saveNotifications(history);
  renderNotifications();
  return notification;
}

function renderNotifications(markAsRead = false) {
  if (!notificationListEl) return;
  let items = getNotifications();
  if (!items.length) {
    notificationListEl.innerHTML = '<p>No notifications yet.</p>';
    return;
  }

  if (markAsRead) {
    items = items.map((item) => ({ ...item, read: true }));
    saveNotifications(items);
  }

  notificationListEl.innerHTML = items.map((item) => `
    <article class="notification-item ${item.read ? 'read' : 'unread'}">
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.body)}</p>
      <p class="notification-meta">${formatTimestamp(item.created_at)}</p>
    </article>
  `).join('');
}

async function loadPosts() {
  try {
    const data = await request();
    currentPosts = data.posts;
    renderPosts(currentPosts);
    handleCommentNotifications(currentPosts);
  } catch (error) {
    showStatus(error.message, true);
  }
}

function setupNotificationControls() {
  if (!notifyButton) return;
  notifyButton.addEventListener('click', requestNotificationPermission);
  updateNotificationButton();
  startAutoRefresh();
}

function setupNewPostButton() {
  if (openNewPostButton) {
    openNewPostButton.addEventListener('click', () => showView('new-post'));
  }
  if (backToHomeButton) {
    backToHomeButton.addEventListener('click', () => showView('home'));
  }
  if (backToHomeFromPostButton) {
    backToHomeFromPostButton.addEventListener('click', () => showView('home'));
  }
}

function startAutoRefresh() {
  if (refreshInterval) return;
  refreshInterval = setInterval(() => {
    loadPosts().catch(() => {});
  }, 30000);
}

function updateNotificationButton() {
  if (!notifyButton) return;
  const enabled = localStorage.getItem('jiipeliNotifications') === 'enabled';
  if (Notification.permission === 'granted' && enabled) {
    notifyButton.textContent = 'Notifications On';
    notifyButton.disabled = true;
  } else if (Notification.permission === 'denied') {
    notifyButton.textContent = 'Notifications Blocked';
    notifyButton.disabled = true;
  } else {
    notifyButton.textContent = 'Enable notifications';
    notifyButton.disabled = false;
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showStatus('Notifications are not supported in this browser.', true);
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    localStorage.setItem('jiipeliNotifications', 'enabled');
    showStatus('Notifications enabled.');
  } else {
    localStorage.removeItem('jiipeliNotifications');
    showStatus('Notifications disabled.');
  }
  updateNotificationButton();
}

function canNotify() {
  return ('Notification' in window) && Notification.permission === 'granted' && localStorage.getItem('jiipeliNotifications') === 'enabled';
}

async function showNotification(title, options) {
  addNotificationItem(title, options?.body || '');
  if (!canNotify()) return;
  if (swRegistration && swRegistration.showNotification) {
    swRegistration.showNotification(title, options);
    return;
  }
  new Notification(title, options);
}

function handleCommentNotifications(posts) {
  if (!canNotify()) {
    if (!localStorage.getItem('jiipeliLastCommentAt')) {
      initializeLastCommentTimestamp(posts);
    }
    return;
  }

  const lastSeen = localStorage.getItem('jiipeliLastCommentAt');
  const commentDates = [];
  let newCommentCount = 0;

  posts.forEach((post) => {
    if (post.device !== currentDeviceId) return;
    post.comments.forEach((comment) => {
      if (comment.device === currentDeviceId) return;
      const commentTime = new Date(comment.created_at).toISOString();
      commentDates.push(commentTime);
      if (lastSeen && commentTime > lastSeen) {
        newCommentCount += 1;
      }
    });
  });

  if (!lastSeen) {
    if (commentDates.length) {
      localStorage.setItem('jiipeliLastCommentAt', commentDates.sort().reverse()[0]);
    }
    return;
  }

  if (newCommentCount > 0) {
    showNotification('New comment on your post', {
      body: `${newCommentCount} new comment${newCommentCount > 1 ? 's' : ''} from other users.`,
      icon: 'icons/icon.svg'
    });
  }

  if (commentDates.length) {
    localStorage.setItem('jiipeliLastCommentAt', commentDates.sort().reverse()[0]);
  }
}

function initializeLastCommentTimestamp(posts) {
  const commentDates = [];
  posts.forEach((post) => {
    if (post.device !== currentDeviceId) return;
    post.comments.forEach((comment) => {
      if (comment.device === currentDeviceId) return;
      commentDates.push(new Date(comment.created_at).toISOString());
    });
  });
  if (commentDates.length) {
    localStorage.setItem('jiipeliLastCommentAt', commentDates.sort().reverse()[0]);
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
    showView('home');
    loadPosts();
  } catch (error) {
    showStatus(error.message, true);
  }
});

postsEl.addEventListener('click', (event) => {
  const postElement = event.target.closest('.post-preview');
  if (!postElement) return;
  const postId = postElement.dataset.postId;
  if (!postId) return;
  openPostDetail(postId);
});

document.body.addEventListener('submit', async (event) => {
  if (!event.target.matches('.comment-form')) return;
  event.preventDefault();
  const form = event.target;
  const body = (form.body?.value || '').trim();
  const post_id = form.dataset.postId || form.closest('[data-post-id]')?.dataset.postId;

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
    window.addEventListener('load', async () => {
      try {
        swRegistration = await navigator.serviceWorker.register('sw.js');
      } catch (error) {
        console.warn('Service worker registration failed', error);
      }
    });
  }

  setupNotificationControls();
  setupNewPostButton();

// Navigation / views
const bottomNav = document.querySelectorAll('.bottom-nav__item');
const profileSection = document.getElementById('profile');
const myPostsEl = document.getElementById('my-posts');
const deviceIdEl = document.getElementById('device-id');
const postSection = postForm.closest('section');

function showView(view) {
  if (view === 'profile') {
    document.querySelector('.hero').hidden = true;
    homeActions.hidden = true;
    postSection.hidden = true;
    postsEl.hidden = true;
    notificationsSection.hidden = true;
    newPostSection.hidden = true;
    postDetailSection.hidden = true;
    profileSection.hidden = false;
    bottomNav.forEach(b => b.classList.toggle('active', b.dataset.view === 'profile'));
    renderProfile();
  } else if (view === 'notifications') {
    document.querySelector('.hero').hidden = true;
    homeActions.hidden = true;
    postSection.hidden = true;
    postsEl.hidden = true;
    profileSection.hidden = true;
    notificationsSection.hidden = false;
    newPostSection.hidden = true;
    postDetailSection.hidden = true;
    bottomNav.forEach(b => b.classList.toggle('active', b.dataset.view === 'notifications'));
    renderNotifications(true);
  } else if (view === 'new-post') {
    document.querySelector('.hero').hidden = false;
    homeActions.hidden = true;
    postSection.hidden = true;
    postsEl.hidden = true;
    profileSection.hidden = true;
    notificationsSection.hidden = true;
    postDetailSection.hidden = true;
    newPostSection.hidden = false;
    bottomNav.forEach(b => b.classList.toggle('active', false));
  } else if (view === 'post-detail') {
    document.querySelector('.hero').hidden = false;
    homeActions.hidden = true;
    postSection.hidden = true;
    postsEl.hidden = true;
    profileSection.hidden = true;
    notificationsSection.hidden = true;
    newPostSection.hidden = true;
    postDetailSection.hidden = false;
    bottomNav.forEach(b => b.classList.toggle('active', false));
  } else {
    document.querySelector('.hero').hidden = false;
    homeActions.hidden = false;
    postSection.hidden = false;
    postsEl.hidden = false;
    profileSection.hidden = true;
    notificationsSection.hidden = true;
    newPostSection.hidden = true;
    postDetailSection.hidden = true;
    bottomNav.forEach(b => b.classList.toggle('active', b.dataset.view === 'home'));
    loadPosts();
  }
}

function openPostDetail(postId) {
  const post = currentPosts.find((item) => item.post_id === postId);
  if (!post) {
    showStatus('Post not found.', true);
    return;
  }

  detailTitleText.textContent = post.title;
  detailMeta.textContent = `Posted by ${maskDevice(post.device)} · ${formatTimestamp(post.created_at)}`;
  detailBody.textContent = post.body;
  const commentsHtml = post.comments.map((comment) => `
    <li class="comment">
      <p class="comment-body">${escapeHtml(comment.body || '')}</p>
      ${comment.image ? `<img class="comment-image" src="${escapeHtml(comment.image)}" alt="comment image" />` : ''}
      <p class="comment-meta">${maskDevice(comment.device)} · ${formatTimestamp(comment.created_at)}</p>
    </li>
  `).join('');
  detailComments.innerHTML = commentsHtml || '<li><p>No comments yet.</p></li>';

  const detailForm = postDetailSection.querySelector('.comment-form');
  if (detailForm) {
    detailForm.dataset.postId = post.post_id;
  }

  showView('post-detail');
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
