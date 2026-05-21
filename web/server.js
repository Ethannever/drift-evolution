// 漂流进化 Web服务器

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    
    // 默认 index.html
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // 去除查询字符串
    filePath = filePath.split('?')[0];
    
    // 防止路径遍历：规范化后确认仍在服务目录内
    const normalized = path.normalize(filePath);
    const fullPath = path.join(__dirname, normalized);
    
    // 安全检查：确保解析后的路径在 __dirname 子目录下
    if (!fullPath.startsWith(__dirname + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    
    const ext = path.extname(fullPath).toLowerCase();
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }
    
    // 读取文件
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
        }
        
        // 设置 MIME 类型
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🌊 漂流进化 - Drift Evolution');
    console.log('═══════════════════════════════════════');
    console.log(`服务器已启动: http://0.0.0.0:${PORT}`);
    console.log('');
    console.log('按 Ctrl+C 停止服务器');
    console.log('');
});