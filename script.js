const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const originalCanvas = document.getElementById('originalCanvas');
const rgb565Canvas = document.getElementById('rgb565Canvas');
const loading = document.getElementById('loading');
const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
const rgb565Ctx = rgb565Canvas.getContext('2d', { willReadFrequently: true });

let originalImage = null;
let originalFileName = '';
let currentFilter = 'none';
let filterIntensity = 1.0;
let ditheringEnabled = false;
let ditheringType = 'floyd-steinberg';
let focusedCanvasId = null;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isWheelZoom = false;
let resizeMode = 'scale';
let originalAspectRatio = 1;
let resizeSectionExpanded = true;
let lastResizedDimension = 'width'; // 最後に変更されたディメンション
let resizedWidth = null; // リサイズされた幅
let resizedHeight = null; // リサイズされた高さ
let isApplyingResize = false; // リサイズ中フラグ

// アップロードエリアをクリック
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// ファイル選択
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// ドラッグ&ドロップ
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// フィルタースライダー
const filterSlider = document.getElementById('filterSlider');
const filterValue = document.getElementById('filterValue');
const filterControl = document.getElementById('filterControl');

filterSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    filterValue.textContent = value + '%';
    filterIntensity = value / 100;
    if (currentFilter !== 'none') {
        applyFilter(currentFilter, true);
    }
});

// クリップボードから貼り付け
document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            handleFile(blob);
            break;
        }
    }
});

// ファイル処理
function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
    }

    // 元のファイル名を保存（拡張子を除く）
    originalFileName = file.name ? file.name.replace(/\.[^/.]+$/, '') : 'image';

    loading.classList.add('active');
    previewSection.classList.remove('active');

    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
            originalImage = img;
            currentFilter = 'none';
            filterIntensity = 1.0;
            
            // アスペクト比を保存
            originalAspectRatio = img.width / img.height;
            
            // リサイズ設定をリセット
            document.getElementById('scaleSlider').value = 100;
            document.getElementById('scaleValue').textContent = '100%';
            document.getElementById('widthInput').value = img.width;
            document.getElementById('heightInput').value = img.height;
            
            // 元画像を描画
            originalCanvas.width = img.width;
            originalCanvas.height = img.height;
            originalCtx.drawImage(img, 0, 0);

            // RGB565に変換
            convertToRGB565(img);
            
            // フィルターボタンの状態をリセット
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.querySelector('.filter-btn').classList.add('active');
            
            // スライダーをリセット
            filterSlider.value = 100;
            filterValue.textContent = '100%';
            filterControl.classList.remove('active');
            
            loading.classList.remove('active');
            previewSection.classList.add('active');
        };
        
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// RGB565変換
function convertToRGB565(img) {
    rgb565Canvas.width = img.width;
    rgb565Canvas.height = img.height;
    
    // 元画像を描画
    rgb565Ctx.drawImage(img, 0, 0);
    
    // ピクセルデータを取得
    const imageData = rgb565Ctx.getImageData(0, 0, img.width, img.height);
    
    if (ditheringEnabled) {
        applyDithering(imageData);
    } else {
        convertToRGB565Simple(imageData);
    }
    
    // 変換後の画像を描画
    rgb565Ctx.putImageData(imageData, 0, 0);
}

// シンプルなRGB565変換（ディザリングなし）
function convertToRGB565Simple(imageData) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // RGB888 → RGB565
        const r5 = (r >> 3) & 0x1F;  // 8ビット→5ビット
        const g6 = (g >> 2) & 0x3F;  // 8ビット→6ビット
        const b5 = (b >> 3) & 0x1F;  // 8ビット→5ビット
        
        // RGB565 → RGB888 (表示用に戻す)
        data[i] = (r5 << 3) | (r5 >> 2);      // 5ビット→8ビット
        data[i + 1] = (g6 << 2) | (g6 >> 4);  // 6ビット→8ビット
        data[i + 2] = (b5 << 3) | (b5 >> 2);  // 5ビット→8ビット
    }
}

