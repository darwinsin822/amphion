use anyhow::Result;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};

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

pub struct SpotifyApi {
    client: reqwest::Client,
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

        Self { client }
    }

    pub async fn search_tracks(&self, query: &str) -> Result<Vec<TrackItem>> {
        let url = format!(
            "https://api.spotify.com/v1/search?q={}&type=track&limit=30",
            urlencoding_helper(query)
        );
        let resp = self.client.get(&url).send().await?;

        if !resp.status().is_success() {
            anyhow::bail!("Error en búsqueda: {}", resp.status());
        }

        let val: serde_json::Value = resp.json().await?;
        let mut results = Vec::new();

        if let Some(items) = val
            .get("tracks")
            .and_then(|t| t.get("items"))
            .and_then(|i| i.as_array())
        {
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
