"use client";

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface DragDropWrapperProps {
  onDragEnd: (event: DragEndEvent) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DragDropWrapper({ onDragEnd, children, disabled = false }: DragDropWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (disabled) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!disabled) {
      onDragEnd(event);
    }
  };

  // Se disabled, apenas retornar os children sem DndContext
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay>
        {activeId ? (
          <div className="opacity-50">
            Movendo ticket...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}