// クリップボードにコピー
async function copyToClipboard() {
    try {
        const blob = await new Promise(resolve => {
            rgb565Canvas.toBlob(resolve, 'image/png');
        });
        
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        
        alert('✅ クリップボードにコピーしました！');
    } catch (err) {
        console.error('コピーに失敗しました:', err);
        alert('❌ コピーに失敗しました。ブラウザがクリップボードAPIに対応していない可能性があります。');
    }
}

// ダウンロード
function downloadImage() {
    const link = document.createElement('a');
    const fileName = originalFileName || 'image';
    link.download = `${fileName}_rgb565.png`;
    link.href = rgb565Canvas.toDataURL('image/png');
    link.click();
}

// リセット
function resetImage() {
    previewSection.classList.remove('active');
    fileInput.value = '';
    originalImage = null;
    originalFileName = '';
    currentFilter = 'none';
    filterIntensity = 1.0;
    filterSlider.value = 100;
    filterValue.textContent = '100%';
    filterControl.classList.remove('active');
}

// フィルター適用
function applyFilter(filterType, skipButtonUpdate = false) {
    if (!originalImage) return;
    
    currentFilter = filterType;
    
    // フィルターボタンの状態を更新
    if (!skipButtonUpdate && event && event.target) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }
    
    // スライダーの表示/非表示
    if (filterType === 'none') {
        filterControl.classList.remove('active');
    } else {
        filterControl.classList.add('active');
    }
    
    // 元画像をキャンバスに描画
    originalCanvas.width = originalImage.width;
    originalCanvas.height = originalImage.height;
    originalCtx.drawImage(originalImage, 0, 0);
    
    // フィルターを適用
    const imageData = originalCtx.getImageData(0, 0, originalImage.width, originalImage.height);
    const data = imageData.data;
    
    switch(filterType) {
        case 'grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const gray = r * 0.299 + g * 0.587 + b * 0.114;
                data[i] = r + (gray - r) * filterIntensity;
                data[i + 1] = g + (gray - g) * filterIntensity;
                data[i + 2] = b + (gray - b) * filterIntensity;
            }
            break;
            
        case 'sepia':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const sr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
                const sg = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
                const sb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
                data[i] = r + (sr - r) * filterIntensity;
                data[i + 1] = g + (sg - g) * filterIntensity;
                data[i + 2] = b + (sb - b) * filterIntensity;
            }
            break;
            
        case 'invert':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                data[i] = r + (255 - r - r) * filterIntensity;
                data[i + 1] = g + (255 - g - g) * filterIntensity;
                data[i + 2] = b + (255 - b - b) * filterIntensity;
            }
            break;
            
        case 'brightness':
            const brightnessAmount = 50 * filterIntensity;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, data[i] + brightnessAmount);
                data[i + 1] = Math.min(255, data[i + 1] + brightnessAmount);
                data[i + 2] = Math.min(255, data[i + 2] + brightnessAmount);
            }
            break;
            
        case 'contrast':
            const baseFactor = 1.5;
            const factor = 1 + (baseFactor - 1) * filterIntensity;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
            }
            break;
            
        case 'edge':
            // エッジ強調（アンシャープマスク）
            applyEdgeFilter(imageData, filterIntensity);
            break;
    }
    
    originalCtx.putImageData(imageData, 0, 0);
    
    // フィルター適用後の画像でRGB565変換
    let sourceCanvas = document.createElement('canvas');
    
    // リサイズが適用されている場合は、リサイズサイズで処理
    if (resizedWidth !== null && resizedHeight !== null) {
        sourceCanvas.width = resizedWidth;
        sourceCanvas.height = resizedHeight;
        const ctx = sourceCanvas.getContext('2d');
        const algorithm = document.getElementById('interpolationAlgorithm').value;
        
        // フィルター済みの画像をリサイズ
        switch(algorithm) {
            case 'nearest':
                ctx.imageSmoothingEnabled = false;
                break;
            case 'bilinear':
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low';
                break;
            case 'bicubic':
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                break;
        }
        ctx.drawImage(originalCanvas, 0, 0, resizedWidth, resizedHeight);
    } else {
        sourceCanvas.width = originalImage.width;
        sourceCanvas.height = originalImage.height;
        const tempCtx = sourceCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);
    }
    
    convertToRGB565FromCanvas(sourceCanvas);
}

