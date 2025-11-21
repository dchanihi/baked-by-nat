import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Upload, Save, X } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Bake = Tables<'bakes'>;

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
  
  const [formData, setFormData] = useState({
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
  });

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
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="font-display">
          {bake ? 'Edit Bake' : 'Create New Bake'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="image">Image *</Label>
            <div className="mt-2">
              {imagePreview && (
                <div className="mb-4 rounded-lg overflow-hidden max-w-md">
                  <img src={imagePreview} alt="Preview" className="w-full h-auto" />
                </div>
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                required={!bake}
              />
            </div>
          </div>

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
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., cookies, cakes"
              />
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

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading || uploading}
              className="flex-1"
            >
              {loading || uploading ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Bake
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading || uploading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
