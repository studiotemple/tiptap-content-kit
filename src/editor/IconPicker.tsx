'use client';

import { useState } from 'react';

interface IconPickerProps {
  value?: string;
  onChange: (icon: string) => void;
}

const ICON_CATEGORIES = [
  {
    label: 'Common',
    icons: ['🚀', '⚡', '🔧', '📦', '🎯', '💡', '🔑', '🛡️', '📊', '🔍', '📝', '✅'],
  },
  {
    label: 'Tech',
    icons: ['💻', '🖥️', '📱', '🌐', '☁️', '🔗', '⚙️', '🗄️', '📡', '🤖', '🧪', '🔬'],
  },
  {
    label: 'Status',
    icons: ['✨', '⭐', '🔥', '❤️', '💎', '🏆', '🎉', '⚠️', '🚫', 'ℹ️', '❓', '💬'],
  },
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-lg"
      >
        {value || '📦'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 w-64">
            {ICON_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 px-1 mb-1">{cat.label}</div>
                <div className="grid grid-cols-6 gap-1">
                  {cat.icons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => { onChange(icon); setIsOpen(false); }}
                      className={`w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg ${value === icon ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300' : ''}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