// ディザリング処理
function applyDithering(imageData) {
    switch(ditheringType) {
        case 'floyd-steinberg':
            floydSteinbergDithering(imageData);
            break;
        case 'ordered':
            orderedDithering(imageData);
            break;
        case 'atkinson':
            atkinsonDithering(imageData);
            break;
    }
}

// Floyd-Steinbergディザリング
function floydSteinbergDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            
            const oldR = data[i];
            const oldG = data[i + 1];
            const oldB = data[i + 2];
            
            // RGB565に変換
            const r5 = (oldR >> 3) & 0x1F;
            const g6 = (oldG >> 2) & 0x3F;
            const b5 = (oldB >> 3) & 0x1F;
            
            // RGB888に戻す
            const newR = (r5 << 3) | (r5 >> 2);
            const newG = (g6 << 2) | (g6 >> 4);
            const newB = (b5 << 3) | (b5 >> 2);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
            
            // 誤差を計算
            const errR = oldR - newR;
            const errG = oldG - newG;
            const errB = oldB - newB;
            
            // 誤差を周囲のピクセルに拡散
            distributeError(data, width, height, x + 1, y, errR, errG, errB, 7/16);
            distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 3/16);
            distributeError(data, width, height, x, y + 1, errR, errG, errB, 5/16);
            distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1/16);
        }
    }
}

// 誤差拡散ヘルパー関数
function distributeError(data, width, height, x, y, errR, errG, errB, factor) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    
    const i = (y * width + x) * 4;
    data[i] = Math.max(0, Math.min(255, data[i] + errR * factor));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + errG * factor));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + errB * factor));
}

// Ordered (Bayer) ディザリング
function orderedDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // 4x4 Bayerマトリックス
    const bayerMatrix = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
    ];
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const threshold = (bayerMatrix[y % 4][x % 4] / 16 - 0.5) * 32;
            
            const r = Math.max(0, Math.min(255, data[i] + threshold));
            const g = Math.max(0, Math.min(255, data[i + 1] + threshold));
            const b = Math.max(0, Math.min(255, data[i + 2] + threshold));
            
            // RGB565に変換
            const r5 = (r >> 3) & 0x1F;
            const g6 = (g >> 2) & 0x3F;
            const b5 = (b >> 3) & 0x1F;
            
            // RGB888に戻す
            data[i] = (r5 << 3) | (r5 >> 2);
            data[i + 1] = (g6 << 2) | (g6 >> 4);
            data[i + 2] = (b5 << 3) | (b5 >> 2);
        }
    }
}

// Atkinsonディザリング
function atkinsonDithering(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            
            const oldR = data[i];
            const oldG = data[i + 1];
            const oldB = data[i + 2];
            
            // RGB565に変換
            const r5 = (oldR >> 3) & 0x1F;
            const g6 = (oldG >> 2) & 0x3F;
            const b5 = (oldB >> 3) & 0x1F;
            
            // RGB888に戻す
            const newR = (r5 << 3) | (r5 >> 2);
            const newG = (g6 << 2) | (g6 >> 4);
            const newB = (b5 << 3) | (b5 >> 2);
            
            data[i] = newR;
            data[i + 1] = newG;
            data[i + 2] = newB;
            
            // 誤差を計算
            const errR = oldR - newR;
            const errG = oldG - newG;
            const errB = oldB - newB;
            
            // Atkinsonパターンで誤差を拡散（1/8ずつ）
            const factor = 1/8;
            distributeError(data, width, height, x + 1, y, errR, errG, errB, factor);
            distributeError(data, width, height, x + 2, y, errR, errG, errB, factor);
            distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, factor);
            distributeError(data, width, height, x, y + 1, errR, errG, errB, factor);
            distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, factor);
            distributeError(data, width, height, x, y + 2, errR, errG, errB, factor);
        }
    }
}

