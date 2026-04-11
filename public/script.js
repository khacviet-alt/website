let currentPerson = null;
let currentPassword = null;
let currentLetters = [];
let selectedLetterId = null;

// DOM elements
const mailboxScreen = document.getElementById('mailboxScreen');
const passwordScreen = document.getElementById('passwordScreen');
const mainScreen = document.getElementById('mainScreen');
const lettersListDiv = document.getElementById('lettersList');
const letterViewDiv = document.getElementById('letterView');
const mainPersonNameSpan = document.getElementById('mainPersonName');
const passwordPersonName = document.getElementById('passwordPersonName');
const passwordPersonAvatar = document.getElementById('passwordPersonAvatar');

// Chuyển hướng URL dựa vào hash
function handleRouting() {
    const hash = window.location.hash.slice(1); // bỏ dấu #
    
    if (hash === 'vietnam') {
        currentPerson = 'vietnam';
        showPasswordScreen('vietnam');
    } else if (hash === 'van') {
        currentPerson = 'van';
        showPasswordScreen('van');
    } else {
        showMailboxScreen();
    }
}

function showMailboxScreen() {
    mailboxScreen.classList.add('active');
    passwordScreen.classList.remove('active');
    mainScreen.classList.remove('active');
    window.location.hash = '';
    currentPerson = null;
    currentPassword = null;
}

function showPasswordScreen(person) {
    currentPerson = person;
    const name = person === 'vietnam' ? 'Việt' : 'Vân';
    const avatar = person === 'vietnam' ? '🌸' : '🌺';
    passwordPersonName.textContent = `Hòm thư của ${name}`;
    passwordPersonAvatar.textContent = avatar;
    
    mailboxScreen.classList.remove('active');
    passwordScreen.classList.add('active');
    mainScreen.classList.remove('active');
    
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').textContent = '';
}

function showMainScreen() {
    mailboxScreen.classList.remove('active');
    passwordScreen.classList.remove('active');
    mainScreen.classList.add('active');
}

// Kiểm tra hash khi load trang và khi hash thay đổi
window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);

// Chọn hòm thư - cập nhật hash
document.querySelectorAll('.mailbox-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const person = btn.dataset.person;
        window.location.hash = person;
    });
});

