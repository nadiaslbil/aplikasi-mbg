const { db, isPostgres } = require('../database');

/**
 * Log an action to the audit_logs table
 * @param {Object} params
 * @param {number} params.user_id - ID of the user performing the action
 * @param {string} params.action - Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param {string} params.table_name - Name of the table affected
 * @param {string|number} params.record_id - ID of the record affected
 * @param {Object} params.old_values - Previous data (for UPDATE/DELETE)
 * @param {Object} params.new_values - New data (for CREATE/UPDATE)
 * @param {Object} params.req - Express request object (to extract IP and User Agent)
 */
async function logAudit({ user_id, action, table_name, record_id, old_values, new_values, req }) {
  try {
    const ip_address = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const user_agent = req ? req.headers['user-agent'] : null;

    // Prepare JSON values based on database type
    let oldVal = old_values;
    let newVal = new_values;

    if (!isPostgres) {
      // SQLite requires stringified JSON
      oldVal = old_values ? JSON.stringify(old_values) : null;
      newVal = new_values ? JSON.stringify(new_values) : null;
    }

    await db('audit_logs').insert({
      user_id: user_id || (req && req.user ? req.user.id : null),
      action,
      table_name,
      record_id: record_id ? record_id.toString() : null,
      old_values: oldVal,
      new_values: newVal,
      ip_address,
      user_agent,
      created_at: db.fn.now()
    });

    console.log(`📝 Audit Log: ${action} on ${table_name || 'N/A'} (ID: ${record_id || 'N/A'}) by User ID: ${user_id || 'System'}`);
  } catch (error) {
    console.error('❌ Audit Logging Error:', error.message);
    // We don't want to crash the main app if logging fails, but we should know about it
  }
}

module.exports = { logAudit };
