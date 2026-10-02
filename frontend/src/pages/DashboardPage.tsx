import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Workspace } from '../types';
import { getWorkspaces, createWorkspace } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export const DashboardPage: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getWorkspaces().then(setWorkspaces).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nw = await createWorkspace(name, description);
      setWorkspaces([...workspaces, nw]);
      setName('');
      setDescription('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <header className="flex-row">
        <h2>Welcome, {user?.displayName || user?.email}</h2>
        <button onClick={logout}>Logout</button>
      </header>

      <h3>Your Workspaces</h3>
      <div className="card-list">
        {(Array.isArray(workspaces) ? workspaces : []).map(ws => (
          <div key={ws.workspaceId} className="card" onClick={() => navigate(`/workspace/${ws.workspaceId}`)}>
            <h4>{ws.name}</h4>
            <p>{ws.description}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleCreate} className="inline-form">
        <h4>Create Workspace</h4>
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <button type="submit">Create</button>
      </form>
    </div>
  );
};
