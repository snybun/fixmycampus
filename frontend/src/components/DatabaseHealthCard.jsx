import React from 'react';
import { CheckCircle2, XCircle, Database, Server } from 'lucide-react';

export default function DatabaseHealthCard({ stats = {} }) {
  const isConnected = stats.db_connected;
  const tables = stats.tables || [];

  return (
    <section className="card" id="system">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Database size={20} />
          <div>
            <h2 className="card-title">Database &amp; Architecture Foundation</h2>
            <p className="card-subtitle">
              Verified MySQL 8.0 relational schema running inside Docker
            </p>
          </div>
        </div>

        {isConnected ? (
          <span className="badge badge-success">
            <CheckCircle2 size={13} />
            <span>MySQL 8 Active</span>
          </span>
        ) : (
          <span className="badge badge-danger">
            <XCircle size={13} />
            <span>Connection Offline</span>
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginTop: '0.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-canvas)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.125rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Connection Metrics
          </span>
          <ul style={{ listStyle: 'none', marginTop: '0.65rem', fontSize: '0.8125rem' }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Database Name:</span>
              <strong>fixmycampus_db</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Host &amp; Port:</span>
              <strong>database:3306</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Server Engine:</span>
              <strong>{stats.db_version || 'MySQL 8.0'}</strong>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Abstraction Layer:</span>
              <strong>PHP PDO (Prepared Statements)</strong>
            </li>
          </ul>
        </div>

        <div
          style={{
            background: 'var(--color-canvas)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '1.125rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            Relational Tables ({tables.length})
          </span>
          <div
            style={{
              marginTop: '0.65rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem',
            }}
          >
            {tables.length > 0 ? (
              tables.map((table) => (
                <span
                  key={table}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    padding: '0.2rem 0.5rem',
                    background: 'var(--color-white)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '4px',
                  }}
                >
                  {table}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Start containers to auto-populate schema and seed tables.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
