const express = require('express');
const router = express.Router();

// placeholder user routes for extension
router.get('/me', (req, res) => {
  res.json({ message: 'user route placeholder' });
});

module.exports = router;
