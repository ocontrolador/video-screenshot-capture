// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'takeScreenshot' });
      }
    });
  }
});

// Handle screenshot download via downloads API
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadScreenshot' && request.blob) {
    // Converter blob para URL
    const blob = new Blob([request.blob], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: request.filename,
      saveAs: true, // Isso faz aparecer a janela "Salvar como"
      conflictAction: 'uniquify'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download error:', chrome.runtime.lastError);
      } else {
        // Limpar a URL depois do download
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60000); // Limpar após 1 minuto
      }
    });
  }
});

// Listener para mensagens de content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    // Handle direct screenshot requests
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        return;
      }
      
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('.')[0];
      
      const filename = `Screenshot-${timestamp}.png`;
      
      // Download da imagem
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true
      });
    });
  }
});