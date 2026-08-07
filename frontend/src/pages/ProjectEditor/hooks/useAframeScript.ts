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
            const AFRAME = (window as any).AFRAME;
            if (AFRAME) {
                const THREE = AFRAME.THREE;
                if (!AFRAME.components['draggable-object']) {
                    AFRAME.registerComponent('draggable-object', {
                        init: function (this: any) {
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
                        onMouseDown: function (this: any, evt: any) {
                            const camera = this.el.sceneEl.camera;
                            if (!camera) return;

                            const originalEvent = evt.detail.mouseEvent || evt.detail.touchEvent || evt;
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

                            const cameraEl = camera.el;
                            if (cameraEl && cameraEl.components['look-controls']) {
                                cameraEl.setAttribute('look-controls', 'enabled', false);
                            }

                            evt.stopPropagation();

                            // Offset between object position and mouse intersection point
                            this.offset.copy(objectPosition).sub(this.intersection);

                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('touchmove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                            window.addEventListener('touchend', this.onMouseUp);
                        },
                        onMouseMove: function (this: any, evt: any) {
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
                        onMouseUp: function (this: any) {
                            if (this.isDragging) {
                                this.isDragging = false;
                                this.el.emit('dragend');

                                const camera = this.el.sceneEl.camera;
                                const cameraEl = camera?.el;
                                if (cameraEl && cameraEl.components['look-controls']) {
                                    cameraEl.setAttribute('look-controls', 'enabled', true);
                                }

                                window.removeEventListener('mousemove', this.onMouseMove);
                                window.removeEventListener('touchmove', this.onMouseMove);
                                window.removeEventListener('mouseup', this.onMouseUp);
                                window.removeEventListener('touchend', this.onMouseUp);
                            }
                        },
                        remove: function (this: any) {
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
                        init: function (this: any) {
                            this.isDragging = false;
                            this.onMouseDown = this.onMouseDown.bind(this);
                            this.onMouseMove = this.onMouseMove.bind(this);
                            this.onMouseUp = this.onMouseUp.bind(this);
                            this.el.addEventListener('mousedown', this.onMouseDown);
                        },
                        getScreenCenter: function (this: any, camera: any, rect: DOMRect) {
                            const worldPos = new THREE.Vector3();
                            this.el.parentEl.object3D.getWorldPosition(worldPos);
                            const ndc = worldPos.project(camera);
                            return {
                                x: ((ndc.x + 1) / 2) * rect.width + rect.left,
                                y: ((1 - ndc.y) / 2) * rect.height + rect.top,
                            };
                        },
                        onMouseDown: function (this: any, evt: any) {
                            const originalEvent = evt.detail.mouseEvent || evt.detail.touchEvent || evt;
                            evt.stopPropagation();

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

                            const cameraEl = camera.el;
                            if (cameraEl && cameraEl.components['look-controls']) {
                                cameraEl.setAttribute('look-controls', 'enabled', false);
                            }

                            this.startDistance = dist;
                            const currentScale = parentEl.getAttribute('scale') || { x: 1, y: 1, z: 1 };
                            this.startScale = currentScale.x;

                            window.addEventListener('mousemove', this.onMouseMove);
                            window.addEventListener('touchmove', this.onMouseMove);
                            window.addEventListener('mouseup', this.onMouseUp);
                            window.addEventListener('touchend', this.onMouseUp);
                        },
                        onMouseMove: function (this: any, evt: any) {
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
                        onMouseUp: function (this: any) {
                            if (!this.isDragging) return;
                            this.isDragging = false;
                            this.el.emit('scaleend');

                            const camera = this.el.sceneEl.camera;
                            const cameraEl = camera && camera.el;
                            if (cameraEl && cameraEl.components['look-controls']) {
                                cameraEl.setAttribute('look-controls', 'enabled', true);
                            }

                            window.removeEventListener('mousemove', this.onMouseMove);
                            window.removeEventListener('touchmove', this.onMouseMove);
                            window.removeEventListener('mouseup', this.onMouseUp);
                            window.removeEventListener('touchend', this.onMouseUp);
                        },
                        remove: function (this: any) {
                            this.el.removeEventListener('mousedown', this.onMouseDown);
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
                        init: function (this: any) {
                            this.keys = {};
                            this.onKeyDown = this.onKeyDown.bind(this);
                            this.onKeyUp = this.onKeyUp.bind(this);
                            this.onBlur = this.onBlur.bind(this);
                            // Tự lắng nghe trên window (không dùng wasd-controls / shouldCaptureKeyEvent
                            // có sẵn của A-Frame) — component built-in của A-Frame chỉ nhận phím khi
                            // document.activeElement === document.body, nên chỉ cần bấm 1 nút/input bất kỳ
                            // trên trang (sidebar, header...) là WASD im re cho tới khi focus quay lại body.
                            window.addEventListener('keydown', this.onKeyDown);
                            window.addEventListener('keyup', this.onKeyUp);
                            // Khi trang mất focus (Ctrl+P, alt+tab, mở dialog khác...), phím đang giữ
                            // rất hay KHÔNG bắn được sự kiện keyup (trình duyệt/OS giữ luôn sự kiện đó) —
                            // nếu không reset thì this.keys[phím đó] mắc kẹt ở true mãi mãi, camera cứ
                            // bay tới hoài dù tay đã buông phím từ lâu. Reset sạch mỗi khi mất focus.
                            window.addEventListener('blur', this.onBlur);
                            document.addEventListener('visibilitychange', this.onBlur);
                        },
                        onKeyDown: function (this: any, e: KeyboardEvent) {
                            this.keys[e.key.toLowerCase()] = true;
                        },
                        onKeyUp: function (this: any, e: KeyboardEvent) {
                            this.keys[e.key.toLowerCase()] = false;
                        },
                        onBlur: function (this: any) {
                            this.keys = {};
                        },
                        tick: function (this: any, _time: number, timeDelta: number) {
                            if (!this.data.enabled) return;
                            const speed = this.data.speed * (timeDelta / 16.6);
                            const position = this.el.getAttribute('position');
                            if (!position) return;

                            let moved = false;

                            // Space/E lên, Shift/Q xuống — theo trục Y thế giới
                            if (this.keys[' '] || this.keys['e']) { position.y += speed; moved = true; }
                            if (this.keys['shift'] || this.keys['q']) { position.y -= speed; moved = true; }

                            // W/A/S/D (hoặc phím mũi tên) — bay theo hướng camera đang nhìn (fly 3D đầy đủ)
                            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
                            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.el.object3D.quaternion);

                            if (this.keys['w'] || this.keys['arrowup']) {
                                position.x += forward.x * speed;
                                position.y += forward.y * speed;
                                position.z += forward.z * speed;
                                moved = true;
                            }
                            if (this.keys['s'] || this.keys['arrowdown']) {
                                position.x -= forward.x * speed;
                                position.y -= forward.y * speed;
                                position.z -= forward.z * speed;
                                moved = true;
                            }
                            if (this.keys['a'] || this.keys['arrowleft']) {
                                position.x -= right.x * speed;
                                position.y -= right.y * speed;
                                position.z -= right.z * speed;
                                moved = true;
                            }
                            if (this.keys['d'] || this.keys['arrowright']) {
                                position.x += right.x * speed;
                                position.y += right.y * speed;
                                position.z += right.z * speed;
                                moved = true;
                            }

                            if (moved) this.el.setAttribute('position', position);
                        },
                        remove: function (this: any) {
                            window.removeEventListener('keydown', this.onKeyDown);
                            window.removeEventListener('keyup', this.onKeyUp);
                            window.removeEventListener('blur', this.onBlur);
                            document.removeEventListener('visibilitychange', this.onBlur);
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