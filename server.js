const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Đọc/ghi hòm thư
function readMailbox(person) {
  const filePath = path.join(dataDir, `${person}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return { letters: [] };
}

function writeMailbox(person, data) {
  fs.writeFileSync(path.join(dataDir, `${person}.json`), JSON.stringify(data, null, 2));
}

// ==================== API MỚI ====================

// Lấy danh sách thư
app.get('/api/letters/:person', (req, res) => {
  const { person } = req.params;
  const mailbox = readMailbox(person);
  const safeLetters = mailbox.letters.map(({ id, title, author, hint, createdAt }) => ({
    id, title, author, hint, createdAt
  }));
  res.json({ letters: safeLetters });
});

// Xác thực mật khẩu và lấy nội dung thư
app.post('/api/letter/:person/:letterId', (req, res) => {
  const { person, letterId } = req.params;
  const { password } = req.body;
  
  const mailbox = readMailbox(person);
  const letter = mailbox.letters.find(l => l.id === parseInt(letterId));
  
  if (!letter) return res.status(404).json({ error: 'Không tìm thấy thư' });
  if (letter.password !== password) return res.status(401).json({ error: 'Sai mật khẩu' });
  
  res.json({ content: letter.content });
});

// Tạo thư mới + KIỂM TRA TRÙNG NỘI DUNG
app.post('/api/letter/:person', (req, res) => {
  const { person } = req.params;
  const { title, content, author, password, hint } = req.body;
  
  if (!content || !password) {
    return res.status(400).json({ error: 'Thiếu nội dung hoặc mật khẩu' });
  }

  const mailbox = readMailbox(person);
  
  // Kiểm tra trùng nội dung (trim và so sánh)
  const normalizedContent = content.trim().toLowerCase();
  const isDuplicate = mailbox.letters.some(letter => 
    letter.content.trim().toLowerCase() === normalizedContent
  );

  if (isDuplicate) {
    return res.status(409).json({ 
      error: 'Thư có nội dung giống hệt đã tồn tại!', 
      message: 'Bạn có muốn tạo thêm không? Nếu muốn, hãy thay đổi nội dung một chút.' 
    });
  }
  
  const newLetter = {
    id: Date.now(),
    title: title || 'Thư không tiêu đề',
    content: content.trim(),
    author: author || 'Người gửi ẩn danh',
    password: password,
    hint: hint || 'Không có gợi ý',
    createdAt: new Date().toISOString()
  };
  
  mailbox.letters.unshift(newLetter);   // thêm lên đầu
  writeMailbox(person, mailbox);
  
  res.json({ success: true, letter: { id: newLetter.id, title: newLetter.title } });
});

// XÓA THƯ (rất quan trọng để dọn thư nhầm)
app.delete('/api/letter/:person/:letterId', (req, res) => {
  const { person, letterId } = req.params;
  
  const mailbox = readMailbox(person);
  const initialLength = mailbox.letters.length;
  
  mailbox.letters = mailbox.letters.filter(l => l.id !== parseInt(letterId));
  
  if (mailbox.letters.length === initialLength) {
    return res.status(404).json({ error: 'Không tìm thấy thư để xóa' });
  }
  
  writeMailbox(person, mailbox);
  res.json({ success: true, message: 'Đã xóa thư thành công' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
  console.log(`📁 Dữ liệu được lưu trong thư mục /data`);
});