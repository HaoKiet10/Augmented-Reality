import { useEffect, useState } from 'react';
import { AFRAME_SCRIPT_SRC } from '../constants';

/**
 * Load script A-Frame một lần duy nhất (toàn cục).
 * Nếu window.AFRAME đã tồn tại (do mount lại hoặc đã load trước đó), bỏ qua việc inject script.
 */
export function useAframeScript(): boolean {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if ((window as any).AFRAME) {
            setLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = AFRAME_SCRIPT_SRC;
        script.async = true;
        script.onload = () => setLoaded(true);
        document.head.appendChild(script);

        // Không remove script khi unmount để tránh phá vỡ lifecycle của A-Frame
        // nếu component re-mount.
    }, []);

    return loaded;
}