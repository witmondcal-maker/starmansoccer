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
  /** Higher sides usually win a simulated scoreline. 74 is average-high. */
  strength: number;
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
  strength: 74,
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

function country(id: string, name: string, strength: number, kit: Kit, names: readonly string[]): Team {
  return { id, name, strength, kit, squad: squad(names) };
}

export const COUNTRIES: readonly Team[] = [
  country('brazil', 'Brazil', 90,
    { shirt: 0xf7d417, trim: 0x1f9e45, shorts: 0x2350c8, socks: 0xf6f6f6, pattern: 'collar', gkShirt: 0x3a3a3a, gkShorts: 0x3a3a3a },
    ['Mango', 'Papaya', 'Toucan', 'Parrot', 'Cashew', 'Guava', 'Macaw', 'Lagoon', 'Palm', 'Coconut', 'Tapir',
      'Sloth', 'Orchid', 'Canopy', 'Breeze', 'Samba', 'Lime', 'Jaguar']),
  country('argentina', 'Argentina', 88,
    { shirt: 0x8fd0ff, trim: 0xf6f6f6, shorts: 0x1c1c3a, socks: 0xf6f6f6, pattern: 'stripes', gkShirt: 0x7a3cc8, gkShorts: 0x1c1c3a },
    ['Condor', 'Tango', 'Llama', 'Glacier', 'Cactus', 'Canyon', 'Lasso', 'Saddle', 'Spur', 'Gallop', 'Poncho',
      'Summit', 'Dusty', 'Pebble', 'Flare', 'Ridge', 'Nimbus', 'Tumble']),
  country('france', 'France', 87,
    { shirt: 0x2d5be3, trim: 0xe23a3a, shorts: 0xf6f6f6, socks: 0xe23a3a, pattern: 'band', gkShirt: 0xf2c230, gkShorts: 0x3a3a3a },
    ['Crepe', 'Beret', 'Mistral', 'Lavender', 'Truffle', 'Canal', 'Velvet', 'Violet', 'Chime', 'Lantern', 'Easel',
      'Pastel', 'Plume', 'Rooster', 'Satin', 'Tower', 'Quill', 'Meadow']),
  country('england', 'England', 84,
    { shirt: 0xf6f6f6, trim: 0xd8262e, shorts: 0x2a3f9a, socks: 0xf6f6f6, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x3a3a3a },
    ['Crumpet', 'Kettle', 'Biscuit', 'Drizzle', 'Foggy', 'Brolly', 'Teacup', 'Thimble', 'Pudding', 'Chalk', 'Clover',
      'Hedge', 'Bramble', 'Lark', 'Badger', 'Crumble', 'Scone', 'Muffin']),
  country('spain', 'Spain', 86,
    { shirt: 0xd8262e, trim: 0xf6c90e, shorts: 0x1f3a93, socks: 0x1f3a93, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Paella', 'Siesta', 'Olive', 'Saffron', 'Fiesta', 'Sunny', 'Castle', 'Sierra', 'Guitar', 'Marble', 'Amber',
      'Coral', 'Anchor', 'Harbor', 'Sunset', 'Churro', 'Tile', 'Lemon']),
  country('germany', 'Germany', 85,
    { shirt: 0xf6f6f6, trim: 0x1a1a1a, shorts: 0x1a1a1a, socks: 0xf6f6f6, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Pretzel', 'Cuckoo', 'Gear', 'Piston', 'Anvil', 'Sprocket', 'Timber', 'Acorn', 'Oak', 'Pine', 'Lynx',
      'Otter', 'Beacon', 'Engine', 'Lever', 'Hammer', 'Rivet', 'Turbo']),
  country('italy', 'Italy', 80,
    { shirt: 0x2e86de, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0x2e86de, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x3a3a3a },
    ['Pesto', 'Gelato', 'Basil', 'Ravioli', 'Gondola', 'Espresso', 'Violin', 'Opera', 'Mosaic', 'Fresco', 'Tomato',
      'Cypress', 'Pizza', 'Macaroni', 'Parsley', 'Scooter', 'Balcony', 'Fountain']),
  country('portugal', 'Portugal', 82,
    { shirt: 0xa51d2d, trim: 0x1e8f4e, shorts: 0x1e8f4e, socks: 0xa51d2d, pattern: 'sash', gkShirt: 0x3a3a3a, gkShorts: 0x3a3a3a },
    ['Sardine', 'Cork', 'Custard', 'Seagull', 'Galleon', 'Compass', 'Sailor', 'Tide', 'Wave', 'Clam', 'Pearl',
      'Reef', 'Mast', 'Rudder', 'Voyage', 'Ocean', 'Tram', 'Kelp']),
  country('netherlands', 'Netherlands', 79,
    { shirt: 0xff7a1a, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0xff7a1a, pattern: 'collar', gkShirt: 0x7a3cc8, gkShorts: 0x1a1a1a },
    ['Tulip', 'Windmill', 'Clog', 'Gouda', 'Bicycle', 'Dune', 'Herring', 'Bridge', 'Pancake', 'Waffle', 'Daisy',
      'Pumpkin', 'Carrot', 'Tangerine', 'Apricot', 'Marigold', 'Ginger', 'Paddle']),
  country('japan', 'Japan', 72,
    { shirt: 0x2a4fcf, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0x2a4fcf, pattern: 'band', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Sushi', 'Bonsai', 'Origami', 'Kite', 'Blossom', 'Bamboo', 'Crane', 'Koi', 'Tofu', 'Noodle', 'Maple',
      'Robot', 'Kimono', 'Pixel', 'Wasabi', 'Teapot', 'Firefly', 'Lotus']),
  country('mexico', 'Mexico', 68,
    { shirt: 0x0f7a3e, trim: 0xd8262e, shorts: 0xf6f6f6, socks: 0xd8262e, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Taco', 'Salsa', 'Pinata', 'Chili', 'Avocado', 'Maraca', 'Quartz', 'Tortilla', 'Cocoa', 'Firework', 'Paprika',
      'Iguana', 'Mesa', 'Coyote', 'Volcano', 'Trumpet', 'Poppy', 'Agave']),
  country('united-states', 'United States', 66,
    { shirt: 0xf6f6f6, trim: 0xd8262e, shorts: 0x2a3f9a, socks: 0xf6f6f6, pattern: 'stripes', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Bison', 'Rodeo', 'Cowboy', 'Burger', 'Popcorn', 'Hotdog', 'Liberty', 'Skyline', 'Jazz', 'Diner', 'Raccoon',
      'Moose', 'Prairie', 'Banjo', 'Boulder', 'Denim', 'Pinball', 'Cobalt']),
  country('nigeria', 'Nigeria', 70,
    { shirt: 0x3cc45a, trim: 0xf6f6f6, shorts: 0x1e6b33, socks: 0x3cc45a, pattern: 'sash', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Savanna', 'Drum', 'Baobab', 'Yam', 'Plantain', 'Jollof', 'Rhythm', 'Leopard', 'Gazelle', 'Rainbow', 'Thunder',
      'Sunbird', 'Hornbill', 'Mahogany', 'Calabash', 'Cassava', 'Groove', 'Tempo']),
  country('morocco', 'Morocco', 77,
    { shirt: 0xc8202c, trim: 0x1e8f4e, shorts: 0x1e8f4e, socks: 0xc8202c, pattern: 'collar', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Mint', 'Oasis', 'Camel', 'Couscous', 'Mirage', 'Kasbah', 'Tagine', 'Carpet', 'Spice', 'Pistachio', 'Fig',
      'Caravan', 'Sahara', 'Henna', 'Cedar', 'Jasmine', 'Argan', 'Sandy']),
  country('uruguay', 'Uruguay', 76,
    { shirt: 0x7cc4f0, trim: 0x1a1a1a, shorts: 0x1a1a1a, socks: 0x1a1a1a, pattern: 'collar', gkShirt: 0xd8262e, gkShorts: 0x1a1a1a },
    ['Sky', 'Cloud', 'Horizon', 'Seashell', 'Dolphin', 'Starfish', 'Surf', 'Sandbar', 'Pelican', 'Heron', 'Cobble',
      'Mate', 'Bluebell', 'Glimmer', 'Kestrel', 'Seaglass', 'Puddle', 'Misty']),
  country('south-korea', 'South Korea', 71,
    { shirt: 0xe0283a, trim: 0x1a1a1a, shorts: 0x1a1a1a, socks: 0xe0283a, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Kimchi', 'Tiger', 'Magpie', 'Hanbok', 'Dumpling', 'Pagoda', 'Ginseng', 'Pinecone', 'Chestnut', 'Radish', 'Sesame',
      'Persimmon', 'Button', 'Zipper', 'Glow', 'Echo', 'Ribbon', 'Frost']),
  country('belgium', 'Belgium', 81,
    { shirt: 0x7a1020, trim: 0xf2c230, shorts: 0x1a1a1a, socks: 0xf2c230, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Batter', 'Praline', 'Sprout', 'Belfry', 'Lace', 'Comic', 'Atom', 'Fries', 'Rail', 'Iris', 'Mustard',
      'Diamond', 'Alley', 'Hedgehog', 'Chicory', 'Speculoos', 'Bristle', 'Endive']),
  country('croatia', 'Croatia', 78,
    { shirt: 0xe23a3a, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0xe23a3a, pattern: 'stripes', gkShirt: 0x2a4fcf, gkShorts: 0x1a1a1a },
    ['Cliff', 'Island', 'Linen', 'Checker', 'Walnut', 'Gull', 'Anchovy', 'Quarry', 'Chapel', 'Ferry', 'Saltpan',
      'Netting', 'Rope', 'Buoy', 'Adriatic', 'Seawall', 'Lighthouse', 'Redcheck']),
  country('colombia', 'Colombia', 75,
    { shirt: 0xf2c230, trim: 0x1f3a93, shorts: 0x1f3a93, socks: 0xd8262e, pattern: 'collar', gkShirt: 0x1a1a1a, gkShorts: 0x1a1a1a },
    ['Coffee', 'Emerald', 'Cumbia', 'Andes', 'Sombrero', 'Frog', 'Cacao', 'Clay', 'Basket', 'Flute', 'Arepa',
      'Falls', 'Peak', 'Valley', 'Anaconda', 'Hammock', 'Canoe', 'Humming']),
  country('senegal', 'Senegal', 73,
    { shirt: 0xf6f6f6, trim: 0x1e8f4e, shorts: 0x1e8f4e, socks: 0xf2c230, pattern: 'sash', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Lion', 'Peanut', 'Pirogue', 'Djembe', 'Boat', 'Mask', 'Cloth', 'Market', 'Griot', 'Millet', 'Sahel',
      'Hippo', 'Kora', 'Beads', 'Fan', 'Warmth', 'Tambour', 'Teranga']),
  country('australia', 'Australia', 64,
    { shirt: 0xf2b705, trim: 0x1e6b33, shorts: 0x1e6b33, socks: 0xf2b705, pattern: 'collar', gkShirt: 0x7a3cc8, gkShorts: 0x1a1a1a },
    ['Kangaroo', 'Koala', 'Boomerang', 'Wombat', 'Emu', 'Outback', 'Platypus', 'Gumtree', 'Dingo', 'Spread', 'Corkhat',
      'Billabong', 'Opal', 'Shark', 'Pavlova', 'Lamington', 'Quokka', 'Kookaburra']),
  country('switzerland', 'Switzerland', 74,
    { shirt: 0xd8262e, trim: 0xf6f6f6, shorts: 0xd8262e, socks: 0xf6f6f6, pattern: 'band', gkShirt: 0x2a4fcf, gkShorts: 0x1a1a1a },
    ['Alp', 'Cheese', 'Cowbell', 'Fondue', 'Edelweiss', 'Ski', 'Chocolate', 'Tunnel', 'Cog', 'Chalet', 'Raclette',
      'Yodel', 'Snowcap', 'Crossbar', 'Bellhop', 'Alphorn', 'Toboggan', 'Muesli']),
  country('denmark', 'Denmark', 73,
    { shirt: 0xc8202c, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0xc8202c, pattern: 'plain', gkShirt: 0x2a4fcf, gkShorts: 0x1a1a1a },
    ['Block', 'Pastry', 'Mermaid', 'Viking', 'Bacon', 'Rye', 'Brick', 'Oar', 'Swan', 'Beech', 'Hygge',
      'Butter', 'Crown', 'Barrow', 'Cookie', 'Keel', 'Pier', 'Blueflag']),
  country('poland', 'Poland', 69,
    { shirt: 0xf6f6f6, trim: 0xd8262e, shorts: 0xd8262e, socks: 0xf6f6f6, pattern: 'band', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Pierogi', 'Dragon', 'Resin', 'Wheat', 'Stork', 'Cottage', 'Birch', 'Honey', 'Falcon', 'Mill', 'Copper',
      'Pottery', 'Flax', 'Wolf', 'Apple', 'Bagel', 'Snowdrop', 'Poppyseed']),
  country('ecuador', 'Ecuador', 67,
    { shirt: 0xf7d417, trim: 0x1f3a93, shorts: 0x1f3a93, socks: 0xd8262e, pattern: 'stripes', gkShirt: 0x1a1a1a, gkShorts: 0xf6f6f6 },
    ['Tortoise', 'Equator', 'Quinoa', 'Amazon', 'Raft', 'Boa', 'Brim', 'Crest', 'Finch', 'Lava', 'Galapago',
      'Straw', 'Pacific', 'Alpaca', 'Potato', 'Yarn', 'Loom', 'Hilltop']),
  country('canada', 'Canada', 60,
    { shirt: 0xd8262e, trim: 0xf6f6f6, shorts: 0xd8262e, socks: 0xd8262e, pattern: 'collar', gkShirt: 0x1a1a1a, gkShorts: 0xf2c230 },
    ['Puck', 'Beaver', 'Mountie', 'Totem', 'Loon', 'Syrup', 'Flannel', 'Cabin', 'Aurora', 'Salmon', 'Inuksuk',
      'Hockey', 'Snowflake', 'Rink', 'Goose', 'Polar', 'Grizzly', 'Bannock']),
  country('ghana', 'Ghana', 65,
    { shirt: 0xf2c230, trim: 0xd8262e, shorts: 0x1e8f4e, socks: 0xf2c230, pattern: 'sash', gkShirt: 0x2a4fcf, gkShorts: 0x1a1a1a },
    ['Kente', 'Adinkra', 'Drummer', 'Anansi', 'Stool', 'Fufu', 'Bracelet', 'Fort', 'Grove', 'Horn', 'Dance',
      'Shea', 'Weaver', 'Rattle', 'Pot', 'Mallet', 'Headwrap', 'Goldweight']),
  country('cameroon', 'Cameroon', 66,
    { shirt: 0x1e8f4e, trim: 0xd8262e, shorts: 0xf2c230, socks: 0x1e8f4e, pattern: 'band', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Elephant', 'Gorilla', 'Indigo', 'Banana', 'Crater', 'Rainforest', 'Makossa', 'Ndop', 'Carving', 'Hillside', 'Palmnut',
      'Beadwork', 'Wooddrum', 'Termite', 'Drumline', 'Tusk', 'Greenhill', 'Sunhat']),
  country('sweden', 'Sweden', 68,
    { shirt: 0xf7d417, trim: 0x2a4fcf, shorts: 0x2a4fcf, socks: 0xf7d417, pattern: 'collar', gkShirt: 0xd8262e, gkShorts: 0x1a1a1a },
    ['Meatball', 'Fika', 'Dala', 'Lingon', 'Cinnamon', 'Elk', 'Reindeer', 'Candle', 'Bun', 'Icicle', 'Berry',
      'Knit', 'Wool', 'Blizzard', 'Sauna', 'Midnight', 'Sunbeam', 'Arch']),
  country('scotland', 'Scotland', 63,
    { shirt: 0x1d2b64, trim: 0xf6f6f6, shorts: 0xf6f6f6, socks: 0xd8262e, pattern: 'stripes', gkShirt: 0xf2c230, gkShorts: 0x1a1a1a },
    ['Thistle', 'Bagpipe', 'Kilt', 'Haggis', 'Loch', 'Heather', 'Shortbread', 'Tartan', 'Porridge', 'Nessie', 'Highland',
      'Oatcake', 'Fiddle', 'Glen', 'Bothy', 'Cairn', 'Broth', 'Sporran']),
  country('egypt', 'Egypt', 64,
    { shirt: 0x8b1e2d, trim: 0xf2c230, shorts: 0xf6f6f6, socks: 0x8b1e2d, pattern: 'collar', gkShirt: 0x2fa84f, gkShorts: 0x1a1a1a },
    ['Pyramid', 'Sphinx', 'Nile', 'Papyrus', 'Scarab', 'Obelisk', 'Felucca', 'Cartouche', 'Ankh', 'Ibis', 'Reed',
      'Sandal', 'Glyph', 'Crocodile', 'Dates', 'Desert', 'Lamp', 'Sandglass']),
];

export function starters(team: Team): SquadPlayer[] {
  return team.squad.filter((p) => p.starter);
}

export function findCountry(id: string): Team {
  return COUNTRIES.find((c) => c.id === id) ?? COUNTRIES[0];
}

export function allTeams(): readonly Team[] {
  return [EAGLES_NING, ...COUNTRIES];
}

export function findTeam(id: string): Team {
  return id === EAGLES_NING.id ? EAGLES_NING : findCountry(id);
}
