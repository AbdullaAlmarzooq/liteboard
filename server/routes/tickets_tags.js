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

// ----------------------------------------------------------------------
// GET all tags for a specific ticket
// Route: /api/ticket_tags/:ticketId
// ----------------------------------------------------------------------
router.get("/:ticketId", async (req, res) => {
  const { ticketId } = req.params;

  try {
    const resolvedTicketId = await resolveTicketId(ticketId);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Joins the junction table (ticket_tags) with the tags table 
    // to retrieve the details (label, color) of all tags associated with the ticketId.
    const tagsQuery = `
      SELECT 
        t.id, t.label, t.color
      FROM tags t
      JOIN ticket_tags tt ON t.id = tt.tag_id
      WHERE tt.ticket_id = $1
      ORDER BY t.label ASC
    `;
    
    const { rows } = await db.query(tagsQuery, [resolvedTicketId]);

    // Returns an array of tag objects linked to the ticket
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("Error fetching tags for ticket:", err);
    res.status(500).json({ error: "Failed to fetch ticket tags" });
  }
});

// ----------------------------------------------------------------------
// POST associate a tag with a ticket (Add)
// Route: /api/ticket_tags
// Body: { ticket_id: "TKT-001", tag_id: "TAG-XYZ" }
// ----------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { ticket_id, tag_id } = req.body;

  if (!ticket_id || !tag_id) {
    return res.status(400).json({ error: "Both ticket_id and tag_id are required" });
  }

  try {
    const resolvedTicketId = await resolveTicketId(ticket_id);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Ticket or Tag ID does not exist" });
    }
    await db.query(
      `
        INSERT INTO ticket_tags (ticket_id, tag_id)
        VALUES ($1, $2)
      `,
      [resolvedTicketId, tag_id]
    );

    res.status(201).json({ message: "Tag associated successfully" });
  } catch (err) {
    // Check for unique constraint violation (tag already assigned)
    if (err.message.includes('duplicate key')) {
        return res.status(409).json({ error: "Tag is already associated with this ticket" });
    }
    // Check for foreign key constraint violation (ticket or tag doesn't exist)
    if (err.message.includes('FOREIGN KEY constraint failed') || err.message.includes('violates foreign key constraint')) {
        return res.status(404).json({ error: "Ticket or Tag ID does not exist" });
    }

    console.error("Error associating tag:", err);
    res.status(500).json({ error: "Failed to associate tag with ticket" });
  }
});

// ----------------------------------------------------------------------
// DELETE remove a tag from a ticket (Remove)
// Route: /api/ticket_tags/:ticketId/:tagId
// ----------------------------------------------------------------------
router.delete("/:ticketId/:tagId", async (req, res) => {
  const { ticketId, tagId } = req.params;

  try {
    const resolvedTicketId = await resolveTicketId(ticketId);
    if (!resolvedTicketId) {
      return res.status(404).json({ error: "Tag association not found for this ticket" });
    }
    const result = await db.query(
      `
        DELETE FROM ticket_tags
        WHERE ticket_id = $1 AND tag_id = $2
      `,
      [resolvedTicketId, tagId]
    );

    if (result.rowCount === 0) {
      // If 0 changes, it means the tag association didn't exist
      return res.status(404).json({ error: "Tag association not found for this ticket" });
    }

    res.json({ message: "Tag removed successfully" });
  } catch (err) {
    console.error("Error removing tag:", err);
    res.status(500).json({ error: "Failed to remove tag from ticket" });
  }
});

// ----------------------------------------------------------------------
// PUT/PATCH replace all tags for a ticket (Modification/Edit)
// Route: /api/ticket_tags/:ticketId
// Body: { tag_ids: ["TAG-001", "TAG-002", ...] }
// This replaces the old set of tags with a completely new set in a single transaction.
// ----------------------------------------------------------------------
router.put("/:ticketId", async (req, res) => {
    const { ticketId } = req.params;
    const { tag_ids } = req.body; // Expects an array of tag IDs

    if (!Array.isArray(tag_ids)) {
        return res.status(400).json({ error: "tag_ids must be an array" });
    }

    try {
        const resolvedTicketId = await resolveTicketId(ticketId);
        if (!resolvedTicketId) {
            return res.status(404).json({ error: "Ticket not found" });
        }
        const client = await db.pool.connect();
        try {
            await client.query("BEGIN");

            await client.query("DELETE FROM ticket_tags WHERE ticket_id = $1", [resolvedTicketId]);

            for (const tagId of tag_ids) {
                await client.query(
                    `INSERT INTO ticket_tags (ticket_id, tag_id) VALUES ($1, $2)`,
                    [resolvedTicketId, tagId]
                );
            }

            await client.query("COMMIT");
            res.json({ message: "Tags updated successfully" });
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error("Error updating all tags:", err);
        // Specifically check for Foreign Key constraint violation
        if (err.message.includes('FOREIGN KEY constraint failed') || err.message.includes('violates foreign key constraint')) {
            // This happens if one of the IDs in tag_ids does not exist in the 'tags' table.
            return res.status(400).json({ error: "One or more Tag IDs provided are invalid" });
        }
        res.status(500).json({ error: "Failed to update tags for ticket" });
    }
});


module.exports = router;
