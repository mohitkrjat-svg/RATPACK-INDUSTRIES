const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    genre: { type: String, required: true }, // Jaise: Comedy, Sci-Fi, Drama
    type: { type: String, default: 'Series' }, // Series ya Movie
    seasons: { type: Number, default: 1 },
    episodes: { type: Number, default: 1 },
    thumbnailColor: { type: String, default: '#ff3ea5' }, // Card ka background color/gradient
    bannerImage: { type: String }, // Optional banner url
}, { timestamps: true });

module.exports = mongoose.model('Show', showSchema);