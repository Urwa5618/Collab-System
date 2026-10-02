import axios from 'axios';
import { User, Workspace, WorkspaceMember, Document } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

export const register = async (email: string, password: string, displayName?: string) => {
  const { data } = await api.post('/auth/register', { email, password, displayName });
  return data.user;
};

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get('/auth/me');
  return data.user;
};

export const logout = async () => {
  const { data } = await api.post('/auth/logout');
  return data;
};

export const getWorkspaces = async (): Promise<Workspace[]> => {
  const { data } = await api.get('/workspaces');
  return data.workspaces;
};

export const createWorkspace = async (name: string, description?: string): Promise<Workspace> => {
  const { data } = await api.post('/workspaces', { name, description });
  return data.workspace;
};

export const getWorkspace = async (workspaceId: string): Promise<Workspace> => {
  const { data } = await api.get(`/workspaces/${workspaceId}`);
  return data.workspace;
};

export const updateWorkspace = async (workspaceId: string, updates: any): Promise<Workspace> => {
  const { data } = await api.patch(`/workspaces/${workspaceId}`, updates);
  return data.workspace;
};

export const deleteWorkspace = async (workspaceId: string) => {
  const { data } = await api.delete(`/workspaces/${workspaceId}`);
  return data;
};

export const getWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const { data } = await api.get(`/workspaces/${workspaceId}/members`);
  return data.members;
};

export const addWorkspaceMember = async (workspaceId: string, email: string, role: string) => {
  const { data } = await api.post(`/workspaces/${workspaceId}/members`, { email, role });
  return data;
};

export const removeWorkspaceMember = async (workspaceId: string, userId: string) => {
  const { data } = await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  return data;
};

export const createDocument = async (workspaceId: string, title?: string): Promise<Document> => {
  const { data } = await api.post(`/workspaces/${workspaceId}/documents`, { title });
  return data.document;
};

export const getWorkspaceDocuments = async (workspaceId: string): Promise<Document[]> => {
  const { data } = await api.get(`/workspaces/${workspaceId}/documents`);
  return data.documents;
};

export const getDocument = async (docId: string): Promise<Document> => {
  const { data } = await api.get(`/documents/${docId}`);
  return data.document;
};

export const updateDocument = async (docId: string, updates: any): Promise<Document> => {
  const { data } = await api.patch(`/documents/${docId}`, updates);
  return data.document;
};

export const deleteDocument = async (docId: string) => {
  const { data } = await api.delete(`/documents/${docId}`);
  return data;
};
