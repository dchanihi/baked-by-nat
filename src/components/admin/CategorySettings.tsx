import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, GripVertical, Pencil, Check, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Category = Tables<'categories'>;

const SortableCategory = ({ 
  category, 
  onDelete, 
  onEdit, 
  isEditing, 
  editValue, 
  onEditChange, 
  onSaveEdit, 
  onCancelEdit 
}: { 
  category: Category; 
  onDelete: (id: string, name: string) => void;
  onEdit: (id: string, name: string) => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      {isEditing ? (
        <>
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1"
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveEdit}
            className="text-green-600 hover:text-green-700"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 font-medium">{category.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category.id, category.name)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(category.id, category.name)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export const CategorySettings = () => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [replacementCategoryId, setReplacementCategoryId] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load categories.',
        variant: 'destructive',
      });
    } else {
      setCategories(data || []);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.trim()) return;

    setLoading(true);
    const maxOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.display_order)) 
      : 0;

    const { error } = await supabase
      .from('categories')
      .insert({ 
        name: newCategory.trim(),
        display_order: maxOrder + 1
      });

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add category.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Category added successfully.',
      });
      setNewCategory('');
      loadCategories();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setCategoryToDelete({ id, name });
    setReplacementCategoryId('');
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    // Update all bakes with this category to the replacement category
    if (replacementCategoryId) {
      const { error: updateError } = await supabase
        .from('bakes')
        .update({ category: categories.find(c => c.id === replacementCategoryId)?.name })
        .eq('category', categoryToDelete.name);

      if (updateError) {
        toast({
          title: 'Error',
          description: 'Failed to update bakes with new category.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Delete the category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryToDelete.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Category deleted and bakes updated successfully.',
      });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      setReplacementCategoryId('');
      loadCategories();
    }
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() || !editingId) return;

    const { error } = await supabase
      .from('categories')
      .update({ name: editValue.trim() })
      .eq('id', editingId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Category updated successfully.',
      });
      setEditingId(null);
      setEditValue('');
      loadCategories();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);

    const newOrder = arrayMove(categories, oldIndex, newIndex);
    setCategories(newOrder);

    // Update display_order for all affected categories
    const updates = newOrder.map((cat, index) => ({
      id: cat.id,
      display_order: index + 1,
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('categories')
        .update({ display_order: update.display_order })
        .eq('id', update.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update category order.',
          variant: 'destructive',
        });
        loadCategories(); // Reload to reset on error
        return;
      }
    }

    toast({
      title: 'Success',
      description: 'Category order updated.',
    });
  };

  const availableReplacementCategories = categories.filter(
    cat => cat.id !== categoryToDelete?.id
  );

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-display">manage categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="new-category">Add New Category</Label>
          <div className="flex gap-2">
            <Input
              id="new-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g., Macarons"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button 
              onClick={handleAdd}
              disabled={loading || !newCategory.trim()}
              className="bg-pink-soft hover:bg-pink-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Existing Categories</Label>
          <p className="text-sm text-muted-foreground">Drag to reorder categories</p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No categories yet. Add your first one above!
                </p>
              ) : (
                <SortableContext
                  items={categories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categories.map((category) => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      isEditing={editingId === category.id}
                      editValue={editValue}
                      onEditChange={setEditValue}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
          </DndContext>
        </div>
      </CardContent>
    </Card>

    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            You are about to delete "{categoryToDelete?.name}". 
            {availableReplacementCategories.length > 0 ? (
              <> Please select a category to reassign all bakes currently using this category.</>
            ) : (
              <> There are no other categories available. All bakes using this category will have their category cleared.</>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {availableReplacementCategories.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="replacement-category">Replacement Category</Label>
            <Select value={replacementCategoryId} onValueChange={setReplacementCategoryId}>
              <SelectTrigger id="replacement-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {availableReplacementCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDeleteDialogOpen(false);
              setCategoryToDelete(null);
              setReplacementCategoryId('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={availableReplacementCategories.length > 0 && !replacementCategoryId}
          >
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};