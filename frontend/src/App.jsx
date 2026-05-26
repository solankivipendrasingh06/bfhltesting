import React, { useState, useEffect } from 'react';

const API_URL = 'https://bfhltesting.onrender.com/tickets';

const validTransitions = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['in_progress', 'closed'],
  closed: ['resolved']
};

const columns = [
  { id: 'open', title: 'Open' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'resolved', title: 'Resolved' },
  { id: 'closed', title: 'Closed' }
];

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [priorityFilter, setPriorityFilter] = useState('');
  const [breachedFilter, setBreachedFilter] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '', description: '', customerEmail: '', priority: 'medium'
  });
  const [formErrors, setFormErrors] = useState({});
  const [formGlobalError, setFormGlobalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Drag and Drop State
  const [draggedTicket, setDraggedTicket] = useState(null);

  const fetchTickets = async () => {
    try {
      let url = API_URL;
      const params = new URLSearchParams();
      if (priorityFilter) params.append('priority', priorityFilter);
      if (breachedFilter) params.append('breached', 'true');
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchTickets(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [priorityFilter, breachedFilter]);

  const handleStatusChange = async (id, newStatus, currentStatus) => {
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      alert(`Invalid transition from ${currentStatus.replace('_', ' ')} to ${newStatus.replace('_', ' ')}`);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      
      const updatedTicket = await res.json();
      setTickets(tickets.map(t => t.id === id || t._id === id ? updatedTicket : t));
      fetchStats(); // Update stats in background
    } catch (err) {
      alert(err.message);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, ticket) => {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTicket(null);
    document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const currentStatus = draggedTicket?.status;
    if (currentStatus !== colId && validTransitions[currentStatus]?.includes(colId)) {
      e.currentTarget.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!draggedTicket) return;
    
    const currentStatus = draggedTicket.status;
    if (currentStatus !== colId) {
      handleStatusChange(draggedTicket._id || draggedTicket.id, colId, currentStatus);
    }
  };

  // Form Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific error
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormGlobalError('');
    setFormErrors({});
    
    // Basic validation
    const errors = {};
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (!formData.customerEmail.trim()) {
      errors.customerEmail = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.customerEmail)) {
      errors.customerEmail = 'Invalid email format';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }
      
      // Success
      setIsModalOpen(false);
      setFormData({ subject: '', description: '', customerEmail: '', priority: 'medium' });
      // Reload everything to ensure consistency
      loadData();
    } catch (err) {
      setFormGlobalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Render Helpers
  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="app-container">
      <header>
        <h1>DeskFlow</h1>
        <button className="btn" onClick={() => setIsModalOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          New Ticket
        </button>
      </header>

      {stats && (
        <div className="stats-strip">
          <div className="stat-item">
            <span className="stat-label">Total Tickets</span>
            <span className="stat-value">{Object.values(stats.statusCounts).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Open</span>
            <span className="stat-value">{stats.statusCounts.open}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{stats.statusCounts.in_progress}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Resolved</span>
            <span className="stat-value">{stats.statusCounts.resolved}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Open SLA Breaches</span>
            <span className="stat-value stat-breached">{stats.openBreachedCount}</span>
          </div>
        </div>
      )}

      <div className="controls-bar">
        <div className="filters">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="urgent">Urgent (1h SLA)</option>
            <option value="high">High (4h SLA)</option>
            <option value="medium">Medium (24h SLA)</option>
            <option value="low">Low (72h SLA)</option>
          </select>
          <label className="checkbox-label">
            <input 
              type="checkbox" 
              checked={breachedFilter} 
              onChange={(e) => setBreachedFilter(e.target.checked)} 
            />
            Show SLA Breached Only
          </label>
        </div>
        <button className="btn-secondary btn-small" onClick={loadData}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading board...</div>
      ) : error ? (
        <div className="global-error">{error}</div>
      ) : (
        <div className="board">
          {columns.map(col => {
            const colTickets = tickets.filter(t => t.status === col.id);
            return (
              <div 
                key={col.id} 
                className="column"
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="column-header">
                  {col.title}
                  <span className="column-count">{colTickets.length}</span>
                </div>
                <div className="ticket-list">
                  {colTickets.map(ticket => (
                    <div 
                      key={ticket._id || ticket.id} 
                      className={`ticket-card ${ticket.slaBreached ? 'breached' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, ticket)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="ticket-header">
                        <span className={`badge badge-${ticket.priority}`}>{ticket.priority}</span>
                      </div>
                      <div className="ticket-subject">{ticket.subject}</div>
                      
                      <div className="ticket-meta">
                        <span>Age: {formatTime(ticket.ageMinutes)}</span>
                        {ticket.slaBreached && (
                          <span className="sla-indicator" title="SLA Breached">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            Breached
                          </span>
                        )}
                      </div>

                      <div className="ticket-actions">
                        {validTransitions[ticket.status]?.map(nextStatus => {
                          const actionNames = {
                            'in_progress': 'Start Work',
                            'resolved': 'Resolve',
                            'open': 'Reopen',
                            'closed': 'Close'
                          };
                          return (
                            <button 
                              key={nextStatus}
                              className="btn-secondary btn-small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(ticket._id || ticket.id, nextStatus, ticket.status);
                              }}
                            >
                              {actionNames[nextStatus]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {colTickets.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '1rem 0' }}>
                      No tickets
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Create New Ticket</div>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            {formGlobalError && <div className="global-error">{formGlobalError}</div>}
            
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Subject</label>
                <input 
                  type="text" 
                  name="subject" 
                  value={formData.subject} 
                  onChange={handleInputChange}
                  placeholder="E.g., Cannot login to account"
                />
                {formErrors.subject && <div className="error-text">{formErrors.subject}</div>}
              </div>
              
              <div className="form-group">
                <label>Customer Email</label>
                <input 
                  type="email" 
                  name="customerEmail" 
                  value={formData.customerEmail} 
                  onChange={handleInputChange}
                  placeholder="customer@example.com"
                />
                {formErrors.customerEmail && <div className="error-text">{formErrors.customerEmail}</div>}
              </div>
              
              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={formData.priority} onChange={handleInputChange}>
                  <option value="low">Low (72h target)</option>
                  <option value="medium">Medium (24h target)</option>
                  <option value="high">High (4h target)</option>
                  <option value="urgent">Urgent (1h target)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleInputChange}
                  placeholder="Detailed description of the issue..."
                ></textarea>
                {formErrors.description && <div className="error-text">{formErrors.description}</div>}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
