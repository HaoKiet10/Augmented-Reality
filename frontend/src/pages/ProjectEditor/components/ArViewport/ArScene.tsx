import { useState, useRef, useEffect, memo, Fragment } from 'react';
import { Entity } from 'aframe-react';
import type { Asset } from '../../types';
import { isImageAsset, isVideoAsset } from '../../utils/assetType';
import { DEFAULT_SPATIAL_CONFIG, MARKER_PLANE_WIDTH } from '../../constants';

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
    // Tỉ lệ khung hình THẬT của video (width/height) — mobile cũng dùng tỉ lệ thật, nên editor
    // không được ép 16:9 cố định nữa. Fallback 16/9 cho tới khi đọc được kích thước.
    const [aspect, setAspect] = useState(16 / 9);
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
        const readAspect = () => {
            if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                setAspect(videoEl.videoWidth / videoEl.videoHeight);
            }
        };

        if (videoEl.readyState >= 2) {
            readAspect();
            setStatus('ready');
            return;
        }

        const handleLoadedData = () => {
            readAspect();
            setStatus('ready');
        };
        const handleError = () => setStatus('error');

        videoEl.addEventListener('loadeddata', handleLoadedData);
        videoEl.addEventListener('error', handleError);

        return () => {
            videoEl.removeEventListener('loadeddata', handleLoadedData);
            videoEl.removeEventListener('error', handleError);
        };
    }, [videoElId, assetUrl]);

    return { status, aspect };
}

/** Tỉ lệ khung hình (width/height) của 1 ảnh theo URL — dùng cho mặt phẳng ảnh trigger. */
function useImageAspect(url: string | null) {
    const [aspect, setAspect] = useState<number | null>(null);
    useEffect(() => {
        setAspect(null);
        if (!url) return;
        let cancelled = false;
        const img = new Image();
        img.onload = () => {
            if (!cancelled && img.naturalWidth > 0 && img.naturalHeight > 0) {
                setAspect(img.naturalWidth / img.naturalHeight);
            }
        };
        img.src = url;
        return () => {
            cancelled = true;
        };
    }, [url]);
    return aspect;
}

interface ArSceneProps {
    triggerImageUrl: string | null;
    assets: Asset[];
    activeAssetId: string | null;
    onSelectAsset: (assetId: string) => void;
    onDragAsset: (assetId: string, position: { x: number; y: number; z: number }) => void;
    onScaleAsset: (assetId: string, scale: { x: number; y: number; z: number }) => void;
    onRotateAsset: (assetId: string, rotation: { x: number; y: number; z: number }) => void;
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
 * Camera mặc định đứng trước ảnh trigger (gốc toạ độ), nhìn thẳng vào tâm ảnh.
 */
const CameraRig = memo(function CameraRig() {
    return (
        <Entity
            primitive="a-camera"
            position="0 0.3 2.4"
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
                data-selectable=""
                geometry={`primitive: cylinder; radius: 0.035; height: ${ARM_LENGTH}`}
                material="shader: flat"
                rotation="0 0 -90"
                position={`${ARM_LENGTH / 2} 0 0`}
            />
            {/* Trục Y — xanh lá */}
            <Entity
                axis-handle="axis: y; color: #22c55e"
                data-selectable=""
                geometry={`primitive: cylinder; radius: 0.035; height: ${ARM_LENGTH}`}
                material="shader: flat"
                position={`0 ${ARM_LENGTH / 2} 0`}
            />
            {/* Trục Z — xanh dương */}
            <Entity
                axis-handle="axis: z; color: #3b82f6"
                data-selectable=""
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
    onBeforeChange,
    onScale,
    onRotate,
}: {
    asset: Asset;
    isSelected: boolean;
    onSelect: () => void;
    onDragPosition: (position: { x: number; y: number; z: number }) => void;
    onBeforeChange: () => void;
    onScale: (scale: { x: number; y: number; z: number }) => void;
    onRotate: (rotation: { x: number; y: number; z: number }) => void;
}) {
    const isVideo = isVideoAsset(asset.fileType, asset.filename);
    const isImage = isImageAsset(asset.fileType, asset.filename);
    const transform = asset.transform ?? DEFAULT_SPATIAL_CONFIG;
    const videoElId = `ar-video-src-${asset.id}`;
    // Luôn gọi hook (tuân thủ rules-of-hooks) — với asset không phải video thì
    // videoElId trỏ tới 1 <video> không tồn tại, hook chỉ đứng yên ở 'loading'
    // và giá trị đó không được dùng ở nhánh render bên dưới.
    const { status: videoStatus, aspect: videoAspect } = useVideoReadyState(videoElId, asset.url);

    // Bề rộng mặt phẳng = MARKER_PLANE_WIDTH (1 đơn vị = 100% bề rộng ảnh trigger) — scale 1 nghĩa là
    // rộng bằng ảnh trigger, đúng quy ước README. Giữ chiều rộng cố định (đơn vị scene) và suy ra chiều cao theo đúng tỉ lệ
    // khung hình gốc của ảnh (width/height tính bằng px, lưu lúc upload) — nếu không
    // có dữ liệu này (asset cũ / không đọc được), fallback về hình vuông 1.6x1.6 như cũ.
    const IMAGE_PLANE_WIDTH = MARKER_PLANE_WIDTH;
    const videoPlaneHeight = MARKER_PLANE_WIDTH / videoAspect;
    const imagePlaneHeight =
        asset.width && asset.height
            ? IMAGE_PLANE_WIDTH * (asset.height / asset.width)
            : IMAGE_PLANE_WIDTH;

    const entityProps: any = {
        position: vectorToString(transform.position),
        rotation: vectorToString(transform.rotation),
        scale: vectorToString(transform.scale),
        'draggable-object': '',
        'rotatable-object': '', // chuột giữa + kéo = xoay asset (xem useAframeScript.ts)
        'data-selectable': '', // whitelist cho raycaster của cursor — xem cấu hình ở <Scene>
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
                onBeforeChange(); // chốt snapshot undo TRƯỚC khi vị trí bắt đầu thay đổi
            },
            dragposition: (e: any) => onDragPosition(e.detail),
            scalestart: onBeforeChange, // trước đây 'scalestart' hoàn toàn chưa được lắng nghe ở đây
            scalevalue: (e: any) => onScale(e.detail),
            rotatestart: () => {
                // Cùng logic với dragstart: chọn asset + chốt snapshot undo ngay khi bắt đầu
                // xoay bằng chuột giữa, trước khi rotation thật sự thay đổi.
                onSelect();
                onBeforeChange();
            },
            rotatevalue: (e: any) => onRotate(e.detail),
        }
    };

