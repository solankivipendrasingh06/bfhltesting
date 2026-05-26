const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  subject: { type: String, required: [true, 'Subject is required'] },
  description: { type: String, required: [true, 'Description is required'] },
  customerEmail: { 
    type: String, 
    required: [true, 'Email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  priority: { 
    type: String, 
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: '{VALUE} is not a valid priority'
    },
    required: [true, 'Priority is required']
  },
  status: { 
    type: String, 
    enum: {
      values: ['open', 'in_progress', 'resolved', 'closed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'open' 
  },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date, default: null }
});

ticketSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    // Calculate ageMinutes
    const end = ret.resolvedAt ? new Date(ret.resolvedAt) : new Date();
    const start = new Date(ret.createdAt);
    const diffMs = end - start;
    ret.ageMinutes = Math.floor(diffMs / 60000);

    // Calculate slaBreached
    const targetHours = {
      urgent: 1,
      high: 4,
      medium: 24,
      low: 72
    };
    const targetMs = targetHours[ret.priority] * 60 * 60 * 1000;
    
    if (ret.resolvedAt) {
      // Resolved after target
      const timeToResolve = new Date(ret.resolvedAt) - new Date(ret.createdAt);
      ret.slaBreached = timeToResolve > targetMs;
    } else {
      // Still unresolved past target
      const timeOpen = new Date() - new Date(ret.createdAt);
      ret.slaBreached = timeOpen > targetMs;
    }

    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Ticket', ticketSchema);