// ディザリングの切り替え
function toggleDithering() {
    ditheringEnabled = document.getElementById('ditheringEnabled').checked;
    const ditheringOptions = document.getElementById('ditheringOptions');
    
    if (ditheringEnabled) {
        ditheringOptions.classList.add('active');
    } else {
        ditheringOptions.classList.remove('active');
    }
    
    if (originalImage) {
        // リサイズ情報を保持したまま再変換
        if (resizedWidth !== null && resizedHeight !== null) {
            applyResize();
        } else if (currentFilter !== 'none') {
            applyFilter(currentFilter, true);
        } else {
            convertToRGB565(originalImage);
        }
    }
}

// ディザリングタイプの更新
function updateDithering() {
    ditheringType = document.querySelector('input[name="ditheringType"]:checked').value;
    
    if (ditheringEnabled && originalImage) {
        // リサイズ情報を保持したまま再変換
        if (resizedWidth !== null && resizedHeight !== null) {
            applyResize();
        } else if (currentFilter !== 'none') {
            applyFilter(currentFilter, true);
        } else {
            convertToRGB565(originalImage);
        }
    }
}

// キャンバスからRGB565変換
function convertToRGB565FromCanvas(sourceCanvas) {
    rgb565Canvas.width = sourceCanvas.width;
    rgb565Canvas.height = sourceCanvas.height;
    
    rgb565Ctx.drawImage(sourceCanvas, 0, 0);
    
    const imageData = rgb565Ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    
    if (ditheringEnabled) {
        applyDithering(imageData);
    } else {
        convertToRGB565Simple(imageData);
    }
    
    rgb565Ctx.putImageData(imageData, 0, 0);
}

// C配列形式で出力
function exportCArray() {
    const imageData = rgb565Ctx.getImageData(0, 0, rgb565Canvas.width, rgb565Canvas.height);
    const data = imageData.data;
    const width = rgb565Canvas.width;
    const height = rgb565Canvas.height;
    
    let cArray = `// RGB565 Image Data\n`;
    cArray += `// Size: ${width}x${height} pixels\n`;
    cArray += `// Total bytes: ${width * height * 2}\n\n`;
    cArray += `const uint16_t image_data[${height}][${width}] = {\n`;
    
    for (let y = 0; y < height; y++) {
        cArray += '    {';
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            const r5 = (r >> 3) & 0x1F;
            const g6 = (g >> 2) & 0x3F;
            const b5 = (b >> 3) & 0x1F;
            
            const rgb565 = (r5 << 11) | (g6 << 5) | b5;
            
            cArray += `0x${rgb565.toString(16).padStart(4, '0').toUpperCase()}`;
            if (x < width - 1) cArray += ', ';
        }
        cArray += '}';
        if (y < height - 1) cArray += ',';
        cArray += '\n';
    }
    
    cArray += '};';
    
    document.getElementById('cArrayOutput').textContent = cArray;
    document.getElementById('cArrayModal').classList.add('active');
}

// C配列をコピー
async function copyCArray() {
    const text = document.getElementById('cArrayOutput').textContent;
    try {
        await navigator.clipboard.writeText(text);
        alert('✅ C配列をクリップボードにコピーしました！');
    } catch (err) {
        console.error('コピーに失敗しました:', err);
        alert('❌ コピーに失敗しました。');
    }
}

