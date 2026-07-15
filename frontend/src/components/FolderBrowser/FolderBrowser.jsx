import React, { useState, useEffect } from 'react';
import { fetchFolders, fetchChildFolders } from '../../utils/api';
import './FolderBrowser.css';

export default function FolderBrowser({ currentFolder, onFolderSelect, children }) {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  // We fetch siblings of current folder, or top-level if none
  useEffect(() => {
    setLoading(true);
    
    // If we have a current folder, we want to show its children
    // If not, we show top-level folders
    const apiCall = currentFolder 
      ? fetchChildFolders(currentFolder) 
      : fetchFolders('');
      
    apiCall
      .then(data => {
        // Handle both API response formats
        setFolders(data.folders || data.children || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentFolder]);

  // Build breadcrumbs
  const breadcrumbs = [];
  if (currentFolder) {
    const parts = currentFolder.split('/');
    let pathSoFar = '';
    
    parts.forEach((part, index) => {
      pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
      breadcrumbs.push({
        name: part,
        path: pathSoFar,
        isLast: index === parts.length - 1
      });
    });
  }

  const handleBreadcrumbClick = (path) => {
    if (path !== currentFolder) {
      onFolderSelect(path);
    }
  };

  const handleFolderClick = (folderName) => {
    const newPath = currentFolder ? `${currentFolder}/${folderName}` : folderName;
    onFolderSelect(newPath);
  };

  return (
    <div className="folder-browser">
      {/* Breadcrumbs */}
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <div className="breadcrumb-path">
          <button 
            className={`crumb-btn ${!currentFolder ? 'active' : ''}`}
            onClick={() => handleBreadcrumbClick('')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Root
          </button>
          
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              <span className="crumb-separator">/</span>
              <button 
                className={`crumb-btn ${crumb.isLast ? 'active' : ''}`}
                onClick={() => handleBreadcrumbClick(crumb.path)}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {children && (
          <div className="breadcrumb-actions">
            {children}
          </div>
        )}
      </div>

      {/* Folder List */}
      <div className="folder-list">
        {loading ? (
          <div className="folder-loader"><div className="spinner"></div></div>
        ) : folders.length > 0 ? (
          folders.map(folder => (
            <button 
              key={folder} 
              className="folder-item glass"
              onClick={() => handleFolderClick(folder)}
            >
              <span className="folder-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </span>
              <span className="folder-name">{folder}</span>
            </button>
          ))
        ) : (
          currentFolder && <div className="no-folders">No subfolders</div>
        )}
      </div>
    </div>
  );
}
