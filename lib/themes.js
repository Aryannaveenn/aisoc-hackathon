// Room themes. Ids and object ids must match public/js/rooms/*.js, in order:
// object 1 is lock I, object 5 is lock V.

export const THEMES = {
  office: {
    name: "The solicitor's office",
    exit: "the exit door",
    objects: [
      { id: "portrait", name: "the portrait", description: "an oil portrait of a pale solicitor whose eyes follow you" },
      { id: "clock", name: "the grandfather clock", description: "a tall clock with a swinging pendulum" },
      { id: "bookshelf", name: "the bookshelf", description: "shelves of crumbling law books and a small skull" },
      { id: "desk", name: "the desk", description: "a writing desk with a guttering candle and a sealed contract" },
      { id: "safe", name: "the safe", description: "an iron safe with a combination dial" },
    ],
  },
  crypt: {
    name: "The family crypt",
    exit: "the iron gate",
    objects: [
      { id: "coffin", name: "the coffin", description: "a cracked stone coffin whose lid has shifted" },
      { id: "candelabra", name: "the candelabra", description: "a wrought-iron candelabra dripping black wax" },
      { id: "angel", name: "the weeping angel", description: "a stone angel statue with its hands over its face" },
      { id: "urn", name: "the funeral urn", description: "a sealed urn of someone's ashes, engraved with initials" },
      { id: "raven", name: "the raven", description: "a raven on a perch that watches and occasionally speaks" },
    ],
  },
  parlour: {
    name: "The séance parlour",
    exit: "the parlour door",
    objects: [
      { id: "crystal-ball", name: "the crystal ball", description: "a crystal ball swirling with fog on a draped table" },
      { id: "spirit-board", name: "the spirit board", description: "a talking board with a planchette that moves on its own" },
      { id: "gramophone", name: "the gramophone", description: "a gramophone that plays a crackling voice from nowhere" },
      { id: "mirror", name: "the veiled mirror", description: "a tall mirror half covered by a black veil" },
      { id: "tarot", name: "the tarot cards", description: "a spread of tarot cards that rearrange themselves" },
    ],
  },
  nursery: {
    name: "The nursery",
    exit: "the nursery door",
    objects: [
      { id: "rocking-horse", name: "the rocking horse", description: "a wooden rocking horse that rocks with no one on it" },
      { id: "music-box", name: "the music box", description: "a music box with a tiny ballerina that turns to face you" },
      { id: "doll", name: "the porcelain doll", description: "a cracked porcelain doll sitting in a small chair" },
      { id: "dollhouse", name: "the dollhouse", description: "a dollhouse that is an exact copy of this house" },
      { id: "wardrobe", name: "the wardrobe", description: "a tall wardrobe whose door is open just a crack" },
    ],
  },
};

export const THEME_IDS = Object.keys(THEMES);

export function randomThemeId() {
  return THEME_IDS[Math.floor(Math.random() * THEME_IDS.length)];
}
