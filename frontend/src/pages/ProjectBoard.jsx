import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AuthContext } from '../context/AuthContext';
import TaskDetails from '../components/TaskDetails';
import api from '../api/axios';

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];

export default function ProjectBoard() {
    const { projectId } = useParams();
    const { user } = useContext(AuthContext);
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState({
        'To Do': [], 'In Progress': [], 'In Review': [], 'Done': []
    });
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedTask, setSelectedTask] = useState(null);

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

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        try {
            await api.post('/tasks/', {
                title: newTaskTitle,
                project_id: projectId,
                status: 'To Do'
            });
            setNewTaskTitle('');
            fetchProjectAndTasks(); // Refresh board
        } catch (error) {
            alert("Failed to create task");
        }
    };

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

    if (!project) return <div className="p-10 text-center">Loading board...</div>;

    return (
        <div className="flex h-screen flex-col bg-gray-50">
            {/* Top Nav */}
            <nav className="flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="text-gray-500 hover:text-gray-800">← Dashboard</Link>
                    <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
                </div>
            </nav>

            {/* Board Area */}
            <main className="flex-1 overflow-x-auto p-6">
                
                {/* Quick Add Task */}
                <form onSubmit={handleCreateTask} className="mb-6 flex max-w-md gap-2">
                    <input 
                        type="text" 
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="What needs to be done?"
                        className="flex-1 rounded-md border p-2 focus:border-blue-500 focus:outline-none"
                    />
                    <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Add Task</button>
                </form>

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex h-full items-start gap-6">
                        {COLUMNS.map((columnId) => (
                            <div key={columnId} className="flex h-full max-h-full w-80 flex-col rounded-lg bg-gray-200 p-4">
                                <h2 className="mb-4 font-semibold text-gray-700">{columnId}</h2>
                                
                                <Droppable droppableId={columnId}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef} 
                                            {...provided.droppableProps}
                                            className={`flex-1 overflow-y-auto rounded-md p-1 ${snapshot.isDraggingOver ? 'bg-gray-300' : ''}`}
                                        >
                                            {tasks[columnId].map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => setSelectedTask(task)} // 3. Add this onClick!
                                                            className={`mb-3 cursor-pointer rounded-md bg-white p-4 shadow-sm hover:ring-2 hover:ring-blue-300 ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}`}
                                                        >
                                                            <p className="text-sm font-medium text-gray-800">{task.title}</p>
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