// C配列をダウンロード
function downloadCArray() {
    const text = document.getElementById('cArrayOutput').textContent;
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = originalFileName || 'image';
    link.download = `${fileName}_rgb565.h`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// モーダルを閉じる
function closeCArrayModal() {
    document.getElementById('cArrayModal').classList.remove('active');
}

// モーダル外クリックで閉じる
document.getElementById('cArrayModal').addEventListener('click', (e) => {
    if (e.target.id === 'cArrayModal') {
        closeCArrayModal();
    }
});

// 画像フォーカス機能
function focusImage(canvasId) {
    focusedCanvasId = canvasId;
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    
    const modal = document.getElementById('imageFocusModal');
    const focusCanvas = document.getElementById('imageFocusCanvas');
    
    const sourceCanvas = document.getElementById(canvasId);
    focusCanvas.width = sourceCanvas.width;
    focusCanvas.height = sourceCanvas.height;
    
    const ctx = focusCanvas.getContext('2d');
    ctx.drawImage(sourceCanvas, 0, 0);
    
    updateZoomLevel();
    modal.classList.add('active');
    
    // マウスホイールを自動ズーム
    focusCanvas.addEventListener('wheel', handleCanvasWheel);
}

function closeFocusModal() {
    document.getElementById('imageFocusModal').classList.remove('active');
    const focusCanvas = document.getElementById('imageFocusCanvas');
    focusCanvas.removeEventListener('wheel', handleCanvasWheel);
}

function handleCanvasWheel(e) {
    e.preventDefault();
    
    const focusCanvas = document.getElementById('imageFocusCanvas');
    const container = focusCanvas.parentElement;
    const rect = focusCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // マウスカーソル位置（コンテナ内の相対座標）
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // キャンバスの表示上の位置とサイズを計算
    const canvasDisplayWidth = focusCanvas.width * zoomLevel;
    const canvasDisplayHeight = focusCanvas.height * zoomLevel;
    const canvasLeft = (container.clientWidth - canvasDisplayWidth) / 2 + panX;
    const canvasTop = (container.clientHeight - canvasDisplayHeight) / 2 + panY;
    
    // マウスカーソルがキャンバス上のどこにあるかを計算
    const canvasX = (mouseX - canvasLeft) / zoomLevel;
    const canvasY = (mouseY - canvasTop) / zoomLevel;
    
    const oldZoom = zoomLevel;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    zoomLevel = Math.max(0.1, Math.min(10, zoomLevel * zoomFactor));
    
    // マウスカーソル位置が常に同じ場所に来るようにパンを調整
    const newCanvasDisplayWidth = focusCanvas.width * zoomLevel;
    const newCanvasDisplayHeight = focusCanvas.height * zoomLevel;
    
    panX = mouseX - canvasX * zoomLevel - (container.clientWidth - newCanvasDisplayWidth) / 2;
    panY = mouseY - canvasY * zoomLevel - (container.clientHeight - newCanvasDisplayHeight) / 2;
    
    updateFocusCanvasDisplay();
}

function zoomIn() {
    zoomFromCenter(1.2);
}

function zoomOut() {
    zoomFromCenter(0.8);
}

function zoomFromCenter(factor) {
    const focusCanvas = document.getElementById('imageFocusCanvas');
    const container = focusCanvas.parentElement;
    
    // 表示範囲の中央を基準に計算
    const centerX = container.clientWidth / 2;
    const centerY = container.clientHeight / 2;
    
    // キャンバスの表示上の中央位置
    const canvasDisplayWidth = focusCanvas.width * zoomLevel;
    const canvasDisplayHeight = focusCanvas.height * zoomLevel;
    const canvasLeft = (container.clientWidth - canvasDisplayWidth) / 2 + panX;
    const canvasTop = (container.clientHeight - canvasDisplayHeight) / 2 + panY;
    
    // 中央がキャンバス上のどこにあるかを計算
    const canvasX = (centerX - canvasLeft) / zoomLevel;
    const canvasY = (centerY - canvasTop) / zoomLevel;
    
    const oldZoom = zoomLevel;
    zoomLevel = Math.max(0.1, Math.min(10, zoomLevel * factor));
    
    // 中央位置が常に同じ場所に来るようにパンを調整
    const newCanvasDisplayWidth = focusCanvas.width * zoomLevel;
    const newCanvasDisplayHeight = focusCanvas.height * zoomLevel;
    
    panX = centerX - canvasX * zoomLevel - (container.clientWidth - newCanvasDisplayWidth) / 2;
    panY = centerY - canvasY * zoomLevel - (container.clientHeight - newCanvasDisplayHeight) / 2;
    
    updateFocusCanvasDisplay();
}

function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    updateFocusCanvasDisplay();
}

