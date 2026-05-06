"use client";

import React from "react";

interface SpecialInstructionsDialogProps {
  open: boolean;
  onClose: () => void;
  instructions: string;
  customerName: string;
  spfNumber: string;
  status?: string;
  onCreate?: () => void;
  onRevise?: () => void;
}

export default function SpecialInstructionsDialog({
  open,
  onClose,
  instructions,
  customerName,
  spfNumber,
  status,
  onCreate,
  onRevise,
}: SpecialInstructionsDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Special Instructions</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-medium text-gray-700">SPF Number:</span> {spfNumber}</p>
                <p><span className="font-medium text-gray-700">Customer:</span> {customerName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Person icon and Full Instructions text outside speech balloon */}
          <div className="flex items-center gap-3 mb-3 text-indigo-700">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Full Instructions</span>
          </div>
          
          {/* Speech balloon pointing to icon */}
          <div className="relative bg-linear-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-4">
            {/* Speech balloon tail pointing to icon above */}
            <div className="absolute -top-2 left-6 w-4 h-4 bg-indigo-50 border-l-2 border-t-2 border-indigo-200 transform rotate-45"></div>
            
            {/* Instructions text */}
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {instructions}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
          <div className="flex gap-2">
            {!status && onCreate && (
              <button
                onClick={onCreate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Create
              </button>
            )}
            {status && onRevise && (
              <button
                onClick={onRevise}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Revise
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
