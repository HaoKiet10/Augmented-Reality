import { useEffect, useState } from 'react';

/**
 * Với aframe-react, A-Frame core được import trực tiếp từ package `aframe`
 * thay vì inject <script> từ CDN. Import có side-effect (gắn `window.AFRAME`),
 * nên chỉ cần đảm bảo import đã chạy xong trước khi render <Scene>.
 */
export function useAframeScript(): boolean {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        import('aframe').then(() => {
            if (mounted) setLoaded(true);
        });

        return () => {
            mounted = false;
        };
    }, []);

    return loaded;
}