function updateZoomLevel() {
    document.getElementById('zoomLevelDisplay').textContent = (zoomLevel * 100).toFixed(0) + '%';
}

function updateFocusCanvasDisplay() {
    const focusCanvas = document.getElementById('imageFocusCanvas');
    const container = focusCanvas.parentElement;
    const antialiasingEnabled = document.getElementById('antialiasingEnabled').checked;
    
    // アンチエイリアス設定を適用
    focusCanvas.style.imageRendering = antialiasingEnabled ? 'auto' : 'pixelated';
    
    focusCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    focusCanvas.style.transformOrigin = 'top left';
    
    updateZoomLevel();
}

// モーダル外クリックで閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('imageFocusModal').classList.contains('active')) {
        closeFocusModal();
    }
});

document.getElementById('imageFocusModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'imageFocusModal') {
        closeFocusModal();
    }
});

// アンチエイリアス切り替え
const antialiasingCheckbox = document.getElementById('antialiasingEnabled');
if (antialiasingCheckbox) {
    antialiasingCheckbox.addEventListener('change', () => {
        updateFocusCanvasDisplay();
    });
}

// リサイズ機能
// リサイズセクションの開閉
function toggleResizeSection() {
    resizeSectionExpanded = !resizeSectionExpanded;
    const resizeContent = document.getElementById('resizeContent');
    const arrow = document.getElementById('resizeSectionArrow');
    
    if (resizeSectionExpanded) {
        resizeContent.classList.remove('collapsed');
        arrow.textContent = '▼';
    } else {
        resizeContent.classList.add('collapsed');
        arrow.textContent = '▶';
    }
}

function toggleResizeMode() {
    resizeMode = document.querySelector('input[name="resizeMode"]:checked').value;
    document.getElementById('scaleMode').style.display = resizeMode === 'scale' ? 'block' : 'none';
    document.getElementById('sizeMode').style.display = resizeMode === 'size' ? 'block' : 'none';
}

function updateScale() {
    const scale = document.getElementById('scaleSlider').value;
    document.getElementById('scaleValue').textContent = scale + '%';
    
    // 自動でリサイズを実行
    applyResize();
}

function updateSize() {
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const aspectRatioLock = document.getElementById('aspectRatioLock').checked;
    
    const width = parseFloat(widthInput.value);
    const height = parseFloat(heightInput.value);
    
    if (isNaN(width) || isNaN(height)) return;
    
    if (aspectRatioLock) {
        // イベント発火元を判定して自動計算
        const activeElement = document.activeElement;
        if (activeElement === widthInput) {
            // 幅が変更された → 高さを再計算
            heightInput.value = Math.round(width / originalAspectRatio);
            lastResizedDimension = 'width';
        } else if (activeElement === heightInput) {
            // 高さが変更された → 幅を再計算
            widthInput.value = Math.round(height * originalAspectRatio);
            lastResizedDimension = 'height';
        }
    }
    
    // 自動でリサイズを実行
    applyResize();
}

