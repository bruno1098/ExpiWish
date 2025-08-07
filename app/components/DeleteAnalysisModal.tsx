'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  analysisName?: string;
  isDeleting?: boolean;
}

export default function DeleteAnalysisModal({
  isOpen,
  onClose,
  onConfirm,
  analysisName,
  isDeleting = false
}: DeleteAnalysisModalProps) {
  const [reason, setReason] = React.useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason || 'Análise removida pelo usuário');
    setReason('');
  };

  const handleClose = () => {
    if (!isDeleting) {
      setReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              Excluir Análise
            </h3>
          </div>
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Tem certeza que deseja excluir esta análise?
            </p>
            {analysisName && (
              <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">
                {analysisName}
              </p>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">Esta ação não pode ser desfeita!</p>
                <p>A análise será marcada como excluída e não aparecerá mais nos dashboards.</p>
              </div>
            </div>
          </div>

          {/* Reason input */}
          <div className="mb-4">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Motivo da exclusão (opcional)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Dados incorretos, análise duplicada..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isDeleting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Excluindo...</span>
              </>
            ) : (
              <span>Confirmar Exclusão</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}