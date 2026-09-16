import { useState, useRef, useEffect, memo, Fragment } from 'react';
import { Entity } from 'aframe-react';
import type { Asset } from '../../types';
import { isImageAsset, isVideoAsset } from '../../utils/assetType';
import { DEFAULT_SPATIAL_CONFIG } from '../../constants';

/**
 * Theo dõi trạng thái "đã có frame thật" của từng thẻ <video> trong <a-assets>.
 *
 * Lý do cần cái này: THREE.VideoTexture mà A-Frame tạo cho `a-video` được gắn vào
 * material NGAY khi entity mount, bất kể thẻ <video> đã tải được frame nào chưa.
 * Trong lúc video còn readyState = 0 (HAVE_NOTHING), texture đó là texture "rỗng"
 * trên GPU — và giá trị mặc định đó hiển thị ra là một màu cyan/lục lam đặc trưng,
 * KHÔNG phải chủ đích của app. Nếu network/CORS lỗi khiến video không bao giờ tải
 * được, người dùng sẽ thấy màu cyan đó mãi mãi thay vì chỉ trong chốc lát.
 *
 * Giải pháp: ẩn `a-video` (không render entity vật liệu video) cho tới khi trình
 * duyệt xác nhận đã có ít nhất 1 frame (`loadeddata`), đồng thời bắt sự kiện lỗi
 * để phân biệt "đang tải" với "tải hỏng" (ví dụ do CORS) và báo rõ cho người dùng
 * thay vì im lặng hiện màu cyan.
 */
function useVideoReadyState(videoElId: string, assetUrl: string) {
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const attemptedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        // Đổi asset (url mới) -> reset lại trạng thái, chờ frame mới.
        if (attemptedUrlRef.current !== assetUrl) {
            attemptedUrlRef.current = assetUrl;
            setStatus('loading');
        }

        const videoEl = document.getElementById(videoElId) as HTMLVideoElement | null;
        if (!videoEl) return;

        // Video có thể đã sẵn sàng từ trước khi effect này gắn listener (ví dụ
        // component re-mount nhưng thẻ <video> trong <a-assets> vẫn còn sống).
        if (videoEl.readyState >= 2) {
            setStatus('ready');
            return;
        }

        const handleLoadedData = () => setStatus('ready');
        const handleError = () => setStatus('error');

        videoEl.addEventListener('loadeddata', handleLoadedData);
        videoEl.addEventListener('error', handleError);

        return () => {
            videoEl.removeEventListener('loadeddata', handleLoadedData);
            videoEl.removeEventListener('error', handleError);
        };
    }, [videoElId, assetUrl]);

    return status;
}

interface ArSceneProps {
    assets: Asset[];
    activeAssetId: string | null;
    onSelectAsset: (assetId: string) => void;
    onDragAsset: (assetId: string, position: { x: number; y: number; z: number }) => void;
    onScaleAsset: (assetId: string, scale: { x: number; y: number; z: number }) => void;
    onBeforeTransformChange: () => void;
}

function vectorToString(v: { x: number; y: number; z: number }) {
    return `${v.x} ${v.y} ${v.z}`;
}

/**
 * Camera tách riêng + bọc memo: component này KHÔNG nhận prop nào thay đổi theo asset,
 * nên React sẽ bỏ qua re-render nó khi ArScene re-render (do kéo/scale asset khác).
 * Nếu không tách, aframe-react sẽ gọi lại setAttribute('position', '0 1.6 0') mỗi lần
 * ArScene render lại — xoá sạch vị trí camera đã bay tới bằng WASD (free-fly-controls).
 */
const CameraRig = memo(function CameraRig() {
    return (
        <Entity
            primitive="a-camera"
            position="0 1.6 0"
            wasd-controls="enabled: false"
            look-controls="enabled: false"
            free-fly-controls="speed: 0.08"
        />
    );
});

/**
 * 3 mũi tên kéo theo từng trục thế giới (X đỏ, Y xanh lá, Z xanh dương) — hiện khi asset
 * đang được chọn. Render như SIBLING của asset (không phải con bên trong entity đã bị
 * rotate/scale theo transform của asset) để trục luôn thẳng theo world-space tuyệt đối,
 * không bị xoay/lệch theo rotation riêng của asset.
 */
