class_name AttachmentData
extends Resource
extends Resource

enum AttachmentType { ARMOR, ENGINE, RADAR, WEAPON, CARGO, AMMO, MEDKIT, LUCK }

@export var attachment_name: String = "护甲片"
@export var attachment_type: AttachmentType = AttachmentType.ARMOR
@export var quality: ItemData.Quality = ItemData.Quality.COMMON
@export var description: String = "提供减伤效果"

# 属性加成
@export var hp_boost: float = 0.0       # HP加成倍率
@export var speed_boost: float = 0.0     # 速度加成倍率
@export var damage_boost: float = 0.0   # 伤害加成倍率
@export var defense_boost: float = 0.0  # 防御加成
@export var range_boost: float = 0.0    # 视野/射程加成
@export var fire_rate_boost: float = 0.0 # 射速加成
@export var drop_rate_boost: float = 0.0 # 掉落率加成

@export var durability_max: int = 100
@export var durability_current: int = 100

const TYPE_NAMES := {
    AttachmentType.ARMOR: "护甲",
    AttachmentType.ENGINE: "发动机",
    AttachmentType.RADAR: "雷达",
    AttachmentType.WEAPON: "武器",
    AttachmentType.CARGO: "货舱",
    AttachmentType.AMMO: "弹药库",
    AttachmentType.MEDKIT: "医疗箱",
    AttachmentType.LUCK: "幸运符"
}

func get_quality_color() -> Color:
    return ItemData.QUALITY_COLORS[quality]

func apply_damage(dmg: float) -> float:
    """应用防御，返回实际受到的伤害"""
    var reduction := defense_boost * 0.01 * float(quality + 1)
    return max(1.0, dmg * (1.0 - reduction))

func is_broken() -> bool:
    return durability_current <= 0
