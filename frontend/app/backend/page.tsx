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

"use client";

import { useEffect } from 'react';

export default function BackendPortalPage() {
    useEffect(() => {
        // perform a full redirect to the static backend HTML so it renders standalone
        window.location.replace('/backend/index.html');
    }, []);

    return (
        <div style={{ padding: '2rem', color: 'var(--t1)' }}>
            <p>Redirecting to backend portal...</p>
        </div>
    );
}
