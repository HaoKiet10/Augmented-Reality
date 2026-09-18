import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ArSceneErrorBoundaryProps {
    children: ReactNode;
}

interface ArSceneErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Bọc quanh <ArScene> — vùng NHIỀU khả năng throw runtime error nhất trong app (A-Frame/Three.js:
 * asset load lỗi định dạng, WebGL context bị mất, gltf hỏng, component tự đăng ký lỗi schema...).
 * Trước đây không có error boundary nào: 1 lỗi trong lúc render 3D scene làm React unmount SẠCH
 * toàn bộ cây component TỪ ĐIỂM LỖI TRỞ LÊN — tức là mất luôn cả EditorHeader, AssetSidebar,
 * InspectorSidebar, chỉ vì lỗi nằm gọn trong khung xem trước 3D. Bọc ở đây để lỗi chỉ làm hỏng
 * đúng khung xem trước đó, phần còn lại của editor (sidebar, nút Save/Publish...) vẫn dùng được
 * bình thường — quan trọng vì user vẫn cần các nút đó để thoát ra/thử asset khác.
 *
 * LƯU Ý: phải là class component — React chưa có hook tương đương cho
 * componentDidCatch/getDerivedStateFromError.
 */
export class ArSceneErrorBoundary extends Component<ArSceneErrorBoundaryProps, ArSceneErrorBoundaryState> {
    constructor(props: ArSceneErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ArSceneErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ArScene] render crashed:', error, errorInfo.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="max-w-md text-center flex flex-col items-center p-8">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-4">
                            <AlertTriangle size={36} className="text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-200">Không tải được khung xem 3D</h3>
                        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                            Khung xem AR gặp lỗi khi hiển thị (có thể do 1 asset bị hỏng file/định dạng).
                            Các phần khác của trình soạn thảo vẫn dùng được bình thường.
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-red-400/70 mt-3 font-mono break-all">
                                {this.state.error.message}
                            </p>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}