// widthInputとheightInputにイベントリスナーを設定
document.addEventListener('DOMContentLoaded', () => {
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    
    if (widthInput) widthInput.addEventListener('input', updateSize);
    if (heightInput) heightInput.addEventListener('input', updateSize);
});

function applyResize() {
    if (!originalImage) {
        return;
    }
    
    let newWidth, newHeight;
    
    if (resizeMode === 'scale') {
        const scale = parseFloat(document.getElementById('scaleSlider').value) / 100;
        newWidth = Math.round(originalImage.width * scale);
        newHeight = Math.round(originalImage.height * scale);
    } else {
        newWidth = parseFloat(document.getElementById('widthInput').value);
        newHeight = parseFloat(document.getElementById('heightInput').value);
        
        if (isNaN(newWidth) || isNaN(newHeight)) {
            return;
        }
    }
    
    const algorithm = document.getElementById('interpolationAlgorithm').value;
    
    // リサイズされたサイズを保存
    resizedWidth = newWidth;
    resizedHeight = newHeight;
    isApplyingResize = true;
    
    // リサイズを実行
    const resizedImage = resizeImage(originalImage, newWidth, newHeight, algorithm);
    
    // キャンバスに描画
    originalCanvas.width = newWidth;
    originalCanvas.height = newHeight;
    originalCtx.drawImage(resizedImage, 0, 0);
    
    // RGB565に再変換（フィルター情報を保持）
    if (currentFilter !== 'none') {
        applyFilter(currentFilter, true);
    } else {
        convertToRGB565(resizedImage);
    }
    
    isApplyingResize = false;
}

function resizeImage(img, newWidth, newHeight, algorithm) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = newWidth;
    tempCanvas.height = newHeight;
    const ctx = tempCanvas.getContext('2d');
    
    switch(algorithm) {
        case 'nearest':
            ctx.imageSmoothingEnabled = false;
            break;
        case 'bilinear':
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'low';
            break;
        case 'bicubic':
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            break;
    }
    
    ctx.drawImage(img, 0, 0, newWidth, newHeight);
    return tempCanvas;
}

function applyEdgeFilter(imageData, intensity = 1.0) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // ガウスぼかし用のカーネル（5x5より強いぼかし）
    const gaussianKernel = [
        [1, 4, 6, 4, 1],
        [4, 16, 24, 16, 4],
        [6, 24, 36, 24, 6],
        [4, 16, 24, 16, 4],
        [1, 4, 6, 4, 1]
    ];
    const kernelSum = 256;
    
    // ぼかし画像を作成
    const blurred = new Uint8ClampedArray(data.length);
    
    for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
            let sum_r = 0, sum_g = 0, sum_b = 0;
            
            // ガウスぼかしを適用（5x5カーネル）
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const pidx = ((y + dy) * width + (x + dx)) * 4;
                    const weight = gaussianKernel[dy + 2][dx + 2];
                    sum_r += data[pidx] * weight;
                    sum_g += data[pidx + 1] * weight;
                    sum_b += data[pidx + 2] * weight;
                }
            }
            
            const idx = (y * width + x) * 4;
            blurred[idx] = sum_r / kernelSum;
            blurred[idx + 1] = sum_g / kernelSum;
            blurred[idx + 2] = sum_b / kernelSum;
            blurred[idx + 3] = data[idx + 3];
        }
    }
    
    // アンシャープマスク: 元画像 + (元画像 - ぼかし画像) * intensity * 倍率係数
    const strengthFactor = 2.0; // エッジ強度を2倍にする
    for (let i = 0; i < data.length; i += 4) {
        const diff_r = data[i] - blurred[i];
        const diff_g = data[i + 1] - blurred[i + 1];
        const diff_b = data[i + 2] - blurred[i + 2];
        
        data[i] = Math.min(255, Math.max(0, data[i] + diff_r * intensity * strengthFactor));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + diff_g * intensity * strengthFactor));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + diff_b * intensity * strengthFactor));
    }
}
