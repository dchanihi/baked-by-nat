import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

export const InventoryCategorySettings = () => {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('display_order');

    if (error) {
      toast({ title: 'Error loading categories', description: error.message, variant: 'destructive' });
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: 'Please enter a category name', variant: 'destructive' });
      return;
    }

    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) : 0;

    const { error } = await supabase
      .from('inventory_categories')
      .insert({
        name: newCategoryName.trim(),
        display_order: maxOrder + 1,
      });

    if (error) {
      toast({ title: 'Error adding category', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Category added' });
    setNewCategoryName('');
    loadCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category?')) return;

    const { error } = await supabase
      .from('inventory_categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting category', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Category deleted' });
    loadCategories();
  };

  const handleUpdateName = async (id: string, name: string) => {
    const { error } = await supabase
      .from('inventory_categories')
      .update({ name })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error updating category', description: error.message, variant: 'destructive' });
      return;
    }

    loadCategories();
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Inventory Categories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button onClick={handleAddCategory} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Categories list */}
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet. Add one above.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={category.name}
                      onChange={(e) => {
                        setCategories(prev => 
                          prev.map(c => c.id === category.id ? { ...c, name: e.target.value } : c)
                        );
                      }}
                      onBlur={(e) => handleUpdateName(category.id, e.target.value)}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
