import {
  ABILITIES,
  ARCHETYPES,
  characterHandle,
  classDetails,
} from "./character.js";
import {
  characterSize,
  initiativeBonus,
  movementSpeed,
  passivePerception,
  proficienciesFor,
} from "./character-stats.js";
import { readDeathSaves } from "./death.js";
import { ITEM_FACTS, ITEM_MARKS, readItemFacts } from "./inventory.js";
import {
  getSavingThrowBonus,
  isSavingThrowProficient,
} from "./saving-throws.js";
import {
  SKILLS,
  abilityModifier,
  proficiencyBonus,
  skillState,
  skillTotal,
} from "./skills.js";
import {
  casterKind,
  readSpellcasting,
  readSpellSlots,
} from "./spellcasting.js";
import { readCatalogueSpell } from "./spells.js";

export const PARTY_EXPORT_VERSION = "1.0.0";

const SPELL_FIELDS = [
  "name",
  "level",
  "school",
  "castingTime",
  "range",
  "components",
  "material",
  "duration",
  "concentration",
  "ritual",
  "attackSave",
  "damage",
  "description",
  "higherLevel",
  "classes",
  "damageByLevel",
  "healByLevel",
];

function exportSpell(row) {
  const spell = readCatalogueSpell({
    slug: row.spell_slug,
    name: row.name,
    level: row.level,
    school: row.school,
    castingTime: row.casting_time,
    range: row.range_text,
    components: row.components,
    material: row.material,
    duration: row.duration,
    concentration: row.concentration,
    ritual: row.ritual,
    attackSave: row.attack_save,
    damage: row.damage,
    description: row.description,
    higherLevel: row.higher_level,
    classes: row.classes,
    damageByLevel: row.damage_by_level,
    healByLevel: row.heal_by_level,
  });
  if (!spell) throw new Error("invalid_spell");
  return {
    id: row.id,
    slug: row.spell_slug,
    ...Object.fromEntries(SPELL_FIELDS.map((field) => [field, spell[field]])),
  };
}

function exportItem(row, containers) {
  const held = readItemFacts(row.facts);
  const facts = Object.fromEntries(
    [...ITEM_FACTS, ...ITEM_MARKS]
      .filter((field) => held[field] !== undefined)
      .map((field) => [field, held[field]]),
  );
  if (held.attunement) facts.requiresAttunement = true;
  const bag = containers.find((container) => container.id === row.container_id);
  return {
    id: row.id,
    slug: row.item_slug,
    name: row.name,
    category: row.category,
    description: row.description ?? "",
    quantity: row.quantity,
    isCustom: Boolean(row.is_custom),
    inHand: Boolean(row.in_hand),
    location: row.container_id
      ? { type: "bag", id: row.container_id, name: bag?.name ?? null }
      : { type: "pack" },
    facts,
  };
}

