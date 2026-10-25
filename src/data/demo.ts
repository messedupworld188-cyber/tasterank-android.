import type { CategoryId, Rating } from '../types';

interface DemoSeed {
  name: string;
  brand: string;
  flavor: string;
  category: CategoryId;
  score: number;
  review: string;
  daysAgo: number;
}

const SEEDS: DemoSeed[] = [
  {
    name: 'Sour Patch Kids Redberry',
    brand: 'Ghost Energy',
    flavor: 'Redberry',
    category: 'energy',
    score: 9.4,
    review:
      'Tastes almost exactly like the candy, which is the whole point. Sharp, carbonated and zero sugar aftertaste. My new benchmark for energy drinks.',
    daysAgo: 2,
  },
  {
    name: 'Cherry Slush',
    brand: 'Alani Nu',
    flavor: 'Cherry',
    category: 'energy',
    score: 8.7,
    review:
      'Clean cherry flavour without the syrupy finish. Great for a mid-afternoon can, though the 200mg of caffeine is no joke.',
    daysAgo: 5,
  },
  {
    name: 'Frozen Bombsicle',
    brand: 'C4 Energy',
    flavor: 'Blue raspberry',
    category: 'energy',
    score: 8.1,
    review: 'Bright, cold-tasting and easy to drink. Slightly artificial on the back end.',
    daysAgo: 11,
  },
  {
    name: 'Cookies & Cream',
    brand: 'Barebells',
    flavor: 'Cookies & cream',
    category: 'protein',
    score: 9.1,
    review:
      'Genuinely tastes like a chocolate bar and the texture does not fight back. 20g of protein with no chalkiness.',
    daysAgo: 3,
  },
  {
    name: 'Chocolate Chip Cookie Dough',
    brand: 'Quest',
    flavor: 'Cookie dough',
    category: 'protein',
    score: 7.4,
    review:
      'Dense and chewy in a good way, but the sweetness builds up by the last bite. Solid post-gym option.',
    daysAgo: 9,
  },
  {
    name: 'White Chocolate Oreo',
    brand: 'Grenade',
    flavor: 'White chocolate',
    category: 'protein',
    score: 8.6,
    review: 'Best of the Oreo protein bars. Sweet, crunchy centre, no weird aftertaste.',
    daysAgo: 18,
  },
  {
    name: "Flamin' Hot Nacho",
    brand: 'Doritos',
    flavor: 'Chilli lime',
    category: 'snacks',
    score: 8.8,
    review: 'Reliably dangerous. The heat lands at the end and the bag disappears too fast.',
    daysAgo: 6,
  },
  {
    name: 'Sea Salt & Vinegar Chips',
    brand: 'Kettle Brand',
    flavor: 'Sea salt & vinegar',
    category: 'snacks',
    score: 8.3,
    review: 'Thick cut, aggressive vinegar, perfect crunch. Leaves the roof of my mouth wrecked.',
    daysAgo: 15,
  },
  {
    name: 'Double SmokeShack',
    brand: 'Shake Shack',
    flavor: 'Smoked bacon, cherry pepper',
    category: 'restaurants',
    score: 9.2,
    review:
      'Best fast-casual burger I have had this year. The cherry peppers cut through the cheese sauce perfectly.',
    daysAgo: 1,
  },
  {
    name: 'Chicken Burrito Bowl',
    brand: 'Chipotle',
    flavor: 'Double chicken, hot salsa',
    category: 'restaurants',
    score: 8.5,
    review: 'Consistent and filling. Ask for extra fajita veg and it turns into a genuinely great bowl.',
    daysAgo: 13,
  },
  {
    name: 'Iced Brown Sugar Oat Shaken Espresso',
    brand: 'Starbucks',
    flavor: 'Brown sugar, oat milk',
    category: 'coffee',
    score: 7.8,
    review: 'Sweet but balanced. Too much ice on this order, still my default drive-thru pick.',
    daysAgo: 4,
  },
  {
    name: 'New Orleans Iced Coffee',
    brand: 'Blue Bottle',
    flavor: 'Chicory, milk',
    category: 'coffee',
    score: 8.4,
    review: 'Smooth, a little smoky from the chicory. Expensive but worth it on a slow morning.',
    daysAgo: 22,
  },
  {
    name: 'Phish Food',
    brand: "Ben & Jerry's",
    flavor: 'Chocolate, caramel, marshmallow',
    category: 'dessert',
    score: 9.5,
    review:
      'The caramel filled fish are the whole reason to buy it. Rich enough that one serving actually feels like enough.',
    daysAgo: 8,
  },
  {
    name: 'Pralines & Cream',
    brand: 'Häagen-Dazs',
    flavor: 'Praline, vanilla',
    category: 'dessert',
    score: 8.0,
    review: 'Simple, creamy and not too sweet. The praline pieces are generous.',
    daysAgo: 27,
  },
];

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(18, 30, 0, 0);
  return date.toISOString();
}

/** Builds a fresh set of demo ratings with dates relative to today. */
export function createDemoRatings(): Rating[] {
  return SEEDS.map((seed, index) => {
    const createdAt = daysAgoIso(seed.daysAgo);
    return {
      id: `demo_${index}_${Date.now().toString(36)}`,
      name: seed.name,
      brand: seed.brand,
      flavor: seed.flavor,
      category: seed.category,
      score: seed.score,
      review: seed.review,
      photoUri: null,
      barcode: null,
      source: 'manual',
      createdAt,
      updatedAt: createdAt,
      isDemo: true,
    } satisfies Rating;
  });
}
