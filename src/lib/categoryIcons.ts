import {
  Cookie, Cake, CakeSlice, Croissant, IceCream, Cherry, Coffee, Candy, 
  Package, UtensilsCrossed, Heart, Star, Sparkles, CircleDot, Donut,
  Sandwich, Pizza, Beef, Apple, Citrus, Grape, Banana, Carrot,
  Milk, Egg, Wheat, ChefHat, CupSoda, Salad, Hop, Circle,
  type LucideIcon
} from 'lucide-react';

// Comprehensive list of baked goods and food-related icons
export const CATEGORY_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: 'cookie', icon: Cookie, label: 'Cookie' },
  { name: 'cake', icon: Cake, label: 'Cake' },
  { name: 'cake-slice', icon: CakeSlice, label: 'Cake Slice' },
  { name: 'cupcake', icon: CupSoda, label: 'Cupcake/Muffin' },
  { name: 'croissant', icon: Croissant, label: 'Croissant' },
  { name: 'loaf', icon: Sandwich, label: 'Loaf/Bread' },
  { name: 'sourdough', icon: Salad, label: 'Sourdough' },
  { name: 'macaron', icon: Circle, label: 'Macaron' },
  { name: 'ice-cream', icon: IceCream, label: 'Ice Cream' },
  { name: 'cherry', icon: Cherry, label: 'Cherry' },
  { name: 'coffee', icon: Coffee, label: 'Coffee' },
  { name: 'candy', icon: Candy, label: 'Candy' },
  { name: 'donut', icon: Donut, label: 'Donut' },
  { name: 'sandwich', icon: Sandwich, label: 'Sandwich' },
  { name: 'pizza', icon: Pizza, label: 'Pizza/Pie' },
  { name: 'beef', icon: Beef, label: 'Savory' },
  { name: 'apple', icon: Apple, label: 'Apple' },
  { name: 'citrus', icon: Citrus, label: 'Citrus' },
  { name: 'grape', icon: Grape, label: 'Grape' },
  { name: 'banana', icon: Banana, label: 'Banana' },
  { name: 'carrot', icon: Carrot, label: 'Carrot' },
  { name: 'milk', icon: Milk, label: 'Milk/Dairy' },
  { name: 'egg', icon: Egg, label: 'Egg' },
  { name: 'wheat', icon: Wheat, label: 'Wheat/Grain' },
  { name: 'hop', icon: Hop, label: 'Hop/Yeast' },
  { name: 'chef-hat', icon: ChefHat, label: 'Chef Special' },
  { name: 'utensils', icon: UtensilsCrossed, label: 'Utensils' },
  { name: 'heart', icon: Heart, label: 'Heart' },
  { name: 'star', icon: Star, label: 'Star' },
  { name: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'circle-dot', icon: CircleDot, label: 'Circle Dot' },
  { name: 'package', icon: Package, label: 'Package' },
];

export const getIconComponent = (iconName: string | null | undefined): LucideIcon => {
  const found = CATEGORY_ICONS.find(i => i.name === iconName);
  return found?.icon || Cookie;
};
