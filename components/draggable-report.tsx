"use client"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import type { ReportBlock } from "@/lib/report-blocks"

function SortableBlock({ block }: { block: ReportBlock }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !block.draggable })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={`relative ${block.draggable ? "group" : ""}`}>
      {block.draggable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div dangerouslySetInnerHTML={{ __html: block.html }} />
    </div>
  )
}

interface DraggableReportProps {
  blocks: ReportBlock[]
  onReorder: (blocks: ReportBlock[]) => void
}

export function DraggableReport({ blocks, onReorder }: DraggableReportProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id)
      const newIndex = blocks.findIndex(b => b.id === over.id)
      onReorder(arrayMove(blocks, oldIndex, newIndex))
    }
  }

  const sortableIds = blocks.filter(b => b.draggable).map(b => b.id)

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        {blocks.map(block => (
          <SortableBlock key={block.id} block={block} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
