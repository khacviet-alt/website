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
        // Màn hình chọn người
        app.innerHTML = `
            <div class="header">
                <h1>📬 HÒM THƯ BÍ MẬT 📬</h1>
            </div>
            <div class="letters-grid">
                <div class="letter-card" onclick="selectPerson('vietnam')">
                    <h3>🌸 HÒM THƯ CỦA VIỆT</h3>
                    <div class="letter-meta">Những bức thư đến từ  Việt</div>
                </div>
                <div class="letter-card" onclick="selectPerson('van')">
                    <h3>🌺 HÒM THƯ CỦA VÂN</h3>
                    <div class="letter-meta">Những bức thư đến từ Vân</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Đang ở hòm thư của Việt hoặc Vân
    const personName = currentPerson === 'vietnam' ? 'Việt' : 'Vân';
    
    // Tải danh sách thư
    const res = await fetch(`/api/letters/${currentPerson}`);
    const data = await res.json();
    letters = data.letters || [];
    
    app.innerHTML = `
        <button class="back-btn" onclick="goBack()">← Đổi hòm thư</button>
        <div class="header">
            <h1>📭 HÒM THƯ ĐẾN TỪ ${personName.toUpperCase()}</h1>
        </div>
        <div class="letters-grid" id="lettersGrid">
            ${letters.map(letter => `
                <div class="letter-card" onclick="openLetterPassword(${letter.id})">
                    <h3>✉️ ${escapeHtml(letter.title)}</h3>
                    <div class="letter-meta">👤 ${escapeHtml(letter.author)}</div>
                    <div class="letter-meta">📅 ${new Date(letter.createdAt).toLocaleDateString('vi-VN')}</div>
                    <div class="letter-hint">💡 Gợi ý: ${escapeHtml(letter.hint)}</div>
                </div>
            `).join('')}
        </div>
        <button class="write-btn" onclick="openWriteModal()">✏️ VIẾT THƯ MỚI</button>
        <div id="letterContentView"></div>
    `;
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
        
        // Hiển thị nội dung thư
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
        
        // Cuộn đến nội dung
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
        
        if (res.ok) {
            document.getElementById('writeModal').classList.remove('active');
            render(); // Tải lại danh sách thư
        } else {
            const err = await res.json();
            alert('Lỗi: ' + (err.error || 'Không gửi được thư'));
        }
    } catch (err) {
        alert('Lỗi kết nối!');
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

// Lắng nghe thay đổi hash
window.addEventListener('hashchange', () => {
    currentPerson = getPersonFromHash();
    render();
});

// Khởi động
render();