export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

export type AppPage =
  | "Overview"
  | "Campaigns"
  | "Compendium"
  | "Battles"
  | "Current Battle";
export type Ability = (typeof ABILITIES)[number];
export type AbilityScores = Record<Ability, number>;
export type ResourceType =
  | "campaign"
  | "player"
  | "npc"
  | "location"
  | "battle"
  | "monster"
  | "item"
  | "gear"
  | "effect";

export interface ResourceLink {
  type: ResourceType;
  id: string;
  campaignId: string | null;
  label: string;
}

export interface ResourceOption extends ResourceLink {
  context: string;
  preview?: ResourcePreview;
}

export interface ResourcePreview {
  subtitle: string;
  details: string[];
  description: string;
  imageId: string | null;
}

export interface ResourceNavigation {
  resource: ResourceLink;
  requestId: string;
}

export interface ResourceNotes {
  text: string;
  links: ResourceLink[];
  images: NoteImage[];
}

export interface NoteImage {
  id: string;
  altText: string;
}

export interface Player {
  id: string;
  name: string;
  profileImageId: string | null;
  notes: ResourceNotes;
}

export interface PreparedEnemy {
  monsterId: string;
  count: number;
}

export interface PreparedBattle {
  id: string;
  name: string;
  playerIds: string[];
  enemies: PreparedEnemy[];
  notes: ResourceNotes;
}

export interface Note {
  id: string;
  campaignId: string | null;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  notes: ResourceNotes;
  players: Player[];
  preparedBattles: PreparedBattle[];
  activeBattles: ActiveBattle[];
  npcs: Npc[];
  locations: LocationNode[];
}

export interface CreatureStats {
  size: string;
  creatureType: string;
  alignment: string;
  armorClass: number;
  hitPoints: number;
  hitDice: string;
  speed: string;
  abilityScores: AbilityScores;
  savingThrows: string;
  skills: string;
  damageVulnerabilities: string;
  damageResistances: string;
  damageImmunities: string;
  conditionImmunities: string;
  senses: string;
  languages: string;
  challengeRating: string;
  proficiencyBonus: number;
  traits: string;
  actions: string;
  bonusActions: string;
  reactions: string;
  legendaryActions: string;
}

export interface Npc {
  id: string;
  name: string;
  profileImageId: string | null;
  notes: ResourceNotes;
  stats: CreatureStats | null;
}

export interface LocationNode {
  id: string;
  name: string;
  parentId: string | null;
  kind: "folder" | "location";
  notes: ResourceNotes;
}

export interface Monster extends CreatureStats {
  id: string;
  name: string;
  profileImageId: string | null;
  spellSlots: SpellSlotCapacity[];
  spells: MonsterSpell[];
  notes: ResourceNotes;
}

export interface SpellSlotCapacity {
  level: number;
  maximum: number;
}

export type MonsterSpellUsage =
  | { type: "spell-slot"; level: number }
  | { type: "shared-daily"; usesPerDay: number }
  | { type: "daily-each"; usesPerDay: number }
  | { type: "at-will" };

export interface MonsterSpell {
  id: string;
  name: string;
  usage: MonsterSpellUsage;
}

export interface SpellSlotTracker extends SpellSlotCapacity {
  remaining: number;
}

export interface DailySpellPoolTracker {
  usesPerDay: number;
  maximum: number;
  remaining: number;
}

export interface IndividualDailySpellTracker {
  spellId: string;
  maximum: number;
  remaining: number;
}

export interface MonsterBattleSnapshot extends CreatureStats {
  id: string;
  name: string;
  profileImageId: string | null;
  spellSlots: SpellSlotCapacity[];
  spells: MonsterSpell[];
}

export type CompendiumCategory = "items" | "effects";

export interface CompendiumEntry {
  id: string;
  name: string;
  notes: ResourceNotes;
}

export interface DiceExpression {
  count: number;
  die: DndDie;
  modifier: number;
}

export type DndDie = "d4" | "d6" | "d8" | "d10" | "d12" | "d20";

interface GearEntryBase {
  id: string;
  name: string;
  cost: string;
  notes: ResourceNotes;
}

export interface WeaponGearEntry extends GearEntryBase {
  kind: "weapon";
  damage: DiceExpression;
  damageType: string;
  range: WeaponRange;
}

export interface WeaponRange {
  normal: number;
  long: number;
}

export interface ArmorGearEntry extends GearEntryBase {
  kind: "armor";
  armorClass: string;
}

export type GearEntry = WeaponGearEntry | ArmorGearEntry;

export interface WorkspaceData {
  campaigns: Campaign[];
  monsters: Monster[];
  items: CompendiumEntry[];
  gear: GearEntry[];
  effects: CompendiumEntry[];
  currentBattle: CurrentBattle | null;
}

export interface TurnParticipant {
  id: string;
  name: string;
  kind: "player" | "enemy";
  initiative: number;
  dexterityModifier: number;
}

export interface ActivePlayerParticipant extends TurnParticipant {
  kind: "player";
  playerId: string;
  monster: null;
}

export interface ActiveEnemyParticipant extends TurnParticipant {
  kind: "enemy";
  playerId: null;
  monster: MonsterBattleSnapshot;
  currentHitPoints: number;
  maxHitPoints: number;
  spellSlots: SpellSlotTracker[];
  sharedDailySpellPools: DailySpellPoolTracker[];
  individualDailySpells: IndividualDailySpellTracker[];
}

export type ActiveBattleParticipant =
  | ActivePlayerParticipant
  | ActiveEnemyParticipant;

export interface ActiveBattle {
  id: string;
  name: string;
  round: number;
  currentParticipantId: string;
  participants: ActiveBattleParticipant[];
}

export interface CurrentBattleSetup {
  playerIds: string[];
  enemies: PreparedEnemy[];
  notes: ResourceNotes;
  playerInitiatives: Record<string, string>;
}

export interface CurrentBattle {
  campaignId: string;
  name: string;
  setup: CurrentBattleSetup | null;
}

export interface EnemyInitiativeInput {
  id: string;
  name: string;
  dexterityScore: number;
}
