const express = require('express');
const router = express.Router();

let tickets = []; // In-memory database bypass
let nextId = 1;

const validTransitions = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['resolved']
};

const targetHours = {
  urgent: 1,
  high: 4,
  medium: 24,
  low: 72
};

function enrichTicket(t) {
  const end = t.resolvedAt ? new Date(t.resolvedAt) : new Date();
  const start = new Date(t.createdAt);
  const diffMs = end - start;
  const ageMinutes = Math.floor(diffMs / 60000);

  const targetMs = targetHours[t.priority] * 60 * 60 * 1000;
  let slaBreached = false;
  
  if (t.resolvedAt) {
    const timeToResolve = new Date(t.resolvedAt) - new Date(t.createdAt);
    slaBreached = timeToResolve > targetMs;
  } else {
    const timeOpen = new Date() - new Date(t.createdAt);
    slaBreached = timeOpen > targetMs;
  }

  return { ...t, ageMinutes, slaBreached };
}

// POST /tickets
router.post('/', (req, res) => {
  const { subject, description, customerEmail, priority } = req.body;
  
  if (!subject || !description || !customerEmail || !priority) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const ticket = {
    _id: nextId.toString(),
    id: nextId.toString(),
    subject,
    description,
    customerEmail,
    priority,
    status: 'open',
    createdAt: new Date(),
    resolvedAt: null
  };
  
  tickets.unshift(ticket);
  nextId++;
  
  res.status(201).json(enrichTicket(ticket));
});

// GET /tickets/stats
router.get('/stats', (req, res) => {
  const stats = {
    statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
    priorityCounts: { low: 0, medium: 0, high: 0, urgent: 0 },
    openBreachedCount: 0
  };

  tickets.forEach(t => {
    const enriched = enrichTicket(t);
    stats.statusCounts[enriched.status]++;
    stats.priorityCounts[enriched.priority]++;
    
    if ((enriched.status === 'open' || enriched.status === 'in_progress') && enriched.slaBreached) {
      stats.openBreachedCount++;
    }
  });

  res.json(stats);
});

// GET /tickets
router.get('/', (req, res) => {
  const { status, priority, breached } = req.query;
  
  let result = tickets.map(enrichTicket);

  if (status) result = result.filter(t => t.status === status);
  if (priority) result = result.filter(t => t.priority === priority);
  if (breached === 'true') {
    result = result.filter(t => t.slaBreached === true);
  } else if (breached === 'false') {
    result = result.filter(t => t.slaBreached === false);
  }

  res.json(result);
});

// PATCH /tickets/:id
router.patch('/:id', (req, res) => {
  const { status } = req.body;
  const index = tickets.findIndex(t => t._id === req.params.id || t.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const ticket = tickets[index];
  const currentStatus = ticket.status;
  
  if (currentStatus === status) {
    return res.json(enrichTicket(ticket));
  }

  if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
    return res.status(400).json({ 
      error: `Invalid transition from ${currentStatus} to ${status}.` 
    });
  }

  if (status === 'resolved') {
    ticket.resolvedAt = new Date();
  } else if (currentStatus === 'resolved' && status !== 'closed') {
    ticket.resolvedAt = null;
  }

  ticket.status = status;
  res.json(enrichTicket(ticket));
});

// DELETE /tickets/:id
router.delete('/:id', (req, res) => {
  const index = tickets.findIndex(t => t._id === req.params.id || t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  tickets.splice(index, 1);
  res.json({ message: 'Ticket deleted' });
});

module.exports = router;
