require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const ticketRoutes = require('./routes/tickets');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.json({ message: "DeskFlow API is successfully running!" });
});

// Database connection
const MONGODB_URI = 'mongodb+srv://solankivipendrasingh06_db_user:ahvHxdv2v7fsik97@cluster0.ihaguxw.mongodb.net/deskflow?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
