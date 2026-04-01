import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ModelRecord = {
  upstreamId: string;
  id: string;
  created: number | null;
  ownedBy: string | null;
  displayName: string | null;
  icon: string | null;
  isVisible: boolean;
  sortOrder: number;
  syncedAt: string;
  isActive: boolean;
};

export type ProbeRecord = {
  id: number;
  upstreamId: string;
  upstreamName: string;
  model: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  statusCode: number | null;
  error: string | null;
  connectivityLatencyMs: number | null;
  firstTokenLatencyMs: number | null;
  totalLatencyMs: number;
  rawResponseText: string | null;
};

export type AdminUserRecord = {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: string;
  passwordUpdatedAt: string;
  lastLoginAt: string | null;
};

export type AdminSessionRecord = {
  id: string;
  userId: number;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
};

export type DbClient = {
  upsertUpstream(upstream: { id: string; name: string; group: string; apiBaseUrl: string; modelsUrl: string; apiKey: string; isActive: boolean; updatedAt: string }): void;
  listUpstreams(activeOnly?: boolean): Array<{ id: string; name: string; group: string; apiBaseUrl: string; modelsUrl: string; apiKey: string; isActive: boolean; updatedAt: string }>;
  deactivateMissingUpstreams(activeUpstreamIds: string[], updatedAt: string): void;
  upsertModel(model: ModelRecord): void;
  listModels(activeOnly?: boolean): ModelRecord[];
  updateModelMetadata(model: { upstreamId: string; id: string; displayName: string | null; icon: string | null; isVisible: boolean; sortOrder: number }): void;
  deactivateMissingModels(upstreamId: string, activeModelIds: string[], syncedAt: string): void;
  getSetting(key: string): string | null;
  setSetting(key: string, value: string, updatedAt: string): void;
  listSettings(): Record<string, string>;
  getAdminUserByUsername(username: string): AdminUserRecord | null;
  getAdminUserById(userId: number): AdminUserRecord | null;
  createAdminUser(username: string, passwordHash: string, createdAt: string): void;
  updateAdminCredentials?(userId: number, username: string, passwordHash: string, updatedAt: string): void;
  updateAdminLogin(userId: number, loggedInAt: string): void;
  createAdminSession(session: AdminSessionRecord): void;
  getAdminSessionByTokenHash(tokenHash: string): AdminSessionRecord | null;
  touchAdminSession(sessionId: string, lastSeenAt: string): void;
  deleteAdminSession(sessionId: string): void;
  deleteExpiredAdminSessions(nowIso: string): void;
  insertProbe(probe: Omit<ProbeRecord, "id">): number;
  deleteProbesForModel?(upstreamId: string, modelId: string): number;
  listProbesSince(sinceIso: string): ProbeRecord[];
  listRecentProbes(limit: number): ProbeRecord[];
  close(): void;
};

function toProbeRecord(row: Record<string, unknown>): ProbeRecord {
  return {
    id: Number(row.id),
    upstreamId: String(row.upstream_id),
    upstreamName: String(row.upstream_name),
    model: String(row.model),
    startedAt: String(row.started_at),
    completedAt: String(row.completed_at),
    success: Boolean(row.success),
    statusCode: row.status_code === null ? null : Number(row.status_code),
    error: row.error === null ? null : String(row.error),
    connectivityLatencyMs:
      row.connectivity_latency_ms === null ? null : Number(row.connectivity_latency_ms),
    firstTokenLatencyMs:
      row.first_token_latency_ms === null ? null : Number(row.first_token_latency_ms),
    totalLatencyMs: Number(row.total_latency_ms),
    rawResponseText: row.raw_response_text === null ? null : String(row.raw_response_text),
  };
}

function toModelRecord(row: Record<string, unknown>): ModelRecord {
  return {
    upstreamId: String(row.upstream_id),
    id: String(row.id),
    created: row.created === null ? null : Number(row.created),
    ownedBy: row.owned_by === null ? null : String(row.owned_by),
    displayName: row.display_name === null ? null : String(row.display_name),
    icon: row.icon === null ? null : String(row.icon),
    isVisible: Boolean(row.is_visible),
    sortOrder: Number(row.sort_order ?? 0),
    syncedAt: String(row.synced_at),
    isActive: Boolean(row.is_active),
  };
}

