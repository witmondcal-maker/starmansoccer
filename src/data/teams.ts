/**
 * The one copy of every team and squad the game loads.
 * Eagle's Ning is canonical in .cursor/skills/starman-soccer/references/roster.md.
 * Every name is fictional. Never add a real footballer's name or a twist on one.
 */

export type Position = 'GK' | 'RB' | 'LB' | 'CB' | 'CM' | 'RM' | 'LM' | 'ST' | 'DF' | 'MF' | 'FW';

export type ShirtPattern = 'star' | 'plain' | 'band' | 'stripes' | 'sash' | 'collar';

export interface Kit {
  shirt: number;
  trim: number;
  shorts: number;
  socks: number;
  pattern: ShirtPattern;
  gkShirt: number;
  gkShorts: number;
}

export interface SquadPlayer {
  number: number;
  name: string;
  position: Position;
  starter: boolean;
}

export interface Team {
  id: string;
  name: string;
  kit: Kit;
  squad: readonly SquadPlayer[];
}

/** 4-4-2 starters (numbers 1–11), then 7 reserves (12–18). */
const SQUAD_SHAPE: readonly Position[] = [
  'GK', 'RB', 'LB', 'CB', 'CB', 'CM', 'RM', 'CM', 'ST', 'ST', 'LM',
  'GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW',
];

function squad(names: readonly string[]): SquadPlayer[] {
  if (names.length !== SQUAD_SHAPE.length) {
    throw new Error(`A squad needs ${SQUAD_SHAPE.length} names, got ${names.length}`);
  }
  return names.map((name, i) => ({
    number: i + 1,
    name,
    position: SQUAD_SHAPE[i],
    starter: i < 11,
  }));
}

export const EAGLES_NING: Team = {
  id: 'eagles-ning',
  name: "Eagle's Ning",
  kit: {
    shirt: 0x1d2b64,
    trim: 0xffd23a,
    shorts: 0xf2b705,
    socks: 0xf6f6f6,
    pattern: 'star',
    gkShirt: 0x2fa84f,
    gkShorts: 0x1d2b64,
  },
  squad: squad([
    'George', 'Soldier', 'Fighter', 'Blood', 'Hawk', 'Delf', 'Rox', 'Grigo', 'Ronaldian', 'Starman', 'Starcan',
    'Flint', 'Vigor', 'Nox', 'Blitz', 'Grif', 'Comet', 'Jolt',
  ]),
};

function country(id: string, name: string, kit: Kit, names: readonly string[]): Team {
  return { id, name, kit, squad: squad(names) };
}

