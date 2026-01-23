import { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, Edit2, Trash2, ChefHat, Search, X, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BakeCategory {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string | null;
  cost_per_unit: number | null;
  category: string | null;
}

interface RecipeIngredient {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  inventory_item?: InventoryItem;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  yield_quantity: number;
  yield_unit: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  ingredients?: RecipeIngredient[];
}

interface TempIngredient {
  inventory_item_id: string;
  quantity: number;
  unit: string;
}

const RecipesContent = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [bakeCategories, setBakeCategories] = useState<BakeCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    yield_quantity: 1,
    yield_unit: 'pc',
    category: '',
  });
  const [tempIngredients, setTempIngredients] = useState<TempIngredient[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [openIngredientPopover, setOpenIngredientPopover] = useState<number | null>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRecipes();
    loadInventory();
    loadBakeCategories();
  }, []);

  const loadRecipes = async () => {
    const { data: recipesData, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .order('name');

    if (recipesError) {
      toast({ title: 'Error loading recipes', description: recipesError.message, variant: 'destructive' });
      return;
    }

    // Load ingredients for each recipe
    const recipesWithIngredients = await Promise.all(
      (recipesData || []).map(async (recipe) => {
        const { data: ingredientsData } = await supabase
          .from('recipe_ingredients')
          .select('*')
          .eq('recipe_id', recipe.id);

        return {
          ...recipe,
          ingredients: ingredientsData || [],
        };
      })
    );

    setRecipes(recipesWithIngredients);
  };

  const loadInventory = async () => {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, unit, cost_per_unit, category')
      .order('name');

    if (error) {
      toast({ title: 'Error loading inventory', description: error.message, variant: 'destructive' });
      return;
    }

    setInventoryItems(data || []);
  };

  const loadBakeCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('display_order');

    if (error) {
      toast({ title: 'Error loading categories', description: error.message, variant: 'destructive' });
      return;
    }

    setBakeCategories(data || []);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      yield_quantity: 1,
      yield_unit: 'pc',
      category: '',
    });
    // Start with one empty row for new ingredients
    setTempIngredients([{ inventory_item_id: '', quantity: 0, unit: 'g' }]);
    setEditingRecipe(null);
    setCategorySearch('');
    setShowCategoryDropdown(false);
    setIsDescriptionOpen(false);
    setOpenIngredientPopover(null);
  };

  const openEditDialog = async (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      yield_quantity: recipe.yield_quantity,
      yield_unit: recipe.yield_unit || 'pc',
      category: recipe.category || '',
    });
    setCategorySearch(recipe.category || '');
    setIsDescriptionOpen(false); // Auto-collapse description

    // Load existing ingredients
    const { data: ingredientsData } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipe.id);

    const existingIngredients = (ingredientsData || []).map((ing) => ({
      inventory_item_id: ing.inventory_item_id,
      quantity: Number(ing.quantity),
      unit: ing.unit,
    }));
    
    // Add an empty row for adding new ingredients
    setTempIngredients([...existingIngredients, { inventory_item_id: '', quantity: 0, unit: 'g' }]);
    setIsDialogOpen(true);
  };

  const filteredBakeCategories = useMemo(() => {
    if (!categorySearch) return bakeCategories;
    return bakeCategories.filter((cat) =>
      cat.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [bakeCategories, categorySearch]);

  const handleCategorySelect = (categoryName: string) => {
    setFormData({ ...formData, category: categoryName });
    setCategorySearch(categoryName);
    setShowCategoryDropdown(false);
  };

  const updateIngredient = (index: number, field: keyof TempIngredient, value: string | number) => {
    const updated = [...tempIngredients];
    updated[index] = { ...updated[index], [field]: value };
    
    // If updating inventory_item_id, also set default unit from inventory
    if (field === 'inventory_item_id' && value) {
      const item = getInventoryItemById(value as string);
      if (item?.unit) {
        updated[index].unit = item.unit;
      }
    }
    
    setTempIngredients(updated);
    
    // Auto-add new row if the last row now has an item selected
    if (index === tempIngredients.length - 1 && field === 'inventory_item_id' && value) {
      setTempIngredients([...updated, { inventory_item_id: '', quantity: 0, unit: 'g' }]);
    }
  };

  const removeIngredient = (index: number) => {
    // Don't remove if it's the last empty row
    if (tempIngredients.length === 1) {
      setTempIngredients([{ inventory_item_id: '', quantity: 0, unit: 'g' }]);
      return;
    }
    const updated = tempIngredients.filter((_, i) => i !== index);
    // Ensure there's always at least one empty row at the end
    const lastItem = updated[updated.length - 1];
    if (lastItem && lastItem.inventory_item_id) {
      updated.push({ inventory_item_id: '', quantity: 0, unit: 'g' });
    }
    setTempIngredients(updated);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    // Filter out empty ingredient rows
    const validIngredients = tempIngredients.filter(ing => ing.inventory_item_id && ing.quantity > 0);
    
    if (validIngredients.length === 0) {
      toast({ title: 'Please add at least one ingredient', variant: 'destructive' });
      return;
    }

    try {
      if (editingRecipe) {
        // Update recipe
        const { error: updateError } = await supabase
          .from('recipes')
          .update({
            name: formData.name,
            description: formData.description || null,
            yield_quantity: formData.yield_quantity,
            yield_unit: formData.yield_unit,
            category: formData.category || null,
          })
          .eq('id', editingRecipe.id);

        if (updateError) throw updateError;

        // Delete existing ingredients and re-add
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', editingRecipe.id);

        // Insert new ingredients
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            validIngredients.map((ing) => ({
              recipe_id: editingRecipe.id,
              inventory_item_id: ing.inventory_item_id,
              quantity: ing.quantity,
              unit: ing.unit,
            }))
          );

        if (ingredientsError) throw ingredientsError;

        toast({ title: 'Recipe updated successfully' });
      } else {
        // Create recipe
        const { data: newRecipe, error: createError } = await supabase
          .from('recipes')
          .insert({
            name: formData.name,
            description: formData.description || null,
            yield_quantity: formData.yield_quantity,
            yield_unit: formData.yield_unit,
            category: formData.category || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert ingredients
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            validIngredients.map((ing) => ({
              recipe_id: newRecipe.id,
              inventory_item_id: ing.inventory_item_id,
              quantity: ing.quantity,
              unit: ing.unit,
            }))
          );

        if (ingredientsError) throw ingredientsError;

        toast({ title: 'Recipe created successfully' });
      }

      setIsDialogOpen(false);
      resetForm();
      loadRecipes();
    } catch (error: any) {
      toast({ title: 'Error saving recipe', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    const { error } = await supabase.from('recipes').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error deleting recipe', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Recipe deleted successfully' });
    loadRecipes();
  };

  const getInventoryItemById = (id: string): InventoryItem | undefined => {
    return inventoryItems.find((item) => item.id === id);
  };

  // Get available inventory items (not already used in other rows)
  const getAvailableInventoryItems = (currentIndex: number) => {
    const usedIds = tempIngredients
      .filter((_, i) => i !== currentIndex)
      .map((ing) => ing.inventory_item_id)
      .filter(Boolean);
    return inventoryItems.filter((item) => !usedIds.includes(item.id));
  };

  // Calculate total cost from temp ingredients
  const calculateTempTotalCost = () => {
    return tempIngredients.reduce((sum, ing) => {
      if (!ing.inventory_item_id) return sum;
      const item = getInventoryItemById(ing.inventory_item_id);
      return sum + (item?.cost_per_unit ? ing.quantity * Number(item.cost_per_unit) : 0);
    }, 0);
  };

  const calculateRecipeCost = (recipe: Recipe) => {
    if (!recipe.ingredients) return 0;
    return recipe.ingredients.reduce((sum, ing) => {
      const item = getInventoryItemById(ing.inventory_item_id);
      if (!item || !item.cost_per_unit) return sum;
      return sum + Number(ing.quantity) * Number(item.cost_per_unit);
    }, 0);
  };

  const calculateCostPerUnit = (recipe: Recipe) => {
    const totalCost = calculateRecipeCost(recipe);
    return recipe.yield_quantity > 0 ? totalCost / recipe.yield_quantity : 0;
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recipes, searchQuery]);

  const mostPopularRecipe = useMemo(() => {
    if (recipes.length === 0) return null;
    // Find recipe with most ingredients as a proxy for complexity/popularity
    return recipes.reduce((prev, curr) => 
      (curr.ingredients?.length || 0) > (prev.ingredients?.length || 0) ? curr : prev
    , recipes[0]);
  }, [recipes]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Recipes</h2>
          <p className="text-muted-foreground">Manage recipes and calculate COGS</p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Recipe Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Chocolate Chip Cookies"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="yield_quantity">Yield Quantity</Label>
                    <Input
                      id="yield_quantity"
                      type="number"
                      min="1"
                      value={formData.yield_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, yield_quantity: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Yield Unit</Label>
                    <ToggleGroup
                      type="single"
                      value={formData.yield_unit}
                      onValueChange={(value) => {
                        if (value) setFormData({ ...formData, yield_unit: value });
                      }}
                      className="justify-start mt-1"
                    >
                      <ToggleGroupItem value="g" aria-label="Grams" className="px-4">
                        g
                      </ToggleGroupItem>
                      <ToggleGroupItem value="kg" aria-label="Kilograms" className="px-4">
                        kg
                      </ToggleGroupItem>
                      <ToggleGroupItem value="pc" aria-label="Pieces" className="px-4">
                        pc
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="relative">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      ref={categoryInputRef}
                      id="category"
                      value={categorySearch}
                      onChange={(e) => {
                        setCategorySearch(e.target.value);
                        setFormData({ ...formData, category: e.target.value });
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() => {
                        // Delay to allow click on dropdown items
                        setTimeout(() => setShowCategoryDropdown(false), 150);
                      }}
                      placeholder="Search categories..."
                    />
                    {showCategoryDropdown && filteredBakeCategories.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredBakeCategories.map((cat) => (
                          <div
                            key={cat.id}
                            className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleCategorySelect(cat.name)}
                          >
                            {cat.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Collapsible Description */}
                <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between px-0 hover:bg-transparent">
                      <Label className="cursor-pointer">Description</Label>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", isDescriptionOpen && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Recipe description or notes"
                      rows={2}
                      className="mt-1"
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Ingredients Section - Tabular Format */}
              <div className="space-y-2">
                <h3 className="font-semibold">Ingredients</h3>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[45%]">Inventory Item</TableHead>
                        <TableHead className="w-[20%] text-center">Qty</TableHead>
                        <TableHead className="w-[20%] text-center">Unit</TableHead>
                        <TableHead className="w-[10%] text-right">Cost</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tempIngredients.map((ing, index) => {
                        const item = ing.inventory_item_id ? getInventoryItemById(ing.inventory_item_id) : null;
                        const cost = item?.cost_per_unit ? ing.quantity * Number(item.cost_per_unit) : 0;
                        const availableItems = getAvailableInventoryItems(index);
                        
                        return (
                          <TableRow key={index} className="group">
                            <TableCell className="p-1">
                              <Popover 
                                open={openIngredientPopover === index} 
                                onOpenChange={(open) => setOpenIngredientPopover(open ? index : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between h-9 font-normal"
                                  >
                                    {item ? (
                                      <span className="truncate">{item.name}</span>
                                    ) : (
                                      <span className="text-muted-foreground">Select item...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search inventory..." />
                                    <CommandList>
                                      <CommandEmpty>No item found.</CommandEmpty>
                                      <CommandGroup>
                                        {availableItems.map((invItem) => (
                                          <CommandItem
                                            key={invItem.id}
                                            value={invItem.name}
                                            onSelect={() => {
                                              updateIngredient(index, 'inventory_item_id', invItem.id);
                                              setOpenIngredientPopover(null);
                                            }}
                                          >
                                            <span>{invItem.name}</span>
                                            {invItem.category && (
                                              <span className="ml-2 text-xs text-muted-foreground">
                                                ({invItem.category})
                                              </span>
                                            )}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={ing.quantity || ''}
                                onChange={(e) => updateIngredient(index, 'quantity', Number(e.target.value))}
                                className="h-9 text-center"
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <ToggleGroup
                                type="single"
                                value={ing.unit}
                                onValueChange={(value) => {
                                  if (value) updateIngredient(index, 'unit', value);
                                }}
                                className="justify-center"
                                size="sm"
                              >
                                <ToggleGroupItem value="g" aria-label="Grams" className="h-9 px-2 text-xs">g</ToggleGroupItem>
                                <ToggleGroupItem value="kg" aria-label="Kilograms" className="h-9 px-2 text-xs">kg</ToggleGroupItem>
                                <ToggleGroupItem value="pc" aria-label="Pieces" className="h-9 px-2 text-xs">pc</ToggleGroupItem>
                              </ToggleGroup>
                            </TableCell>
                            <TableCell className="p-1 text-right text-sm text-muted-foreground">
                              {cost > 0 ? `$${cost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="p-1">
                              {ing.inventory_item_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeIngredient(index)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total row */}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell colSpan={3} className="text-right">Total Cost</TableCell>
                        <TableCell className="text-right">${calculateTempTotalCost().toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingRecipe ? 'Update Recipe' : 'Create Recipe'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Popular Recipe</CardTitle>
          <ChefHat className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {mostPopularRecipe ? (
            <div>
              <div className="text-2xl font-bold">{mostPopularRecipe.name}</div>
              <p className="text-xs text-muted-foreground">
                {mostPopularRecipe.ingredients?.length || 0} ingredients • ${calculateRecipeCost(mostPopularRecipe).toFixed(2)} cost
              </p>
            </div>
          ) : (
            <div className="text-2xl font-bold text-muted-foreground">No recipes yet</div>
          )}
        </CardContent>
      </Card>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipe Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right">Ingredients</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Cost/Unit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No recipes match your search' : 'No recipes yet. Create your first recipe!'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecipes.map((recipe) => {
                  const totalCost = calculateRecipeCost(recipe);
                  const costPerUnit = calculateCostPerUnit(recipe);
                  return (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">
                        <div>
                          {recipe.name}
                          {recipe.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {recipe.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {recipe.category ? (
                          <Badge variant="outline">{recipe.category}</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {recipe.yield_quantity} {recipe.yield_unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {recipe.ingredients?.length || 0}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-primary font-semibold">${costPerUnit.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(recipe)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(recipe.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecipesContent;