    return (
        <Entity {...entityProps}>
            {isVideo && videoStatus === 'ready' && (
                <Entity primitive="a-video" data-selectable="" src={`#${videoElId}`} width={String(MARKER_PLANE_WIDTH)} height={String(videoPlaneHeight)} material="side: double" />
            )}
            {isVideo && videoStatus === 'loading' && (
                // Placeholder trung tính trong lúc video chưa có frame thật — thay cho
                // việc để lộ THREE.VideoTexture rỗng (hiện ra màu cyan). Vẫn cần
                // data-selectable để không bị "mất" khả năng bấm/kéo asset trong lúc
                // đang chờ video tải (raycaster chỉ bắt entity có mesh + data-selectable).
                <Entity
                    primitive="a-plane"
                    data-selectable=""
                    width={String(MARKER_PLANE_WIDTH)}
                    height={String(videoPlaneHeight)}
                    material="color: #1f2937; shader: flat; side: double; opacity: 0.85"
                />
            )}
            {isVideo && videoStatus === 'error' && (
                // Video tải lỗi (ví dụ CORS/URL hỏng) — báo rõ bằng màu đỏ thay vì
                // im lặng đứng yên ở trạng thái loading hoặc lộ ra màu cyan.
                <Entity
                    primitive="a-plane"
                    data-selectable=""
                    width={String(MARKER_PLANE_WIDTH)}
                    height={String(videoPlaneHeight)}
                    material="color: #7f1d1d; shader: flat; side: double; opacity: 0.85"
                />
            )}
            {isImage && (
                <Entity primitive="a-image" data-selectable="" src={asset.url} width={String(IMAGE_PLANE_WIDTH)} height={String(imagePlaneHeight)} material="side: double" />
            )}
            {!isVideo && !isImage && <Entity primitive="a-gltf-model" data-selectable="" src={asset.url} />}

            {isSelected && (
                // Chấm nhỏ ở rìa — kéo ra xa/gần tâm để scale đều 3 trục. (Vòng tròn chỉ báo
                // chọn trước đây đã bỏ — giờ chuột giữa dùng để xoay asset, xem 'rotatable-object'.)
                <Entity
                    scale-handle=""
                    data-selectable=""
                    geometry="primitive: sphere; radius: 0.035"
                    material="color: #fbbf24; shader: flat"
                    position="0.6 0 0"
                />
            )}
        </Entity>
    );
}

