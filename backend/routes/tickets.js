const express = require('express');
const Ticket = require('../models/Ticket');
const router = express.Router();

const statusOrder = ['open', 'in_progress', 'resolved', 'closed'];

const validTransitions = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['resolved']
};

// POST /tickets
router.post('/', async (req, res) => {
  try {
    const { subject, description, customerEmail, priority } = req.body;
    
    // Status defaults to open, so we don't need to pass it unless we want to, but standard says default is open.
    const ticket = new Ticket({
      subject,
      description,
      customerEmail,
      priority,
      status: 'open'
    });

    const savedTicket = await ticket.save();
    res.status(201).json(savedTicket);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /tickets/stats
router.get('/stats', async (req, res) => {
  try {
    const tickets = await Ticket.find();
    
    const stats = {
      statusCounts: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
      priorityCounts: { low: 0, medium: 0, high: 0, urgent: 0 },
      openBreachedCount: 0
    };

    tickets.forEach(t => {
      // Convert to JSON to get virtual fields like slaBreached
      const ticketObj = t.toJSON();
      
      if (stats.statusCounts[ticketObj.status] !== undefined) {
        stats.statusCounts[ticketObj.status]++;
      }
      if (stats.priorityCounts[ticketObj.priority] !== undefined) {
        stats.priorityCounts[ticketObj.priority]++;
      }
      
      // count of SLA-breached tickets currently open (open or in_progress)
      if ((ticketObj.status === 'open' || ticketObj.status === 'in_progress') && ticketObj.slaBreached) {
        stats.openBreachedCount++;
      }
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// GET /tickets
router.get('/', async (req, res) => {
  try {
    const { status, priority, breached } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    
    // Convert to JSON to get virtuals
    let result = tickets.map(t => t.toJSON());

    if (breached === 'true') {
      result = result.filter(t => t.slaBreached === true);
    } else if (breached === 'false') {
      result = result.filter(t => t.slaBreached === false);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// PATCH /tickets/:id
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required to update' });
    }

    const currentStatus = ticket.status;
    
    if (currentStatus === status) {
      return res.json(ticket);
    }

    // Validate transition
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ 
        error: `Invalid transition from ${currentStatus} to ${status}. Allowed transitions are: ${validTransitions[currentStatus]?.join(', ') || 'none'}` 
      });
    }

    // Apply rules
    if (status === 'resolved') {
      ticket.resolvedAt = new Date();
    } else if (currentStatus === 'resolved' && status !== 'closed') {
      // moving back from resolved
      ticket.resolvedAt = null;
    }

    ticket.status = status;
    const updatedTicket = await ticket.save();
    
    res.json(updatedTicket);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Server Error' });
  }
});

// DELETE /tickets/:id
router.delete('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;
