const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Đảm bảo thư mục data tồn tại
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Mật khẩu mặc định (có thể đổi)
const PASSWORDS = {
  vietnam: 'yeuviet',
  van: 'yeuvan'
};

// Hàm đọc dữ liệu hòm thư
function readMailbox(person) {
  const filePath = path.join(dataDir, `${person}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }
  return {
    letters: [],
    responses: []
  };
}

// Hàm ghi dữ liệu hòm thư
function writeMailbox(person, data) {
  const filePath = path.join(dataDir, `${person}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// API xác thực mật khẩu
app.post('/api/auth/:person', (req, res) => {
  const { person } = req.params;
  const { password } = req.body;
  
  if (person !== 'vietnam' && person !== 'van') {
    return res.status(400).json({ error: 'Invalid person' });
  }
  
  const isValid = (password === PASSWORDS[person]);
  
  if (isValid) {
    res.json({ success: true, message: 'Mật khẩu chính xác!' });
  } else {
    res.json({ success: false, message: 'Sai mật khẩu. Thử lại nhé!' });
  }
});

// API lấy danh sách thư (cần mật khẩu xác thực qua header)
app.get('/api/letters/:person', (req, res) => {
  const { person } = req.params;
  const password = req.headers['x-password'];
  
  if (!password || password !== PASSWORDS[person]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const mailbox = readMailbox(person);
  res.json({ letters: mailbox.letters });
});

// API lấy nội dung 1 thư cụ thể
app.get('/api/letter/:person/:letterId', (req, res) => {
  const { person, letterId } = req.params;
  const password = req.headers['x-password'];
  
  if (!password || password !== PASSWORDS[person]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const mailbox = readMailbox(person);
  const letter = mailbox.letters.find(l => l.id === parseInt(letterId));
  
  if (!letter) {
    return res.status(404).json({ error: 'Letter not found' });
  }
  
  res.json(letter);
});

// API tạo thư mới
app.post('/api/letter/:person', (req, res) => {
  const { person } = req.params;
  const { title, content, author } = req.body;
  const password = req.headers['x-password'];
  
  if (!password || password !== PASSWORDS[person]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!content || content.trim() === '') {
    return res.status(400).json({ error: 'Nội dung thư không được để trống' });
  }
  
  const mailbox = readMailbox(person);
  const newLetter = {
    id: Date.now(),
    title: title || 'Thư không tiêu đề',
    content: content.trim(),
    author: author || 'Người gửi ẩn danh',
    createdAt: new Date().toISOString()
  };
  
  mailbox.letters.unshift(newLetter); // thư mới lên đầu
  writeMailbox(person, mailbox);
  
  res.json({ success: true, letter: newLetter });
});

// API ghi phản hồi
app.post('/api/response/:person', (req, res) => {
  const { person } = req.params;
  const { letterId, responseText, responderName } = req.body;
  const password = req.headers['x-password'];
  
  if (!password || password !== PASSWORDS[person]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  if (!responseText || responseText.trim() === '') {
    return res.status(400).json({ error: 'Phản hồi không được để trống' });
  }
  
  const mailbox = readMailbox(person);
  const newResponse = {
    id: Date.now(),
    letterId: parseInt(letterId),
    responseText: responseText.trim(),
    responderName: responderName || 'Người đọc',
    createdAt: new Date().toISOString()
  };
  
  mailbox.responses.push(newResponse);
  writeMailbox(person, mailbox);
  
  res.json({ success: true, response: newResponse });
});

// API lấy phản hồi của một thư
app.get('/api/responses/:person/:letterId', (req, res) => {
  const { person, letterId } = req.params;
  const password = req.headers['x-password'];
  
  if (!password || password !== PASSWORDS[person]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const mailbox = readMailbox(person);
  const responses = mailbox.responses.filter(r => r.letterId === parseInt(letterId));
  
  res.json({ responses });
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
  console.log(`📭 Hòm thư Việt - Mật khẩu: ${PASSWORDS.vietnam}`);
  console.log(`📭 Hòm thư Vân - Mật khẩu: ${PASSWORDS.van}`);
});