export const COUNTRIES: readonly Team[] = [
  country('brazil', 'Brazil',
    { shirt: 0xf7d417, trim: 0x1f9e45, shorts: 0x2350c8, socks: 0xf6f6f6, pattern: 'collar', gkShirt: 0x3a3a3a, gkShorts: 0x3a3a3a },
    ['Mango', 'Papaya', 'Toucan', 'Parrot', 'Cashew', 'Guava', 'Macaw', 'Lagoon', 'Palm', 'Coconut', 'Tapir',
      'Sloth', 'Orchid', 'Canopy', 'Breeze', 'Samba', 'Lime', 'Jaguar']),
  country('argentina', 'Argentina',
    { shirt: 0x8fd0ff, trim: 0xf6f6f6, shorts: 0x1c1c3a, socks: 0xf6f6f6, pattern: 'stripes', gkShirt: 0x7a3cc8, gkShorts: 0x1c1c3a },
    ['Condor', 'Tango', 'Llama', 'Glacier', 'Cactus', 'Canyon', 'Lasso', 'Saddle', 'Spur', 'Gallop', 'Poncho',
      'Summit', 'Dusty', 'Pebble', 'Flare', 'Ridge', 'Nimbus', 'Tumble']),
  country('france', 'France',
    { shirt: 0x2d5be3, trim: 0xe23a3a, shorts: 0xf6f6f6, socks: 0xe23a3a, pattern: 'band', gkShirt: 0xf2c230, gkShorts: 0x3a3a3a },
    ['Crepe', 'Beret', 'Mistral', 'Lavender', 'Truffle', 'Canal', 'Velvet', 'Violet', 'Chime', 'Lantern', 'Easel',
      'Pastel', 'Plume', 'Rooster', 'Satin', 'Tower', 'Quill', 'Meadow']),
  country('england', 'England',
    { shirt: 0xf6f6f6, trim: 0xd8262e, shorts: 0x2a3f9a, socks: 0xf6f6f6, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x3a3a3a },
    ['Crumpet', 'Kettle', 'Biscuit', 'Drizzle', 'Foggy', 'Brolly', 'Teacup', 'Thimble', 'Pudding', 'Chalk', 'Clover',
      'Hedge', 'Bramble', 'Lark', 'Badger', 'Crumble', 'Scone', 'Muffin']),
  country('spain', 'Spain',
    { shirt: 0xd8262e, trim: 0xf6c90e, shorts: 0x1f3a93, socks: 0x1f3a93, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Paella', 'Siesta', 'Olive', 'Saffron', 'Fiesta', 'Sunny', 'Castle', 'Sierra', 'Guitar', 'Marble', 'Amber',
      'Coral', 'Anchor', 'Harbor', 'Sunset', 'Churro', 'Tile', 'Lemon']),
  country('germany', 'Germany',
    { shirt: 0xf6f6f6, trim: 0x1a1a1a, shorts: 0x1a1a1a, socks: 0xf6f6f6, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Pretzel', 'Cuckoo', 'Gear', 'Piston', 'Anvil', 'Sprocket', 'Timber', 'Acorn', 'Oak', 'Pine', 'Lynx',
      'Otter', 'Beacon', 'Engine', 'Lever', 'Hammer', 'Rivet', 'Turbo']),
  country('italy', 'Italy',
    { shirt: 0x2e86de, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0x2e86de, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x3a3a3a },
    ['Pesto', 'Gelato', 'Basil', 'Ravioli', 'Gondola', 'Espresso', 'Violin', 'Opera', 'Mosaic', 'Fresco', 'Tomato',
      'Cypress', 'Pizza', 'Macaroni', 'Parsley', 'Scooter', 'Balcony', 'Fountain']),
  country('portugal', 'Portugal',
    { shirt: 0xa51d2d, trim: 0x1e8f4e, shorts: 0x1e8f4e, socks: 0xa51d2d, pattern: 'sash', gkShirt: 0x3a3a3a, gkShorts: 0x3a3a3a },
    ['Sardine', 'Cork', 'Custard', 'Seagull', 'Galleon', 'Compass', 'Sailor', 'Tide', 'Wave', 'Clam', 'Pearl',
      'Reef', 'Mast', 'Rudder', 'Voyage', 'Ocean', 'Tram', 'Kelp']),
  country('netherlands', 'Netherlands',
    { shirt: 0xff7a1a, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0xff7a1a, pattern: 'collar', gkShirt: 0x7a3cc8, gkShorts: 0x1a1a1a },
    ['Tulip', 'Windmill', 'Clog', 'Gouda', 'Bicycle', 'Dune', 'Herring', 'Bridge', 'Pancake', 'Waffle', 'Daisy',
      'Pumpkin', 'Carrot', 'Tangerine', 'Apricot', 'Marigold', 'Ginger', 'Paddle']),
  country('japan', 'Japan',
    { shirt: 0x2a4fcf, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0x2a4fcf, pattern: 'band', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Sushi', 'Bonsai', 'Origami', 'Kite', 'Blossom', 'Bamboo', 'Crane', 'Koi', 'Tofu', 'Noodle', 'Maple',
      'Robot', 'Kimono', 'Pixel', 'Wasabi', 'Teapot', 'Firefly', 'Lotus']),
  country('mexico', 'Mexico',
    { shirt: 0x0f7a3e, trim: 0xd8262e, shorts: 0xf6f6f6, socks: 0xd8262e, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Taco', 'Salsa', 'Pinata', 'Chili', 'Avocado', 'Maraca', 'Quartz', 'Tortilla', 'Cocoa', 'Firework', 'Paprika',
      'Iguana', 'Mesa', 'Coyote', 'Volcano', 'Trumpet', 'Poppy', 'Agave']),
  country('united-states', 'United States',
    { shirt: 0xf6f6f6, trim: 0xd8262e, shorts: 0x2a3f9a, socks: 0xf6f6f6, pattern: 'stripes', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Bison', 'Rodeo', 'Cowboy', 'Burger', 'Popcorn', 'Hotdog', 'Liberty', 'Skyline', 'Jazz', 'Diner', 'Raccoon',
      'Moose', 'Prairie', 'Banjo', 'Boulder', 'Denim', 'Pinball', 'Cobalt']),
  country('nigeria', 'Nigeria',
    { shirt: 0x3cc45a, trim: 0xf6f6f6, shorts: 0x1e6b33, socks: 0x3cc45a, pattern: 'sash', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Savanna', 'Drum', 'Baobab', 'Yam', 'Plantain', 'Jollof', 'Rhythm', 'Leopard', 'Gazelle', 'Rainbow', 'Thunder',
      'Sunbird', 'Hornbill', 'Mahogany', 'Calabash', 'Cassava', 'Groove', 'Tempo']),
  country('morocco', 'Morocco',
    { shirt: 0xc8202c, trim: 0x1e8f4e, shorts: 0x1e8f4e, socks: 0xc8202c, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Mint', 'Oasis', 'Camel', 'Couscous', 'Mirage', 'Kasbah', 'Tagine', 'Carpet', 'Spice', 'Pistachio', 'Fig',
      'Caravan', 'Sahara', 'Henna', 'Cedar', 'Jasmine', 'Argan', 'Sandy']),
  country('uruguay', 'Uruguay',
    { shirt: 0x7cc4f0, trim: 0x1a1a1a, shorts: 0x1a1a1a, socks: 0x1a1a1a, pattern: 'collar', gkShirt: 0xd8262e, gkShorts: 0x1a1a1a },
    ['Sky', 'Cloud', 'Horizon', 'Seashell', 'Dolphin', 'Starfish', 'Surf', 'Sandbar', 'Pelican', 'Heron', 'Cobble',
      'Mate', 'Bluebell', 'Glimmer', 'Kestrel', 'Seaglass', 'Puddle', 'Misty']),
  country('south-korea', 'South Korea',
    { shirt: 0xe0283a, trim: 0x1a1a1a, shorts: 0x1a1a1a, socks: 0xe0283a, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Kimchi', 'Tiger', 'Magpie', 'Hanbok', 'Dumpling', 'Pagoda', 'Ginseng', 'Pinecone', 'Chestnut', 'Radish', 'Sesame',
      'Persimmon', 'Button', 'Zipper', 'Glow', 'Echo', 'Ribbon', 'Frost']),
];

export function starters(team: Team): SquadPlayer[] {
  return team.squad.filter((p) => p.starter);
}

export function findCountry(id: string): Team {
  return COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0];
}
