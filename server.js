const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== KẾT NỐI MONGODB ====================
// Thay bằng connection string của bạn
const MONGODB_URI = 'mongodb://loveletters:khacviet2007@cluster0-shard-00-00.hschcpg.mongodb.net:27017,cluster0-shard-00-01.hschcpg.mongodb.net:27017,cluster0-shard-00-02.hschcpg.mongodb.net:27017/loveletter?ssl=true&replicaSet=atlas-10gnkm-shard-0&authSource=admin&retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Kết nối MongoDB thành công'))
  .catch(err => console.error('❌ Lỗi kết nối MongoDB:', err));

// ==================== ĐỊNH NGHĨA SCHEMA ====================
const letterSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  title: String,
  content: String,
  author: String,
  password: String,
  hint: String,
  createdAt: Date,
  person: { type: String, enum: ['vietnam', 'van'] }
});

const Letter = mongoose.model('Letter', letterSchema);

// ==================== API ====================

// Lấy danh sách thư (không lấy nội dung và mật khẩu)
app.get('/api/letters/:person', async (req, res) => {
  const { person } = req.params;
  try {
    const letters = await Letter.find({ person }, { content: 0, password: 0 }).sort({ createdAt: -1 });
    res.json({ letters });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi tải danh sách thư' });
  }
});

// Xác thực mật khẩu và lấy nội dung thư
app.post('/api/letter/:person/:letterId', async (req, res) => {
  const { person, letterId } = req.params;
  const { password } = req.body;
  
  try {
    const letter = await Letter.findOne({ person, id: parseInt(letterId) });
    if (!letter) return res.status(404).json({ error: 'Không tìm thấy thư' });
    if (letter.password !== password) return res.status(401).json({ error: 'Sai mật khẩu' });
    
    res.json({ content: letter.content });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi xác thực thư' });
  }
});

// Tạo thư mới + kiểm tra trùng nội dung
app.post('/api/letter/:person', async (req, res) => {
  const { person } = req.params;
  const { title, content, author, password, hint } = req.body;
  
  if (!content || !password) {
    return res.status(400).json({ error: 'Thiếu nội dung hoặc mật khẩu' });
  }

  try {
    // Kiểm tra trùng nội dung (không phân biệt hoa thường, trim khoảng trắng)
    const normalizedContent = content.trim().toLowerCase();
    const existingLetter = await Letter.findOne({
      person,
      content: { $regex: new RegExp(`^${normalizedContent}$`, 'i') }
    });

    if (existingLetter) {
      return res.status(409).json({ 
        error: 'Thư có nội dung giống hệt đã tồn tại!', 
        message: 'Vui lòng thay đổi nội dung một chút trước khi gửi.' 
      });
    }
    
    // Tìm id lớn nhất hiện tại để tăng dần
    const lastLetter = await Letter.findOne({ person }).sort({ id: -1 });
    const newId = lastLetter ? lastLetter.id + 1 : 1;
    
    const newLetter = new Letter({
      id: newId,
      title: title || 'Thư không tiêu đề',
      content: content.trim(),
      author: author || 'Người gửi ẩn danh',
      password: password,
      hint: hint || 'Không có gợi ý',
      createdAt: new Date(),
      person: person
    });
    
    await newLetter.save();
    res.json({ success: true, letter: { id: newLetter.id, title: newLetter.title } });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi khi gửi thư' });
  }
});

// Xóa thư
app.delete('/api/letter/:person/:letterId', async (req, res) => {
  const { person, letterId } = req.params;
  
  try {
    const result = await Letter.findOneAndDelete({ person, id: parseInt(letterId) });
    
    if (!result) {
      return res.status(404).json({ error: 'Không tìm thấy thư để xóa' });
    }
    
    res.json({ success: true, message: 'Đã xóa thư thành công' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xóa thư' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại: http://localhost:${PORT}`);
  console.log(`✅ Đã kết nối MongoDB Atlas`);
});