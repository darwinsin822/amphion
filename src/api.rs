use anyhow::{Context, Result};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyUserProfile {
    pub id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub product: Option<String>, // "premium" o "free"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackItem {
    pub id: String,
    pub name: String,
    pub uri: String,
    pub duration_ms: u64,
    pub artists: Vec<ArtistItem>,
    pub album: Option<AlbumItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistItem {
    pub id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumItem {
    pub id: Option<String>,
    pub name: String,
    pub images: Vec<ImageItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageItem {
    pub url: String,
    pub height: Option<u32>,
    pub width: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistItem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tracks_total: u32,
    pub image_url: Option<String>,
}

pub struct SpotifyApi {
    client: reqwest::Client,
    access_token: String,
}

impl SpotifyApi {
    pub fn new(access_token: String) -> Self {
        let mut headers = HeaderMap::new();
        if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", access_token)) {
            headers.insert(AUTHORIZATION, val);
        }

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap_or_default();

        Self {
            client,
            access_token,
        }
    }

    pub fn token(&self) -> &str {
        &self.access_token
    }

    pub async fn get_me(&self) -> Result<SpotifyUserProfile> {
        let resp = self.client.get("https://api.spotify.com/v1/me")
            .send().await
            .context("Error enviando petición a /v1/me")?;

        if !resp.status().is_success() {
            anyhow::bail!("API /v1/me respondió con error: {}", resp.status());
        }

        let profile = resp.json::<SpotifyUserProfile>().await?;
        Ok(profile)
    }

    pub async fn get_my_playlists(&self) -> Result<Vec<PlaylistItem>> {
        let resp = self.client.get("https://api.spotify.com/v1/me/playlists?limit=50")
            .send().await
            .context("Error enviando petición a /v1/me/playlists")?;

        if !resp.status().is_success() {
            anyhow::bail!("API /v1/me/playlists respondió con error: {}", resp.status());
        }

        let val: serde_json::Value = resp.json().await?;
        let mut items = Vec::new();

        if let Some(arr) = val.get("items").and_then(|i| i.as_array()) {
            for item in arr {
                let id = item.get("id").and_then(|i| i.as_str()).unwrap_or_default().to_string();
                let name = item.get("name").and_then(|n| n.as_str()).unwrap_or("Sin nombre").to_string();
                let description = item.get("description").and_then(|d| d.as_str()).map(|s| s.to_string());
                let tracks_total = item.get("tracks")
                    .and_then(|t| t.get("total"))
                    .and_then(|tot| tot.as_u64())
                    .unwrap_or(0) as u32;

                let image_url = item.get("images")
                    .and_then(|imgs| imgs.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|img| img.get("url"))
                    .and_then(|u| u.as_str())
                    .map(|s| s.to_string());

                items.push(PlaylistItem {
                    id,
                    name,
                    description,
                    tracks_total,
                    image_url,
                });
            }
        }

        Ok(items)
    }

    pub async fn search_tracks(&self, query: &str) -> Result<Vec<TrackItem>> {
        let url = format!("https://api.spotify.com/v1/search?q={}&type=track&limit=30", urlencoding_helper(query));
        let resp = self.client.get(&url).send().await?;

        if !resp.status().is_success() {
            anyhow::bail!("Error en búsqueda: {}", resp.status());
        }

        let val: serde_json::Value = resp.json().await?;
        let mut results = Vec::new();

        if let Some(items) = val.get("tracks").and_then(|t| t.get("items")).and_then(|i| i.as_array()) {
            for it in items {
                if let Ok(track) = serde_json::from_value::<TrackItem>(it.clone()) {
                    results.push(track);
                }
            }
        }

        Ok(results)
    }
}

fn urlencoding_helper(s: &str) -> String {
    url::form_urlencoded::byte_serialize(s.as_bytes()).collect()
}