function hasColumn(db: DatabaseSync, tableName: string, columnName: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<Record<string, unknown>>;
  return rows.some((row) => String(row.name) === columnName);
}

function hasTable(db: DatabaseSync, tableName: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as Record<string, unknown> | undefined;
  return Boolean(row);
}

function readNullableString(value: unknown): string | null {
  return value === null ? null : String(value);
}

function readAdminUserRecord(row: Record<string, unknown>): AdminUserRecord {
  return {
    id: Number(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
    passwordUpdatedAt: String(row.password_updated_at),
    lastLoginAt: readNullableString(row.last_login_at),
  };
}

function readAdminSessionRecord(row: Record<string, unknown>): AdminSessionRecord {
  return {
    id: String(row.id),
    userId: Number(row.user_id),
    tokenHash: String(row.token_hash),
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
    lastSeenAt: String(row.last_seen_at),
  };
}

export function createDb(databaseFile: string): DbClient {
  mkdirSync(dirname(databaseFile), { recursive: true });
  const db = new DatabaseSync(databaseFile);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS upstreams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      upstream_group TEXT NOT NULL DEFAULT 'default',
      api_base_url TEXT NOT NULL,
      models_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      password_updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);
  `);

  if (!hasColumn(db, "upstreams", "upstream_group")) {
    db.exec("ALTER TABLE upstreams ADD COLUMN upstream_group TEXT NOT NULL DEFAULT 'default';");
  }

  const hasModelsTable = hasTable(db, "models");
  const hasProbesTable = hasTable(db, "probes");

  if (!hasModelsTable) {
    db.exec(`
      CREATE TABLE models (
        upstream_id TEXT NOT NULL,
        id TEXT NOT NULL,
        created INTEGER,
        owned_by TEXT,
        display_name TEXT,
        icon TEXT,
        is_visible INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (upstream_id, id),
        FOREIGN KEY (upstream_id) REFERENCES upstreams(id) ON DELETE CASCADE
      );
    `);
  }

  if (hasModelsTable && !hasColumn(db, "models", "upstream_id")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;

      ALTER TABLE models RENAME TO models_legacy;
      CREATE TABLE models (
        upstream_id TEXT NOT NULL,
        id TEXT NOT NULL,
        created INTEGER,
        owned_by TEXT,
        display_name TEXT,
        icon TEXT,
        is_visible INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        synced_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (upstream_id, id),
        FOREIGN KEY (upstream_id) REFERENCES upstreams(id) ON DELETE CASCADE
      );
      INSERT INTO models (upstream_id, id, created, owned_by, display_name, icon, is_visible, sort_order, synced_at, is_active)
      SELECT 'default', id, created, owned_by, NULL, NULL, 1, 0, synced_at, COALESCE(is_active, 1)
      FROM models_legacy;
      DROP TABLE models_legacy;

      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  if (hasTable(db, "models") && !hasColumn(db, "models", "is_active")) {
    db.exec("ALTER TABLE models ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;");
  }

  if (hasTable(db, "models") && !hasColumn(db, "models", "display_name")) {
    db.exec("ALTER TABLE models ADD COLUMN display_name TEXT;");
  }

  if (hasTable(db, "models") && !hasColumn(db, "models", "icon")) {
    db.exec("ALTER TABLE models ADD COLUMN icon TEXT;");
  }

  if (hasTable(db, "models") && !hasColumn(db, "models", "is_visible")) {
    db.exec("ALTER TABLE models ADD COLUMN is_visible INTEGER NOT NULL DEFAULT 1;");
  }

  if (hasTable(db, "models") && !hasColumn(db, "models", "sort_order")) {
    db.exec("ALTER TABLE models ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;");
  }

  if (!hasProbesTable) {
    db.exec(`
      CREATE TABLE probes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upstream_id TEXT NOT NULL,
        model TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        success INTEGER NOT NULL,
        status_code INTEGER,
        error TEXT,
        connectivity_latency_ms INTEGER,
        first_token_latency_ms INTEGER,
        total_latency_ms INTEGER NOT NULL,
        raw_response_text TEXT,
        FOREIGN KEY (upstream_id, model) REFERENCES models(upstream_id, id)
      );
    `);
  }

  if (hasProbesTable && !hasColumn(db, "probes", "upstream_id")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;

      ALTER TABLE probes RENAME TO probes_legacy;
      CREATE TABLE probes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upstream_id TEXT NOT NULL,
        model TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        success INTEGER NOT NULL,
        status_code INTEGER,
        error TEXT,
        connectivity_latency_ms INTEGER,
        first_token_latency_ms INTEGER,
        total_latency_ms INTEGER NOT NULL,
        raw_response_text TEXT,
        FOREIGN KEY (upstream_id, model) REFERENCES models(upstream_id, id)
      );
      INSERT INTO probes (
        id,
        upstream_id,
        model,
        started_at,
        completed_at,
        success,
        status_code,
        error,
        connectivity_latency_ms,
        first_token_latency_ms,
        total_latency_ms,
        raw_response_text
      )
      SELECT
        id,
        'default',
        model,
        started_at,
        completed_at,
        success,
        status_code,
        error,
        connectivity_latency_ms,
        first_token_latency_ms,
        total_latency_ms,
        raw_response_text
      FROM probes_legacy;
      DROP TABLE probes_legacy;

      COMMIT;
      PRAGMA foreign_keys = ON;
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_models_upstream_id ON models(upstream_id);
    CREATE INDEX IF NOT EXISTS idx_probes_upstream_model_started_at ON probes(upstream_id, model, started_at);
    CREATE INDEX IF NOT EXISTS idx_probes_started_at ON probes(started_at);
  `);

  db.prepare("UPDATE models SET upstream_id = 'default' WHERE upstream_id IS NULL OR upstream_id = ''").run();
  db.prepare("UPDATE probes SET upstream_id = 'default' WHERE upstream_id IS NULL OR upstream_id = ''").run();

  const upsertUpstreamStmt = db.prepare(`
    INSERT INTO upstreams (id, name, upstream_group, api_base_url, models_url, api_key, is_active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id)
    DO UPDATE SET
      name = excluded.name,
      upstream_group = excluded.upstream_group,
      api_base_url = excluded.api_base_url,
      models_url = excluded.models_url,
      api_key = excluded.api_key,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `);

  const listActiveUpstreamsStmt = db.prepare(`
    SELECT id, name, upstream_group, api_base_url, models_url, api_key, is_active, updated_at
    FROM upstreams
    WHERE is_active = 1
    ORDER BY name ASC, id ASC
  `);

  const listAllUpstreamsStmt = db.prepare(`
    SELECT id, name, upstream_group, api_base_url, models_url, api_key, is_active, updated_at
    FROM upstreams
    ORDER BY name ASC, id ASC
  `);

  const deactivateUpstreamStmt = db.prepare(`
    UPDATE upstreams
    SET is_active = 0, updated_at = ?
    WHERE id = ?
  `);

  const upsertModelStmt = db.prepare(`
    INSERT INTO models (upstream_id, id, created, owned_by, synced_at, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT (upstream_id, id)
    DO UPDATE SET
      created = COALESCE(excluded.created, models.created),
      owned_by = COALESCE(excluded.owned_by, models.owned_by),
      synced_at = excluded.synced_at,
      is_active = 1
  `);

  const listActiveModelsStmt = db.prepare(`
    SELECT upstream_id, id, created, owned_by, display_name, icon, is_visible, sort_order, synced_at, is_active
    FROM models
    WHERE is_active = 1
    ORDER BY upstream_id ASC, sort_order ASC, COALESCE(display_name, id) COLLATE NOCASE ASC, id ASC
  `);

  const listAllModelsStmt = db.prepare(`
    SELECT upstream_id, id, created, owned_by, display_name, icon, is_visible, sort_order, synced_at, is_active
    FROM models
    ORDER BY upstream_id ASC, sort_order ASC, COALESCE(display_name, id) COLLATE NOCASE ASC, id ASC
  `);

  const deactivateModelStmt = db.prepare(`
    UPDATE models
    SET is_active = 0, synced_at = ?
    WHERE upstream_id = ? AND id = ?
  `);

  const updateModelMetadataStmt = db.prepare(`
    UPDATE models
    SET display_name = ?, icon = ?, is_visible = ?, sort_order = ?
    WHERE upstream_id = ? AND id = ?
  `);

  const insertProbeStmt = db.prepare(`
    INSERT INTO probes (
      upstream_id,
      model,
      started_at,
      completed_at,
      success,
      status_code,
      error,
      connectivity_latency_ms,
      first_token_latency_ms,
      total_latency_ms,
      raw_response_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteProbesForModelStmt = db.prepare(`
    DELETE FROM probes
    WHERE upstream_id = ? AND model = ?
  `);

  const deleteStaleModelsForInactiveUpstreamsStmt = db.prepare(`
    UPDATE models
    SET is_active = 0
    WHERE upstream_id = ?
  `);

  const getSettingStmt = db.prepare(`
    SELECT value
    FROM app_settings
    WHERE key = ?
  `);

  const setSettingStmt = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  const listSettingsStmt = db.prepare(`
    SELECT key, value
    FROM app_settings
    ORDER BY key ASC
  `);

  const getAdminUserByUsernameStmt = db.prepare(`
    SELECT *
    FROM admin_users
    WHERE username = ?
  `);

  const getAdminUserByIdStmt = db.prepare(`
    SELECT *
    FROM admin_users
    WHERE id = ?
  `);

  const createAdminUserStmt = db.prepare(`
    INSERT INTO admin_users (username, password_hash, created_at, password_updated_at)
    VALUES (?, ?, ?, ?)
  `);

  const updateAdminCredentialsStmt = db.prepare(`
    UPDATE admin_users
    SET username = ?, password_hash = ?, password_updated_at = ?
    WHERE id = ?
  `);

  const updateAdminLoginStmt = db.prepare(`
    UPDATE admin_users
    SET last_login_at = ?
    WHERE id = ?
  `);

  const createAdminSessionStmt = db.prepare(`
    INSERT INTO admin_sessions (id, user_id, token_hash, created_at, expires_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const getAdminSessionByTokenHashStmt = db.prepare(`
    SELECT *
    FROM admin_sessions
    WHERE token_hash = ?
  `);

  const touchAdminSessionStmt = db.prepare(`
    UPDATE admin_sessions
    SET last_seen_at = ?
    WHERE id = ?
  `);

  const deleteAdminSessionStmt = db.prepare(`
    DELETE FROM admin_sessions
    WHERE id = ?
  `);

  const deleteExpiredAdminSessionsStmt = db.prepare(`
    DELETE FROM admin_sessions
    WHERE expires_at <= ?
  `);

  const listProbesSinceStmt = db.prepare(`
    SELECT probes.*, upstreams.name AS upstream_name
    FROM probes
    JOIN upstreams ON upstreams.id = probes.upstream_id
    WHERE started_at >= ?
    ORDER BY started_at DESC
  `);

  const listRecentProbesStmt = db.prepare(`
    SELECT probes.*, upstreams.name AS upstream_name
    FROM probes
    JOIN upstreams ON upstreams.id = probes.upstream_id
    ORDER BY started_at DESC
    LIMIT ?
  `);

  return {
    upsertUpstream(upstream) {
      upsertUpstreamStmt.run(
        upstream.id,
        upstream.name,
        upstream.group,
        upstream.apiBaseUrl,
        upstream.modelsUrl,
        upstream.apiKey,
        upstream.isActive ? 1 : 0,
        upstream.updatedAt,
      );
    },
    listUpstreams(activeOnly = true) {
      const statement = activeOnly ? listActiveUpstreamsStmt : listAllUpstreamsStmt;
      const rows = statement.all() as Array<Record<string, unknown>>;
      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name),
        group: String(row.upstream_group),
        apiBaseUrl: String(row.api_base_url),
        modelsUrl: String(row.models_url),
        apiKey: String(row.api_key),
        isActive: Boolean(row.is_active),
        updatedAt: String(row.updated_at),
      }));
    },
    deactivateMissingUpstreams(activeUpstreamIds, updatedAt) {
      const activeIdSet = new Set(activeUpstreamIds);
      const existingUpstreams = this.listUpstreams(false);

      for (const upstream of existingUpstreams) {
        if (!activeIdSet.has(upstream.id)) {
          deactivateUpstreamStmt.run(updatedAt, upstream.id);
          deleteStaleModelsForInactiveUpstreamsStmt.run(upstream.id);
        }
      }
    },
    upsertModel(model) {
      upsertModelStmt.run(model.upstreamId, model.id, model.created, model.ownedBy, model.syncedAt);
    },
    listModels(activeOnly = true) {
      const statement = activeOnly ? listActiveModelsStmt : listAllModelsStmt;
      const rows = statement.all() as Array<Record<string, unknown>>;
      return rows.map(toModelRecord);
    },
    updateModelMetadata(model) {
      updateModelMetadataStmt.run(model.displayName, model.icon, model.isVisible ? 1 : 0, model.sortOrder, model.upstreamId, model.id);
    },
    deactivateMissingModels(upstreamId, activeModelIds, syncedAt) {
      const activeIdSet = new Set(activeModelIds);
      const existingModels = this.listModels(true).filter((model) => model.upstreamId === upstreamId);

      for (const model of existingModels) {
        if (!activeIdSet.has(model.id)) {
          deactivateModelStmt.run(syncedAt, upstreamId, model.id);
        }
      }
    },
    getSetting(key) {
      const row = getSettingStmt.get(key) as Record<string, unknown> | undefined;
      return row ? String(row.value) : null;
    },
    setSetting(key, value, updatedAt) {
      setSettingStmt.run(key, value, updatedAt);
    },
    listSettings() {
      const rows = listSettingsStmt.all() as Array<Record<string, unknown>>;
      return rows.reduce<Record<string, string>>((accumulator, row) => {
        accumulator[String(row.key)] = String(row.value);
        return accumulator;
      }, {});
    },
    getAdminUserByUsername(username) {
      const row = getAdminUserByUsernameStmt.get(username) as Record<string, unknown> | undefined;
      return row ? readAdminUserRecord(row) : null;
    },
    getAdminUserById(userId) {
      const row = getAdminUserByIdStmt.get(userId) as Record<string, unknown> | undefined;
      return row ? readAdminUserRecord(row) : null;
    },
    createAdminUser(username, passwordHash, createdAt) {
      createAdminUserStmt.run(username, passwordHash, createdAt, createdAt);
    },
    updateAdminCredentials(userId, username, passwordHash, updatedAt) {
      updateAdminCredentialsStmt.run(username, passwordHash, updatedAt, userId);
    },
    updateAdminLogin(userId, loggedInAt) {
      updateAdminLoginStmt.run(loggedInAt, userId);
    },
    createAdminSession(session) {
      createAdminSessionStmt.run(session.id, session.userId, session.tokenHash, session.createdAt, session.expiresAt, session.lastSeenAt);
    },
    getAdminSessionByTokenHash(tokenHash) {
      const row = getAdminSessionByTokenHashStmt.get(tokenHash) as Record<string, unknown> | undefined;
      return row ? readAdminSessionRecord(row) : null;
    },
    touchAdminSession(sessionId, lastSeenAt) {
      touchAdminSessionStmt.run(lastSeenAt, sessionId);
    },
    deleteAdminSession(sessionId) {
      deleteAdminSessionStmt.run(sessionId);
    },
    deleteExpiredAdminSessions(nowIso) {
      deleteExpiredAdminSessionsStmt.run(nowIso);
    },
    insertProbe(probe) {
      const info = insertProbeStmt.run(
        probe.upstreamId,
        probe.model,
        probe.startedAt,
        probe.completedAt,
        probe.success ? 1 : 0,
        probe.statusCode,
        probe.error,
        probe.connectivityLatencyMs,
        probe.firstTokenLatencyMs,
        probe.totalLatencyMs,
        probe.rawResponseText,
      );
      return Number(info.lastInsertRowid);
    },
    deleteProbesForModel(upstreamId, modelId) {
      const info = deleteProbesForModelStmt.run(upstreamId, modelId);
      return Number(info.changes ?? 0);
    },
    listProbesSince(sinceIso) {
      const rows = listProbesSinceStmt.all(sinceIso) as Array<Record<string, unknown>>;
      return rows.map(toProbeRecord);
    },
    listRecentProbes(limit) {
      const rows = listRecentProbesStmt.all(limit) as Array<Record<string, unknown>>;
      return rows.map(toProbeRecord);
    },
    close() {
      db.close();
    },
  };
}
