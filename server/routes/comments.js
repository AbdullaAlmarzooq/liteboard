// server/routes/comments.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

// Helper function to generate next comment ID
const generateCommentId = () => {
  try {
    const result = db.prepare(`
      SELECT id FROM comments 
      WHERE id LIKE 'COM-%' 
      ORDER BY id DESC 
      LIMIT 1
    `).get();
    
    if (result) {
      const currentNum = parseInt(result.id.split('-')[1]);
      const nextNum = currentNum + 1;
      return `COM-${String(nextNum).padStart(3, '0')}`;
    }
    return 'COM-001';
  } catch (err) {
    console.error('Error generating comment ID:', err);
    return `COM-${String(Date.now()).slice(-3)}`; // Fallback
  }
};

// GET comments for a ticket
router.get("/", (req, res) => {
  const { ticketId } = req.query;
  
  if (!ticketId) {
    return res.status(400).json({ error: "ticketId query parameter is required" });
  }
  
  try {
    const commentsQuery = `
      SELECT id, ticket_id, text, author, comment_type, timestamp
      FROM comments 
      WHERE ticket_id = ?
      ORDER BY timestamp ASC
    `;
    
    const comments = db.prepare(commentsQuery).all(ticketId);
    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST new comment
router.post("/", (req, res) => {
  const { ticket_id, text, author, comment_type } = req.body;
  
  if (!ticket_id || !text || !author) {
    return res.status(400).json({ error: "ticket_id, text, and author are required" });
  }
  
  try {
    const newId = generateCommentId();
    
    const insertComment = db.prepare(`
      INSERT INTO comments (id, ticket_id, text, author, comment_type, timestamp)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    insertComment.run(newId, ticket_id, text, author, comment_type || 'comment');
    
    res.status(201).json({ 
      message: "Comment created",
      id: newId
    });
  } catch (err) {
    console.error("Error creating comment:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// PUT update comment
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }
  
  try {
    const updateComment = db.prepare(`
      UPDATE comments 
      SET text = ?
      WHERE id = ?
    `);
    
    const result = updateComment.run(text, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ message: "Comment updated" });
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// DELETE comment
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  
  try {
    const deleteComment = db.prepare("DELETE FROM comments WHERE id = ?");
    const result = deleteComment.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

module.exports = router;