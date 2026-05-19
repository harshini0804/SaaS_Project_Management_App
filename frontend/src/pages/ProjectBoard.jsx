import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AuthContext } from '../context/AuthContext';
import TaskDetails from '../components/TaskDetails';
import api from '../api/axios';
import Navbar from '../components/Navbar';

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

// Helper for modern column styling
const getColumnStyle = (columnId) => {
    switch(columnId) {
        case 'To Do': return 'bg-slate-50 border-slate-200';
        case 'In Progress': return 'bg-blue-50/50 border-blue-100';
        case 'In Review': return 'bg-amber-50/50 border-amber-100';
        case 'Done': return 'bg-green-50/50 border-green-100';
        default: return 'bg-gray-50 border-gray-200';
    }
};

export default function ProjectBoard() {
    const { projectId } = useParams();
    const { user } = useContext(AuthContext);
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState({
        'To Do': [], 'In Progress': [], 'In Review': [], 'Done': []
    });
    
    // Task Input State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);

    // AI Feature State
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        fetchProjectAndTasks();
    }, [projectId]);

    const fetchProjectAndTasks = async () => {
        try {
            const projRes = await api.get(`/projects/${projectId}`);
            setProject(projRes.data);

            const taskRes = await api.get(`/tasks/project/${projectId}`);
            // Group tasks by status and sort by position
            const grouped = { 'To Do': [], 'In Progress': [], 'In Review': [], 'Done': [] };
            taskRes.data.forEach(task => {
                if (grouped[task.status]) {
                    grouped[task.status].push(task);
                }
            });
            // Ensure they are sorted by the position integer
            Object.keys(grouped).forEach(key => {
                grouped[key].sort((a, b) => a.position - b.position);
            });
            setTasks(grouped);
        } catch (error) {
            console.error("Failed to load board data", error);
        }
    };

    // --- AI TASK ENHANCEMENT LOGIC ---
    const handleEnhanceTask = async () => {
        if (!newTaskTitle.trim()) {
            alert("Please type a few words first so the AI has context!");
            return;
        }

        setIsAiLoading(true);
        setAiSuggestions([]); 

        try {
            const response = await api.post('/ai/enhance-task', { 
                vague_task: newTaskTitle 
            });
            setAiSuggestions(response.data.suggestions);
        } catch (error) {
            alert("Failed to generate suggestions. Please check your backend logs.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSelectSuggestion = (suggestion) => {
        setNewTaskTitle(suggestion);
        setAiSuggestions([]); 
    };
    // ---------------------------------

    // --- FIXED: TASK CREATION LOGIC ---
    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            await api.post('/tasks/', {
                title: newTaskTitle,
                project_id: projectId,
                status: 'To Do',
                description: "" // Fixed: Prevents the 500 error!
            });
            setNewTaskTitle('');
            setAiSuggestions([]); 
            fetchProjectAndTasks(); // Fixed: Refreshes the board immediately!
        } catch (error) {
            alert("Failed to create task");
        }
    };
    // ----------------------------------

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a column or didn't move
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Optimistically update UI
        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        
        const newTasks = { ...tasks };
        const [movedTask] = newTasks[sourceCol].splice(source.index, 1);
        movedTask.status = destCol;
        newTasks[destCol].splice(destination.index, 0, movedTask);
        
        // Re-calculate positions for the destination column
        newTasks[destCol].forEach((task, index) => {
            task.position = index;
        });

        setTasks(newTasks);

        // Send update to backend
        try {
            await api.patch(`/tasks/${draggableId}/move`, {
                status: destCol,
                position: destination.index
            });
        } catch (error) {
            console.error("Failed to save move", error);
            fetchProjectAndTasks(); // Revert on failure
        }
    };

    if (!project) return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />
            <div className="flex flex-1 items-center justify-center text-gray-500 animate-pulse">Loading board...</div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />
            
            <main className="flex-1 mx-auto w-full max-w-[1400px] px-6 py-8">
                
                {/* Project Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                    {project.description && (
                        <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                    )}
                </div>

                {/* AI-Powered Task Input Bar */}
                <div className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <form onSubmit={handleCreateTask} className="flex items-center gap-3">
                        <input 
                            type="text" 
                            placeholder="Type a new task (e.g., 'fix login')"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 transition-colors"
                        />
                        
                        <button 
                            type="button" 
                            onClick={handleEnhanceTask}
                            disabled={isAiLoading}
                            className="flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2.5 font-medium text-purple-700 hover:bg-purple-100 border border-purple-200 disabled:opacity-50 transition-colors"
                        >
                            {isAiLoading ? '✨ Thinking...' : '✨ Enhance'}
                        </button>

                        <button 
                            type="submit"
                            disabled={!newTaskTitle.trim()}
                            className="rounded-lg bg-blue-600 px-6 py-2.5 text-white hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 transition-colors"
                        >
                            Add Task
                        </button>
                    </form>

                    {/* AI Suggestions Display */}
                    {aiSuggestions.length > 0 && (
                        <div className="mt-4 border-t border-gray-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p className="text-sm text-gray-500 mb-3 font-medium flex items-center gap-2">
                                ✨ Pick a refined alternative:
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {aiSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelectSuggestion(suggestion)}
                                        className="rounded-md bg-gray-50 px-4 py-2 text-sm text-gray-700 hover:bg-purple-600 hover:text-white transition-all border border-gray-200 shadow-sm text-left font-medium"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Drag and Drop Board Area */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-4">
                        {COLUMNS.map((columnId) => (
                            <div 
                                key={columnId} 
                                className={`flex flex-col rounded-xl border ${getColumnStyle(columnId)} p-4`}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="font-bold text-gray-700">{columnId}</h2>
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-600 shadow-sm">
                                        {tasks[columnId]?.length || 0}
                                    </span>
                                </div>
                                
                                <Droppable droppableId={columnId}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.droppableProps}
                                            className={`min-h-[200px] rounded-lg p-1 transition-colors ${snapshot.isDraggingOver ? 'bg-gray-200/50' : ''}`}
                                        >
                                            {tasks[columnId].map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => setSelectedTask(task)} 
                                                            className={`mb-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-xl ring-2 ring-blue-500' : ''}`}
                                                        >
                                                            <p className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</p>
                                                            
                                                            <div className="mt-4 flex items-center justify-between">
                                                                <span className="text-xs text-gray-400 font-medium">
                                                                    {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </span>
                                                                
                                                                {task.assignee_id ? (
                                                                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                                                                        Assigned
                                                                    </span>
                                                                ) : (
                                                                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                                        Unassigned
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </main>

            {/* Task Modal Overlay */}
            {selectedTask && (
                <TaskDetails 
                    task={selectedTask} 
                    onClose={() => setSelectedTask(null)} 
                    onTaskUpdated={fetchProjectAndTasks} 
                />
            )}
        </div>
    );
}