const AxisGizmo = memo(function AxisGizmo({
    position,
    onDrag,
    onBeforeChange,
}: {
    position: { x: number; y: number; z: number };
    onDrag: (position: { x: number; y: number; z: number }) => void;
    onBeforeChange: () => void;
}) {
    const ARM_LENGTH = 0.35;
    return (
        <Entity
            position={vectorToString(position)}
            events={{
                axisdragstart: onBeforeChange,
                axisdragposition: (e: any) => onDrag(e.detail),
            }}
        >
            {/* Trục X — đỏ */}
            <Entity
                axis-handle="axis: x; color: #ef4444"
                geometry={`primitive: cylinder; radius: 0.035; height: ${ARM_LENGTH}`}
                material="shader: flat"
                rotation="0 0 -90"
                position={`${ARM_LENGTH / 2} 0 0`}
            />
            {/* Trục Y — xanh lá */}
            <Entity
                axis-handle="axis: y; color: #22c55e"
                geometry={`primitive: cylinder; radius: 0.035; height: ${ARM_LENGTH}`}
                material="shader: flat"
                position={`0 ${ARM_LENGTH / 2} 0`}
            />
            {/* Trục Z — xanh dương */}
            <Entity
                axis-handle="axis: z; color: #3b82f6"
                geometry={`primitive: cylinder; radius: 0.035; height: ${ARM_LENGTH}`}
                material="shader: flat"
                rotation="90 0 0"
                position={`0 0 ${ARM_LENGTH / 2}`}
            />
        </Entity>
    );
});

function AssetEntity({
    asset,
    isSelected,
    onSelect,
    onDragPosition,
    onDragStart,
    onDragEnd,
    isDragging,
    onScale,
    onBeforeChange,
}: {
    asset: Asset;
    isSelected: boolean;
    onSelect: () => void;
    onDragPosition: (position: { x: number; y: number; z: number }) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    isDragging: boolean;
    onScale: (scale: { x: number; y: number; z: number }) => void;
    onBeforeChange: () => void;
}) {
    const isVideo = isVideoAsset(asset.fileType, asset.filename);
    const isImage = isImageAsset(asset.fileType, asset.filename);
    const transform = asset.transform ?? DEFAULT_SPATIAL_CONFIG;
    const videoElId = `ar-video-src-${asset.id}`;
    // Luôn gọi hook (tuân thủ rules-of-hooks) — với asset không phải video thì
    // videoElId trỏ tới 1 <video> không tồn tại, hook chỉ đứng yên ở 'loading'
    // và giá trị đó không được dùng ở nhánh render bên dưới.
    const videoStatus = useVideoReadyState(videoElId, asset.url);

    // Giữ chiều rộng cố định 1.6 (đơn vị scene) và suy ra chiều cao theo đúng tỉ lệ
    // khung hình gốc của ảnh (width/height tính bằng px, lưu lúc upload) — nếu không
    // có dữ liệu này (asset cũ / không đọc được), fallback về hình vuông 1.6x1.6 như cũ.
    const IMAGE_PLANE_WIDTH = 1.6;
    const imagePlaneHeight =
        asset.width && asset.height
            ? IMAGE_PLANE_WIDTH * (asset.height / asset.width)
            : IMAGE_PLANE_WIDTH;

    const entityProps: any = {
        position: vectorToString(transform.position),
        rotation: vectorToString(transform.rotation),
        scale: vectorToString(transform.scale),
        'draggable-object': '',
        'data-selected': isSelected ? 'true' : 'false',
        events: {
            click: (e: any) => {
                // Cursor component của A-Frame bắn 'click' bất kể nút chuột nào (kể cả phải/giữa) —
                // chỉ nhận click THẬT từ chuột trái (hoặc chạm, không có mouseEvent) để chọn asset;
                // chuột phải chỉ dùng để xoay camera, không được phép chọn/ảnh hưởng gì tới asset.
                const button = e.detail?.mouseEvent?.button;
                if (typeof button === 'number' && button !== 0) return;
                onSelect();
            },
            dragstart: () => {
                // Chọn asset ngay khi bắt đầu kéo, không chờ sự kiện 'click' lúc buông chuột —
                // A-Frame chỉ bắn 'click' nếu entity bị raycaster trỏ tới lúc buông TRÙNG với
                // lúc nhấn; khi kéo, model giữ nguyên độ lệch so với điểm nắm ban đầu nên con trỏ
                // rất dễ không còn nằm đúng trên model lúc buông tay -> 'click' không bắn -> asset
                // không được chọn, vòng tròn bị "kẹt" ở asset đã chọn trước đó.
                onSelect();
                onDragStart();
                onBeforeChange(); // chốt snapshot undo TRƯỚC khi vị trí bắt đầu thay đổi
            },
            dragposition: (e: any) => onDragPosition(e.detail),
            dragend: onDragEnd,
            scalestart: onBeforeChange, // trước đây 'scalestart' hoàn toàn chưa được lắng nghe ở đây
            scalevalue: (e: any) => onScale(e.detail),
        }
    };

    return (
        <Entity {...entityProps}>
            {isVideo && videoStatus === 'ready' && (
                <Entity primitive="a-video" src={`#${videoElId}`} width="1.6" height="0.9" material="side: double" />
            )}
            {isVideo && videoStatus === 'loading' && (
                // Placeholder trung tính trong lúc video chưa có frame thật — thay cho
                // việc để lộ THREE.VideoTexture rỗng (hiện ra màu cyan).
                <Entity
                    primitive="a-plane"
                    width="1.6"
                    height="0.9"
                    material="color: #1f2937; shader: flat; side: double; opacity: 0.85"
                />
            )}
            {isVideo && videoStatus === 'error' && (
                // Video tải lỗi (ví dụ CORS/URL hỏng) — báo rõ bằng màu đỏ thay vì
                // im lặng đứng yên ở trạng thái loading hoặc lộ ra màu cyan.
                <Entity
                    primitive="a-plane"
                    width="1.6"
                    height="0.9"
                    material="color: #7f1d1d; shader: flat; side: double; opacity: 0.85"
                />
            )}
            {isImage && (
                <Entity primitive="a-image" src={asset.url} width={String(IMAGE_PLANE_WIDTH)} height={String(imagePlaneHeight)} material="side: double" />
            )}
            {!isVideo && !isImage && <Entity primitive="a-gltf-model" src={asset.url} />}

            {isSelected && (
                <>
                    {/* Vòng tròn chỉ báo đang chọn (không dùng để kéo xoay nữa — xoay dùng
                        ô số bên Inspector sidebar cho cả 3 trục, chính xác và gọn hơn). */}
                    <Entity
                        geometry="primitive: ring; radiusInner: 0.85; radiusOuter: 0.9"
                        material={`color: ${isDragging ? '#f59e0b' : '#3b82f6'}; shader: flat; side: double`}
                        rotation="-90 0 0"
                    />
                    {/* Chấm nhỏ ở rìa — kéo ra xa/gần tâm để scale đều 3 trục. */}
                    <Entity
                        scale-handle=""
                        geometry="primitive: sphere; radius: 0.06"
                        material="color: #fbbf24; shader: flat"
                        position="0.9 0 0"
                    />
                </>
            )}
        </Entity>
    );
}

