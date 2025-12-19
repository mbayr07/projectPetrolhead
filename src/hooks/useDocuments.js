import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`vg_documents_${user.id}`);
      if (stored) {
        setDocuments(JSON.parse(stored));
      } else {
        const defaultDocs = [
          {
            id: '1',
            vehicleId: '1',
            name: 'Insurance Certificate 2024',
            type: 'insurance',
            uploadDate: '2024-04-10',
            size: '1.2 MB',
            url: '#'
          },
          {
            id: '2',
            vehicleId: '1',
            name: 'Service History',
            type: 'service',
            uploadDate: '2024-11-05',
            size: '2.8 MB',
            url: '#'
          }
        ];
        localStorage.setItem(`vg_documents_${user.id}`, JSON.stringify(defaultDocs));
        setDocuments(defaultDocs);
      }
    }
  }, [user]);

  const saveDocuments = (newDocs) => {
    if (user) {
      localStorage.setItem(`vg_documents_${user.id}`, JSON.stringify(newDocs));
      setDocuments(newDocs);
    }
  };

  const addDocument = (docData) => {
    const newDoc = {
      id: Date.now().toString(),
      ...docData,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    saveDocuments([...documents, newDoc]);
    return newDoc;
  };

  const deleteDocument = (id) => {
    saveDocuments(documents.filter(d => d.id !== id));
  };

  return {
    documents,
    addDocument,
    deleteDocument
  };
}