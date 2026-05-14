/**
 * Backend Portal Page — Vercel-Compatible
 * 
 * This page loads a static HTML file from the public directory using an iframe.
 * All Node.js filesystem APIs have been removed to ensure compatibility with:
 * - Vercel serverless environment
 * - Edge runtime
 * - Next.js App Router
 * 
 * The static portal HTML is served from /public/backend/index.html
 */

export default function BackendPortalPage() {
    return (
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <iframe
                title="Manthaan Backend Portal"
                src="/backend/index.html"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                }}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
                allow="camera; microphone"
            />
        </div>
    );
}
