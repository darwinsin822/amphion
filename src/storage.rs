use crate::api::TrackItem;
use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct OfflineTrack {
    pub id: String,
    pub name: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration_ms: u64,
    pub local_path: String,
    pub downloaded_at: i64,
    pub source_extension: String,
}

pub struct OfflineStorage {
    conn: Connection,
    pub storage_dir: PathBuf,
}

impl OfflineStorage {
    pub fn new(custom_path: Option<&Path>) -> Result<Self> {
        let storage_dir = if let Some(p) = custom_path {
            p.to_path_buf()
        } else {
            let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join(".local/share/mintplayer")
        };

        fs::create_dir_all(&storage_dir)?;
        let db_path = storage_dir.join("library.db");
        let conn = Connection::open(&db_path)
            .context("No se pudo abrir base de datos SQLite")?;

        let storage = Self { conn, storage_dir };
        storage.init_tables()?;
        Ok(storage)
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS offline_tracks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT,
                duration_ms INTEGER,
                local_path TEXT NOT NULL,
                downloaded_at INTEGER,
                source_extension TEXT
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS offline_playlists (
                playlist_id TEXT,
                track_id TEXT,
                position INTEGER,
                PRIMARY KEY (playlist_id, track_id)
            )",
            [],
        )?;

        Ok(())
    }

    pub fn save_track(
        &self,
        track: &TrackItem,
        local_path: &str,
        source_ext: &str,
    ) -> Result<()> {
        let artist = track.artists.first().map(|a| a.name.clone()).unwrap_or_default();
        let album = track.album.as_ref().map(|a| a.name.clone());
        let now = chrono_timestamp();

        self.conn.execute(
            "INSERT OR REPLACE INTO offline_tracks 
            (id, name, artist, album, duration_ms, local_path, downloaded_at, source_extension)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                track.id,
                track.name,
                artist,
                album,
                track.duration_ms as i64,
                local_path,
                now,
                source_ext,
            ],
        )?;

        Ok(())
    }

    pub fn list_tracks(&self) -> Result<Vec<OfflineTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, artist, album, duration_ms, local_path, downloaded_at, source_extension 
             FROM offline_tracks ORDER BY downloaded_at DESC"
        )?;

        let track_iter = stmt.query_map([], |row| {
            Ok(OfflineTrack {
                id: row.get(0)?,
                name: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration_ms: row.get::<_, i64>(4)? as u64,
                local_path: row.get(5)?,
                downloaded_at: row.get(6)?,
                source_extension: row.get(7)?,
            })
        })?;

        let mut tracks = Vec::new();
        for t in track_iter {
            tracks.push(t?);
        }

        Ok(tracks)
    }

    pub fn get_track(&self, id: &str) -> Result<Option<OfflineTrack>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, artist, album, duration_ms, local_path, downloaded_at, source_extension 
             FROM offline_tracks WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(OfflineTrack {
                id: row.get(0)?,
                name: row.get(1)?,
                artist: row.get(2)?,
                album: row.get(3)?,
                duration_ms: row.get::<_, i64>(4)? as u64,
                local_path: row.get(5)?,
                downloaded_at: row.get(6)?,
                source_extension: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }
}

fn chrono_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_offline_storage() {
        let temp_dir = std::env::temp_dir().join(format!("mintplayer_test_{}", chrono_timestamp()));
        let storage = OfflineStorage::new(Some(&temp_dir)).expect("Debe crear base de datos temporal");

        let track = TrackItem {
            id: "track_test_1".to_string(),
            name: "Prueba Offline".to_string(),
            uri: "spotify:track:track_test_1".to_string(),
            duration_ms: 200000,
            artists: vec![],
            album: None,
        };

        storage.save_track(&track, "/tmp/audio.mp3", "youtube-resolver")
            .expect("Debe guardar pista");

        let retrieved = storage.get_track("track_test_1")
            .expect("Debe consultar pista")
            .expect("Pista debe existir");

        assert_eq!(retrieved.name, "Prueba Offline");
        assert_eq!(retrieved.source_extension, "youtube-resolver");

        let list = storage.list_tracks().expect("Debe listar pistas");
        assert_eq!(list.len(), 1);

        let _ = fs::remove_dir_all(temp_dir);
    }
}
