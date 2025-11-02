
import React from 'react';
import { UserData } from '../types';
import TrashIcon from './icons/TrashIcon';
import CloseIcon from './icons/CloseIcon';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: UserData;
  onDelete: (key: string) => void;
}

const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, userData, onDelete }) => {
  if (!isOpen) return null;

  const memoryItems = Object.entries(userData);
  const memoryCount = memoryItems.length;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-modal-title"
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4 text-white border border-gray-700 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="memory-modal-title" className="text-2xl font-bold text-cyan-400">إدارة الذاكرة</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            aria-label="إغلاق"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-4 text-gray-300">
          <p>المعلومات المحفوظة: <span className="font-bold text-cyan-400">{memoryCount} / 10</span></p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2">
            <div className="bg-cyan-600 h-2.5 rounded-full" style={{ width: `${memoryCount * 10}%` }}></div>
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
          {memoryItems.length > 0 ? (
            memoryItems.map(([key, value]) => (
              <div key={key} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold capitalize text-cyan-200">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-gray-300">{value}</p>
                </div>
                <button 
                  onClick={() => onDelete(key)}
                  className="p-2 rounded-full text-red-400 hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label={`حذف ${key}`}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-8">الذاكرة فارغة.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryModal;
