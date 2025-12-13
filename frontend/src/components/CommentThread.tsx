import React from 'react';

interface Comment {
  id: string;
  userId: string;
  userName?: string;
  comment: string;
  timestamp?: string;
  createdAt?: string;
  type?: string;
  fieldKey?: string;
}

interface Study {
  id?: string;
  comments?: Comment[];
  fieldComments?: Comment[];
  [key: string]: any;
}

interface CommentThreadProps {
  study: Study;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ study }) => {
  const allComments = [
    ...(study.comments || []).map(c => ({ ...c, source: 'general' })),
    ...(study.fieldComments || []).map(c => ({ ...c, source: 'field' }))
  ].sort((a, b) => {
    const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
    const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  if (allComments.length === 0) return null;

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Comment History
        </h3>
        <span className="text-xs text-gray-500">{allComments.length} comments</span>
      </div>
      <div className="max-h-60 overflow-y-auto p-4 space-y-4">
        {allComments.map((comment) => (
          <div key={comment.id} className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                {(comment.userName || '?').charAt(0)}
              </div>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <p className="text-xs font-medium text-gray-900">{comment.userName || 'Unknown User'}</p>
                <span className="text-xs text-gray-500">
                  {new Date(comment.timestamp || comment.createdAt || '').toLocaleString()}
                </span>
              </div>
              {comment.fieldKey && (
                <p className="text-xs text-gray-600 mt-1 font-medium">
                  Field: {comment.fieldKey === 'listedness' ? 'Listedness' : comment.fieldKey === 'seriousness' ? 'Seriousness' : comment.fieldKey}
                </p>
              )}
              {comment.type && comment.type !== 'field_comment' && (
                 <p className="text-xs text-gray-500 mt-1 italic">
                   Type: {comment.type.replace(/_/g, ' ')}
                 </p>
              )}
              <p className="text-sm text-gray-800 mt-1">{comment.comment}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
