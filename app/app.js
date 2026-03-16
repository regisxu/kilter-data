// Kilterboard Logbook H5 App
// 使用 sql.js 直接查询 SQLite 数据库

let db = null;                    // SQL.js 数据库实例
let allRecords = [];              // 所有记录
let filteredRecords = [];         // 筛选后的记录
let displayedCount = 0;           // 已显示数量
const PAGE_SIZE = 50;             // 每页显示数量

// Initialize
async function init() {
    // File selection listener
    document.getElementById('db-file-input').addEventListener('change', handleFileSelect);
    
    // Initialize grade range slider
    onDiffChange();

    // ALWAYS show loading screen first
    // This ensures error messages are visible if cache loading fails
    document.getElementById('loading-screen').classList.add('active');

    // Check for cached database
    const cachedDb = await loadDbFromCache();
    if (cachedDb) {
        // Load cached database
        await loadDatabase(cachedDb);
    } else {
        // No cache - show file input
        document.querySelector('.file-input-wrapper').style.display = 'block';
    }
}

// 处理文件选择
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // 隐藏文件选择按钮，显示加载状态
        document.querySelector('.file-input-wrapper').style.display = 'none';
        showLoadingStatus(`正在读取 ${file.name}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        await loadDatabase(arrayBuffer);
        
        // 缓存到 IndexedDB
        await saveDbToCache(arrayBuffer);
    } catch (error) {
        showLoadingStatus(`读取文件失败: ${error.message}`);
        console.error('File reading error:', error);
        document.querySelector('.file-input-wrapper').style.display = 'block';
    }
}

// 加载数据库
async function loadDatabase(arrayBuffer) {
    try {
        showLoadingStatus('正在初始化 SQL.js...');
        
        // 检查 initSqlJs 是否可用
        if (typeof initSqlJs !== 'function') {
            throw new Error('SQL.js 库未加载，请检查网络连接');
        }
        
        // Initialize SQL.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        showLoadingStatus('Parsing database...');
        db = new SQL.Database(new Uint8Array(arrayBuffer));
        
        showLoadingStatus('Querying data...');
        // Query data (sync operation)
        try {
            fetchData();
        } catch (queryError) {
            console.error('Query error:', queryError);
            throw new Error(`Query failed: ${queryError.message}`);
        }
        
        // Switch to main screen
        console.log('[loadDatabase] Calling showMainScreen...');
        showMainScreen();
        
    } catch (error) {
        showLoadingStatus(`加载失败: ${error.message}`);
        console.error('Database loading error:', error);
        // 显示重新选择按钮
        document.querySelector('.file-input-wrapper').style.display = 'block';
    }
}

// 获取数据
async function fetchData() {
    // 数据查询在后台进行，不显示额外状态
    
    // 查询 ascents（完攀记录）
    const ascentQuery = `
        SELECT 
            a.uuid,
            a.climb_uuid,
            a.angle,
            a.bid_count,
            a.difficulty,
            a.quality,
            a.climbed_at,
            a.comment,
            c.name as climb_name,
            c.setter_username,
            c.frames,
            c.description,
            c.layout_id,
            'ascent' as type
        FROM ascents a
        LEFT JOIN climbs c ON a.climb_uuid = c.uuid
        WHERE a.climbed_at IS NOT NULL
        ORDER BY a.climbed_at DESC
    `;
    
    // 查询 bids（尝试记录）
    const bidQuery = `
        SELECT 
            b.uuid,
            b.climb_uuid,
            b.angle,
            b.bid_count,
            NULL as difficulty,
            NULL as quality,
            b.climbed_at,
            b.comment,
            c.name as climb_name,
            c.setter_username,
            c.frames,
            c.description,
            c.layout_id,
            'bid' as type
        FROM bids b
        LEFT JOIN climbs c ON b.climb_uuid = c.uuid
        WHERE b.climbed_at IS NOT NULL
        ORDER BY b.climbed_at DESC
    `;
    
    const ascentResult = db.exec(ascentQuery);
    const bidResult = db.exec(bidQuery);
    
    // 解析结果
    const ascents = parseQueryResult(ascentResult);
    const bids = parseQueryResult(bidResult);
    
    // 合并并排序
    allRecords = [...ascents, ...bids];
    allRecords.sort((a, b) => new Date(b.climbed_at) - new Date(a.climbed_at));
    
    // 获取线路统计信息
    const statsQuery = `SELECT climb_uuid, angle, difficulty_average, quality_average, ascensionist_count FROM climb_stats`;
    const statsResult = db.exec(statsQuery);
    const stats = parseQueryResult(statsResult);
    
    // 关联统计信息
    const statsMap = {};
    stats.forEach(s => {
        statsMap[`${s.climb_uuid}_${s.angle}`] = s;
    });
    
    allRecords.forEach(record => {
        const key = `${record.climb_uuid}_${record.angle}`;
        record.stats = statsMap[key] || {};
    });
    
    filteredRecords = [...allRecords];
    displayedCount = 0;
    
    // 显示加载完成统计
    showLoadingStats(allRecords.length);
}

// 解析查询结果
function parseQueryResult(result) {
    if (!result || result.length === 0) return [];
    
    const { columns, values } = result[0];
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
            obj[col] = row[i];
        });
        return obj;
    });
}

// Show main screen
function showMainScreen() {
    console.log('[showMainScreen] Starting...');
    
    // Hide loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('active');
        console.log('[showMainScreen] Removed active from loading-screen');
    } else {
        console.warn('[showMainScreen] loading-screen not found!');
    }
    
    // Show main screen
    const mainScreen = document.getElementById('main-screen');
    if (mainScreen) {
        mainScreen.classList.add('active');
        console.log('[showMainScreen] Added active to main-screen');
    } else {
        console.warn('[showMainScreen] main-screen not found!');
    }
    
    document.getElementById('total-count').textContent = `${allRecords.length} records`;
    
    renderList();
    console.log('[showMainScreen] Completed');
}

// 显示加载状态
function showLoadingStatus(message) {
    document.getElementById('loading-status').textContent = message;
}

// 显示加载完成统计并直接进入主界面
function showLoadingStats(total) {
    // 直接切换到主界面，不显示紫色加载界面
    showMainScreen();
}

let lastRenderedDate = null;  // 用于按天分块

// 渲染列表
function renderList() {
    const listEl = document.getElementById('record-list');
    const recordsToShow = filteredRecords.slice(displayedCount, displayedCount + PAGE_SIZE);
    
    recordsToShow.forEach(record => {
        // 检查是否需要插入日期分隔线
        const recordDate = record.climbed_at.split(' ')[0];
        if (recordDate !== lastRenderedDate) {
            const dateDivider = createDateDivider(record.climbed_at);
            listEl.appendChild(dateDivider);
            lastRenderedDate = recordDate;
        }
        
        const card = createRecordCard(record);
        listEl.appendChild(card);
    });
    
    displayedCount += recordsToShow.length;
    
    // 控制加载更多按钮
    const loadMoreEl = document.getElementById('load-more');
    if (displayedCount >= filteredRecords.length) {
        loadMoreEl.style.display = 'none';
    } else {
        loadMoreEl.style.display = 'block';
        loadMoreEl.querySelector('span').textContent = 
            `加载更多 (${displayedCount}/${filteredRecords.length})`;
    }
}

// 创建日期分隔线
function createDateDivider(dateStr) {
    const div = document.createElement('div');
    div.className = 'date-divider';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateText = date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'short'
    });
    
    if (date.toDateString() === today.toDateString()) {
        dateText = '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
        dateText = '昨天';
    }
    
    div.innerHTML = `<span class="date-text">${dateText}</span>`;
    return div;
}

// 创建记录卡片
function createRecordCard(record) {
    const div = document.createElement('div');
    div.className = `record-card ${record.type}`;
    div.onclick = () => showDetail(record);
    
    const time = formatTime(record.climbed_at);
    const difficulty = record.difficulty || record.stats.difficulty_average || '-';
    const difficultyLabel = getDifficultyLabel(difficulty);
    const isAscent = record.type === 'ascent';
    
    div.innerHTML = `
        <div class="card-header">
            <span class="time">${time}</span>
            <span class="status-badge ${record.type}">
                <svg width="12" height="12"><use href="#icon-${isAscent ? 'check' : 'rotate'}"/></svg>
                ${isAscent ? 'Sent' : 'Attempt'}
            </span>
        </div>
        <div class="card-body">
            <h3 class="climb-name">${escapeHtml(record.climb_name || 'Unknown')}</h3>
            <div class="card-meta">
                <span class="meta-item">
                    <svg><use href="#icon-angle"/></svg>
                    ${record.angle}°
                </span>
                <span class="meta-item grade">${difficultyLabel}</span>
                <span class="meta-item">
                    <svg><use href="#icon-rotate"/></svg>
                    ${record.bid_count || 0}
                </span>
            </div>
        </div>
    `;
    
    return div;
}

// 格式化时间（精确到秒）
function formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
}

// 显示详情
function showDetail(record) {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('modal-body');
    
    const setter = record.setter_username || 'Unknown';
    
    // 获取该用户在这条线路的所有攀爬记录
    const userClimbs = getUserClimbsForRoute(record.climb_uuid, record.angle);
    
    // 计算完成次数
    const ascentCount = userClimbs.filter(c => c.type === 'ascent').length;
    
    body.innerHTML = `
        <div class="detail-header">
            <h2>${escapeHtml(record.climb_name || 'Unknown')}</h2>
            <div class="detail-meta">
                <span class="meta-tag">
                    <svg><use href="#icon-angle"/></svg>
                    ${record.angle}°
                </span>
                <span class="meta-tag">
                    <svg><use href="#icon-user"/></svg>
                    ${escapeHtml(setter)}
                </span>
            </div>
        </div>
        
        <div class="detail-section">
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Grade</label>
                    <value class="grade">${getDifficultyLabel(record.stats.difficulty_average || record.difficulty)}</value>
                </div>
                <div class="detail-item">
                    <label>Quality</label>
                    <value>${record.stats.quality_average ? '⭐'.repeat(Math.round(record.stats.quality_average)) : '-'}</value>
                </div>
                <div class="detail-item">
                    <label>Ascensionists</label>
                    <value>${record.stats.ascensionist_count || '-'}</value>
                </div>
                <div class="detail-item">
                    <label>My Sends</label>
                    <value>${ascentCount}</value>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>My Sessions (${userClimbs.length})</h3>
            <div class="climb-history">
                ${userClimbs.map(climb => `
                    <div class="history-item ${climb.type}">
                        <div class="history-main">
                            <span class="history-time">${formatDateTime(climb.climbed_at)}</span>
                            <span class="history-type">
                                <svg width="12" height="12"><use href="#icon-${climb.type === 'ascent' ? 'check' : 'rotate'}"/></svg>
                                ${climb.type === 'ascent' ? 'Sent' : 'Attempt'}
                            </span>
                        </div>
                        <div class="history-detail">
                            <span>Grade: ${getDifficultyLabel(climb.difficulty) || '-'}</span>
                            <span>Quality: ${climb.quality ? '⭐'.repeat(climb.quality) : '-'}</span>
                            <span>Attempts: ${climb.bid_count || 0}</span>
                        </div>
                        ${climb.comment ? `<div class="history-comment">${escapeHtml(climb.comment)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${record.description ? `
        <div class="detail-section">
            <h3>Description</h3>
            <p class="description">${escapeHtml(record.description)}</p>
        </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
}

// 获取用户在某条线路的所有攀爬记录
function getUserClimbsForRoute(climbUuid, angle) {
    return allRecords.filter(r => 
        r.climb_uuid === climbUuid && 
        r.angle === angle
    ).sort((a, b) => new Date(b.climbed_at) - new Date(a.climbed_at));
}

// 关闭弹窗
function closeModal(event) {
    if (!event || event.target.id === 'detail-modal') {
        document.getElementById('detail-modal').classList.remove('active');
    }
}

// 显示筛选面板
function showFilterPanel() {
    document.getElementById('filter-panel').classList.add('active');
}

// 隐藏筛选面板
function hideFilterPanel() {
    document.getElementById('filter-panel').classList.remove('active');
}

// Grade range change handler
function onDiffChange() {
    const minInput = document.getElementById('diff-min');
    const maxInput = document.getElementById('diff-max');
    const min = parseInt(minInput.value);
    const max = parseInt(maxInput.value);
    const minVal = parseInt(minInput.min);
    const maxVal = parseInt(maxInput.max);
    
    // Ensure min <= max
    if (min > max) {
        if (document.activeElement === minInput) {
            minInput.value = max;
        } else {
            maxInput.value = min;
        }
    }
    
    // Update fill bar
    const rangeFill = document.getElementById('range-fill');
    if (rangeFill) {
        const totalRange = maxVal - minVal;
        const leftPercent = ((parseInt(minInput.value) - minVal) / totalRange) * 100;
        const rightPercent = ((parseInt(maxInput.value) - minVal) / totalRange) * 100;
        rangeFill.style.left = leftPercent + '%';
        rangeFill.style.width = (rightPercent - leftPercent) + '%';
    }
    
    // Update labels
    document.getElementById('diff-min-label').textContent = getDifficultyLabel(min);
    document.getElementById('diff-max-label').textContent = getDifficultyLabel(max);
    
    applyFilters();
}

// 时间筛选变化处理
function onTimeFilterChange() {
    const timeFilter = document.getElementById('filter-time').value;
    const customDateRange = document.getElementById('custom-date-range');
    
    if (timeFilter === 'custom') {
        customDateRange.style.display = 'flex';
    } else {
        customDateRange.style.display = 'none';
    }
    
    applyFilters();
}

// 应用筛选
function applyFilters() {
    const timeFilter = document.getElementById('filter-time').value;
    const showAscent = document.getElementById('filter-ascent').checked;
    const showBid = document.getElementById('filter-bid').checked;
    const diffMin = parseInt(document.getElementById('diff-min').value) || 0;
    const diffMax = parseInt(document.getElementById('diff-max').value) || 30;
    const searchText = document.getElementById('filter-search').value.toLowerCase();
    
    // 获取选中的角度
    const angleCheckboxes = document.querySelectorAll('.angles input[type="checkbox"]:checked');
    const selectedAngles = Array.from(angleCheckboxes).map(cb => parseInt(cb.value));
    
    // 自定义日期
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    
    filteredRecords = allRecords.filter(record => {
        // 类型筛选
        if (record.type === 'ascent' && !showAscent) return false;
        if (record.type === 'bid' && !showBid) return false;
        
        // 角度筛选
        if (!selectedAngles.includes(record.angle)) return false;
        
        // 时间筛选
        const recordDate = new Date(record.climbed_at);
        const now = new Date();
        
        if (timeFilter !== 'all') {
            if (timeFilter === 'custom') {
                // 自定义日期范围
                if (dateStart) {
                    const start = new Date(dateStart);
                    if (recordDate < start) return false;
                }
                if (dateEnd) {
                    const end = new Date(dateEnd);
                    end.setHours(23, 59, 59);
                    if (recordDate > end) return false;
                }
            } else if (['7', '30', '90', '365'].includes(timeFilter)) {
                const days = parseInt(timeFilter);
                const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);
                if (recordDate < cutoff) return false;
            } else {
                const year = parseInt(timeFilter);
                if (recordDate.getFullYear() !== year) return false;
            }
        }
        
        // 难度筛选
        const difficulty = record.difficulty || record.stats.difficulty_average || 0;
        if (difficulty < diffMin || difficulty > diffMax) return false;
        
        // 搜索筛选
        if (searchText && record.climb_name) {
            if (!record.climb_name.toLowerCase().includes(searchText)) return false;
        }
        
        return true;
    });
    
    // 重置列表
    displayedCount = 0;
    lastRenderedDate = null;
    document.getElementById('record-list').innerHTML = '';
    document.getElementById('total-count').textContent = `${filteredRecords.length} 条记录`;
    renderList();
    
    // 更新 filter bar 显示
    updateFilterBar();
}

// 更新 Filter Bar 显示
function updateFilterBar() {
    const timeFilter = document.getElementById('filter-time').value;
    const showAscent = document.getElementById('filter-ascent').checked;
    const showBid = document.getElementById('filter-bid').checked;
    const diffMin = document.getElementById('diff-min').value;
    const diffMax = document.getElementById('diff-max').value;
    const dateStart = document.getElementById('date-start').value;
    const dateEnd = document.getElementById('date-end').value;
    
    // Time
    let timeText = 'All';
    if (timeFilter === 'custom' && (dateStart || dateEnd)) {
        const start = dateStart ? dateStart.slice(5) : '...';
        const end = dateEnd ? dateEnd.slice(5) : '...';
        timeText = `${start}-${end}`;
    } else {
        const timeMap = {
            'all': 'All',
            '7': '7d',
            '30': '30d',
            '90': '90d',
            '365': '1y',
            '2026': '2026',
            '2025': '2025',
            '2024': '2024',
            '2023': '2023',
            '2022': '2022'
        };
        timeText = timeMap[timeFilter] || timeFilter;
    }
    document.getElementById('filter-bar-time').textContent = timeText;
    
    // Type
    let typeText = 'All';
    if (showAscent && !showBid) typeText = 'Sent';
    else if (!showAscent && showBid) typeText = 'Attempts';
    else if (!showAscent && !showBid) typeText = 'None';
    document.getElementById('filter-bar-type').textContent = typeText;
    
    // Angle
    const angleCheckboxes = document.querySelectorAll('.angles input[type="checkbox"]:checked');
    const selectedAngles = Array.from(angleCheckboxes).map(cb => parseInt(cb.value));
    let angleText = 'All';
    if (selectedAngles.length === 1) angleText = selectedAngles[0] + '°';
    else if (selectedAngles.length > 1 && selectedAngles.length < 15) {
        const min = Math.min(...selectedAngles);
        const max = Math.max(...selectedAngles);
        if (max - min === (selectedAngles.length - 1) * 5) {
            angleText = min + '°-' + max + '°';
        } else {
            angleText = selectedAngles.length + '';
        }
    } else if (selectedAngles.length === 0) angleText = 'None';
    document.getElementById('filter-bar-angle').textContent = angleText;
    
    // Grade
    let diffText = 'All';
    const minVal = parseInt(diffMin) || 10;
    const maxVal = parseInt(diffMax) || 33;
    if (minVal > 10 || maxVal < 33) {
        const minLabel = getDifficultyLabel(minVal);
        const maxLabel = getDifficultyLabel(maxVal);
        diffText = minLabel.split('/')[1] + '-' + maxLabel.split('/')[1];
    }
    document.getElementById('filter-bar-diff').textContent = diffText;
    
    // Search (optional, only if element exists)
    const searchInput = document.getElementById('filter-search');
    const nameDisplay = document.getElementById('filter-bar-name');
    if (searchInput && nameDisplay) {
        const searchText = searchInput.value.trim();
        let nameText = 'All';
        if (searchText) {
            nameText = searchText.length > 6 ? searchText.slice(0, 6) + '...' : searchText;
        }
        nameDisplay.textContent = nameText;
    }
}

// 重置筛选
function resetFilters() {
    document.getElementById('filter-time').value = 'all';
    document.getElementById('filter-ascent').checked = true;
    document.getElementById('filter-bid').checked = true;
    document.getElementById('diff-min').value = '10';
    document.getElementById('diff-max').value = '33';
    document.getElementById('filter-search').value = '';
    document.getElementById('custom-date-range').style.display = 'none';
    document.getElementById('date-start').value = '';
    document.getElementById('date-end').value = '';
    
    document.querySelectorAll('.angles input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    
    onDiffChange();
    applyFilters();
}

// 加载更多
function loadMore() {
    renderList();
}

// 辅助函数
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 根据 difficulty 数值获取 V-grade（Fontainebleau 等级对照表）
// difficulty: 10=4a/V0, 16=6a/V3, 20=6c/V5, 24=7b/V8, 32=8c/V15
// 输入值会先四舍五入到整数
function getDifficultyLabel(difficulty) {
    if (!difficulty || difficulty === '-') return '';
    
    // 先四舍五入到整数
    const d = Math.round(parseFloat(difficulty));
    
    // Fontainebleau / V-grade / difficulty 对照
    if (d <= 10) return '4a/V0';
    if (d <= 11) return '4b/V0';
    if (d <= 12) return '4c/V0';
    if (d <= 13) return '5a/V1';
    if (d <= 14) return '5b/V1';
    if (d <= 15) return '5c/V2';
    if (d <= 16) return '6a/V3';
    if (d <= 17) return '6a+/V3';
    if (d <= 18) return '6b/V4';
    if (d <= 19) return '6b+/V4';
    if (d <= 20) return '6c/V5';
    if (d <= 21) return '6c+/V5';
    if (d <= 22) return '7a/V6';
    if (d <= 23) return '7a+/V7';
    if (d <= 24) return '7b/V8';
    if (d <= 25) return '7b+/V8';
    if (d <= 26) return '7c/V9';
    if (d <= 27) return '7c+/V10';
    if (d <= 28) return '8a/V11';
    if (d <= 29) return '8a+/V12';
    if (d <= 30) return '8b/V13';
    if (d <= 31) return '8b+/V14';
    if (d <= 32) return '8c/V15';
    return '8c+/V16+';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// IndexedDB 缓存
const DB_NAME = 'KilterLogbookDB';
const STORE_NAME = 'database';
const DB_KEY = 'kilterdb';

async function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(STORE_NAME);
        };
    });
}

async function saveDbToCache(arrayBuffer) {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        return new Promise((resolve, reject) => {
            const request = store.put(arrayBuffer, DB_KEY);
            request.onsuccess = () => {
                console.log('Database cached to IndexedDB');
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Failed to cache database:', error);
    }
}

async function loadDbFromCache() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(DB_KEY);
        
        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        return null;
    }
}

// 启动
init();

// ==================== 统计分析模块 ====================

// 显示统计页面
function showStatsPage() {
    document.getElementById('stats-page').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // 延迟初始化图表，确保DOM已渲染
    setTimeout(() => {
        initStatsCharts();
    }, 100);
}

// 隐藏统计页面
function hideStatsPage() {
    document.getElementById('stats-page').classList.remove('active');
    document.body.style.overflow = '';
    
    // 销毁图表释放资源
    disposeStatsCharts();
}

// 切换统计Tab
function switchStatsTab(tabName) {
    // 更新Tab样式
    document.querySelectorAll('.stats-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // 更新内容显示
    document.querySelectorAll('.stats-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`stats-${tabName}`).classList.add('active');
    
    // 如果切换到SQL之外的Tab，重新渲染图表
    if (tabName !== 'sql') {
        setTimeout(() => {
            renderStatsCharts(tabName);
        }, 50);
    }
}

// 图表实例缓存
let statsCharts = {};
let currentTrendGranularity = 'week';

// 初始化统计图表
function initStatsCharts() {
    // 计算统计数据
    calculateStatsData();
    
    // 初始化概览Tab图表
    renderOverviewCharts();
}

// 销毁图表
function disposeStatsCharts() {
    Object.values(statsCharts).forEach(chart => {
        if (chart && !chart.isDisposed()) {
            chart.dispose();
        }
    });
    statsCharts = {};
}

// 统计数据缓存
let statsData = {};

// 计算统计数据
function calculateStatsData() {
    const ascents = allRecords.filter(r => r.type === 'ascent');
    const bids = allRecords.filter(r => r.type === 'bid');
    
    // Flash: 尝试次数<=1的完攀
    const flashAscents = ascents.filter(a => (a.bid_count || 0) <= 1);
    
    // 最高难度
    let maxDifficulty = 0;
    ascents.forEach(a => {
        const diff = a.difficulty || a.stats?.difficulty_average || 0;
        if (diff > maxDifficulty) maxDifficulty = diff;
    });
    
    // 更新KPI
    document.getElementById('kpi-total').textContent = allRecords.length;
    document.getElementById('kpi-ascent').textContent = ascents.length;
    document.getElementById('kpi-bid').textContent = bids.length;
    document.getElementById('kpi-flash').textContent = flashAscents.length;
    document.getElementById('kpi-max-grade').textContent = maxDifficulty > 0 ? getDifficultyLabel(maxDifficulty).split('/')[1] : '-';
    
    // 角度分布
    const angleDist = {};
    allRecords.forEach(r => {
        angleDist[r.angle] = (angleDist[r.angle] || 0) + 1;
    });
    
    // 难度分布（V-grade）
    const gradeDist = { ascent: {}, bid: {} };
    allRecords.forEach(r => {
        const diff = Math.round(r.difficulty || r.stats?.difficulty_average || 0);
        if (diff > 0) {
            const vGrade = getDifficultyLabel(diff).split('/')[1];
            if (r.type === 'ascent') {
                gradeDist.ascent[vGrade] = (gradeDist.ascent[vGrade] || 0) + 1;
            } else {
                gradeDist.bid[vGrade] = (gradeDist.bid[vGrade] || 0) + 1;
            }
        }
    });
    
    // 完攀率
    const allGrades = new Set([...Object.keys(gradeDist.ascent), ...Object.keys(gradeDist.bid)]);
    const completionRate = [];
    allGrades.forEach(grade => {
        const asc = gradeDist.ascent[grade] || 0;
        const bid = gradeDist.bid[grade] || 0;
        const total = asc + bid;
        completionRate.push({
            grade,
            rate: total > 0 ? (asc / total * 100).toFixed(1) : 0,
            asc,
            bid
        });
    });
    completionRate.sort((a, b) => vGradeToNum(a.grade) - vGradeToNum(b.grade));
    
    // 尝试次数分布
    const bidCountDist = {};
    allRecords.forEach(r => {
        const count = r.bid_count || 0;
        const range = count <= 1 ? '1次(Flash)' : 
                      count <= 3 ? '2-3次' :
                      count <= 5 ? '4-5次' :
                      count <= 10 ? '6-10次' : '10次以上';
        bidCountDist[range] = (bidCountDist[range] || 0) + 1;
    });
    
    // 时间趋势（6个月）
    const monthTrend = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthTrend[key] = { month: key, count: 0 };
    }
    allRecords.forEach(r => {
        const date = new Date(r.climbed_at);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthTrend[key]) {
            monthTrend[key].count++;
        }
    });
    
    // 热力图数据（近3个月）
    const heatmapData = [];
    const heatmapDates = [];
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const dateCount = {};
    allRecords.forEach(r => {
        const date = r.climbed_at.split(' ')[0];
        dateCount[date] = (dateCount[date] || 0) + 1;
    });
    
    // 星期/时段偏好
    const weekdayDist = [0, 0, 0, 0, 0, 0, 0]; // 周日到周六
    allRecords.forEach(r => {
        const date = new Date(r.climbed_at);
        weekdayDist[date.getDay()]++;
    });
    
    statsData = {
        ascents,
        bids,
        flashCount: flashAscents.length,
        maxDifficulty,
        angleDist,
        gradeDist,
        completionRate,
        bidCountDist,
        monthTrend: Object.values(monthTrend),
        dateCount,
        weekdayDist
    };
}

// V-grade 转数字用于排序
function vGradeToNum(grade) {
    const match = grade.match(/V(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

// 渲染统计图表
function renderStatsCharts(tabName) {
    if (tabName === 'overview' || !tabName) {
        renderOverviewCharts();
    } else if (tabName === 'grade') {
        renderGradeCharts();
    } else if (tabName === 'trend') {
        renderTrendCharts();
    }
}

// 渲染概览图表
function renderOverviewCharts() {
    // 1. 完攀/尝试饼图
    const pieChart = statsCharts['overview-pie'] || echarts.init(document.getElementById('chart-overview-pie'));
    statsCharts['overview-pie'] = pieChart;
    pieChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: '5%', left: 'center' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' }},
            data: [
                { value: statsData.ascents.length, name: 'Ascents', itemStyle: { color: '#10B981' }},
                { value: statsData.bids.length, name: 'Attempts', itemStyle: { color: '#F97316' }}
            ]
        }]
    });
    
    // 2. 角度玫瑰图
    const angleChart = statsCharts['overview-angle'] || echarts.init(document.getElementById('chart-overview-angle'));
    statsCharts['overview-angle'] = angleChart;
    const angleData = Object.entries(statsData.angleDist)
        .map(([angle, count]) => ({ value: count, name: angle + '°' }))
        .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    angleChart.setOption({
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: [20, 80],
            center: ['50%', '50%'],
            roseType: 'area',
            itemStyle: { borderRadius: 5 },
            data: angleData,
            label: { fontSize: 11 }
        }]
    });
    
    // 3. 6个月趋势
    const trendChart = statsCharts['overview-trend'] || echarts.init(document.getElementById('chart-overview-trend'));
    statsCharts['overview-trend'] = trendChart;
    trendChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: statsData.monthTrend.map(d => d.month),
            axisLabel: { fontSize: 11 }
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
            data: statsData.monthTrend.map(d => d.count),
            type: 'bar',
            itemStyle: { color: '#4a90d9', borderRadius: [4, 4, 0, 0] },
            barWidth: '50%'
        }]
    });
}

// 渲染难度分析图表
function renderGradeCharts() {
    // 1. 难度金字塔
    const pyramidChart = statsCharts['grade-pyramid'] || echarts.init(document.getElementById('chart-grade-pyramid'));
    statsCharts['grade-pyramid'] = pyramidChart;
    
    // 获取所有难度并排序
    const allGrades = new Set([
        ...Object.keys(statsData.gradeDist.ascent),
        ...Object.keys(statsData.gradeDist.bid)
    ]);
    const sortedGrades = Array.from(allGrades).sort((a, b) => vGradeToNum(a) - vGradeToNum(b));
    
    pyramidChart.setOption({
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params) {
                let result = params[0].name + '<br/>';
                params.forEach(p => {
                    result += p.marker + ' ' + p.seriesName + ': ' + Math.abs(p.value) + '<br/>';
                });
                return result;
            }
        },
        legend: { data: ['完攀', '尝试'], bottom: 5 },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
        xAxis: {
            type: 'value',
            axisLabel: { formatter: v => Math.abs(v) }
        },
        yAxis: {
            type: 'category',
            data: sortedGrades,
            axisLabel: { fontSize: 11 }
        },
        series: [
            {
                name: '完攀',
                type: 'bar',
                stack: 'total',
                label: { show: true, position: 'inside' },
                data: sortedGrades.map(g => statsData.gradeDist.ascent[g] || 0),
                itemStyle: { color: '#10B981' }
            },
            {
                name: '尝试',
                type: 'bar',
                stack: 'total',
                label: { show: true, position: 'inside', formatter: v => v.value > 0 ? '-' + v.value : '' },
                data: sortedGrades.map(g => -(statsData.gradeDist.bid[g] || 0)),
                itemStyle: { color: '#F97316' }
            }
        ]
    });
    
    // 2. 完攀率柱状图
    const rateChart = statsCharts['grade-rate'] || echarts.init(document.getElementById('chart-grade-rate'));
    statsCharts['grade-rate'] = rateChart;
    
    // 构建dataMap用于tooltip查询
    const completionRateMap = {};
    statsData.completionRate.forEach(d => {
        completionRateMap[d.grade] = { asc: d.asc, bid: d.bid };
    });
    
    rateChart.setOption({
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const grade = params[0].name;
                const rate = params[0].value;
                const data = completionRateMap[grade] || { asc: 0, bid: 0 };
                const total = data.asc + data.bid;
                return `${grade}: ${rate}%<br/>完攀: ${data.asc}次, 尝试: ${data.bid}次<br/>总计: ${total}次`;
            }
        },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: statsData.completionRate.map(d => d.grade),
            axisLabel: { fontSize: 11, rotate: 45 }
        },
        yAxis: {
            type: 'value',
            max: 100,
            axisLabel: { formatter: '{value}%' }
        },
        series: [{
            data: statsData.completionRate.map(d => ({
                value: d.rate,
                asc: d.asc,
                bid: d.bid
            })),
            type: 'bar',
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#F59E0B' },
                    { offset: 1, color: '#F97316' }
                ]),
                borderRadius: [8, 8, 0, 0]
            }
        }]
    });
    
    // 3. 尝试次数分布
    const bidDistChart = statsCharts['bid-dist'] || echarts.init(document.getElementById('chart-bid-distribution'));
    statsCharts['bid-dist'] = bidDistChart;
    const bidDistOrder = ['1次(Flash)', '2-3次', '4-5次', '6-10次', '10次以上'];
    bidDistChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
            type: 'pie',
            radius: ['30%', '60%'],
            center: ['50%', '50%'],
            roseType: 'radius',
            itemStyle: { borderRadius: 5 },
            data: bidDistOrder.map(range => ({
                name: range,
                value: statsData.bidCountDist[range] || 0
            })).filter(d => d.value > 0),
            label: { fontSize: 12 }
        }]
    });
}

// 设置趋势粒度
function setTrendGranularity(granularity) {
    currentTrendGranularity = granularity;
    document.querySelectorAll('.granularity-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.gran === granularity) {
            btn.classList.add('active');
        }
    });
    renderTrendCharts();
}

// 渲染趋势图表
function renderTrendCharts() {
    const granularity = currentTrendGranularity;
    
    // 计算时间分组数据
    const timeData = {};
    allRecords.forEach(r => {
        const date = new Date(r.climbed_at);
        let key;
        if (granularity === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
        } else if (granularity === 'month') {
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
            key = String(date.getFullYear());
        }
        
        if (!timeData[key]) {
            timeData[key] = { count: 0, totalDiff: 0, diffCount: 0 };
        }
        timeData[key].count++;
        const diff = r.difficulty || r.stats?.difficulty_average;
        if (diff) {
            timeData[key].totalDiff += diff;
            timeData[key].diffCount++;
        }
    });
    
    const sortedKeys = Object.keys(timeData).sort();
    
    // 1. 热力图 - 显示近3个月的每日活动
    const heatmapChart = statsCharts['trend-heatmap'] || echarts.init(document.getElementById('chart-trend-heatmap'));
    statsCharts['trend-heatmap'] = heatmapChart;
    
    // 生成近3个月的日期和数据
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    const heatmapDates = [];
    const heatmapValues = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        heatmapDates.push(dateStr);
        heatmapValues.push(statsData.dateCount[dateStr] || 0);
    }
    
    heatmapChart.setOption({
        tooltip: { 
            position: 'top',
            formatter: p => `${p.name}: ${p.value[1] || 0} 次攀爬`
        },
        visualMap: {
            min: 0,
            max: Math.max(...heatmapValues, 5),
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            inRange: { color: ['#F1F5F9', '#FDBA74', '#F97316', '#10B981', '#059669'] }
        },
        calendar: {
            top: 30,
            left: 30,
            right: 30,
            cellSize: ['auto', 18],
            range: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]],
            itemStyle: { borderWidth: 0.5 },
            splitLine: { show: false },
            dayLabel: { firstDay: 1, nameMap: '周日一二三四五六'.split('') },
            monthLabel: { nameMap: 'cn' }
        },
        series: [{
            type: 'heatmap',
            coordinateSystem: 'calendar',
            data: heatmapDates.map((date, i) => [date, heatmapValues[i]])
        }]
    });
    
    // 2. 趋势折线+67f1状图
    const lineChart = statsCharts['trend-line'] || echarts.init(document.getElementById('chart-trend-line'));
    statsCharts['trend-line'] = lineChart;
    lineChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['攀爬次数', '平均难度'], bottom: 0 },
        grid: { left: '3%', right: '3%', bottom: '15%', top: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: sortedKeys,
            axisLabel: { fontSize: 11, rotate: granularity === 'week' ? 45 : 0 }
        },
        yAxis: [
            { type: 'value', name: '次数', minInterval: 1 },
            { type: 'value', name: '难度', min: 10, max: 35 }
        ],
        series: [
            {
                name: '攀爬次数',
                type: 'bar',
                data: sortedKeys.map(k => timeData[k].count),
                itemStyle: { color: '#6366F1', borderRadius: [8, 8, 0, 0] }
            },
            {
                name: '平均难度',
                type: 'line',
                yAxisIndex: 1,
                data: sortedKeys.map(k => {
                    const d = timeData[k];
                    return d.diffCount > 0 ? (d.totalDiff / d.diffCount).toFixed(1) : null;
                }),
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                lineStyle: { color: '#F59E0B', width: 3 },
                itemStyle: { color: '#F59E0B' }
            }
        ]
    });
    
    // 3. 星期偏好
    const weekdayChart = statsCharts['trend-weekday'] || echarts.init(document.getElementById('chart-trend-weekday'));
    statsCharts['trend-weekday'] = weekdayChart;
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    weekdayChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            data: weekdayNames,
            axisTick: { alignWithLabel: true }
        },
        yAxis: { type: 'value', minInterval: 1 },
        series: [{
            type: 'bar',
            data: statsData.weekdayDist,
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#667eea' },
                    { offset: 1, color: '#764ba2' }
                ]),
                borderRadius: [4, 4, 0, 0]
            },
            barWidth: '50%'
        }]
    });
}

// ==================== SQL探索功能 ====================

// SQL模板
const sqlTemplates = {
    grade_distribution: `SELECT 
    CASE 
        WHEN difficulty >= 20 THEN 'V5+'
        WHEN difficulty >= 18 THEN 'V3-V4'
        ELSE 'V0-V2'
    END as grade_range,
    COUNT(*) as count,
    SUM(CASE WHEN type = 'ascent' THEN 1 ELSE 0 END) as ascents
FROM (
    SELECT difficulty, 'ascent' as type FROM ascents
    UNION ALL
    SELECT NULL as difficulty, 'bid' as type FROM bids
)
GROUP BY grade_range
ORDER BY count DESC`,

    monthly_stats: `SELECT 
    strftime('%Y-%m', climbed_at) as month,
    COUNT(*) as total,
    SUM(CASE WHEN type = 'ascent' THEN 1 ELSE 0 END) as ascents,
    SUM(CASE WHEN type = 'bid' THEN 1 ELSE 0 END) as bids
FROM (
    SELECT climbed_at, 'ascent' as type FROM ascents
    UNION ALL
    SELECT climbed_at, 'bid' as type FROM bids
)
GROUP BY month
ORDER BY month DESC
LIMIT 12`,

    setter_ranking: `SELECT 
    setter_username,
    COUNT(*) as climb_count,
    COUNT(DISTINCT a.uuid) as my_climbs
FROM climbs c
LEFT JOIN ascents a ON c.uuid = a.climb_uuid
WHERE setter_username IS NOT NULL
GROUP BY setter_username
ORDER BY my_climbs DESC
LIMIT 20`,

    project_list: `SELECT 
    c.name,
    c.setter_username,
    b.angle,
    b.bid_count,
    b.climbed_at as last_attempt
FROM bids b
JOIN climbs c ON b.climb_uuid = c.uuid
WHERE b.bid_count > 5
AND NOT EXISTS (
    SELECT 1 FROM ascents a 
    WHERE a.climb_uuid = b.climb_uuid AND a.angle = b.angle
)
ORDER BY b.bid_count DESC`,

    repeat_climbs: `SELECT 
    c.name,
    c.setter_username,
    COUNT(*) as send_count,
    MIN(a.climbed_at) as first_send,
    MAX(a.climbed_at) as last_send
FROM ascents a
JOIN climbs c ON a.climb_uuid = c.uuid
GROUP BY a.climb_uuid
HAVING COUNT(*) > 1
ORDER BY send_count DESC`
};

// 加载SQL模板
function loadSqlTemplate() {
    const select = document.getElementById('sql-template');
    const template = select.value;
    if (template && sqlTemplates[template]) {
        document.getElementById('sql-input').value = sqlTemplates[template];
    }
}

// 执行SQL查询
function executeSqlQuery() {
    const sql = document.getElementById('sql-input').value.trim();
    if (!sql) {
        showSqlError('请输入SQL查询语句');
        return;
    }
    
    if (!db) {
        showSqlError('数据库未加载');
        return;
    }
    
    try {
        const result = db.exec(sql);
        displaySqlResult(result, sql);
    } catch (error) {
        showSqlError('查询错误: ' + error.message);
    }
}

// 显示SQL查询结果
function displaySqlResult(result, sql) {
    const resultContainer = document.getElementById('sql-result');
    const chartContainer = document.getElementById('sql-chart-container');
    
    if (!result || result.length === 0) {
        resultContainer.innerHTML = '<div class="sql-placeholder">查询返回空结果</div>';
        chartContainer.style.display = 'none';
        return;
    }
    
    const { columns, values } = result[0];
    
    // 构建表格
    let tableHtml = '<table class="sql-table"><thead><tr>';
    columns.forEach(col => {
        tableHtml += `<th>${escapeHtml(col)}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    
    values.forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => {
            tableHtml += `<td>${escapeHtml(String(cell ?? ''))}</td>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';
    
    resultContainer.innerHTML = tableHtml;
    
    // 尝试可视化（如果是简单的数值查询）
    if (columns.length >= 2 && values.length > 0) {
        chartContainer.style.display = 'block';
        renderSqlChart(columns, values);
    } else {
        chartContainer.style.display = 'none';
    }
}

// 渲染SQL结果图表
function renderSqlChart(columns, values) {
    const chartDom = document.getElementById('chart-sql-result');
    const chart = statsCharts['sql-result'] || echarts.init(chartDom);
    statsCharts['sql-result'] = chart;
    
    // 检查是否可以作为柱状图显示
    const firstCol = columns[0];
    const secondCol = columns[1];
    
    const isNumeric = values.every(row => !isNaN(parseFloat(row[1])));
    
    if (isNumeric) {
        const xData = values.map(row => String(row[0]));
        const yData = values.map(row => parseFloat(row[1]));
        
        chart.setOption({
            tooltip: { trigger: 'axis' },
            grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
            xAxis: {
                type: 'category',
                data: xData,
                axisLabel: { rotate: xData.length > 10 ? 45 : 0, fontSize: 11 }
            },
            yAxis: { type: 'value' },
            series: [{
                type: 'bar',
                data: yData,
                itemStyle: { color: '#4a90d9', borderRadius: [4, 4, 0, 0] }
            }]
        }, true);
    }
}

// 显示SQL错误
function showSqlError(message) {
    document.getElementById('sql-result').innerHTML = 
        `<div class="sql-placeholder" style="color: #f44336;">${escapeHtml(message)}</div>`;
    document.getElementById('sql-chart-container').style.display = 'none';
}

// 导出SQL结果为CSV
function exportSqlResult() {
    const table = document.querySelector('.sql-table');
    if (!table) {
        alert('没有可导出的数据');
        return;
    }
    
    let csv = '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        const rowData = Array.from(cells).map(cell => `"${cell.textContent.replace(/"/g, '""')}"`);
        csv += rowData.join(',') + '\n';
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kilter_stats_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// 窗口大小变化时重新调整图表
window.addEventListener('resize', () => {
    Object.values(statsCharts).forEach(chart => {
        if (chart && !chart.isDisposed()) {
            chart.resize();
        }
    });
});

// Reload database - clear cache and force re-selection
async function reloadDatabase() {
    // Clear IndexedDB cache
    try {
        const idb = await openIndexedDB();
        const transaction = idb.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        await new Promise((resolve, reject) => {
            const request = store.delete(DB_KEY);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
        console.log('[reloadDatabase] Cache cleared');
    } catch (e) {
        console.error('[reloadDatabase] Failed to clear cache:', e);
    }
    
    // Reset state
    db = null;
    allRecords = [];
    filteredRecords = [];
    displayedCount = 0;
    
    // Hide stats page
    const statsPage = document.getElementById('stats-page');
    if (statsPage) {
        statsPage.classList.remove('active');
    }
    disposeStatsCharts();
    
    // Clear main screen content
    document.getElementById('record-list').innerHTML = '';
    document.getElementById('total-count').textContent = '0 records';
    document.getElementById('main-screen').classList.remove('active');
    
    // Show loading screen
    let loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) {
        // Recreate loading screen if it was removed
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.className = 'screen loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="logo-icon">
                    <svg><use href="#icon-mountain"/></svg>
                </div>
                <h1>Kilterboard</h1>
                <p>Track your climbing journey</p>
                <div class="file-input-wrapper">
                    <input type="file" id="db-file-input" accept=".db,.sqlite,.sqlite3" />
                    <button class="btn-primary" onclick="document.getElementById('db-file-input').click()">
                        <svg width="20" height="20"><use href="#icon-upload"/></svg>
                        Select Database
                    </button>
                </div>
                <p class="hint">Supports .db, .sqlite, .sqlite3 files</p>
                <div id="loading-status"></div>
            </div>
        `;
        document.getElementById('app').insertBefore(loadingScreen, document.getElementById('main-screen'));
    }
    
    loadingScreen.classList.add('active');
    
    // Clear any previous loading status
    const loadingStatus = document.getElementById('loading-status');
    if (loadingStatus) {
        loadingStatus.textContent = '';
    }
    
    // Show file input button (cache is cleared, user must select file)
    document.querySelector('.file-input-wrapper').style.display = 'block';
    
    // Re-bind file selection event
    const fileInput = document.getElementById('db-file-input');
    fileInput.value = '';
    fileInput.addEventListener('change', handleFileSelect);
}
