// Kilterboard Logbook H5 App
// 使用 sql.js 直接查询 SQLite 数据库

let db = null;                    // SQL.js 数据库实例
let allRecords = [];              // 所有记录
let filteredRecords = [];         // 筛选后的记录
let displayedCount = 0;           // 已显示数量
const PAGE_SIZE = 20;             // 每页显示数量

// 初始化
async function init() {
    // 检查是否有缓存的数据库
    const cachedDb = await loadDbFromCache();
    if (cachedDb) {
        await loadDatabase(cachedDb);
    }

    // 文件选择监听
    document.getElementById('db-file-input').addEventListener('change', handleFileSelect);
}

// 处理文件选择
async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoadingStatus(`正在读取 ${file.name}...`);
    
    const arrayBuffer = await file.arrayBuffer();
    await loadDatabase(arrayBuffer);
    
    // 缓存到 IndexedDB
    await saveDbToCache(arrayBuffer);
}

// 加载数据库
async function loadDatabase(arrayBuffer) {
    try {
        showLoadingStatus('正在加载 SQL.js...');
        
        // 初始化 SQL.js
        const SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        showLoadingStatus('正在解析数据库...');
        db = new SQL.Database(new Uint8Array(arrayBuffer));
        
        // 查询数据
        await fetchData();
        
        // 切换到主界面
        showMainScreen();
        
    } catch (error) {
        showLoadingStatus(`错误: ${error.message}`);
        console.error(error);
    }
}

