/**
 * Dùng chung cho mọi nơi lắng nghe phím trên toàn trang (window) — free-fly-controls
 * (camera bay WASD) và useAssetKeyboardShortcuts (Delete/Undo/mũi tên...).
 *
 * Trước đây chỉ useAssetKeyboardShortcuts kiểm tra hàm này; free-fly-controls lắng
 * nghe 'keydown' trên window mà KHÔNG loại trừ trường hợp đang gõ chữ vào 1 field
 * (input đổi tên project, ô nhập số Inspector...). Bộ gõ tiếng Việt kiểu Telex
 * (Unikey/EVKey) dùng chính các phím w/a/s/d/e/q làm dấu và ký tự đặc biệt cực kỳ
 * thường xuyên — ví dụ 'w' -> ư/ơ/ă, 's' -> dấu sắc, 'd' -> đ, 'e' kép -> ê. Mỗi lần
 * gõ tiếng Việt trong BẤT KỲ ô nhập liệu nào, free-fly-controls đều "cướp" các phím
 * đó làm lệnh bay camera (preventDefault + set trạng thái phím giữ), phá luôn chữ
 * đang gõ VÀ để lại trạng thái phím bị kẹt true nếu bộ gõ không phát ra đúng cặp
 * keydown/keyup chuẩn khi đang xử lý ghép dấu — đây chính là nguồn gốc camera trôi
 * khi gõ tiếng Việt. Giải pháp: bỏ qua hoàn toàn phím tắt (Escape/Delete/WASD...)
 * bất cứ khi nào đang gõ trong 1 field thật sự, để bộ gõ tiếng Việt gõ tự nhiên,
 * không dây dưa gì tới camera hay các phím tắt khác.
 */
export function isTypingInField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}