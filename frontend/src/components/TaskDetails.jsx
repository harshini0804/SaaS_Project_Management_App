import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function TaskDetails({ task, onClose, onTaskUpdated }) {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || '');
    const [assigneeId, setAssigneeId] = useState(task.assignee_id || ''); // NEW: Track assignee
    const [members, setMembers] = useState([]); // NEW: Store workspace members
    
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [activity, setActivity] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [activeTab, setActiveTab] = useState('comments');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setAssigneeId(task.assignee_id || '');
            fetchWorkspaceMembers();
            fetchComments();
            fetchActivity();
            fetchAttachments();
        }
    }, [task]);

    // NEW: Fetch workspace members to populate the dropdown
    const fetchWorkspaceMembers = async () => {
        try {
            const response = await api.get('/workspaces/me');
            setMembers(response.data.members || []);
        } catch (error) {
            console.error("Failed to fetch workspace members", error);
        }
    };

    const fetchComments = async () => {
        try {
            const response = await api.get(`/tasks/${task.id}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error("Failed to fetch comments", error);
        }
    };

    const fetchActivity = async () => {
        try {
            const response = await api.get(`/tasks/${task.id}/activity`);
            setActivity(response.data);
        } catch (error) {
            console.error("Failed to fetch activity", error);
        }
    };

    const fetchAttachments = async () => {
        try {
            const response = await api.get(`/tasks/${task.id}/attachments`);
            setAttachments(response.data);
        } catch (error) {
            console.error("Failed to fetch attachments", error);
        }
    };

    const handleSaveDetails = async () => {
        try {
            await api.patch(`/tasks/${task.id}`, { 
                title, 
                description,
                assignee_id: assigneeId || null // NEW: Send assignee to backend
            });
            onTaskUpdated();
            alert("Task updated!");
        } catch (error) {
            alert("Failed to update task.");
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            await api.post(`/tasks/${task.id}/comments`, { content: newComment });
            setNewComment('');
            fetchComments();
        } catch (error) {
            alert("Failed to post comment.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const presignedRes = await api.post(`/tasks/${task.id}/attachments/presigned-url`, {
                file_name: file.name,
                file_type: file.type
            });

            const { upload_url, file_path } = presignedRes.data;

            await fetch(upload_url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type
                }
            });

            await api.post(`/tasks/${task.id}/attachments`, {
                file_name: file.name,
                file_path: file_path
            });

            fetchAttachments();
            fetchActivity(); 
            alert("File attached securely!");
        } catch (error) {
            console.error(error);
            alert("Upload failed. Verify your AWS keys and CORS policies.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/30 transition-opacity" onClick={onClose}></div>

            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md transform overflow-y-auto bg-white p-6 shadow-2xl transition-transform">
                <div className="mb-6 flex items-center justify-between">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                        {task.status}
                    </span>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✖ Close</button>
                </div>

                <div className="mb-8 border-b pb-6">
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mb-4 w-full text-xl font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                    
                    <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add a more detailed description..."
                        className="mb-4 w-full rounded-md border p-3 focus:border-blue-500 focus:outline-none"
                        rows="4"
                    />

                    {/* NEW: Assignee Dropdown */}
                    <label className="mb-1 block text-sm font-medium text-gray-700">Assign To</label>
                    <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="mb-6 w-full rounded-md border p-2 text-sm focus:border-blue-500 focus:outline-none"
                    >
                        <option value="">Unassigned</option>
                        {members.map((member) => (
                            <option key={member.id} value={member.user_id || member.id}>
                                {member.email}
                            </option>
                        ))}
                    </select>

                    <button onClick={handleSaveDetails} className="w-full rounded-md bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900">
                        Save Details
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div>
                    <div className="mb-4 flex border-b">
                        {['comments', 'activity', 'attachments'].map((tab) => (
                            <button 
                                key={tab}
                                className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === 'activity' ? 'History' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: Comments */}
                    {activeTab === 'comments' && (
                        <div>
                            <form onSubmit={handlePostComment} className="mb-6">
                                <input 
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="mb-2 w-full rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                                />
                                <div className="flex justify-end">
                                    <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
                                        Comment
                                    </button>
                                </div>
                            </form>
                            <div className="space-y-4">
                                {comments.map(comment => (
                                    <div key={comment.id} className="rounded-lg bg-gray-50 p-3">
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-900">{comment.author_email}</span>
                                            <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-700">{comment.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: History */}
                    {activeTab === 'activity' && (
                        <div className="space-y-4">
                            {activity.map(log => (
                                <div key={log.id} className="flex items-start gap-3 text-sm">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-gray-300"></div>
                                    <div>
                                        <p className="text-gray-800"><span className="font-medium">{log.user_email}</span> {log.action}</p>
                                        <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tab 3: Attachments */}
                    {activeTab === 'attachments' && (
                        <div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                                <input 
                                    type="file" 
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="w-full cursor-pointer text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                />
                                {uploading && <p className="mt-2 animate-pulse text-xs text-blue-600">Uploading securely to AWS S3...</p>}
                            </div>

                            <div className="space-y-2">
                                <h4 className="mb-3 text-sm font-semibold text-gray-900">Attached Files</h4>
                                {attachments.length === 0 ? (
                                    <p className="text-sm text-gray-500">No attachments found.</p>
                                ) : (
                                    attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between rounded-md border bg-gray-50 p-3">
                                            <span className="max-w-[200px] truncate text-sm font-medium text-gray-700">{att.file_name}</span>
                                            <a 
                                                href={att.download_url} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="rounded border bg-white px-3 py-1 text-xs font-bold text-blue-600 shadow-sm hover:text-blue-800"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}