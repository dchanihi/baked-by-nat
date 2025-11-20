export interface Bake {
  id: string;
  title: string;
  date: string;
  image: string;
  caption: string;
  description: string;
  category: string;
  tags: string[];
}

export const bakes: Bake[] = [
  {
    id: '1',
    title: 'strawberry milk cupcakes',
    date: '2025-01-15',
    image: '/src/assets/strawberry-cupcakes.jpg',
    caption: 'fluffy vanilla cupcakes with strawberry cream cheese frosting ♡',
    description: 'these cupcakes are my absolute favorite! made with real strawberry puree in the frosting and topped with fresh strawberries. perfect for spring picnics or just because you deserve something sweet.',
    category: 'cupcakes',
    tags: ['strawberry', 'vanilla', 'cream cheese']
  },
  {
    id: '2',
    title: 'heart sugar cookies',
    date: '2025-01-12',
    image: '/src/assets/heart-cookies.jpg',
    caption: 'buttery sugar cookies decorated with pastel pink icing',
    description: 'classic sugar cookies that melt in your mouth! decorated with royal icing and cute sprinkles. these are perfect for sharing with friends or treating yourself.',
    category: 'cookies',
    tags: ['sugar cookies', 'decorated', 'hearts']
  },
  {
    id: '3',
    title: 'vanilla dream cake',
    date: '2025-01-08',
    image: '/src/assets/vanilla-cake.jpg',
    caption: 'layers of vanilla sponge with pink buttercream',
    description: 'a show-stopping vanilla cake with the fluffiest buttercream frosting. decorated with edible flowers and a touch of gold leaf for that extra special feeling.',
    category: 'cakes',
    tags: ['vanilla', 'buttercream', 'celebration']
  },
  {
    id: '4',
    title: 'matcha macarons',
    date: '2025-01-05',
    image: '/src/assets/matcha-macarons.jpg',
    caption: 'delicate french macarons with matcha cream filling',
    description: 'these little beauties took a few tries to perfect! crispy on the outside, chewy on the inside, with a smooth matcha cream filling. worth every attempt!',
    category: 'cookies',
    tags: ['matcha', 'french', 'macarons']
  },
  {
    id: '5',
    title: 'cinnamon rolls',
    date: '2025-01-02',
    image: '/src/assets/cinnamon-rolls.jpg',
    caption: 'soft and gooey cinnamon rolls with cream cheese glaze',
    description: "there's nothing quite like homemade cinnamon rolls on a lazy sunday morning. these are packed with cinnamon sugar and topped with the dreamiest cream cheese frosting.",
    category: 'breads',
    tags: ['cinnamon', 'breakfast', 'sweet bread']
  },
  {
    id: '6',
    title: 'chocolate chip cookies',
    date: '2024-12-28',
    image: '/src/assets/chocolate-chip-cookies.jpg',
    caption: 'classic chocolate chip cookies with gooey centers',
    description: 'the ultimate comfort cookie! crispy edges, soft centers, and pools of melted chocolate in every bite. my go-to recipe for cookie cravings.',
    category: 'cookies',
    tags: ['chocolate chip', 'classic', 'comfort']
  }
];
