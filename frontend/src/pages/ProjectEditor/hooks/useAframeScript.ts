import { useEffect, useState } from 'react';
import { isTypingInField } from '../utils/keyboard';

/**
 * A-Frame không có type definitions chính thức, nên `el`/`sceneEl`/`data`/tham số event của
 * THREE.js vẫn phải để `any` — không có gì để type chính xác hơn nếu không tự cài @types/aframe
 * (vốn không đầy đủ/không còn maintain tốt). 4 interface dưới đây CHỈ type phần STATE riêng mà
 * mỗi component tự gắn thêm vào `this` (`this.keys`, `this.isDragging`...) — trước đây toàn bộ
 * đều là `this: any`, nghĩa là gõ nhầm tên property (vd. `this.lastKeyTme` thay vì
 * `this.lastKeyTime`) chỉ lộ ra lúc CHẠY (hoặc không lộ ra luôn, chỉ lặng lẽ không hoạt động đúng)
 * thay vì bị TypeScript bắt ngay lúc build. Cũng có thêm autocomplete khi sửa code sau này.
 */
interface DraggableObjectState {
    el: any;
    isDragging: boolean;
    plane: any;
    raycaster: any;
    mouse: any;
    intersection: any;
    offset: any;
    onMouseDown: (evt: any) => void;
    onMouseMove: (evt: any) => void;
    onMouseUp: (evt: any) => void;
}

interface ScaleHandleState {
    el: any;
    isDragging: boolean;
    startDistance: number;
    startScale: number;
    onMouseDown: (evt: any) => void;
    onMouseMove: (evt: any) => void;
    onMouseUp: (evt: any) => void;
    getScreenCenter: (camera: any, rect: DOMRect) => { x: number; y: number };
}

interface RotatableObjectState {
    el: any;
    isDragging: boolean;
    lastX: number;
    lastY: number;
    currentRotation: { x: number; y: number; z: number };
    onMouseDown: (evt: any) => void;
    onMouseMove: (evt: any) => void;
    onMouseUp: (evt: any) => void;
}

interface AxisHandleState {
    el: any;
    data: { axis: 'x' | 'y' | 'z'; color: string };
    isDragging: boolean;
    isHovered: boolean;
    plane: any;
    raycaster: any;
    mouse: any;
    intersection: any;
    axisDir: any;
    startObjectPos: any;
    startProjection: number;
    onMouseDown: (evt: any) => void;
    onMouseMove: (evt: any) => void;
    onMouseUp: (evt: any) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    updateVisual: () => void;
}

