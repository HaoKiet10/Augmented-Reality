import { HelpCircle } from 'lucide-react';

export function HelpCard() {
    return (
        <div className="p-4 m-5 bg-white/2 border border-white/5 rounded-xl flex gap-3 text-left">
            <HelpCircle size={28} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
                <h4 className="text-xs font-bold text-gray-200 mb-1">A-Frame Inspector</h4>
                <p className="text-[10px] text-gray-400 leading-normal">
                    Click on assets in the bank to display them in 3D. Fine-tune their size, positions and
                    angles in the right sidebar.
                </p>
            </div>
        </div>
    );
}