export function ArScene({ triggerImageUrl, assets, activeAssetId, onSelectAsset, onDragAsset, onScaleAsset, onRotateAsset, onBeforeTransformChange }: ArSceneProps) {
    const videoAssets = assets.filter((a) => isVideoAsset(a.fileType, a.filename));
    const sceneRef = useRef<any>(null);
    const triggerAspect = useImageAspect(triggerImageUrl);
    const triggerHeight = MARKER_PLANE_WIDTH / (triggerAspect ?? 1);

    // A-Frame chỉ tự tính lại kích thước canvas + aspect ratio camera khi bắt được sự kiện
    // 'resize' của WINDOW (xem AFRAME.utils.device / core resize system) — nó KHÔNG theo dõi
    // kích thước của chính container cha. Khi 2 sidebar 2 bên (AssetSidebar/InspectorSidebar)
    // collapse/expand, main viewport đổi kích thước qua CSS transition (flex-1 + width transition
    // của sidebar) mà không có window resize nào bắn ra -> canvas WebGL giữ nguyên độ phân giải
    // cũ rồi bị trình duyệt kéo giãn theo khung CSS mới => hình bị méo/dãn trong lúc animation
    // và cả sau khi animation xong. Dùng ResizeObserver theo dõi trực tiếp <a-scene> (nó tự lấp
    // đầy container nhờ class w-full h-full) và gọi sceneEl.resize() mỗi khi kích thước thay đổi
    // (kể cả các frame giữa lúc transition) để canvas luôn khớp với kích thước CSS thực tế.
    useEffect(() => {
        const sceneEl = sceneRef.current;
        if (!sceneEl) return;

        const triggerResize = () => {
            if (typeof sceneEl.resize === 'function') {
                sceneEl.resize();
            }
        };

        const observer = new ResizeObserver(triggerResize);
        observer.observe(sceneEl);

        // Scene có thể chưa init xong (chưa gắn renderer) ngay lúc mount -> đợi 'loaded'
        // rồi resize 1 lần cho chắc, phòng trường hợp kích thước ban đầu bị lệch.
        sceneEl.addEventListener('loaded', triggerResize);

        return () => {
            observer.disconnect();
            sceneEl.removeEventListener('loaded', triggerResize);
        };
    }, []);

    return (
        <a-scene
            ref={sceneRef}
            embedded
            className="w-full h-full"
            vr-mode-ui="enabled: false"
            cursor="rayOrigin: mouse"
            // Chỉ test giao cắt với các entity thật sự cần bắt tương tác (asset, scale-handle,
            // axis-handle — xem 'data-selectable' rải rác trong file này). Mặc định raycaster
            // test với TOÀN BỘ entity trong scene mỗi frame (kể cả floor/sky/grid-helper không
            // ai click được) — đây chính là nguồn gốc warning lặp lại nhiều lần trong console:
            // "[raycaster] For performance, please define raycaster.objects...".
            raycaster="objects: [data-selectable]"
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

            {/* Mặt phẳng ảnh trigger = hệ toạ độ tham chiếu của designer: tâm ở gốc (0,0,0), rộng đúng
                1 đơn vị, đứng thẳng (mặt XY). KHÔNG có data-selectable nên không bị raycaster bắt /
                kéo nhầm. Bán trong suốt để vẫn nhìn thấy asset đặt sát/đè lên nó. */}
            {triggerImageUrl ? (
                <Entity
                    primitive="a-image"
                    src={triggerImageUrl}
                    width={String(MARKER_PLANE_WIDTH)}
                    height={String(triggerHeight)}
                    position="0 0 0"
                    material="side: double; transparent: true; opacity: 0.6"
                />
            ) : (
                <Entity
                    primitive="a-plane"
                    width={String(MARKER_PLANE_WIDTH)}
                    height={String(MARKER_PLANE_WIDTH)}
                    position="0 0 0"
                    material="color: #334155; shader: flat; side: double; transparent: true; opacity: 0.5"
                />
            )}
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
                            onScale={(scale) => onScaleAsset(asset.id, scale)}
                            onRotate={(rotation) => onRotateAsset(asset.id, rotation)}
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

            {/* Camera controls */}
            <CameraRig />
        </a-scene>
    );
}