interface FreeFlyControlsState {
    el: any;
    data: { speed: number; enabled: boolean };
    keys: Record<string, boolean>;
    lastKeyTime: Record<string, number>;
    pitch: number;
    yaw: number;
    isRotating: boolean;
    lastX: number;
    lastY: number;
    onKeyDown: (e: KeyboardEvent) => void;
    onKeyUp: (e: KeyboardEvent) => void;
    onBlur: () => void;
    onComposition: () => void;
    onMouseDown: (evt: MouseEvent) => void;
    onMouseMove: (evt: MouseEvent) => void;
    onMouseUp: (evt: MouseEvent) => void;
    onWheel: (evt: WheelEvent) => void;
    onContextMenu: (evt: Event) => void;
    focusOnSelected: () => void;
}

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
            const AFRAME = (window as any).AFRAME;
            if (AFRAME) {
                const THREE = AFRAME.THREE;
                if (!AFRAME.components['draggable-object']) {
                    AFRAME.registerComponent('draggable-object', {
                        init: function (this: DraggableObjectState) {
                            this.isDragging = false;
                            this.plane = new THREE.Plane();
                            this.raycaster = new THREE.Raycaster();
                            this.mouse = new THREE.Vector2();
                            this.intersection = new THREE.Vector3();
                            this.offset = new THREE.Vector3();

                            this.onMouseDown = this.onMouseDown.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.onMouseUp = this.onMouseUp.bind(this);

                            this.el.addEventListener('mousedown', this.onMouseDown);
                        },
                        onMouseDown: function (this: DraggableObjectState, evt: any) {
                            const originalEvent = evt.detail.mouseEvent || evt.detail.touchEvent || evt;

                            // Chỉ chuột TRÁI mới kéo được asset. Chuột phải/giữa hoàn toàn thuộc về
                            // điều khiển camera, không đụng gì asset (xem free-fly-controls).
                            if (typeof originalEvent.button === 'number' && originalEvent.button !== 0) return;

                            const camera = this.el.sceneEl.camera;
                            if (!camera) return;

                            // Get plane normal facing the camera
                            const cameraDirection = new THREE.Vector3();
                            camera.getWorldDirection(cameraDirection);
                            const planeNormal = cameraDirection.clone().negate();

                            // Get current world position of the object
                            const objectPosition = new THREE.Vector3();
                            this.el.object3D.getWorldPosition(objectPosition);

                            // Set the plane passing through the object position
                            this.plane.setFromNormalAndCoplanarPoint(planeNormal, objectPosition);

                            const clientX = originalEvent.touches ? originalEvent.touches[0].clientX : originalEvent.clientX;
                            const clientY = originalEvent.touches ? originalEvent.touches[0].clientY : originalEvent.clientY;

                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

                            this.raycaster.setFromCamera(this.mouse, camera);
                            const downHit = this.raycaster.ray.intersectPlane(this.plane, this.intersection);
                            if (!downHit) {
                                // Tia chuột không cắt mặt phẳng kéo (VD: camera vừa bay/quay lệch hướng) —
                                // bỏ qua thao tác kéo lần này thay vì dùng `intersection` cũ (stale) làm offset,
                                // vốn là nguyên nhân chính khiến model nhảy sang vị trí rác khi bắt đầu kéo.
                                return;
                            }

                            this.isDragging = true;
                            this.el.emit('dragstart');
                            evt.stopPropagation();

                            // Offset between object position and mouse intersection point
                            this.offset.copy(objectPosition).sub(this.intersection);

                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('touchmove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                            window.addEventListener('touchend', this.onMouseUp);
                        },
                        onMouseMove: function (this: DraggableObjectState, evt: any) {
                            if (!this.isDragging) return;

                            const camera = this.el.sceneEl.camera;
                            if (!camera) return;

                            // Tính lại mặt phẳng kéo mỗi lần rê chuột, bám theo vị trí HIỆN TẠI của
                            // object và hướng camera HIỆN TẠI — thay vì giữ nguyên từ lúc mousedown.
                            // Vì chỉ tính lại khi có sự kiện 'mousemove' THẬT (không chạy theo tick mỗi
                            // frame), nên lúc chỉ bay (WASD) mà không đụng chuột thì hoàn toàn không có
                            // gì được tính lại -> object đứng yên tuyệt đối, không bị trôi theo camera.
                            // Đánh đổi: nếu bay xa rồi mới rê chuột, object có thể "nhảy" một cái tới
                            // đúng điểm chiếu mới của con trỏ (chấp nhận được, ưu tiên không bị trôi).
                            const currentObjectPos = new THREE.Vector3();
                            this.el.object3D.getWorldPosition(currentObjectPos);
                            const cameraDirection = new THREE.Vector3();
                            camera.getWorldDirection(cameraDirection);
                            const planeNormal = cameraDirection.clone().negate();
                            this.plane.setFromNormalAndCoplanarPoint(planeNormal, currentObjectPos);

                            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
                            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

                            this.raycaster.setFromCamera(this.mouse, camera);
                            const moveHit = this.raycaster.ray.intersectPlane(this.plane, this.intersection);
                            if (!moveHit) {
                                // Không có giao điểm hợp lệ ở frame này (tia chuột đang hướng ra sau
                                // mặt phẳng kéo) — bỏ qua, giữ nguyên vị trí hiện tại thay vì dùng
                                // `intersection` của frame trước đó (stale) làm model nhảy vị trí.
                                return;
                            }

                            const newPos = this.intersection.clone().add(this.offset);

                            // Round values to 2 decimal places to prevent coordinate jitter
                            const roundedPos = {
                                x: Math.round(newPos.x * 100) / 100,
                                y: Math.round(newPos.y * 100) / 100,
                                z: Math.round(newPos.z * 100) / 100
                            };

                            // Update position attributes
                            this.el.setAttribute('position', roundedPos);
                            this.el.emit('dragposition', roundedPos);
                        },
                        onMouseUp: function (this: DraggableObjectState) {
                            if (this.isDragging) {
                                this.isDragging = false;
                                this.el.emit('dragend');

                                window.removeEventListener('mousemove', this.onMouseMove);
                                window.removeEventListener('touchmove', this.onMouseMove);
                                window.removeEventListener('mouseup', this.onMouseUp);
                                window.removeEventListener('touchend', this.onMouseUp);
                            }
                        },
                        remove: function (this: DraggableObjectState) {
                            this.el.removeEventListener('mousedown', this.onMouseDown);
                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('touchmove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                            window.removeEventListener('touchend', this.onMouseUp);
                        }
                    });
                }

                if (!AFRAME.components['scale-handle']) {
                    AFRAME.registerComponent('scale-handle', {
                        init: function (this: ScaleHandleState) {
                            this.isDragging = false;
                            this.onMouseDown = this.onMouseDown.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.onMouseUp = this.onMouseUp.bind(this);
                            this.el.addEventListener('mousedown', this.onMouseDown);
                        },
                        getScreenCenter: function (this: ScaleHandleState, camera: any, rect: DOMRect) {
                            const worldPos = new THREE.Vector3();
                            this.el.parentEl.object3D.getWorldPosition(worldPos);
                            const ndc = worldPos.project(camera);
                            return {
                                x: ((ndc.x + 1) / 2) * rect.width + rect.left,
                                y: ((1 - ndc.y) / 2) * rect.height + rect.top,
                            };
                        },
                        onMouseDown: function (this: ScaleHandleState, evt: any) {
                            const originalEvent = evt.detail.mouseEvent || evt.detail.touchEvent || evt;
                            if (typeof originalEvent.button === 'number' && originalEvent.button !== 0) return;

                            const camera = this.el.sceneEl.camera;
                            const parentEl = this.el.parentEl;
                            if (!camera || !parentEl) return;

                            const clientX = originalEvent.touches ? originalEvent.touches[0].clientX : originalEvent.clientX;
                            const clientY = originalEvent.touches ? originalEvent.touches[0].clientY : originalEvent.clientY;
                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            const center = this.getScreenCenter(camera, rect);

                            const dist = Math.hypot(clientX - center.x, clientY - center.y);
                            if (dist < 1) return; // click gần trúng tâm, tránh chia cho ~0

                            this.isDragging = true;
                            this.el.emit('scalestart');
                            evt.stopPropagation();

                            this.startDistance = dist;
                            const currentScale = parentEl.getAttribute('scale') || { x: 1, y: 1, z: 1 };
                            this.startScale = currentScale.x;

                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('touchmove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                            window.addEventListener('touchend', this.onMouseUp);
                        },
                        onMouseMove: function (this: ScaleHandleState, evt: any) {
                            if (!this.isDragging) return;
                            const camera = this.el.sceneEl.camera;
                            const parentEl = this.el.parentEl;
                            if (!camera || !parentEl) return;

                            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
                            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            const center = this.getScreenCenter(camera, rect);

                            const dist = Math.hypot(clientX - center.x, clientY - center.y);
                            const ratio = dist / this.startDistance;
                            const MIN_SCALE = 0.1;
                            const MAX_SCALE = 10;
                            const newScale = Math.round(
                                Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.startScale * ratio)) * 100
                            ) / 100;
                            const nextScale = { x: newScale, y: newScale, z: newScale };

                            parentEl.setAttribute('scale', nextScale);
                            parentEl.emit('scalevalue', nextScale);
                        },
                        onMouseUp: function (this: ScaleHandleState) {
                            if (!this.isDragging) return;
                            this.isDragging = false;
                            this.el.emit('scaleend');

                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('touchmove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                            window.removeEventListener('touchend', this.onMouseUp);
                        },
                        remove: function (this: ScaleHandleState) {
                            this.el.removeEventListener('mousedown', this.onMouseDown);
                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('touchmove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                            window.removeEventListener('touchend', this.onMouseUp);
                        }
                    });
                }

                if (!AFRAME.components['rotatable-object']) {
                    // Chuột GIỮA + kéo = xoay asset đang trỏ tới (trước đây chuột giữa hoàn toàn
                    // không có chức năng gì — xem free-fly-controls.onMouseDown). Trái vẫn dành
                    // riêng cho kéo di chuyển (draggable-object), phải vẫn dành cho xoay camera.
                    // Giữ thêm Shift trong lúc xoay = snap góc về bội số 45° (xem onMouseMove).
                    AFRAME.registerComponent('rotatable-object', {
                        init: function (this: RotatableObjectState) {
                            this.isDragging = false;
                            this.lastX = 0;
                            this.lastY = 0;
                            this.currentRotation = { x: 0, y: 0, z: 0 };

                            this.onMouseDown = this.onMouseDown.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.onMouseUp = this.onMouseUp.bind(this);

                            this.el.addEventListener('mousedown', this.onMouseDown);
                        },
                        onMouseDown: function (this: RotatableObjectState, evt: any) {
                            const originalEvent = evt.detail.mouseEvent || evt.detail.touchEvent || evt;

                            // Chỉ nhận chuột GIỮA (button === 1). Chạm tay (touchEvent, không có
                            // `button`) không kích hoạt xoay kiểu này — để tránh xung đột với kéo
                            // 1 ngón (di chuyển) vốn đã chiếm chỗ đó trên thiết bị cảm ứng.
                            if (originalEvent.button !== 1) return;

                            // Chặn hành vi mặc định của trình duyệt khi nhấn chuột giữa (icon
                            // auto-scroll trên Windows/Linux) — nếu không chặn, vừa xoay asset vừa
                            // bật auto-scroll cùng lúc, rất khó chịu.
                            originalEvent.preventDefault?.();

                            this.lastX = originalEvent.clientX;
                            this.lastY = originalEvent.clientY;

                            // Đọc rotation hiện tại làm điểm xuất phát — cộng dồn lên đây mỗi lần
                            // rê chuột (xem onMouseMove), không phải giá trị cố định của lúc mousedown.
                            const rotationAttr = this.el.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                            this.currentRotation = { x: rotationAttr.x, y: rotationAttr.y, z: rotationAttr.z };

                            this.isDragging = true;
                            this.el.emit('rotatestart');
                            evt.stopPropagation();

                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                        },
                        onMouseMove: function (this: RotatableObjectState, evt: any) {
                            if (!this.isDragging) return;

                            const dx = evt.clientX - this.lastX;
                            const dy = evt.clientY - this.lastY;
                            this.lastX = evt.clientX;
                            this.lastY = evt.clientY;

                            // Kéo ngang -> xoay quanh trục Y (yaw), kéo dọc -> xoay quanh trục X
                            // (pitch) — cùng cảm giác với free-fly-controls xoay camera bằng chuột
                            // phải, chỉ khác đối tượng bị xoay. Cộng dồn trực tiếp lên góc hiện tại
                            // (không giới hạn khoảng) để có thể xoay tự do nhiều vòng. Cộng lên giá
                            // trị GỐC (chưa làm tròn/snap) rồi mới làm tròn khi gửi đi, tránh sai số
                            // làm tròn dồn lại qua nhiều lần rê chuột liên tiếp.
                            const ROTATE_SENSITIVITY = 0.4;
                            this.currentRotation.y += dx * ROTATE_SENSITIVITY;
                            this.currentRotation.x += dy * ROTATE_SENSITIVITY;

                            // Giữ Shift = "hít" (snap) góc xoay về bội số của 45°. Snap chỉ áp dụng
                            // lên GIÁ TRỊ GỬI ĐI thôi — this.currentRotation vẫn giữ nguyên giá trị
                            // liên tục chưa snap ở phía sau, nên lúc thả Shift ra giữa chừng, asset
                            // xoay tiếp mượt mà từ đúng vị trí thật (không bị giật/nhảy do snap đã
                            // "ăn" mất phần lẻ trước đó).
                            const SNAP_STEP_DEG = 45;
                            const displayX = evt.shiftKey
                                ? Math.round(this.currentRotation.x / SNAP_STEP_DEG) * SNAP_STEP_DEG
                                : this.currentRotation.x;
                            const displayY = evt.shiftKey
                                ? Math.round(this.currentRotation.y / SNAP_STEP_DEG) * SNAP_STEP_DEG
                                : this.currentRotation.y;

                            const nextRotation = {
                                x: Math.round(displayX * 100) / 100,
                                y: Math.round(displayY * 100) / 100,
                                z: this.currentRotation.z,
                            };

                            this.el.setAttribute('rotation', nextRotation);
                            this.el.emit('rotatevalue', nextRotation);
                        },
                        onMouseUp: function (this: RotatableObjectState) {
                            if (!this.isDragging) return;
                            this.isDragging = false;
                            this.el.emit('rotateend');

                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                        },
                        remove: function (this: RotatableObjectState) {
                            this.el.removeEventListener('mousedown', this.onMouseDown);
                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                        }
                    });
                }

                if (!AFRAME.components['axis-handle']) {
                    AFRAME.registerComponent('axis-handle', {
                        schema: {
                            axis: { type: 'string', default: 'x' }, // 'x' | 'y' | 'z'
                            color: { type: 'color', default: '#ffffff' } // màu gốc — dùng để trả lại khi hết hover/kéo
                        },
                        init: function (this: AxisHandleState) {
                            this.isDragging = false;
                            this.isHovered = false;
                            this.plane = new THREE.Plane();
                            this.raycaster = new THREE.Raycaster();
                            this.mouse = new THREE.Vector2();
                            this.intersection = new THREE.Vector3();
                            this.axisDir = new THREE.Vector3();
                            this.startObjectPos = new THREE.Vector3();
                            this.startProjection = 0;

                            this.onMouseDown = this.onMouseDown.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.onMouseUp = this.onMouseUp.bind(this);
                            this.onMouseEnter = this.onMouseEnter.bind(this);
                            this.onMouseLeave = this.onMouseLeave.bind(this);

                            this.el.addEventListener('mousedown', this.onMouseDown);
                            // 'mouseenter'/'mouseleave' do component cursor của A-Frame tự bắn dựa theo
                            // raycaster trỏ tới entity nào — thuần theo vị trí con trỏ, không phụ thuộc
                            // nút chuột nào đang giữ, đúng nghĩa "hover".
                            this.el.addEventListener('mouseenter', this.onMouseEnter);
                            this.el.addEventListener('mouseleave', this.onMouseLeave);

                            this.updateVisual();
                        },
                        onMouseEnter: function (this: AxisHandleState) {
                            this.isHovered = true;
                            this.updateVisual();
                        },
                        onMouseLeave: function (this: AxisHandleState) {
                            this.isHovered = false;
                            this.updateVisual();
                        },
                        // Hover hoặc đang kéo: sáng màu vàng + phình to 1.4x cho dễ thấy đang chọn
                        // đúng trục nào. Nhả ra thì về màu gốc + kích thước bình thường.
                        updateVisual: function (this: AxisHandleState) {
                            const highlighted = this.isHovered || this.isDragging;
                            this.el.setAttribute('material', 'color', highlighted ? '#fde047' : this.data.color);
                            const s = highlighted ? 1.4 : 1;
                            this.el.setAttribute('scale', { x: s, y: s, z: s });
                        },
                        // Kéo dọc theo ĐÚNG 1 trục thế giới bằng cách: dựng 1 mặt phẳng quay mặt về
                        // camera đi qua vị trí object (y hệt draggable-object), lấy giao điểm tia
                        // chuột với mặt phẳng đó, rồi CHIẾU (dot product) độ lệch của giao điểm lên
                        // đúng vector trục đang kéo — bỏ qua hoàn toàn phần lệch vuông góc với trục.
                        // Nhờ vậy object chỉ trượt dọc theo 1 đường thẳng dù tay kéo không thật sự
                        // thẳng hàng với trục trên màn hình.
                        onMouseDown: function (this: AxisHandleState, evt: any) {
                            const originalEvent = evt.detail.mouseEvent || evt.detail.touchEvent || evt;
                            if (typeof originalEvent.button === 'number' && originalEvent.button !== 0) return;

                            const camera = this.el.sceneEl.camera;
                            const targetEl = this.el.parentEl; // wrapper gizmo — vị trí của nó = vị trí asset
                            if (!camera || !targetEl) return;

                            this.axisDir.set(
                                this.data.axis === 'x' ? 1 : 0,
                                this.data.axis === 'y' ? 1 : 0,
                                this.data.axis === 'z' ? 1 : 0
                            );

                            targetEl.object3D.getWorldPosition(this.startObjectPos);

                            const cameraDirection = new THREE.Vector3();
                            camera.getWorldDirection(cameraDirection);
                            this.plane.setFromNormalAndCoplanarPoint(cameraDirection.negate(), this.startObjectPos);

                            const clientX = originalEvent.touches ? originalEvent.touches[0].clientX : originalEvent.clientX;
                            const clientY = originalEvent.touches ? originalEvent.touches[0].clientY : originalEvent.clientY;
                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
                            this.raycaster.setFromCamera(this.mouse, camera);

                            const downHit = this.raycaster.ray.intersectPlane(this.plane, this.intersection);
                            if (!downHit) return;

                            this.startProjection = this.intersection.clone().sub(this.startObjectPos).dot(this.axisDir);

                            this.isDragging = true;
                            this.updateVisual();
                            this.el.emit('axisdragstart');
                            evt.stopPropagation();

                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('touchmove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                            window.addEventListener('touchend', this.onMouseUp);
                        },
                        onMouseMove: function (this: AxisHandleState, evt: any) {
                            if (!this.isDragging) return;
                            const camera = this.el.sceneEl.camera;
                            if (!camera) return;

                            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
                            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
                            this.raycaster.setFromCamera(this.mouse, camera);

                            const moveHit = this.raycaster.ray.intersectPlane(this.plane, this.intersection);
                            if (!moveHit) return;

                            const projection = this.intersection.clone().sub(this.startObjectPos).dot(this.axisDir);
                            const delta = projection - this.startProjection;
                            const newPos = this.startObjectPos.clone().add(this.axisDir.clone().multiplyScalar(delta));

                            const roundedPos = {
                                x: Math.round(newPos.x * 100) / 100,
                                y: Math.round(newPos.y * 100) / 100,
                                z: Math.round(newPos.z * 100) / 100
                            };

                            // Emit lên parentEl (wrapper gizmo) — React nghe ở đó để cập nhật state,
                            // xem AxisGizmo trong ArScene.tsx.
                            this.el.parentEl.emit('axisdragposition', roundedPos);
                        },
                        onMouseUp: function (this: AxisHandleState) {
                            if (!this.isDragging) return;
                            this.isDragging = false;
                            this.updateVisual();
                            this.el.emit('axisdragend');

                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('touchmove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                            window.removeEventListener('touchend', this.onMouseUp);
                        },
                        remove: function (this: AxisHandleState) {
                            this.el.removeEventListener('mousedown', this.onMouseDown);
                            this.el.removeEventListener('mouseenter', this.onMouseEnter);
                            this.el.removeEventListener('mouseleave', this.onMouseLeave);
                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('touchmove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                            window.removeEventListener('touchend', this.onMouseUp);
                        }
                    });
                }

                if (!AFRAME.components['free-fly-controls']) {
                    AFRAME.registerComponent('free-fly-controls', {
                        schema: {
                            speed: { type: 'number', default: 0.1 },
                            enabled: { type: 'boolean', default: true }
                        },
                        init: function (this: FreeFlyControlsState) {
                            this.keys = {};
                            // Mốc thời gian keydown (thật, có auto-repeat) gần nhất của từng phím —
                            // dùng để "watchdog" phát hiện phím bị kẹt true mãi mãi, xem chi tiết
                            // trong tick() và onCompositionStart/onCompositionEnd bên dưới.
                            this.lastKeyTime = {};

                            // Yaw/pitch (độ) — thay thế look-controls built-in của A-Frame.
                            // Khởi tạo từ rotation attribute hiện tại để không bị giật khi bắt đầu kéo.
                            const initialRotation = this.el.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
                            this.pitch = initialRotation.x;
                            this.yaw = initialRotation.y;

                            this.isRotating = false; // giữ chuột phải
                            this.lastX = 0;
                            this.lastY = 0;

                            this.onKeyDown = this.onKeyDown.bind(this);
                            this.onKeyUp = this.onKeyUp.bind(this);
                            this.onBlur = this.onBlur.bind(this);
                            this.onComposition = this.onComposition.bind(this);
                            this.onMouseDown = this.onMouseDown.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.onMouseUp = this.onMouseUp.bind(this);
                            this.onWheel = this.onWheel.bind(this);
                            this.onContextMenu = this.onContextMenu.bind(this);

                            // Tự lắng nghe trên window (không dùng wasd-controls / shouldCaptureKeyEvent
                            // có sẵn của A-Frame) — component built-in của A-Frame chỉ nhận phím khi
                            // document.activeElement === document.body, nên chỉ cần bấm 1 nút/input bất kỳ
                            // trên trang (sidebar, header...) là WASD im re cho tới khi focus quay lại body.
                            // keydown gắn ở CAPTURE phase (tham số thứ 3 = true) — chạy TRƯỚC mọi listener
                            // khác đăng ký theo kiểu bubble mặc định (kể cả listener nội bộ của A-Frame,
                            // extension trình duyệt...). Nhờ vậy onKeyDown có thể stopPropagation() để các
                            // phím mình đã xử lý (đặc biệt là F) không bị phần nào khác "giành" xử lý tiếp,
                            // ví dụ phím F từng bị đè lên fullscreen do 1 listener khác cũng nghe cùng phím.
                            window.addEventListener('keydown', this.onKeyDown, true);
                            window.addEventListener('keyup', this.onKeyUp);
                            // Khi trang mất focus (Ctrl+P, alt+tab, mở dialog khác...), phím đang giữ
                            // rất hay KHÔNG bắn được sự kiện keyup (trình duyệt/OS giữ luôn sự kiện đó) —
                            // nếu không reset thì this.keys[phím đó] mắc kẹt ở true mãi mãi, camera cứ
                            // bay tới hoài dù tay đã buông phím từ lâu. Reset sạch mỗi khi mất focus.
                            window.addEventListener('blur', this.onBlur);
                            document.addEventListener('visibilitychange', this.onBlur);

                            // Bộ gõ tiếng Việt (Unikey/EVKey kiểu Telex) can thiệp vào chuỗi phím
                            // trong lúc IME đang "compose" 1 ký tự (vd. gõ 'w' để ra chữ "ư" — xem
                            // chú thích ở onKeyDown về Backspace, cùng gốc vấn đề). Trong lúc đó,
                            // trình duyệt có thể không bắn đúng cặp keydown/keyup thật cho phím vật
                            // lý đang giữ (composition "nuốt" mất keyup) -> this.keys[phím] mắc kẹt
                            // ở true mãi mãi dù tay đã buông từ lâu -> camera trôi liên tục theo
                            // hướng phím đó. Reset sạch mỗi khi 1 phiên compose bắt đầu/kết thúc.
                            window.addEventListener('compositionstart', this.onComposition);
                            window.addEventListener('compositionend', this.onComposition);

                            // mousedown/wheel/contextmenu gắn trên <a-scene> (không phải canvas trực tiếp)
                            // vì canvas có thể chưa tồn tại lúc component này init — event từ canvas vẫn
                            // bubble lên tới sceneEl bình thường. mousemove/mouseup gắn trên window để vẫn
                            // kéo được mượt kể cả khi con trỏ lướt ra ngoài canvas.
                            this.el.sceneEl.addEventListener('mousedown', this.onMouseDown);
                            this.el.sceneEl.addEventListener('wheel', this.onWheel, { passive: false });
                            this.el.sceneEl.addEventListener('contextmenu', this.onContextMenu);
                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                        },
                        onKeyDown: function (this: FreeFlyControlsState, e: KeyboardEvent) {
                            // Đang gõ trong 1 field thật (input đổi tên, ô số Inspector...) -> bỏ
                            // qua HOÀN TOÀN, không preventDefault/không set this.keys. Quan trọng
                            // nhất với bộ gõ tiếng Việt Telex: 'w', 's', 'd', 'e' là các phím ghép
                            // dấu/ký tự (ư/ơ, dấu sắc, đ, ê...) được gõ liên tục khi soạn tiếng Việt
                            // — nếu không loại trừ ở đây, free-fly-controls sẽ cướp các phím đó làm
                            // lệnh bay camera ngay giữa lúc gõ chữ, vừa phá nội dung đang nhập vừa
                            // dễ để lại phím bị kẹt true nếu bộ gõ không phát cặp keydown/keyup chuẩn
                            // lúc đang ghép dấu — đây chính là nguyên nhân camera trôi khi gõ tiếng Việt.
                            if (isTypingInField(e.target) || isTypingInField(document.activeElement)) return;

                            const key = e.key.toLowerCase();
                            const HANDLED_KEYS = [' ', 'w', 'a', 's', 'd', 'e', 'q', 'f'];
                            // e.key của "Ctrl+D" vẫn chỉ là 'd' (Ctrl không đổi giá trị e.key, chỉ set
                            // thêm flag ctrlKey) — nếu không loại trừ tổ hợp phím ở đây, Ctrl+D (nhân bản),
                            // Ctrl+S (lưu)... sẽ bị nhận nhầm thành WASD di chuyển camera, và vì listener
                            // này chạy ở capture phase nên nó stopPropagation() TRƯỚC khi phím tắt thật sự
                            // (ở useAssetKeyboardShortcuts, bubble phase) kịp nhận được sự kiện.
                            const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
                            if (!hasModifier && HANDLED_KEYS.includes(key)) {
                                // preventDefault: chặn hành vi mặc định của trình duyệt (Space cuộn trang...).
                                // stopPropagation: chặn listener khác (nếu có) cũng đang nghe đúng phím này ở
                                // pha bubble phía sau — đây là fix cho lỗi F bị đè lên fullscreen.
                                e.preventDefault();
                                e.stopPropagation();
                                this.keys[key] = true;
                                this.lastKeyTime[key] = performance.now();
                                if (key === 'f') this.focusOnSelected();
                            }
                        },
                        onKeyUp: function (this: FreeFlyControlsState, e: KeyboardEvent) {
                            const key = e.key.toLowerCase();
                            this.keys[key] = false;
                            delete this.lastKeyTime[key];
                        },
                        onBlur: function (this: FreeFlyControlsState) {
                            this.keys = {};
                            this.lastKeyTime = {};
                        },
                        // Xem chú thích ở nơi đăng ký listener (init) — reset cứng mỗi khi 1 phiên
                        // IME compose bắt đầu hoặc kết thúc, phòng trường hợp bộ gõ tiếng Việt
                        // nuốt mất keyup thật của phím đang giữ.
                        onComposition: function (this: FreeFlyControlsState) {
                            this.keys = {};
                            this.lastKeyTime = {};
                        },
                        // Chuột phải + kéo = xoay góc nhìn (thay cho look-controls built-in, vốn xoay
                        // theo chuột trái — trái giờ dành riêng cho chọn/kéo asset). Bấm phải lên asset
                        // không ảnh hưởng gì tới thao tác xoay này (draggable-object chỉ nhận chuột trái,
                        // xem useAframeScript.ts phần draggable-object).
                        // Chuột giữa: xoay ASSET (không phải camera) — xem component 'rotatable-object'
                        // ở trên, tự bắt sự kiện trên từng entity nên free-fly-controls không cần xử lý.
                        onMouseDown: function (this: FreeFlyControlsState, evt: MouseEvent) {
                            if (evt.button === 2) {
                                evt.preventDefault();
                                this.isRotating = true;
                                this.lastX = evt.clientX;
                                this.lastY = evt.clientY;
                            }
                        },
                        onMouseMove: function (this: FreeFlyControlsState, evt: MouseEvent) {
                            if (this.isRotating) {
                                const dx = evt.clientX - this.lastX;
                                const dy = evt.clientY - this.lastY;
                                this.lastX = evt.clientX;
                                this.lastY = evt.clientY;

                                const ROTATE_SENSITIVITY = 0.15;
                                this.yaw -= dx * ROTATE_SENSITIVITY;
                                this.pitch -= dy * ROTATE_SENSITIVITY;
                                this.pitch = Math.max(-89, Math.min(89, this.pitch));
                                this.el.setAttribute('rotation', { x: this.pitch, y: this.yaw, z: 0 });
                            }
                        },
                        onMouseUp: function (this: FreeFlyControlsState, evt: MouseEvent) {
                            if (evt.button === 2) this.isRotating = false;
                        },
                        // Lăn chuột = zoom (tiến/lùi theo hướng camera đang nhìn).
                        onWheel: function (this: FreeFlyControlsState, evt: WheelEvent) {
                            evt.preventDefault();
                            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
                            const ZOOM_SPEED = 0.0015;
                            const delta = -evt.deltaY * ZOOM_SPEED;
                            const pos = this.el.getAttribute('position');
                            this.el.setAttribute('position', {
                                x: pos.x + forward.x * delta,
                                y: pos.y + forward.y * delta,
                                z: pos.z + forward.z * delta,
                            });
                        },
                        onContextMenu: function (this: FreeFlyControlsState, evt: Event) {
                            // Right-click dùng để xoay camera — chặn menu chuột phải mặc định của browser.
                            evt.preventDefault();
                        },
                        // Phím F: bay camera lại gần và nhìn thẳng vào asset đang được chọn (đánh dấu
                        // bằng attribute data-selected="true" trên entity gốc, xem ArScene.tsx).
                        focusOnSelected: function (this: FreeFlyControlsState) {
                            const targetEl = this.el.sceneEl.querySelector('[data-selected="true"]');
                            if (!targetEl || !targetEl.object3D) return;

                            const targetPos = new THREE.Vector3();
                            targetEl.object3D.getWorldPosition(targetPos);

                            const camPos = this.el.object3D.position;
                            const dir = new THREE.Vector3().subVectors(camPos, targetPos);
                            if (dir.lengthSq() < 0.0001) dir.set(0, 0, 1);
                            dir.normalize();

                            const FOCUS_DISTANCE = 2.2;
                            const newCamPos = targetPos.clone().add(dir.multiplyScalar(FOCUS_DISTANCE));
                            newCamPos.y = Math.max(newCamPos.y, 0.2); // tránh camera chui xuống sàn

                            this.el.setAttribute('position', newCamPos);

                            // Dùng lookAt + phân rã quaternion (thứ tự Euler 'YXZ', khớp với cách A-Frame
                            // compose rotation attribute) để tính đúng yaw/pitch thay vì tự suy lượng giác.
                            const dummy = new THREE.Object3D();
                            dummy.position.copy(newCamPos);
                            dummy.lookAt(targetPos);
                            const euler = new THREE.Euler().setFromQuaternion(dummy.quaternion, 'YXZ');
                            this.pitch = THREE.MathUtils.radToDeg(euler.x);
                            this.yaw = THREE.MathUtils.radToDeg(euler.y);
                            this.el.setAttribute('rotation', { x: this.pitch, y: this.yaw, z: 0 });
                        },
                        tick: function (this: FreeFlyControlsState, _time: number, timeDelta: number) {
                            if (!this.data.enabled) return;

                            // Watchdog: 1 phím giữ THẬT sẽ liên tục bắn keydown lặp lại (auto-repeat
                            // của OS/trình duyệt, thường mỗi vài chục ms sau độ trễ ban đầu ~500-700ms).
                            // Nếu quá STALE_MS mà không thấy keydown mới cho phím đang "true", coi như
                            // keyup thật đã bị nuốt mất (IME tiếng Việt đang compose, extension trình
                            // duyệt, tab mất focus theo cách không bắn 'blur'...) và tự nhả phím đó —
                            // tránh camera trôi liên tục theo 1 hướng mà không ai giữ phím nữa.
                            const STALE_MS = 700;
                            const now = performance.now();
                            for (const k in this.keys) {
                                if (this.keys[k] && now - (this.lastKeyTime[k] || 0) > STALE_MS) {
                                    this.keys[k] = false;
                                }
                            }

                            // Giữ Shift = tăng tốc bay (boost), không còn dùng Shift làm phím "xuống" nữa.
                            const boost = this.keys['shift'] ? 2.5 : 1;
                            const speed = this.data.speed * boost * (timeDelta / 16.6);
                            const position = this.el.getAttribute('position');
                            if (!position) return;

                            let moved = false;

                            // Space/E lên, Q xuống — theo trục Y thế giới.
                            // KHÔNG dùng Ctrl làm phím "xuống": giữ Ctrl trong lúc bay rất dễ vô tình
                            // bấm trúng Ctrl+W/Ctrl+S/Ctrl+A — đây là shortcut hệ thống của trình duyệt
                            // (đóng tab / lưu trang / chọn tất cả) mà JS không preventDefault được.
                            if (this.keys[' '] || this.keys['e']) { position.y += speed; moved = true; }
                            if (this.keys['q']) { position.y -= speed; moved = true; }

                            // W/A/S/D — bay theo hướng camera đang nhìn (fly 3D đầy đủ). Không còn alias
                            // phím mũi tên nữa vì mũi tên giờ dành riêng cho nudge asset đang chọn.
                            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
                            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.el.object3D.quaternion);

                            if (this.keys['w']) {
                                position.x += forward.x * speed;
                                position.y += forward.y * speed;
                                position.z += forward.z * speed;
                                moved = true;
                            }
                            if (this.keys['s']) {
                                position.x -= forward.x * speed;
                                position.y -= forward.y * speed;
                                position.z -= forward.z * speed;
                                moved = true;
                            }
                            if (this.keys['a']) {
                                position.x -= right.x * speed;
                                position.y -= right.y * speed;
                                position.z -= right.z * speed;
                                moved = true;
                            }
                            if (this.keys['d']) {
                                position.x += right.x * speed;
                                position.y += right.y * speed;
                                position.z += right.z * speed;
                                moved = true;
                            }

                            if (moved) this.el.setAttribute('position', position);
                        },
                        remove: function (this: FreeFlyControlsState) {
                            window.removeEventListener('keydown', this.onKeyDown, true);
                            window.removeEventListener('keyup', this.onKeyUp);
                            window.removeEventListener('blur', this.onBlur);
                            document.removeEventListener('visibilitychange', this.onBlur);
                            window.removeEventListener('compositionstart', this.onComposition);
                            window.removeEventListener('compositionend', this.onComposition);
                            this.el.sceneEl.removeEventListener('mousedown', this.onMouseDown);
                            this.el.sceneEl.removeEventListener('wheel', this.onWheel);
                            this.el.sceneEl.removeEventListener('contextmenu', this.onContextMenu);
                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                        }
                    });
                }
            }
            if (mounted) setLoaded(true);
        });

        return () => {
            mounted = false;
        };
    }, []);

    return loaded;
}