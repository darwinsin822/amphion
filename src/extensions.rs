use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: Option<String>,
    pub permissions: Vec<String>,
    pub entry: String,
    #[serde(default)]
    pub enabled: bool,
    pub priority: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionInfo {
    pub manifest: ExtensionManifest,
    pub root_dir: PathBuf,
    pub script_code: String,
}

pub struct ExtensionManager {
    extensions_dir: PathBuf,
    loaded: Vec<ExtensionInfo>,
}

impl ExtensionManager {
    pub fn new() -> Self {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let extensions_dir = PathBuf::from(home).join(".config/mintplayer/extensions");
        let _ = fs::create_dir_all(&extensions_dir);

        Self {
            extensions_dir,
            loaded: Vec::new(),
        }
    }

    pub fn load_all(&mut self) -> Result<&Vec<ExtensionInfo>> {
        self.loaded.clear();

        // 1. Cargar desde carpeta local de instalación
        let local_dir = Path::new("extensions");
        if local_dir.exists() {
            self.scan_directory(local_dir)?;
        }

        // 2. Cargar desde configuración de usuario
        if self.extensions_dir.exists() {
            self.scan_directory(&self.extensions_dir.clone())?;
        }

        // Ordenar: primarias primero, luego secundarias, luego el resto
        self.loaded.sort_by(|a, b| {
            let prio_a = a.manifest.priority.as_deref().unwrap_or("normal");
            let prio_b = b.manifest.priority.as_deref().unwrap_or("normal");
            match (prio_a, prio_b) {
                ("primary", "primary") => std::cmp::Ordering::Equal,
                ("primary", _) => std::cmp::Ordering::Less,
                (_, "primary") => std::cmp::Ordering::Greater,
                ("secondary", "secondary") => std::cmp::Ordering::Equal,
                ("secondary", _) => std::cmp::Ordering::Less,
                (_, "secondary") => std::cmp::Ordering::Greater,
                _ => std::cmp::Ordering::Equal,
            }
        });

        Ok(&self.loaded)
    }

    fn scan_directory(&mut self, base: &Path) -> Result<()> {
        if let Ok(entries) = fs::read_dir(base) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let manifest_path = path.join("manifest.json");
                    if manifest_path.exists() {
                        if let Ok(info) = self.load_extension(&path) {
                            if !self.loaded.iter().any(|e| e.manifest.id == info.manifest.id) {
                                self.loaded.push(info);
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    fn load_extension(&self, dir: &Path) -> Result<ExtensionInfo> {
        let manifest_content = fs::read_to_string(dir.join("manifest.json"))
            .context("No se pudo leer manifest.json")?;
        let mut manifest: ExtensionManifest = serde_json::from_str(&manifest_content)
            .context("Formato inválido de manifest.json")?;

        let entry_path = dir.join(&manifest.entry);
        let script_code = fs::read_to_string(&entry_path)
            .context(format!("No se encontró script de entrada {}", entry_path.display()))?;

        manifest.enabled = true;

        Ok(ExtensionInfo {
            manifest,
            root_dir: dir.to_path_buf(),
            script_code,
        })
    }

    pub fn list_extensions(&self) -> Vec<ExtensionManifest> {
        self.loaded.iter().map(|e| e.manifest.clone()).collect()
    }

    pub fn get_primary_resolver(&self) -> Option<&ExtensionInfo> {
        self.loaded.iter().find(|e| {
            e.manifest.priority.as_deref() == Some("primary") && e.manifest.enabled
        })
    }

    pub fn get_secondary_resolver(&self) -> Option<&ExtensionInfo> {
        self.loaded.iter().find(|e| {
            e.manifest.priority.as_deref() == Some("secondary") && e.manifest.enabled
        })
    }

    pub fn resolve_download(&self, track_name: &str, artist: &str, prefer_flac: bool) -> serde_json::Value {
        if prefer_flac {
            if let Some(sec) = self.get_secondary_resolver() {
                return json!({
                    "provider": sec.manifest.id,
                    "provider_name": sec.manifest.name,
                    "format": "flac",
                    "bitrate": 1411,
                    "quality": "Hi-Res Lossless (16-bit/44.1kHz)",
                    "title": format!("{} - {} [FLAC]", track_name, artist),
                    "status": "ready"
                });
            }
        }

        // Predeterminado: Primary YouTube Resolver
        if let Some(prim) = self.get_primary_resolver() {
            json!({
                "provider": prim.manifest.id,
                "provider_name": prim.manifest.name,
                "format": "m4a",
                "bitrate": 320,
                "quality": "Alta Calidad (YouTube Stream 320kbps)",
                "title": format!("{} - {}", track_name, artist),
                "status": "ready"
            })
        } else {
            json!({
                "provider": "builtin",
                "provider_name": "Standard Resolver",
                "format": "mp3",
                "bitrate": 192,
                "quality": "Standard 192kbps",
                "title": format!("{} - {}", track_name, artist),
                "status": "ready"
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_extensions_and_priorities() {
        let mut mgr = ExtensionManager::new();
        let loaded = mgr.load_all().expect("Debe cargar extensiones correctamente");
        assert!(!loaded.is_empty(), "Debe encontrar extensiones");

        let ids: Vec<&str> = loaded.iter().map(|e| e.manifest.id.as_str()).collect();
        assert!(ids.contains(&"youtube-resolver"), "Debe incluir youtube-resolver");
        assert!(ids.contains(&"flac-resolver"), "Debe incluir flac-resolver");

        let primary = mgr.get_primary_resolver().expect("Debe haber un resolver primario");
        assert_eq!(primary.manifest.id, "youtube-resolver", "YouTube debe ser el primario");

        let secondary = mgr.get_secondary_resolver().expect("Debe haber un resolver secundario");
        assert_eq!(secondary.manifest.id, "flac-resolver", "FLAC debe ser el secundario");

        // Resolver estándar debe usar YouTube
        let default_res = mgr.resolve_download("Zapateando Juyayay", "Jayac", false);
        assert_eq!(default_res["provider"], "youtube-resolver");
        assert_eq!(default_res["format"], "m4a");

        // Resolver con flag prefer_flac debe usar FLAC
        let flac_res = mgr.resolve_download("Zapateando Juyayay", "Jayac", true);
        assert_eq!(flac_res["provider"], "flac-resolver");
        assert_eq!(flac_res["format"], "flac");
    }
}
