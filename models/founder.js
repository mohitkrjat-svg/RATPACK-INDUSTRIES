const mongoose = require('mongoose');

const founderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String },
    bio: { type: String },
    color: { type: String, default: '#4deeea' },
    stat_label: { type: String },
    stat_value: { type: String },
    sort_order: { type: Number, default: 0 }
});

module.exports = mongoose.model('Founder', founderSchema);