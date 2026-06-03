// অ্যাপ্লিকেশনের স্টেট
let images = [];
let processedOutputs = [];
let isProcessing = false;

// DOM এলিমেন্টস
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const galleryContainer = document.getElementById('galleryContainer');
const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressStatus = document.getElementById('progressStatus');
const statsPanel = document.getElementById('statsPanel');
const totalImagesSpan = document.getElementById('totalImages');
const processedCountSpan = document.getElementById('processedCount');
const totalOutputsSpan = document.getElementById('totalOutputs');
const clearAllBtn = document.getElementById('clearAllBtn');

// টোস্ট নোটিফিকেশন ফাংশন
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ফাইল সাইজ ফরম্যাটিং
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// সেন্টার ক্রপ ফাংশন
function centerCrop(img, targetWidth, targetHeight) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        
        const targetRatio = targetWidth / targetHeight;
        const imgRatio = img.width / img.height;
        
        if (imgRatio > targetRatio) {
            // ইমেজ বেশি চওড়া - width crop করতে হবে
            sourceWidth = img.height * targetRatio;
            sourceX = (img.width - sourceWidth) / 2;
        } else {
            // ইমেজ বেশি লম্বা - height crop করতে হবে
            sourceHeight = img.width / targetRatio;
            sourceY = (img.height - sourceHeight) / 2;
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/webp', 0.92);
    });
}

// ইমেজ প্রসেসিং ফাংশন
async function processImage(imageFile, imageId) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);
        
        img.onload = async () => {
            try {
                // স্কয়ার ইমেজ (1:1, 300x300)
                const squareBlob = await centerCrop(img, 300, 300);
                
                // ল্যান্ডস্কেপ ইমেজ (4:3, 720x540)
                const landscapeBlob = await centerCrop(img, 720, 540);
                
                URL.revokeObjectURL(url);
                
                resolve({
                    id: imageId,
                    originalName: imageFile.name,
                    originalSize: imageFile.size,
                    originalUrl: URL.createObjectURL(imageFile),
                    square: {
                        blob: squareBlob,
                        url: URL.createObjectURL(squareBlob),
                        size: squareBlob.size,
                        name: imageFile.name.replace(/\.[^/.]+$/, '') + '-square.webp'
                    },
                    landscape: {
                        blob: landscapeBlob,
                        url: URL.createObjectURL(landscapeBlob),
                        size: landscapeBlob.size,
                        name: imageFile.name.replace(/\.[^/.]+$/, '') + '-4x3.webp'
                    }
                });
            } catch (error) {
                URL.revokeObjectURL(url);
                reject(error);
            }
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        
        img.src = url;
    });
}

// ব্যাচ প্রসেসিং ফাংশন
async function processAllImages() {
    if (isProcessing || images.length === 0) return;
    
    isProcessing = true;
    processedOutputs = [];
    progressSection.style.display = 'block';
    
    let processed = 0;
    const total = images.length;
    
    for (let i = 0; i < images.length; i++) {
        const imageFile = images[i];
        const percent = ((i + 1) / total) * 100;
        
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
        progressStatus.textContent = `Processing: ${imageFile.name} (${i + 1}/${total})`;
        
        try {
            const processedImage = await processImage(imageFile, i);
            processedOutputs.push(processedImage);
            processed++;
            
            updateStats();
            renderGallery();
        } catch (error) {
            console.error(`Error processing ${imageFile.name}:`, error);
            showToast(`Failed to process ${imageFile.name}`, 'error');
        }
    }
    
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    progressStatus.textContent = 'Processing complete!';
    
    setTimeout(() => {
        progressSection.style.display = 'none';
    }, 2000);
    
    isProcessing = false;
    showToast(`Successfully processed ${processed} images!`, 'success');
}

// গ্যালারি রেন্ডার
function renderGallery() {
    if (processedOutputs.length === 0) {
        galleryContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <h3>No processed images yet</h3>
                <p>Upload images from the sidebar to start processing</p>
            </div>
        `;
        return;
    }
    
    galleryContainer.innerHTML = processedOutputs.map(item => `
        <div class="image-card" data-id="${item.id}">
            <div class="card-header">
                <h4 title="${item.originalName}">${item.originalName}</h4>
                <span>${formatFileSize(item.originalSize)}</span>
            </div>
            <div class="preview-section">
                <div class="original-preview">
                    <label><i class="fas fa-image"></i> Original</label>
                    <img src="${item.originalUrl}" alt="Original" onclick="window.open('${item.originalUrl}', '_blank')">
                    <div class="output-actions" style="margin-top: 12px;">
                        <button class="btn-download" onclick="downloadImage('${item.originalUrl}', '${item.originalName}')">
                            <i class="fas fa-download"></i> Download Original
                        </button>
                    </div>
                </div>
                <div class="processed-preview">
                    <label><i class="fas fa-crop"></i> Processed Outputs</label>
                    <div class="output-actions">
                        <button class="btn-download" onclick="downloadImage('${item.square.url}', '${item.square.name}')">
                            <i class="fas fa-square"></i> Square (300x300)
                        </button>
                        <button class="btn-download" onclick="downloadImage('${item.landscape.url}', '${item.landscape.name}')">
                            <i class="fas fa-image"></i> 4:3 (720x540)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ডাউনলোড ফাংশন
function downloadImage(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloaded: ${filename}`, 'success');
}

// স্ট্যাটস আপডেট
function updateStats() {
    totalImagesSpan.textContent = images.length;
    processedCountSpan.textContent = processedOutputs.length;
    totalOutputsSpan.textContent = processedOutputs.length * 2;
    
    if (images.length > 0) {
        statsPanel.style.display = 'flex';
        document.getElementById('actionButtons').style.display = 'flex';
    }
}

// ক্লিয়ার অল
function clearAll() {
    if (isProcessing) {
        showToast('Please wait, processing in progress...', 'error');
        return;
    }
    
    // ক্লিনআপ URL অবজেক্ট
    for (const item of processedOutputs) {
        URL.revokeObjectURL(item.originalUrl);
        URL.revokeObjectURL(item.square.url);
        URL.revokeObjectURL(item.landscape.url);
    }
    
    images = [];
    processedOutputs = [];
    fileInput.value = '';
    
    renderGallery();
    updateStats();
    
    if (images.length === 0) {
        statsPanel.style.display = 'none';
        document.getElementById('actionButtons').style.display = 'none';
    }
    
    showToast('All images cleared', 'success');
}

// ফাইল হ্যান্ডলিং
function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif'];
        return validTypes.includes(file.type);
    });
    
    if (validFiles.length === 0) {
        showToast('Please select valid image files (JPG, PNG, WebP, etc.)', 'error');
        return;
    }
    
    images.push(...validFiles);
    updateStats();
    
    // অটো প্রসেসিং শুরু
    processAllImages();
}

// ড্র্যাগ অ্যান্ড ড্রপ
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

clearAllBtn.addEventListener('click', clearAll);

// কীবোর্ড শর্টকাট
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Delete') {
        e.preventDefault();
        clearAll();
    }
});

console.log('Image Processor Ready! 🎉');
