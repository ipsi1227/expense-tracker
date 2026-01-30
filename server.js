// server.js - Backend Server with Database
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize SQLite Database
const db = new sqlite3.Database('./expenses.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        // Create expenses table if it doesn't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('✅ Expenses table ready');
            }
        });
    }
});

// API Routes

// Get all expenses
app.get('/api/expenses', (req, res) => {
    db.all('SELECT * FROM expenses ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ expenses: rows });
    });
});

// Get expenses grouped by category (for the main view)
app.get('/api/expenses/grouped', (req, res) => {
    db.all(`
        SELECT category, SUM(amount) as total_amount 
        FROM expenses 
        GROUP BY category
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Convert to object format like the original Python code
        const grouped = {};
        rows.forEach(row => {
            grouped[row.category] = row.total_amount;
        });
        
        res.json({ expenses: grouped });
    });
});

// Add new expense
app.post('/api/expenses', (req, res) => {
    const { category, amount } = req.body;
    
    if (!category || !amount || amount <= 0) {
        res.status(400).json({ error: 'Invalid category or amount' });
        return;
    }
    
    db.run(
        'INSERT INTO expenses (category, amount) VALUES (?, ?)',
        [category, amount],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: this.lastID,
                category,
                amount,
                message: 'Expense added successfully'
            });
        }
    );
});

// Get total expenses
app.get('/api/expenses/total', (req, res) => {
    db.get('SELECT SUM(amount) as total FROM expenses', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ total: row.total || 0 });
    });
});

// Get highest expense
app.get('/api/expenses/highest', (req, res) => {
    db.get(`
        SELECT category, SUM(amount) as total_amount 
        FROM expenses 
        GROUP BY category 
        ORDER BY total_amount DESC 
        LIMIT 1
    `, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            category: row ? row.category : null,
            amount: row ? row.total_amount : 0 
        });
    });
});

// Delete an expense
app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM expenses WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'Expense deleted successfully',
            changes: this.changes 
        });
    });
});

// Clear all expenses
app.delete('/api/expenses', (req, res) => {
    db.run('DELETE FROM expenses', [], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'All expenses cleared',
            changes: this.changes 
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Access your expense tracker at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed database connection');
        process.exit(0);
    });
});