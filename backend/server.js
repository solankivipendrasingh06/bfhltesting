require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ticketRoutes = require('./routes/tickets');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.json({ message: "DeskFlow API is successfully running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
