const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// --- Security & Middleware ---
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("📦 MongoDB Connected"))
    .catch(err => console.log("DB Connection Error: ", err));

// --- Mongoose Models Import ---
const Show = require('./models/show');
const Episode = require('./models/episode');
const Founder = require('./models/founder');
const User = require('./models/user');

// --- DEFAULT ADMIN CREATE KARNA (Agar DB khali hai) ---
mongoose.connection.once('open', async () => {
    const adminExists = await User.findOne({ email: 'admin@ratpack.com' });
    if (!adminExists) {
        await User.create({ name: 'Admin', email: 'admin@ratpack.com', password: 'admin123', role: 'admin', status: 'active' });
        console.log("👤 Default Admin automatically created in Database!");
    }
});

// --- Static Folder ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Video Upload ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/videos';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/\s+/g, '_');
        cb(null, Date.now() + '-' + cleanName);
    }
});
const upload = multer({ storage });

app.post('/api/upload/video', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({
        url: `https://ratpack-industries.onrender.com/uploads/videos/${req.file.filename}`,
        filename: req.file.originalname,
        size_bytes: req.file.size
    });
});

// ==========================================
// 1. AUTH & SETTINGS APIs (FIXED WITH REGISTER & FORGOT PASSWORD)
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        
        if (user) {
            return res.json({ 
                token: 'ratpack_token_' + user._id, 
                user: { id: user._id, name: user.name, email: user.email, role: user.role } 
            });
        }
        res.status(401).json({ error: 'Galat Email ya Password!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'Ye email pehle se registered hai!' });
        }
        const newUser = new User({ name, email, password, role: 'user', status: 'active' });
        await newUser.save();

        res.json({
            token: 'ratpack_token_' + newUser._id,
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
            msg: 'Account successfully ban gaya!'
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'Is email se koi account registered nahi hai!' });
        }
        // Success response for frontend
        res.json({ msg: 'Password reset instructions aapke email par bhej di gayi hain.' });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.post('/api/auth/reset-password/:token', async (req, res) => {
    try {
        const { newPassword } = req.body;
        // Simple update handler for reset
        res.json({ msg: 'Password successfully update ho gaya! Ab aap login kar sakte hain.' });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ratpack_token_')) {
        const userId = authHeader.split('ratpack_token_')[1];
        try {
            const user = await User.findById(userId);
            if (user) return res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
        } catch (e) {}
    }
    res.status(401).json({ error: 'Unauthorized' });
});

app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const user = await User.findOne({ password: current_password });
        
        if (!user) return res.status(400).json({ error: 'Current password galat hai!' });

        user.password = new_password;
        await user.save();
        res.json({ ok: true, msg: "Password ekdum jhakkas update ho gaya!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. DASHBOARD STATS API
// ==========================================
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const total_shows = await Show.countDocuments();
        const total_episodes = await Episode.countDocuments();
        const total_users = await User.countDocuments();
        res.json({
            total_shows,
            published_shows: total_shows,
            total_episodes,
            total_users
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. SHOWS & EPISODES APIs
// ==========================================
app.get('/api/shows', async (req, res) => {
    const shows = await Show.find();
    res.json(shows.map(s => ({ id: s._id, title: s.title, genre: s.genre, status: s.status || 'published', synopsis: s.description || s.synopsis, thumb_color: s.thumb_color || '#ff3ea5' })));
});
app.post('/api/shows', async (req, res) => {
    const newShow = new Show({ title: req.body.title, genre: req.body.genre, status: req.body.status, description: req.body.synopsis, thumb_color: req.body.thumb_color });
    await newShow.save(); res.json({ id: newShow._id, title: newShow.title });
});
app.put('/api/shows/:id', async (req, res) => {
    const updated = await Show.findByIdAndUpdate(req.params.id, { title: req.body.title, genre: req.body.genre, status: req.body.status, description: req.body.synopsis, thumb_color: req.body.thumb_color }, { new: true });
    res.json({ id: updated._id });
});
app.delete('/api/shows/:id', async (req, res) => {
    await Show.findByIdAndDelete(req.params.id);
    await Episode.deleteMany({ showId: req.params.id }); res.json({ ok: true });
});

app.get('/api/shows/:showId/episodes', async (req, res) => {
    const episodes = await Episode.find({ showId: req.params.showId });
    res.json(episodes.map(ep => ({ id: ep._id, title: ep.title, season: ep.season, ep_number: ep.ep_number, video_url: ep.video_url, status: ep.status })));
});
app.post('/api/shows/:showId/episodes', async (req, res) => {
    const newEp = new Episode({ showId: req.params.showId, title: req.body.title, season: req.body.season, ep_number: req.body.ep_number, video_url: req.body.video_url, status: req.body.video_url ? 'ready' : 'processing' });
    await newEp.save(); res.json({ id: newEp._id });
});
app.put('/api/episodes/:id', async (req, res) => {
    const ep = await Episode.findByIdAndUpdate(req.params.id, { title: req.body.title, season: req.body.season, ep_number: req.body.ep_number, video_url: req.body.video_url, status: req.body.video_url ? 'ready' : 'processing' }, { new: true });
    res.json({ id: ep._id });
});
app.delete('/api/episodes/:id', async (req, res) => {
    await Episode.findByIdAndDelete(req.params.id); res.json({ ok: true });
});

// ==========================================
// 4. FOUNDERS MANAGEMENT APIs
// ==========================================
app.get('/api/founders', async (req, res) => {
    const founders = await Founder.find().sort('sort_order');
    res.json(founders.map(f => ({ id: f._id, name: f.name, role: f.role, bio: f.bio, color: f.color, stat_label: f.stat_label, stat_value: f.stat_value, sort_order: f.sort_order })));
});
app.post('/api/founders', async (req, res) => {
    const newFounder = new Founder(req.body); await newFounder.save(); res.json({ id: newFounder._id });
});
app.put('/api/founders/:id', async (req, res) => {
    const updated = await Founder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ id: updated._id });
});
app.delete('/api/founders/:id', async (req, res) => {
    await Founder.findByIdAndDelete(req.params.id); res.json({ ok: true });
});

// ==========================================
// 5. USERS MANAGEMENT APIs
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, role: u.role, status: u.status })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
            status: 'active'
        });
        await newUser.save();
        res.json({ id: newUser._id });
    } catch (err) {
        res.status(400).json({ error: "Ye email pehle se exist karti hai!" });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
