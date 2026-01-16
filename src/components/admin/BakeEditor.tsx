import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Upload, Save, X, DollarSign } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;

interface Recipe {
  id: string;
  name: string;
  yield_quantity: number;
  category: string | null;
}

interface BakeEditorProps {
  bake: Bake | null;
  onSave: () => void;
  onCancel: () => void;
}

export const BakeEditor = ({ bake, onSave, onCancel }: BakeEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(bake?.image_url || '');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeCost, setRecipeCost] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const initialFormData = {
    title: bake?.title || '',
    description: bake?.description || '',
    caption: bake?.caption || '',
    category: bake?.category || '',
    tags: bake?.tags?.join(', ') || '',
    date: bake?.date || new Date().toISOString().split('T')[0],
    status: bake?.status || 'draft',
    scheduled_publish_date: bake?.scheduled_publish_date 
      ? new Date(bake.scheduled_publish_date).toISOString().slice(0, 16)
      : '',
    image_position: bake?.image_position || 'center',
    recipe_id: bake?.recipe_id || '',
  };
  
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    loadCategories();
    loadRecipes();
  }, []);

  useEffect(() => {
    if (formData.recipe_id) {
      calculateRecipeCost(formData.recipe_id);
    } else {
      setRecipeCost(null);
    }
  }, [formData.recipe_id]);

  useEffect(() => {
    const hasChanges = 
      formData.title !== initialFormData.title ||
      formData.description !== initialFormData.description ||
      formData.caption !== initialFormData.caption ||
      formData.category !== initialFormData.category ||
      formData.tags !== initialFormData.tags ||
      formData.date !== initialFormData.date ||
      formData.status !== initialFormData.status ||
      formData.scheduled_publish_date !== initialFormData.scheduled_publish_date ||
      formData.image_position !== initialFormData.image_position ||
      formData.recipe_id !== initialFormData.recipe_id ||
      imageFile !== null;
    
    setHasUnsavedChanges(hasChanges);
  }, [formData, imageFile, initialFormData]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('display_order', { ascending: true });
    
    if (data) {
      setCategories(data);
    }
  };

  const loadRecipes = async () => {
    const { data } = await supabase
      .from('recipes')
      .select('id, name, yield_quantity, category')
      .order('name');
    
    if (data) {
      setRecipes(data);
    }
  };

  const calculateRecipeCost = async (recipeId: string) => {
    // Get recipe ingredients
    const { data: ingredients } = await supabase
      .from('recipe_ingredients')
      .select('quantity, inventory_item_id')
      .eq('recipe_id', recipeId);

    if (!ingredients || ingredients.length === 0) {
      setRecipeCost(0);
      return;
    }

    // Get inventory items with costs
    const itemIds = ingredients.map(i => i.inventory_item_id);
    const { data: items } = await supabase
      .from('inventory')
      .select('id, cost_per_unit')
      .in('id', itemIds);

    if (!items) {
      setRecipeCost(0);
      return;
    }

    // Calculate total cost
    const totalCost = ingredients.reduce((sum, ing) => {
      const item = items.find(i => i.id === ing.inventory_item_id);
      if (!item || !item.cost_per_unit) return sum;
      return sum + Number(ing.quantity) * Number(item.cost_per_unit);
    }, 0);

    // Get yield quantity for cost per unit
    const recipe = recipes.find(r => r.id === recipeId);
    const yieldQty = recipe?.yield_quantity || 1;
    setRecipeCost(totalCost / yieldQty);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return bake?.image_url || null;

    setUploading(true);
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bake-images')
      .upload(filePath, imageFile);

    setUploading(false);

    if (uploadError) {
      toast({
        title: 'Error',
        description: 'Failed to upload image.',
        variant: 'destructive',
      });
      return null;
    }

    const { data } = supabase.storage
      .from('bake-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const imageUrl = await uploadImage();
    if (imageFile && !imageUrl) {
      setLoading(false);
      return;
    }

    const tagsArray = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const { data: { user } } = await supabase.auth.getUser();

    const bakeData = {
      title: formData.title,
      description: formData.description,
      caption: formData.caption || null,
      category: formData.category || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      date: formData.date,
      status: formData.status,
      scheduled_publish_date: formData.scheduled_publish_date || null,
      image_url: imageUrl!,
      image_position: formData.image_position,
      recipe_id: formData.recipe_id || null,
      created_by: user?.id,
    };

    const { error } = bake
      ? await supabase.from('bakes').update(bakeData).eq('id', bake.id)
      : await supabase.from('bakes').insert(bakeData);

    setLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Bake ${bake ? 'updated' : 'created'} successfully.`,
      });
      onSave();
    }
  };

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <CardTitle className="font-display">
            {bake ? 'Edit Bake' : 'Create New Bake'}
          </CardTitle>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={loading || uploading}
            size="sm"
            form="bake-form"
          >
            {loading || uploading ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading || uploading}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form id="bake-form" onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Image Section */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="image">Image *</Label>
                <div className="mt-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required={!bake}
                    className="mb-4"
                  />
                  {imagePreview && (
                    <div className="rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-auto" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Form Fields */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g., chocolate, vanilla"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="archive">Archive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="scheduled">Schedule Publish Date (optional)</Label>
                <Input
                  id="scheduled"
                  type="datetime-local"
                  value={formData.scheduled_publish_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_publish_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="recipe">Linked Recipe (for COGS)</Label>
                <Select
                  value={formData.recipe_id}
                  onValueChange={(value) => setFormData({ ...formData, recipe_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a recipe (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {recipeCost !== null && formData.recipe_id && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    COGS per unit: ${recipeCost.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