// Mở khóa
document.getElementById('unlockBtn').addEventListener('click', async () => {
    const password = document.getElementById('passwordInput').value;
    if (!password) {
        document.getElementById('passwordError').textContent = 'Vui lòng nhập mật khẩu!';
        return;
    }
    
    try {
        const res = await fetch(`/api/auth/${currentPerson}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await res.json();
        
        if (data.success) {
            currentPassword = password;
            const name = currentPerson === 'vietnam' ? 'Việt' : 'Vân';
            mainPersonNameSpan.textContent = `📭 Hòm thư của ${name}`;
            await loadLetters();
            showMainScreen();
        } else {
            document.getElementById('passwordError').textContent = '❌ Sai mật khẩu! Thử lại nhé!';
        }
    } catch (err) {
        document.getElementById('passwordError').textContent = 'Lỗi kết nối!';
    }
});

// Tải danh sách thư
async function loadLetters() {
    try {
        const res = await fetch(`/api/letters/${currentPerson}`, {
            headers: { 'x-password': currentPassword }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        currentLetters = data.letters || [];
        renderLettersList();
        if (currentLetters.length > 0 && !selectedLetterId) {
            selectLetter(currentLetters[0].id);
        }
    } catch (err) {
        lettersListDiv.innerHTML = '<div class="loading-message">❌ Lỗi tải thư</div>';
    }
}

function renderLettersList() {
    if (currentLetters.length === 0) {
        lettersListDiv.innerHTML = '<div class="loading-message">📭 Chưa có thư nào. Hãy viết thư đầu tiên!</div>';
        return;
    }
    
    lettersListDiv.innerHTML = currentLetters.map(letter => `
        <div class="letter-item ${selectedLetterId === letter.id ? 'selected' : ''}" data-id="${letter.id}">
            <div class="letter-title">📧 ${escapeHtml(letter.title)}</div>
            <div class="letter-meta">
                <span>👤 ${escapeHtml(letter.author)}</span>
                <span>📅 ${new Date(letter.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.letter-item').forEach(el => {
        el.addEventListener('click', () => {
            selectLetter(parseInt(el.dataset.id));
        });
    });
}

async function selectLetter(letterId) {
    selectedLetterId = letterId;
    renderLettersList();
    
    try {
        const res = await fetch(`/api/letter/${currentPerson}/${letterId}`, {
            headers: { 'x-password': currentPassword }
        });
        const letter = await res.json();
        
        const responsesRes = await fetch(`/api/responses/${currentPerson}/${letterId}`, {
            headers: { 'x-password': currentPassword }
        });
        const responsesData = await responsesRes.json();
        const responses = responsesData.responses || [];
        
        renderLetterDetail(letter, responses);
    } catch (err) {
        letterViewDiv.innerHTML = '<div class="empty-letter">❌ Lỗi tải thư</div>';
    }
}

function renderLetterDetail(letter, responses) {
    letterViewDiv.innerHTML = `
        <div class="letter-full">
            <h2>💌 ${escapeHtml(letter.title)}</h2>
            <div class="letter-author">✍️ ${escapeHtml(letter.author)} - ${new Date(letter.createdAt).toLocaleString('vi-VN')}</div>
            <div class="letter-body">${escapeHtml(letter.content).replace(/\n/g, '<br>')}</div>
            
            <div class="response-section">
                <h4>💬 Phản hồi (${responses.length})</h4>
                <div class="response-list">
                    ${responses.length === 0 ? '<p style="color:#AAA;">Chưa có phản hồi nào.</p>' : 
                        responses.map(r => `
                            <div class="response-item">
                                <div class="response-name">${escapeHtml(r.responderName || 'Người đọc')}</div>
                                <div class="response-text">${escapeHtml(r.responseText)}</div>
                                <div class="response-date" style="font-size:0.7rem; color:#888;">${new Date(r.createdAt).toLocaleString('vi-VN')}</div>
                            </div>
                        `).join('')
                    }
                </div>
                <button class="write-response-btn" onclick="openResponseModal()">✍️ Viết phản hồi</button>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Viết thư
document.getElementById('createLetterBtn').addEventListener('click', () => {
    document.getElementById('letterTitle').value = '';
    document.getElementById('letterAuthor').value = '';
    document.getElementById('letterContent').value = '';
    document.getElementById('writeModal').classList.add('active');
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('writeModal').classList.remove('active');
        document.getElementById('responseModal').classList.remove('active');
    });
});

document.getElementById('submitLetterBtn').addEventListener('click', async () => {
    const title = document.getElementById('letterTitle').value || 'Thư không tiêu đề';
    const author = document.getElementById('letterAuthor').value || 'Người gửi ẩn danh';
    const content = document.getElementById('letterContent').value;
    
    if (!content.trim()) {
        alert('Vui lòng nhập nội dung thư!');
        return;
    }
    
    try {
        const res = await fetch(`/api/letter/${currentPerson}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-password': currentPassword
            },
            body: JSON.stringify({ title, author, content })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('writeModal').classList.remove('active');
            await loadLetters();
            selectLetter(data.letter.id);
        } else {
            alert('Gửi thư thất bại: ' + (data.error || 'Lỗi'));
        }
    } catch (err) {
        alert('Lỗi kết nối');
    }
});

// Phản hồi
window.openResponseModal = function() {
    if (!selectedLetterId) return;
    document.getElementById('responderName').value = '';
    document.getElementById('responseText').value = '';
    document.getElementById('responseModal').classList.add('active');
};

document.getElementById('submitResponseBtn').addEventListener('click', async () => {
    const responderName = document.getElementById('responderName').value || 'Người đọc';
    const responseText = document.getElementById('responseText').value;
    
    if (!responseText.trim()) {
        alert('Vui lòng nhập phản hồi!');
        return;
    }
    
    try {
        const res = await fetch(`/api/response/${currentPerson}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-password': currentPassword
            },
            body: JSON.stringify({
                letterId: selectedLetterId,
                responseText: responseText,
                responderName: responderName
            })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('responseModal').classList.remove('active');
            await selectLetter(selectedLetterId);
        } else {
            alert('Gửi phản hồi thất bại');
        }
    } catch (err) {
        alert('Lỗi kết nối');
    }
});

// Nút quay lại
document.getElementById('backFromPassword').addEventListener('click', () => {
    window.location.hash = '';
});

document.getElementById('backToMailbox').addEventListener('click', () => {
    window.location.hash = '';
});