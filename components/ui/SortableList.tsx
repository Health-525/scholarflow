"use client";

import type {
  DragEndEvent,
  DragStartEvent} from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import type { ReactNode} from "react";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface SortableItemProps {
  id: string;
  children: ReactNode;
  showGrip?: boolean;
  className?: string;
}

export function SortableItem({ id, children, showGrip = true, className = "" }: SortableItemProps) {
  const reducedMotion = usePrefersReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: reducedMotion ? undefined : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/section flex items-center gap-2 ${className}`}
    >
      {showGrip && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="shrink-0 min-h-8 min-w-8 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary cursor-grab active:cursor-grabbing touch-none opacity-0 group-hover/section:opacity-100 transition-opacity duration-200"
          aria-label="拖动排序"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  renderDragOverlay?: (item: T) => ReactNode;
  className?: string;
  itemClassName?: string;
  showGrip?: boolean;
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  renderDragOverlay,
  className = "space-y-2",
  itemClassName = "",
  showGrip = true,
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              showGrip={showGrip}
              className={itemClassName}
            >
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem && renderDragOverlay ? (
          <div className="opacity-90 scale-[1.02] shadow-lg cursor-grabbing">
            {renderDragOverlay(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
