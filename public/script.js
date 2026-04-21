// Router dựa trên hash URL
function getPersonFromHash() {
    const hash = window.location.hash.slice(1);
    return (hash === 'vietnam' || hash === 'van') ? hash : null;
}

let currentPerson = getPersonFromHash();
let letters = [];
let currentOpenLetterId = null;

// Render toàn bộ UI
async function render() {
    const app = document.getElementById('app');
    
    if (!currentPerson) {
        app.innerHTML = `
            <div class="header">
                <h1>📬 HÒM THƯ BÍ MẬT 📬</h1>
            </div>
            <div class="letters-grid">
                <div class="letter-card" onclick="selectPerson('vietnam')">
                    <h3>🌸 HÒM THƯ CỦA VIỆT</h3>
                    <div class="letter-meta">Những bức thư dành cho Việt</div>
                </div>
                <div class="letter-card" onclick="selectPerson('van')">
                    <h3>🌺 HÒM THƯ CỦA VÂN</h3>
                    <div class="letter-meta">Những bức thư dành cho Vân</div>
                </div>
            </div>
        `;
        return;
    }
    
    const personName = currentPerson === 'vietnam' ? 'Việt' : 'Vân';
    
    // Hiển thị loading
    app.innerHTML = `
        <button class="back-btn" onclick="goBack()">← Đổi hòm thư</button>
        <div class="header">
            <h1>📭 HÒM THƯ CỦA ${personName.toUpperCase()}</h1>
        </div>
        <div class="loading-container">
            <div class="loading-spinner">🌸</div>
            <div class="loading-text">Đang mở hòm thư...</div>
        </div>
        <button class="write-btn" onclick="openWriteModal()">✏️ VIẾT THƯ MỚI</button>
        <div id="letterContentView"></div>
    `;
    
    try {
        const res = await fetch(`/api/letters/${currentPerson}`);
        const data = await res.json();
        letters = data.letters || [];
        
        const gridHtml = `
            <button class="back-btn" onclick="goBack()">← Đổi hòm thư</button>
            <div class="header">
                <h1>📭 HÒM THƯ CỦA ${personName.toUpperCase()}</h1>
            </div>
            <div class="letters-grid" id="lettersGrid">
                ${letters.length === 0 ? 
                    '<div class="empty">📭 Chưa có thư nào. Hãy viết thư đầu tiên!</div>' : 
                    letters.map(letter => `
                        <div class="letter-card" data-id="${letter.id}">
                            <h3>✉️ ${escapeHtml(letter.title)}</h3>
                            <div class="letter-meta">👤 ${escapeHtml(letter.author)}</div>
                            <div class="letter-meta">📅 ${new Date(letter.createdAt).toLocaleDateString('vi-VN')}</div>
                            <div class="letter-hint">💡 Gợi ý: ${escapeHtml(letter.hint)}</div>
                            <div style="display: flex; gap: 10px; margin-top: 12px;">
                                <button class="read-btn" onclick="openLetterPassword(${letter.id})">📖 Đọc thư</button>
                                <button class="delete-btn" onclick="deleteLetter(${letter.id})">🗑️ Xóa thư</button>
                            </div>
                        </div>
                    `).join('')
                }
            </div>
            <button class="write-btn" onclick="openWriteModal()">✏️ VIẾT THƯ MỚI</button>
            <div id="letterContentView"></div>
        `;
        
        app.innerHTML = gridHtml;
        
    } catch (err) {
        app.innerHTML = `
            <button class="back-btn" onclick="goBack()">← Đổi hòm thư</button>
            <div class="header">
                <h1>📭 HÒM THƯ CỦA ${personName.toUpperCase()}</h1>
            </div>
            <div class="error-container">
                <div class="error-msg-large">❌ Lỗi kết nối đến server!</div>
                <button class="retry-btn" onclick="render()">🔄 Thử lại</button>
            </div>
            <button class="write-btn" onclick="openWriteModal()">✏️ VIẾT THƯ MỚI</button>
            <div id="letterContentView"></div>
        `;
    }
}

function selectPerson(person) {
    window.location.hash = person;
    currentPerson = person;
    render();
}

function goBack() {
    window.location.hash = '';
    currentPerson = null;
    render();
}

