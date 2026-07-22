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

                            this.isDragging = true;
                            this.el.emit('dragstart');

                            const cameraEl = camera.el;
                            if (cameraEl && cameraEl.components['look-controls']) {
                                cameraEl.setAttribute('look-controls', 'enabled', false);
                            }

                            const originalEvent = evt.detail.originalEvent || evt;
                            if (originalEvent.stopPropagation) originalEvent.stopPropagation();

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
                            this.raycaster.ray.intersectPlane(this.plane, this.intersection);

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

                            const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
                            const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

                            const rect = this.el.sceneEl.canvas.getBoundingClientRect();
                            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
                            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

                            this.raycaster.setFromCamera(this.mouse, camera);
                            this.raycaster.ray.intersectPlane(this.plane, this.intersection);

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

                if (!AFRAME.components['vertical-controls']) {
                    AFRAME.registerComponent('vertical-controls', {
                        schema: {
                            speed: { type: 'number', default: 0.1 }
                        },
                        init: function (this: any) {
                            this.keys = {};
                            this.onKeyDown = this.onKeyDown.bind(this);
                            this.onKeyUp = this.onKeyUp.bind(this);
                            window.addEventListener('keydown', this.onKeyDown);
                            window.addEventListener('keyup', this.onKeyUp);
                        },
                        onKeyDown: function (this: any, e: KeyboardEvent) {
                            this.keys[e.key.toLowerCase()] = true;
                        },
                        onKeyUp: function (this: any, e: KeyboardEvent) {
                            this.keys[e.key.toLowerCase()] = false;
                        },
                        tick: function (this: any, _time: number, timeDelta: number) {
                            const speed = this.data.speed * (timeDelta / 16.6);
                            const position = this.el.getAttribute('position');
                            if (!position) return;

                            // Space or E to go up
                            if (this.keys[' '] || this.keys['e']) {
                                position.y += speed;
                                this.el.setAttribute('position', position);
                            }
                            // Shift or Q to go down
                            if (this.keys['shift'] || this.keys['q']) {
                                position.y -= speed;
                                this.el.setAttribute('position', position);
                            }
                        },
                        remove: function (this: any) {
                            window.removeEventListener('keydown', this.onKeyDown);
                            window.removeEventListener('keyup', this.onKeyUp);
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