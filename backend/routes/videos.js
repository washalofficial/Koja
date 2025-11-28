const express = require('express');
const router = express.Router();
const Video = require('../models/Video');

router.get('/', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 }).limit(100);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { videoUrl, caption } = req.body;
    const v = new Video({ videoUrl, caption });
    await v.save();
    res.json(v);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
