use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
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

        // 1. Cargar desde carpeta local (ejecución desde el código fuente)
        let local_dir = Path::new("extensions");
        if local_dir.exists() {
            self.scan_directory(local_dir)?;
        }

        // 1b. Cargar extensiones instaladas por el paquete .deb
        for installed in ["/usr/share/amphion/extensions", "/usr/share/mintplayer/extensions"] {
            let dir = Path::new(installed);
            if dir.exists() {
                let _ = self.scan_directory(dir);
            }
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
                            // Motor único: se ignora cualquier resto de FLAC que
                            // haya quedado en instalaciones antiguas.
                            if info.manifest.id == "flac-resolver" {
                                continue;
                            }
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
        assert!(ids.contains(&"lrclib-lyrics"), "Debe incluir extensión de letras lrclib");
    }
}
