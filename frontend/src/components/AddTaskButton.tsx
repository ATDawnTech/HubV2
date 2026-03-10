import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";

interface AddTaskButtonProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const AddTaskButton: React.FC<AddTaskButtonProps> = ({ onClick, className = "", children }) => (
  <Button onClick={onClick} variant="outline" className={className}>
    <Plus className="mr-2 h-4 w-4" />
    {children || "Add Task"}
  </Button>
);
