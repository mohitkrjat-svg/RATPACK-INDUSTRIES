const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'viewer' }, // admin, staff, ya viewer
    status: { type: String, default: 'active' }
});

module.exports = mongoose.model('User', userSchema);