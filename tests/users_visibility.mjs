import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

// Exercise the endpoint's actual listing query with an isolated in-memory database.
const endpoint = readFileSync(new URL('../public/api/users.php', import.meta.url), 'utf8');
const query = endpoint.match(/\$sql = "([\s\S]*?)";/)?.[1];
assert.ok(query, 'Users listing query exists');
const db = new DatabaseSync(':memory:');
try {
  db.exec(`
    CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT, display_name TEXT);
    CREATE TABLE users (id INTEGER PRIMARY KEY, role_id INTEGER, user_identifier TEXT,
      full_name TEXT, email TEXT, phone_number TEXT, department TEXT, status TEXT, created_at TEXT);
    INSERT INTO roles VALUES (1, 'admin', 'Admin'), (2, 'supervisor', 'Supervisor'),
      (3, 'technician', 'Technician'), (4, 'student', 'Student');
    INSERT INTO users (id, role_id, full_name, status) VALUES
      (1, 1, 'Admin', 'active'), (2, 2, 'Removed supervisor', 'inactive'),
      (3, 3, 'Removed technician', 'inactive'), (4, 2, 'Active supervisor', 'active'),
      (5, 3, 'Active technician', 'active'), (6, 4, 'Inactive student', 'inactive');
  `);
  const ids = (sql) => db.prepare(sql).all().map((user) => user.id).sort((a, b) => a - b);
  assert.deepEqual(ids(query), [1, 4, 5, 6]);
  assert.deepEqual(ids(query + " AND r.name = 'supervisor'"), [4]);
  assert.deepEqual(ids(query + " AND u.full_name LIKE '%Removed%'"), []);
  db.exec("UPDATE users SET status = 'inactive' WHERE id = 5");
  assert.deepEqual(ids(query), [1, 4, 6], 'Newly removed workers disappear on the next fetch');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 6,
    'Historical account records remain intact');
  console.log('PASS: removed staff hidden, active staff visible, filters and counts consistent, history retained');
} finally {
  db.close();
}
