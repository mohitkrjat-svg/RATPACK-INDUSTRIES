const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema({
    showId: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    title: { type: String, required: true },
    season: { type: Number, default: 1 },
    ep_number: { type: Number, default: 1 },
    video_url: { type: String },
    status: { type: String, default: 'ready' }
});

module.exports = mongoose.model('Episode', episodeSchema);