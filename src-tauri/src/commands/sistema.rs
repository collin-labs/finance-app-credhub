use std::path::PathBuf;

/// Abre um arquivo no programa padrão do sistema operacional.
#[tauri::command(rename_all = "snake_case")]
pub fn abrir_arquivo_sistema(caminho: String) -> Result<(), String> {
    let path = PathBuf::from(&caminho);
    if !path.exists() {
        return Err("Arquivo não encontrado".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // No Windows, usa o comando "start" via cmd, ou ShellExecute
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &caminho])
            .spawn()
            .map_err(|e| format!("Erro ao abrir arquivo: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&caminho)
            .spawn()
            .map_err(|e| format!("Erro ao abrir arquivo: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&caminho)
            .spawn()
            .map_err(|e| format!("Erro ao abrir arquivo: {}", e))?;
    }

    Ok(())
}

/// Abre a pasta que contém o arquivo, destacando-o quando possível.
#[tauri::command(rename_all = "snake_case")]
pub fn abrir_pasta_sistema(caminho: String) -> Result<(), String> {
    let path = PathBuf::from(&caminho);

    #[cfg(target_os = "windows")]
    {
        // No Windows, "explorer /select," destaca o arquivo na pasta
        if path.exists() {
            std::process::Command::new("explorer")
                .args(["/select,", &caminho])
                .spawn()
                .map_err(|e| format!("Erro ao abrir pasta: {}", e))?;
        } else {
            let pasta = path.parent().ok_or("Pasta inválida")?;
            std::process::Command::new("explorer")
                .arg(pasta)
                .spawn()
                .map_err(|e| format!("Erro ao abrir pasta: {}", e))?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &caminho])
            .spawn()
            .map_err(|e| format!("Erro ao abrir pasta: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let pasta = path.parent().ok_or("Pasta inválida")?;
        std::process::Command::new("xdg-open")
            .arg(pasta)
            .spawn()
            .map_err(|e| format!("Erro ao abrir pasta: {}", e))?;
    }

    Ok(())
}