// Xóa thư
async function deleteLetter(letterId) {
    if (!confirm('Bạn có chắc chắn muốn xóa thư này? Hành động này không thể hoàn tác!')) {
        return;
    }
    
    try {
        const res = await fetch(`/api/letter/${currentPerson}/${letterId}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            alert('✅ Đã xóa thư thành công!');
            render();
        } else {
            const error = await res.json();
            alert('❌ Xóa thư thất bại: ' + (error.error || 'Lỗi không xác định'));
        }
    } catch (err) {
        alert('❌ Lỗi kết nối!');
    }
}

// Mở popup nhập mật khẩu
let pendingLetterId = null;

function openLetterPassword(letterId) {
    const letter = letters.find(l => l.id === letterId);
    if (!letter) return;
    
    pendingLetterId = letterId;
    document.getElementById('modalHint').innerText = `💡 Gợi ý: ${letter.hint}`;
    document.getElementById('modalPassword').value = '';
    document.getElementById('modalError').innerText = '';
    document.getElementById('passwordModal').classList.add('active');
}

document.getElementById('submitPassword').onclick = async () => {
    const password = document.getElementById('modalPassword').value;
    if (!password) {
        document.getElementById('modalError').innerText = 'Vui lòng nhập mật khẩu!';
        return;
    }
    
    try {
        const res = await fetch(`/api/letter/${currentPerson}/${pendingLetterId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        if (!res.ok) {
            document.getElementById('modalError').innerText = '❌ Sai mật khẩu! Thử lại nhé.';
            return;
        }
        
        const data = await res.json();
        document.getElementById('passwordModal').classList.remove('active');
        
        const letter = letters.find(l => l.id === pendingLetterId);
        const contentDiv = document.getElementById('letterContentView');
        contentDiv.innerHTML = `
            <div class="letter-content-view">
                <h2>✉️ ${escapeHtml(letter.title)}</h2>
                <div class="letter-meta">👤 ${escapeHtml(letter.author)} - ${new Date(letter.createdAt).toLocaleString('vi-VN')}</div>
                <div class="content">${escapeHtml(data.content).replace(/\n/g, '<br>')}</div>
                <button class="close-letter" onclick="closeLetter()">Đóng</button>
            </div>
        `;
        
        contentDiv.scrollIntoView({ behavior: 'smooth' });
        
    } catch (err) {
        document.getElementById('modalError').innerText = 'Lỗi kết nối!';
    }
};

function closeLetter() {
    document.getElementById('letterContentView').innerHTML = '';
    pendingLetterId = null;
}

// Viết thư mới
function openWriteModal() {
    document.getElementById('letterTitle').value = '';
    document.getElementById('letterAuthor').value = '';
    document.getElementById('letterContent').value = '';
    document.getElementById('letterPassword').value = '';
    document.getElementById('letterHint').value = '';
    document.getElementById('writeModal').classList.add('active');
}

document.getElementById('submitLetter').onclick = async () => {
    const title = document.getElementById('letterTitle').value || 'Thư không tiêu đề';
    const author = document.getElementById('letterAuthor').value || 'Người gửi ẩn danh';
    const content = document.getElementById('letterContent').value;
    const password = document.getElementById('letterPassword').value;
    const hint = document.getElementById('letterHint').value || 'Không có gợi ý';
    
    if (!content) {
        alert('Vui lòng nhập nội dung thư!');
        return;
    }
    if (!password) {
        alert('Vui lòng đặt mật khẩu cho thư!');
        return;
    }
    
    try {
        const res = await fetch(`/api/letter/${currentPerson}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, author, content, password, hint })
        });
        
        if (res.status === 409) {
            const error = await res.json();
            alert(`⚠️ ${error.error}\n\n${error.message}`);
            return;
        }
        
        if (res.ok) {
            document.getElementById('writeModal').classList.remove('active');
            alert('✅ Gửi thư thành công!');
            render();
        } else {
            const err = await res.json();
            alert('❌ Lỗi: ' + (err.error || 'Không gửi được thư'));
        }
    } catch (err) {
        alert('❌ Lỗi kết nối!');
    }
};

// Đóng modal
document.querySelectorAll('.close').forEach(btn => {
    btn.onclick = () => {
        document.getElementById('passwordModal').classList.remove('active');
        document.getElementById('writeModal').classList.remove('active');
    };
});

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
};

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

window.addEventListener('hashchange', () => {
    currentPerson = getPersonFromHash();
    render();
});

render();