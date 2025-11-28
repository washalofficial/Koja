require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/simosatok';
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo connected'))
  .catch((err) => console.error(err));

app.use('/api/videos', require('./routes/videos'));
app.use('/api/users', require('./routes/users'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log('Server running on', PORT));
