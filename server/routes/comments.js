// server/routes/comments.js
const express = require("express");
const db = require("../db/db");
const router = express.Router();

const resolveTicketId = async (ticketId) => {
  const { rows } = await db.query(
    "SELECT id FROM tickets WHERE (id::text = $1 OR ticket_code = $1) AND deleted_at IS NULL",
    [ticketId]
  );
  return rows[0]?.id || null;
};

// GET comments for a ticket
router.get("/", async (req, res) => {
  const { ticketId } = req.query;
  
  if (!ticketId) {
    return res.status(400).json({ error: "ticketId query parameter is required" });
  }
  
  try {
    const resolvedTicketId = await resolveTicketId(ticketId);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const commentsQuery = `
      SELECT 
        c.id,
        c.ticket_id,
        c.text,
        c.comment_type,
        c.created_at AS timestamp,
        e.name AS author,
        c.author_id
      FROM comments c
      LEFT JOIN employees e ON c.author_id = e.id
      WHERE c.ticket_id = $1
      ORDER BY c.created_at ASC
    `;
    
    const { rows } = await db.query(commentsQuery, [resolvedTicketId]);
    const comments = rows;
    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST new comment
router.post("/", async (req, res) => {
  const { ticket_id, text, author, comment_type } = req.body;
  
  if (!ticket_id || !text || !author) {
    return res.status(400).json({ error: "ticket_id, text, and author are required" });
  }
  
  try {
    const resolvedTicketId = await resolveTicketId(ticket_id);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const result = await db.query(
      `
        INSERT INTO comments (ticket_id, text, author_id, comment_type, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `,
      [resolvedTicketId, text, author, comment_type || "comment"]
    );

    res.status(201).json({
      message: "Comment created",
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error("Error creating comment:", err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// PUT update comment
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }
  
  try {
    const result = await db.query(
      `
        UPDATE comments
        SET text = $1, updated_at = NOW()
        WHERE id = $2
      `,
      [text, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ message: "Comment updated" });
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// DELETE comment
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query("DELETE FROM comments WHERE id = $1", [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    res.json({ message: "Comment deleted" });
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

module.exports = router;
