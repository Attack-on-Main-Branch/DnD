import { ABILITIES } from "./rules/character.js";

export const EXPORT_CAMPAIGN = "6f1c3d2e-0000-4000-8000-0000000000ca";
export const EXPORT_CHARACTER = "6f1c3d2e-0000-4000-8000-000000000001";
export const EXPORT_BAG = "6f1c3d2e-0000-4000-8000-00000000ba61";
export const EXPORT_OWNER = "6f1c3d2e-0000-4000-8000-000000000099";

export function partyExportFixture() {
  const totals = { str: 10, dex: 14, con: 12, int: 16, wis: 12, cha: 8 };
  const abilities = Object.fromEntries(
    ABILITIES.flatMap(({ id }) => [
      [`ability_${id}`, totals[id] - (id === "int" ? 2 : 0)],
      [`ability_${id}_total`, totals[id]],
    ]),
  );
  return {
    campaign: {
      id: EXPORT_CAMPAIGN,
      title: "The Lantern Road",
      world_description: "PRIVATE_CAMPAIGN_DATA",
    },
    members: [
      {
        id: EXPORT_CHARACTER,
        name: "Fern",
        discriminator: "0451",
        race: "Elf",
        archetype: "mage",
        class_id: "wizard",
        level: 5,
        xp: 6500,
        current_hp: 12,
        max_hp: 30,
        temp_hp: 4,
        temp_hp_max: 8,
        armor_class: 14,
        death_saves: { successes: 0, failures: 0 },
        is_dying: false,
        is_dead: false,
        conditions: ["poisoned"],
        inspiration: 3,
        coin_gp: 100,
        avatar_url: "PRIVATE_AVATAR_DATA",
        backstory: "PRIVATE_BACKSTORY_DATA",
        personality: "PRIVATE_PERSONALITY_DATA",
        user_id: "PRIVATE_ACCOUNT_DATA",
      },
    ],
    sheets: [
      {
        id: EXPORT_CHARACTER,
        race: "Elf",
        class_id: "wizard",
        level: 5,
        ...abilities,
        skills: {
          perception: { proficient: true, custom_bonus: 1 },
          arcana: { proficient: true },
        },
        spell_slots: { 1: { used: 1 }, 3: { used: 1 } },
        hit_dice_spent: 4,
        custom_proficiencies: {
          armor: ["Shields"],
          overrides: { weapons: ["Longbow"] },
          secret: "PRIVATE_PROFICIENCY_DATA",
        },
      },
    ],
    inventory: [
      {
        id: "bow",
        character_id: EXPORT_CHARACTER,
        container_id: EXPORT_BAG,
        item_slug: "custom:moonbow",
        name: "Moonbow",
        category: "Weapon",
        description: "A silver bow.",
        quantity: 1,
        is_custom: true,
        in_hand: false,
        facts: {
          damage: "1d8 Piercing",
          range: "150/600 ft",
          properties: "Two-handed",
          rarity: "Rare",
          attunement: true,
          documentId: "PRIVATE_ATTACHMENT_DATA",
          catalogueId: EXPORT_CAMPAIGN,
          hidden: "PRIVATE_ITEM_DATA",
        },
      },
      {
        id: "dagger",
        character_id: EXPORT_CHARACTER,
        container_id: null,
        item_slug: "dagger",
        name: "Dagger",
        category: "Weapon",
        description: "A small blade.",
        quantity: 2,
        is_custom: false,
        in_hand: true,
        facts: { damage: "1d4 Piercing", thrown: "20/60 ft", weight: "1 lb" },
      },
    ],
    spells: [
      {
        id: "fireball",
        character_id: EXPORT_CHARACTER,
        spell_slug: "fireball",
        name: "Fireball",
        level: 3,
        school: "Evocation",
        casting_time: "1 action",
        range_text: "150 feet",
        components: "V, S, M",
        material: "A pinch of sulfur.",
        duration: "Instantaneous",
        concentration: false,
        ritual: false,
        attack_save: "DEX save",
        damage: "8d6 Fire",
        description: "Fire spreads around corners.",
        higher_level: "Add 1d6 per slot level.",
        classes: "Wizard, Sorcerer",
        damage_by_level: {
          3: "8d6",
          4: "9d6",
          private: "PRIVATE_SCALING_DATA",
        },
        heal_by_level: {},
        is_prepared: true,
        secret: "PRIVATE_SPELL_DATA",
      },
    ],
    features: [
      {
        id: "focus",
        character_id: EXPORT_CHARACTER,
        name: "Battle Focus",
        description: "Keep focus in battle.",
        uses_remaining: 2,
        secret: "PRIVATE_FEATURE_DATA",
      },
    ],
    containers: [
      {
        id: EXPORT_BAG,
        campaign_id: EXPORT_CAMPAIGN,
        owner_character_id: EXPORT_CHARACTER,
        type: "bag",
        name: "Satchel",
        image_url: "PRIVATE_CONTAINER_DATA",
      },
    ],
  };
}
