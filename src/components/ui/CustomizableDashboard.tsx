"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { 
  Cog6ToothIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

interface Widget {
  id: string;
  type: "stats" | "chart" | "list" | "calendar";
  title: string;
  size: "small" | "medium" | "large";
  visible: boolean;
  position: number;
  config: any;
}

interface CustomizableDashboardProps {
  userRole: string;
  onWidgetUpdate?: (widgets: Widget[]) => void;
}

export default function CustomizableDashboard({ userRole, onWidgetUpdate }: CustomizableDashboardProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [availableWidgets, setAvailableWidgets] = useState<Widget[]>([]);

  useEffect(() => {
    loadUserWidgets();
    loadAvailableWidgets();
  }, [userRole]);

  const loadUserWidgets = async () => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      const response = await fetch(`/api/dashboard/widgets?role=${userRole}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setWidgets(data.widgets || getDefaultWidgets());
      } else {
        setWidgets(getDefaultWidgets());
      }
    } catch (error) {
      console.error("Failed to load widgets:", error);
      setWidgets(getDefaultWidgets());
    }
  };

  const loadAvailableWidgets = () => {
    const available: Widget[] = [
      {
        id: "attendance-stats",
        type: "stats",
        title: "Attendance Statistics",
        size: "medium",
        visible: true,
        position: 0,
        config: { showPercentage: true }
      },
      {
        id: "recent-activities",
        type: "list",
        title: "Recent Activities",
        size: "large",
        visible: true,
        position: 1,
        config: { limit: 5 }
      },
      {
        id: "performance-chart",
        type: "chart",
        title: "Performance Trends",
        size: "large",
        visible: userRole !== "EMPLOYEE",
        position: 2,
        config: { chartType: "line" }
      },
      {
        id: "leave-calendar",
        type: "calendar",
        title: "Leave Calendar",
        size: "medium",
        visible: true,
        position: 3,
        config: { view: "month" }
      },
      {
        id: "employee-count",
        type: "stats",
        title: "Employee Count",
        size: "small",
        visible: userRole !== "EMPLOYEE",
        position: 4,
        config: {}
      },
      {
        id: "announcements",
        type: "list",
        title: "Announcements",
        size: "medium",
        visible: true,
        position: 5,
        config: { limit: 3 }
      }
    ];

    setAvailableWidgets(available.filter(w => 
      userRole === "ADMIN" || 
      userRole === "MANAGER" || 
      w.visible
    ));
  };

  const getDefaultWidgets = (): Widget[] => {
    return availableWidgets.slice(0, 4);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedWidgets = items.map((widget, index) => ({
      ...widget,
      position: index
    }));

    setWidgets(updatedWidgets);
    saveWidgetConfiguration(updatedWidgets);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const updatedWidgets = widgets.map(widget =>
      widget.id === widgetId 
        ? { ...widget, visible: !widget.visible }
        : widget
    );
    setWidgets(updatedWidgets);
    saveWidgetConfiguration(updatedWidgets);
  };

  const addWidget = (widgetType: Widget) => {
    const newWidget = {
      ...widgetType,
      id: `${widgetType.type}-${Date.now()}`,
      position: widgets.length
    };
    const updatedWidgets = [...widgets, newWidget];
    setWidgets(updatedWidgets);
    saveWidgetConfiguration(updatedWidgets);
  };

  const removeWidget = (widgetId: string) => {
    const updatedWidgets = widgets.filter(w => w.id !== widgetId);
    setWidgets(updatedWidgets);
    saveWidgetConfiguration(updatedWidgets);
  };

  const saveWidgetConfiguration = async (widgetConfig: Widget[]) => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      await fetch("/api/dashboard/widgets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ widgets: widgetConfig }),
      });

      onWidgetUpdate?.(widgetConfig);
    } catch (error) {
      console.error("Failed to save widget configuration:", error);
    }
  };

  const getWidgetSizeClass = (size: string) => {
    switch (size) {
      case "small": return "col-span-1";
      case "medium": return "col-span-2";
      case "large": return "col-span-3";
      default: return "col-span-2";
    }
  };

  return (
    <div className="space-y-6">
      {/* Customization Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard Widgets</h2>
        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className={`btn-outline ${isCustomizing ? "bg-blue-50 border-blue-300" : ""}`}
        >
          <Cog6ToothIcon className="h-4 w-4 mr-2" />
          {isCustomizing ? "Done Customizing" : "Customize"}
        </button>
      </div>

      {/* Customization Panel */}
      {isCustomizing && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-blue-200">
          <h3 className="text-lg font-medium mb-4">Widget Configuration</h3>
          
          {/* Available Widgets */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Available Widgets</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="text-sm font-medium">{widget.title}</span>
                  <button
                    onClick={() => addWidget(widget)}
                    className="btn-sm bg-green-500 hover:bg-green-600 text-white"
                  >
                    <PlusIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Current Widgets */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Current Widgets</h4>
            <div className="space-y-2">
              {widgets.map((widget) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">{widget.title}</span>
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      {widget.size}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleWidgetVisibility(widget.id)}
                      className={`p-1 rounded ${widget.visible ? "text-green-600" : "text-gray-400"}`}
                    >
                      {widget.visible ? (
                        <EyeIcon className="h-4 w-4" />
                      ) : (
                        <EyeSlashIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeWidget(widget.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {widgets
                .filter(widget => widget.visible)
                .sort((a, b) => a.position - b.position)
                .map((widget, index) => (
                  <Draggable
                    key={widget.id}
                    draggableId={widget.id}
                    index={index}
                    isDragDisabled={!isCustomizing}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`${getWidgetSizeClass(widget.size)} ${
                          snapshot.isDragging ? "opacity-75" : ""
                        } ${isCustomizing ? "ring-2 ring-blue-300 ring-opacity-50" : ""}`}
                      >
                        <div className="bg-white rounded-lg shadow p-6 h-full">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              {widget.title}
                            </h3>
                            {isCustomizing && (
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                Drag to reorder
                              </div>
                            )}
                          </div>
                          
                          {/* Widget Content Placeholder */}
                          <div className="text-center text-gray-500 py-8">
                            <div className="text-4xl mb-2">
                              {widget.type === "stats" && "📊"}
                              {widget.type === "chart" && "📈"}
                              {widget.type === "list" && "📋"}
                              {widget.type === "calendar" && "📅"}
                            </div>
                            <p className="text-sm">
                              {widget.title} content will be rendered here
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