// 获取数据
async function fetchData() {
    showLoadingStatus('正在查询数据...');
    
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
    
    showLoadingStatus(`加载完成: ${allRecords.length} 条记录`);
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

// 显示主界面
function showMainScreen() {
    document.getElementById('loading-screen').classList.remove('active');
    document.getElementById('main-screen').classList.add('active');
    
    document.getElementById('total-count').textContent = `${allRecords.length} 条记录`;
    
    renderList();
}

// 显示加载状态
function showLoadingStatus(message) {
    document.getElementById('loading-status').textContent = message;
}

// 渲染列表
function renderList() {
    const listEl = document.getElementById('record-list');
    const recordsToShow = filteredRecords.slice(displayedCount, displayedCount + PAGE_SIZE);
    
    recordsToShow.forEach(record => {
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

// 创建记录卡片
function createRecordCard(record) {
    const div = document.createElement('div');
    div.className = 'record-card';
    div.onclick = () => showDetail(record);
    
    const date = formatDate(record.climbed_at);
    const typeIcon = record.type === 'ascent' ? '✅' : '🔄';
    const typeClass = record.type === 'ascent' ? 'ascent' : 'bid';
    const difficulty = record.difficulty || record.stats.difficulty_average || '-';
    const difficultyLabel = getDifficultyLabel(difficulty);
    
    div.innerHTML = `
        <div class="card-header">
            <span class="date">${date}</span>
            <span class="type-badge ${typeClass}">${typeIcon} ${record.type.toUpperCase()}</span>
        </div>
        <div class="card-body">
            <h3 class="climb-name">${escapeHtml(record.climb_name || 'Unknown')}</h3>
            <div class="card-meta">
                <span class="meta-item">📐 ${record.angle}°</span>
                <span class="meta-item">⭐ ${difficulty} ${difficultyLabel}</span>
                <span class="meta-item">🔄 ${record.bid_count || 0} 次尝试</span>
            </div>
        </div>
    `;
    
    return div;
}

// 显示详情
function showDetail(record) {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('modal-body');
    
    const date = formatDateTime(record.climbed_at);
    const typeIcon = record.type === 'ascent' ? '✅' : '🔄';
    const difficulty = record.difficulty || record.stats.difficulty_average || '-';
    const quality = record.quality || record.stats.quality_average || '-';
    const setter = record.setter_username || 'Unknown';
    const comment = record.comment || '无评论';
    
    body.innerHTML = `
        <div class="detail-header">
            <h2>${escapeHtml(record.climb_name || 'Unknown')}</h2>
            <span class="detail-type">${typeIcon} ${record.type.toUpperCase()}</span>
        </div>
        
        <div class="detail-section">
            <h3>🧗 线路信息</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>角度</label>
                    <value>${record.angle}°</value>
                </div>
                <div class="detail-item">
                    <label>定线员</label>
                    <value>${escapeHtml(setter)}</value>
                </div>
                <div class="detail-item">
                    <label>你的难度评分</label>
                    <value>${record.difficulty || '-'} ${getDifficultyLabel(record.difficulty)}</value>
                </div>
                <div class="detail-item">
                    <label>你的质量评分</label>
                    <value>${record.quality ? '⭐'.repeat(Math.round(record.quality)) : '-'}</value>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📊 线路统计</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>平均难度</label>
                    <value>${(record.stats.difficulty_average || '-').toString().substring(0, 4)}</value>
                </div>
                <div class="detail-item">
                    <label>平均质量</label>
                    <value>${record.stats.quality_average ? '⭐'.repeat(Math.round(record.stats.quality_average)) : '-'}</value>
                </div>
                <div class="detail-item">
                    <label>完攀人数</label>
                    <value>${record.stats.ascensionist_count || '-'}</value>
                </div>
                <div class="detail-item">
                    <label>你的尝试次数</label>
                    <value>${record.bid_count || 0}</value>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📝 攀爬记录</h3>
            <div class="detail-log">
                <div class="log-item">
                    <span class="log-time">${date}</span>
                    <span class="log-action">${record.type === 'ascent' ? '完成攀爬' : '尝试未成功'}</span>
                </div>
                <div class="log-comment">
                    <label>评论:</label>
                    <p>${escapeHtml(comment)}</p>
                </div>
            </div>
        </div>
        
        ${record.description ? `
        <div class="detail-section">
            <h3>📖 线路说明</h3>
            <p class="description">${escapeHtml(record.description)}</p>
        </div>
        ` : ''}
    `;
    
    modal.classList.add('active');
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
            if (['7', '30', '90', '365'].includes(timeFilter)) {
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
    
    // 时间
    const timeText = {
        'all': '全部',
        '7': '7天',
        '30': '30天',
        '90': '90天',
        '365': '1年',
        '2026': '2026',
        '2025': '2025',
        '2024': '2024',
        '2023': '2023',
        '2022': '2022'
    };
    document.getElementById('filter-bar-time').textContent = timeText[timeFilter] || timeFilter;
    
    // 类型
    let typeText = '全部';
    if (showAscent && !showBid) typeText = '完攀';
    else if (!showAscent && showBid) typeText = '尝试';
    else if (!showAscent && !showBid) typeText = '无';
    document.getElementById('filter-bar-type').textContent = typeText;
    
    // 角度
    const angleCheckboxes = document.querySelectorAll('.angles input[type="checkbox"]:checked');
    const selectedAngles = Array.from(angleCheckboxes).map(cb => cb.value);
    let angleText = '全部';
    if (selectedAngles.length === 1) angleText = selectedAngles[0] + '°';
    else if (selectedAngles.length > 1 && selectedAngles.length < 15) angleText = selectedAngles.length + '个';
    else if (selectedAngles.length === 0) angleText = '无';
    document.getElementById('filter-bar-angle').textContent = angleText;
    
    // 难度
    let diffText = '全部';
    if (diffMin || diffMax) {
        const minLabel = diffMin ? getDifficultyLabel(parseInt(diffMin)) : '0';
        const maxLabel = diffMax ? getDifficultyLabel(parseInt(diffMax)) : 'V16+';
        diffText = minLabel.split('/')[0] + '-' + maxLabel.split('/')[0];
    }
    document.getElementById('filter-bar-diff').textContent = diffText;
}

// 重置筛选
function resetFilters() {
    document.getElementById('filter-time').value = 'all';
    document.getElementById('filter-ascent').checked = true;
    document.getElementById('filter-bid').checked = true;
    document.getElementById('diff-min').value = '';
    document.getElementById('diff-max').value = '';
    document.getElementById('filter-search').value = '';
    
    document.querySelectorAll('.angles input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
    
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
        await store.put(arrayBuffer, DB_KEY);
        console.log('Database cached to IndexedDB');
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
