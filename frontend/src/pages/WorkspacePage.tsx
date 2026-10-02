import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Workspace, Document } from '../types';
import { getWorkspace, getWorkspaceDocuments, createDocument } from '../lib/api';

export const WorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      getWorkspace(id).then(setWorkspace).catch(console.error);
      getWorkspaceDocuments(id).then(setDocuments).catch(console.error);
    }
  }, [id]);

  const handleCreateDocument = async () => {
    if (!id) return;
    try {
      const doc = await createDocument(id, 'New Document');
      navigate(`/document/${doc.docId}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (!workspace) return <div>Loading...</div>;

  return (
    <div className="container">
      <Link to="/">Back to Dashboard</Link>
      <h2>{workspace.name}</h2>
      <p>{workspace.description}</p>

      <h3>Documents</h3>
      <div className="card-list">
        {(Array.isArray(documents) ? documents : []).map(doc => (
          <div key={doc.docId} className="card" onClick={() => navigate(`/document/${doc.docId}`)}>
            <h4>{doc.title || 'Untitled'}</h4>
          </div>
        ))}
      </div>

      <button onClick={handleCreateDocument}>New Document</button>
    </div>
  );
};
