class VideoScreenshotCapture {
  constructor() {
    this.cameraButtons = new Map();
    this.videoElements = new Set();
    this.platform = this.detectPlatform();
    this.init();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('youtube.com')) return 'YouTube';
    if (hostname.includes('x.com') || hostname.includes('twitter.com')) return 'X';
    if (hostname.includes('instagram.com')) return 'Instagram';
    if (hostname.includes('tiktok.com')) return 'TikTok';
    return 'Unknown';
  }

  init() {
    this.setupMutationObserver();
    this.setupKeyboardListener();
    this.scanForVideos();
  }

  scanForVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      this.addVideoElement(video);
    });
  }

  addVideoElement(video) {
    if (this.videoElements.has(video)) return;

    this.videoElements.add(video);
    this.createCameraButtonForVideo(video);

    // Observer para remover o botão se o vídeo for removido
    const observer = new MutationObserver((mutations) => {
      if (!document.body.contains(video)) {
        this.removeCameraButtonForVideo(video);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  createCameraButtonForVideo(video) {
    if (this.cameraButtons.has(video)) return;

    const button = document.createElement('button');
    button.innerHTML = '📷';
    button.dataset.videoId = this.generateId();
    
    button.style.cssText = `
      position: absolute;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid white;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 16px;
      cursor: pointer;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      opacity: 0.9;
      pointer-events: auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(255, 255, 255, 0.9)';
      button.style.color = 'black';
      button.style.transform = 'scale(1.1)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(0, 0, 0, 0.8)';
      button.style.color = 'white';
      button.style.transform = 'scale(1)';
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.captureScreenshot(video);
    });

    this.cameraButtons.set(video, button);
    this.positionCameraButton(video, button);
    document.body.appendChild(button);

    // Observer para reposicionar o botão quando o vídeo se mover
    this.setupVideoPositionObserver(video, button);
  }

  setupVideoPositionObserver(video, button) {
    const positionObserver = new MutationObserver(() => {
      this.positionCameraButton(video, button);
    });

    // Observar mudanças no elemento pai e no próprio vídeo
    if (video.parentElement) {
      positionObserver.observe(video.parentElement, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    positionObserver.observe(video, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    // Também observar scroll e resize
    window.addEventListener('scroll', () => this.positionCameraButton(video, button));
    window.addEventListener('resize', () => this.positionCameraButton(video, button));
  }

  positionCameraButton(video, button) {
    try {
      const videoRect = video.getBoundingClientRect();
      
      if (videoRect.width === 0 || videoRect.height === 0) {
        button.style.display = 'none';
        return;
      }

      button.style.display = 'block';
      
      // Posicionar no canto superior direito do vídeo
      const top = videoRect.top + window.scrollY + 10;
      const left = videoRect.left + window.scrollX + videoRect.width - 46;
      
      button.style.top = `${top}px`;
      button.style.left = `${left}px`;
      
    } catch (error) {
      console.log('Error positioning button:', error);
    }
  }

  removeCameraButtonForVideo(video) {
    const button = this.cameraButtons.get(video);
    if (button) {
      button.remove();
      this.cameraButtons.delete(video);
    }
    this.videoElements.delete(video);
  }

  captureScreenshot(video) {
    if (!video || video.readyState < 2) {
      alert('Video not ready for screenshot. Please wait for video to load.');
      return;
    }

    try {
      // Criar canvas com dimensões originais do vídeo
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Converter para data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // Criar link de download
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .split('.')[0];
      
      const filename = `${this.platform}-${timestamp}.png`;
      
      this.downloadImage(dataUrl, filename);
      this.showCaptureEffect();

    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Error capturing screenshot. Please try again.');
    }
  }

  downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Fallback: usar chrome.downloads API se disponível
    if (chrome.runtime && chrome.downloads) {
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          chrome.runtime.sendMessage({
            action: 'downloadScreenshot',
            blob: blob,
            filename: filename
          });
        });
    }
  }

  showCaptureEffect() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: white;
      opacity: 0;
      pointer-events: none;
      z-index: 99999;
      animation: screenshotFlash 0.4s ease-out;
    `;

    // Adicionar estilos CSS se não existirem
    if (!document.getElementById('screenshot-styles')) {
      const style = document.createElement('style');
      style.id = 'screenshot-styles';
      style.textContent = `
        @keyframes screenshotFlash {
          0% { opacity: 0; }
          25% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(flash);

    setTimeout(() => {
      flash.remove();
    }, 400);
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Verificar nós adicionados
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Verificar se o nó é um vídeo
            if (node.tagName === 'VIDEO') {
              this.addVideoElement(node);
            }
            // Verificar se o nó contém vídeos
            const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
            videos.forEach(video => this.addVideoElement(video));
          }
        });

        // Verificar nós removidos
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.tagName === 'VIDEO') {
              this.removeCameraButtonForVideo(node);
            }
            const videos = node.querySelectorAll ? node.querySelectorAll('video') : [];
            videos.forEach(video => this.removeCameraButtonForVideo(video));
          }
        });
      });

      // Re-scan periódico para vídeos que possam ter sido perdidos
      this.scanForVideos();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style', 'class']
    });

    // Observer específico para mudanças de atributos em vídeos existentes
    const videoObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target.tagName === 'VIDEO') {
          const button = this.cameraButtons.get(mutation.target);
          if (button) {
            this.positionCameraButton(mutation.target, button);
          }
        }
      });
    });

    videoObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'width', 'height']
    });
  }

  setupKeyboardListener() {
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        
        // Encontrar o vídeo mais visível ou em foco
        const visibleVideos = Array.from(this.videoElements)
          .filter(video => this.isElementInViewport(video))
          .sort((a, b) => {
            // Priorizar vídeo que está tocando
            if (!a.paused && b.paused) return -1;
            if (a.paused && !b.paused) return 1;
            return 0;
          });

        if (visibleVideos.length > 0) {
          this.captureScreenshot(visibleVideos[0]);
        }
      }
    });
  }

  isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Inicialização melhorada
function initializeScreenshotCapture() {
  // Esperar um pouco para garantir que a página carregou
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => new VideoScreenshotCapture(), 1000);
    });
  } else {
    setTimeout(() => new VideoScreenshotCapture(), 1000);
  }
}

// Inicializar
initializeScreenshotCapture();