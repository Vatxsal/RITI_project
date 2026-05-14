import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

function readPortalHtml(): string {
    const candidates = [
        path.resolve(process.cwd(), '..', 'backend', 'index.html'),
        path.resolve(process.cwd(), 'backend', 'index.html')
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return fs.readFileSync(candidate, 'utf8');
        }
    }

    return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Portal Not Found</title></head>
<body style="font-family: Arial, sans-serif; padding: 24px;">
<h2>Backend portal file not found</h2>
<p>Expected file: backend/index.html</p>
</body>
</html>`;
}

export default function BackendPortalPage() {
    const portalHtml = readPortalHtml();

    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <iframe
                title="Manthaan Backend Portal"
                srcDoc={portalHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
        </div>
    );
}
