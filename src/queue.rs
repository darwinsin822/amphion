use crate::api::TrackItem;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RepeatMode {
    Off,
    All,
    One,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueState {
    pub tracks: Vec<TrackItem>,
    pub current_index: Option<usize>,
    pub repeat_mode: RepeatMode,
    pub shuffle_enabled: bool, // Por defecto siempre FALSE
}

pub struct QueueManager {
    tracks: Vec<TrackItem>,
    current_index: Option<usize>,
    repeat_mode: RepeatMode,
    shuffle_enabled: bool,
}

impl QueueManager {
    pub fn new() -> Self {
        Self {
            tracks: Vec::new(),
            current_index: None,
            repeat_mode: RepeatMode::Off,
            shuffle_enabled: false, // Regla de oro: shuffle desactivado por defecto
        }
    }

    pub fn set_queue(&mut self, tracks: Vec<TrackItem>, start_index: usize) -> Option<TrackItem> {
        self.tracks = tracks;
        self.shuffle_enabled = false; // Siempre respetar orden estricto
        if start_index < self.tracks.len() {
            self.current_index = Some(start_index);
            Some(self.tracks[start_index].clone())
        } else {
            self.current_index = None;
            None
        }
    }

    pub fn current_track(&self) -> Option<&TrackItem> {
        self.current_index.and_then(|idx| self.tracks.get(idx))
    }

    pub fn next(&mut self) -> Option<TrackItem> {
        if self.tracks.is_empty() {
            return None;
        }

        let next_idx = match self.current_index {
            Some(curr) => {
                if curr + 1 < self.tracks.len() {
                    curr + 1
                } else if self.repeat_mode == RepeatMode::All {
                    0
                } else {
                    return None;
                }
            }
            None => 0,
        };

        self.current_index = Some(next_idx);
        self.tracks.get(next_idx).cloned()
    }

    pub fn previous(&mut self) -> Option<TrackItem> {
        if self.tracks.is_empty() {
            return None;
        }

        let prev_idx = match self.current_index {
            Some(curr) if curr > 0 => curr - 1,
            Some(_) if self.repeat_mode == RepeatMode::All => self.tracks.len() - 1,
            _ => 0,
        };

        self.current_index = Some(prev_idx);
        self.tracks.get(prev_idx).cloned()
    }

    pub fn get_state(&self) -> QueueState {
        QueueState {
            tracks: self.tracks.clone(),
            current_index: self.current_index,
            repeat_mode: self.repeat_mode,
            shuffle_enabled: self.shuffle_enabled,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dummy_track(id: &str, name: &str) -> TrackItem {
        TrackItem {
            id: id.to_string(),
            name: name.to_string(),
            uri: format!("spotify:track:{}", id),
            duration_ms: 180000,
            artists: vec![],
            album: None,
        }
    }

    #[test]
    fn test_strict_in_order_playback() {
        let mut q = QueueManager::new();
        let tracks = vec![
            dummy_track("1", "Pista 1"),
            dummy_track("2", "Pista 2"),
            dummy_track("3", "Pista 3"),
        ];

        let first = q.set_queue(tracks, 0).expect("Debe retornar pista 0");
        assert_eq!(first.name, "Pista 1");
        assert!(!q.shuffle_enabled, "El modo aleatorio debe estar desactivado");

        let second = q.next().expect("Debe avanzar a pista 2");
        assert_eq!(second.name, "Pista 2");

        let third = q.next().expect("Debe avanzar a pista 3");
        assert_eq!(third.name, "Pista 3");

        let end = q.next();
        assert!(end.is_none(), "Al final de la cola se detiene sin shuffle forzado");
    }

}
