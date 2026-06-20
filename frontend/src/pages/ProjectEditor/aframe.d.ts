// Mở rộng JSX namespace của React để hỗ trợ các custom element của A-Frame.
// Cần thiết vì A-Frame không có type definitions chính thức cho JSX/TSX.
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'a-scene': any;
            'a-entity': any;
            'a-camera': any;
            'a-sky': any;
            'a-plane': any;
            'a-assets': any;
            'a-gltf-model': any;
            'a-video': any;
            'a-image': any;
        }
    }
}

export { };