function exportCharacter(
  character,
  { inventory, spells, features, containers },
) {
  const path = classDetails(character.class_id);
  const archetype =
    path?.archetype ??
    ARCHETYPES.find((entry) => entry.id === character.archetype);
  const abilities = Object.fromEntries(
    ABILITIES.map(({ id }) => [
      id,
      {
        base: character[`ability_${id}`],
        total: character[`ability_${id}_total`],
        modifier: abilityModifier(character[`ability_${id}_total`]),
      },
    ]),
  );
  const savingThrows = Object.fromEntries(
    ABILITIES.map(({ id }) => [
      id,
      {
        proficient: isSavingThrowProficient(character.class_id, id),
        bonus:
          getSavingThrowBonus({
            className: character.class_id,
            abilityName: id,
            abilityMod: abilities[id].modifier,
            level: character.level,
          }) ?? abilities[id].modifier,
      },
    ]),
  );
  const skills = Object.fromEntries(
    SKILLS.map((skill) => {
      const state = skillState(character.skills, skill.id);
      return [
        skill.id,
        {
          name: skill.name,
          ability: skill.ability,
          proficient: state.proficient,
          customBonus: state.custom_bonus,
          bonus: skillTotal({
            modifier: abilities[skill.ability].modifier,
            level: character.level,
            proficient: state.proficient,
            customBonus: state.custom_bonus,
          }),
        },
      ];
    }),
  );
  const casting = readSpellcasting(character);

  return {
    id: character.id,
    name: character.name,
    tag: character.discriminator,
    handle: characterHandle(character),
    build: {
      race: character.race,
      archetype: {
        id: archetype?.id ?? character.archetype ?? null,
        name: archetype?.name ?? null,
      },
      class: { id: character.class_id ?? null, name: path?.path.name ?? null },
      level: character.level,
      xp: character.xp,
    },
    abilities,
    proficiencyBonus: proficiencyBonus(character.level),
    health: {
      currentHp: character.current_hp,
      maxHp: character.max_hp,
      temporaryHp: character.temp_hp,
      maxTemporaryHp: character.temp_hp_max,
      deathSaves: readDeathSaves(character.death_saves),
      dying: Boolean(character.is_dying),
      dead: Boolean(character.is_dead),
    },
    combat: {
      armorClass: character.armor_class,
      initiativeBonus: initiativeBonus(character.ability_dex_total),
      speedFeet: movementSpeed(character.race),
      size: characterSize(character.race),
      passivePerception: passivePerception({
        wisTotal: character.ability_wis_total,
        level: character.level,
        skills: character.skills,
      }),
    },
    savingThrows,
    skills,
    proficiencies: proficienciesFor(
      character.class_id,
      character.custom_proficiencies,
    ),
    inventory: inventory
      .filter((row) => row.character_id === character.id)
      .map((row) => exportItem(row, containers)),
    spellcasting: casting
      ? {
          ability: casting.ability,
          score: casting.score,
          modifier: casting.modifier,
          proficiency: casting.proficiency,
          saveDC: casting.saveDC,
          attackBonus: casting.attackBonus,
          kind: casterKind(character.class_id),
          slots: readSpellSlots(
            character.spell_slots,
            character.class_id,
            character.level,
          ),
        }
      : null,
    spells: spells
      .filter((row) => row.character_id === character.id)
      .map(exportSpell),
    features: features
      .filter((row) => row.character_id === character.id)
      .map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
      })),
  };
}

export function buildPartyExport(
  { campaign, members, sheets, inventory, spells, features, containers },
  exportedAt = new Date().toISOString(),
) {
  const characters = members.map((member) => {
    const sheet = sheets.find((row) => row.id === member.id);
    if (
      !sheet ||
      ABILITIES.some(
        ({ id }) =>
          !Number.isFinite(sheet[`ability_${id}`]) ||
          !Number.isFinite(sheet[`ability_${id}_total`]),
      )
    ) {
      throw new Error("incomplete_party");
    }
    const character = { ...member, ...sheet };
    if (
      [
        "level",
        "xp",
        "current_hp",
        "max_hp",
        "temp_hp",
        "temp_hp_max",
        "armor_class",
      ].some((field) => !Number.isFinite(character[field]))
    ) {
      throw new Error("incomplete_party");
    }
    return exportCharacter(character, {
      inventory,
      spells,
      features,
      containers,
    });
  });
  const levels = characters.map((character) => character.build.level);
  const distribution = {};
  for (const level of levels)
    distribution[level] = (distribution[level] ?? 0) + 1;
  function total(field) {
    return characters.reduce(
      (sum, character) => sum + character.health[field],
      0,
    );
  }
  return {
    schemaVersion: PARTY_EXPORT_VERSION,
    exportedAt,
    campaign: { id: campaign.id, name: campaign.title },
    summary: {
      partySize: characters.length,
      levels: {
        min: levels.length ? Math.min(...levels) : null,
        max: levels.length ? Math.max(...levels) : null,
        average: levels.length
          ? levels.reduce((sum, level) => sum + level, 0) / levels.length
          : null,
        distribution,
      },
      health: {
        currentHp: total("currentHp"),
        maxHp: total("maxHp"),
        temporaryHp: total("temporaryHp"),
        maxTemporaryHp: total("maxTemporaryHp"),
      },
    },
    characters,
  };
}