export function ArScene({ assets, activeAssetId, onSelectAsset, onDragAsset, onScaleAsset, onBeforeTransformChange }: ArSceneProps) {
    const videoAssets = assets.filter((a) => isVideoAsset(a.fileType, a.filename));
    const [draggingId, setDraggingId] = useState<string | null>(null);

    return (
        <a-scene
            embedded
            className="w-full h-full"
            vr-mode-ui="enabled: false"
            cursor="rayOrigin: mouse"
            // Tắt loading-screen mặc định của A-Frame (nền #24CAFF, tiêu đề lấy từ
            // document.title, 3 chấm trắng — chính là "màn hình loading màu cyan").
            // App đã có loading UI riêng ở ArViewport.tsx (spinner "Rendering A-Frame
            // Graphics Engine..." + trạng thái "AR Preview Sandbox"), nên không cần
            // lớp loading-screen thứ 2 của A-Frame — vốn còn hay bị kẹt/tắt trễ vì
            // <a-assets> ở đây có <video> được React render ĐỘNG, khiến A-Frame đếm
            // tiến trình tải asset không khớp thời điểm.
            loading-screen="enabled: false"
            onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
        >
            {/* <a-assets> phải là con TRỰC TIẾP của <a-scene>, không bọc div ngoài.
          A-Frame tự ẩn nó, không cần display:none thủ công. */}
            <a-assets>
                {videoAssets.map((asset) => (
                    <video
                        key={asset.id}
                        id={`ar-video-src-${asset.id}`}
                        src={asset.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        crossOrigin="anonymous"
                    />
                ))}
            </a-assets>

            {/* Environment & Floor */}
            <Entity primitive="a-plane" position="0 0 0" rotation="-90 0 0" width="30" height="30" color="#2c3e50" opacity="0.3" />
            <Entity primitive="a-sky" color="#0d0e12" />

            {/* Lights */}
            <Entity light="type: ambient; color: #BBB" />
            <Entity light="type: directional; color: #FFF; intensity: 0.6" position="-0.5 1 1" />

            {/* Render TẤT CẢ assets cùng lúc, mỗi cái với transform riêng */}
            {assets.map((asset) => {
                const isSelected = asset.id === activeAssetId;
                const transform = asset.transform ?? DEFAULT_SPATIAL_CONFIG;
                return (
                    <Fragment key={asset.id}>
                        <AssetEntity
                            asset={asset}
                            isSelected={isSelected}
                            onSelect={() => onSelectAsset(asset.id)}
                            onDragPosition={(pos) => onDragAsset(asset.id, pos)}
                            onDragStart={() => setDraggingId(asset.id)}
                            onDragEnd={() => setDraggingId(null)}
                            isDragging={asset.id === draggingId}
                            onScale={(scale) => onScaleAsset(asset.id, scale)}
                            onBeforeChange={onBeforeTransformChange}
                        />
                        {isSelected && (
                            <AxisGizmo
                                position={transform.position}
                                onDrag={(pos) => onDragAsset(asset.id, pos)}
                                onBeforeChange={onBeforeTransformChange}
                            />
                        )}
                    </Fragment>
                );
            })}

            {/* Grid indicator to help align */}
            <Entity position="0 0.01 0" rotation="90 0 0" className="grid-helper">
                <Entity primitive="a-plane" width="10" height="10" color="#ffffff" opacity="0.05" material="wireframe: true" />
            </Entity>

            {/* Camera controls */}
            <CameraRig />
        </a-scene>
    );
}