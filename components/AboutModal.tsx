
import React from 'react';
import CloseIcon from './icons/CloseIcon';
import BotIcon from './icons/BotIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4 text-white border border-gray-700 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="about-modal-title" className="text-2xl font-bold text-cyan-400">حول التطبيق</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="إغلاق"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6 text-gray-300 text-right">
            <div className="text-center">
                <BotIcon className="w-16 h-16 text-cyan-400 mx-auto mb-2"/>
                <p className="text-lg font-semibold">مساعد الذاكرة بالذكاء الاصطناعي</p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-cyan-300 border-b border-gray-600 pb-1 mb-2">فكرة التطبيق</h3>
                <p>تم تصميم هذا المساعد ليكون ذاكرة خارجية آمنة وبسيطة لك. يمكنك حفظ المعلومات المهمة التي تخشى نسيانها، مثل أعياد الميلاد أو المواعيد، وسيقوم المساعد بتذكيرك بها عند الطلب. الهدف هو توفير راحة البال من خلال معرفة أن معلوماتك محفوظة بشكل آمن وفي متناول يدك.</p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-cyan-300 border-b border-gray-600 pb-1 mb-2">عن المطور</h3>
                <p>تم تطوير هذا التطبيق بواسطة مهندس واجهات أمامية خبير ومختص في واجهة برمجة تطبيقات Gemini، بهدف استعراض قدرات الذكاء الاصطناعي في إنشاء تطبيقات عملية ومفيدة تعزز الإنتاجية اليومية.</p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-cyan-300 border-b border-gray-600 pb-1 mb-2">اتصل بنا</h3>
                <p>نرحب بجميع الاستفسارات والمقترحات. يمكنك التواصل معنا عبر البريد الإلكتروني:</p>
                <a href="mailto:feedback@example.com" className="text-cyan-400 hover:underline">feedback@example.com</a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
